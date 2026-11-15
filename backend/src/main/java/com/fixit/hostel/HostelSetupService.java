package com.fixit.hostel;

import com.fixit.common.AppException;
import com.fixit.hostel.HostelDtos.BlockInput;
import com.fixit.hostel.HostelDtos.BlockView;
import com.fixit.hostel.HostelDtos.CreateHostelRequest;
import com.fixit.hostel.HostelDtos.HostelLookup;
import com.fixit.hostel.HostelDtos.JoinRequest;
import com.fixit.hostel.HostelDtos.RoomView;
import com.fixit.security.AuthUser;
import com.fixit.sla.SlaCalculator;
import com.fixit.ticket.Priority;
import com.fixit.usage.UsageService;
import com.fixit.user.AppUser;
import com.fixit.user.Role;
import com.fixit.user.UserRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creating a hostel, and joining one with an invite code. */
@Service
public class HostelSetupService {

    private final HostelRepository hostels;
    private final BlockRepository blocks;
    private final RoomRepository rooms;
    private final CategoryRepository categories;
    private final SlaPolicyRepository slaPolicies;
    private final UserRepository users;
    private final InviteCodes inviteCodes;
    private final UsageService usage;

    public HostelSetupService(HostelRepository hostels, BlockRepository blocks, RoomRepository rooms,
                              CategoryRepository categories, SlaPolicyRepository slaPolicies,
                              UserRepository users, InviteCodes inviteCodes, UsageService usage) {
        this.hostels = hostels;
        this.blocks = blocks;
        this.rooms = rooms;
        this.categories = categories;
        this.slaPolicies = slaPolicies;
        this.users = users;
        this.inviteCodes = inviteCodes;
        this.usage = usage;
    }

    /** The creator becomes the hostel's first warden. One transaction: either the whole setup exists or none of it. */
    @Transactional
    public AppUser create(AuthUser me, CreateHostelRequest req) {
        AppUser user = loadWithoutHostel(me);
        ensureUniqueBlockNames(req.blocks());
        Hostel hostel = hostels.save(new Hostel(req.name().trim(), req.kind(), inviteCodes.next(), inviteCodes.next()));
        for (BlockInput input : req.blocks()) {
            addBlock(hostel.getId(), input.name(), input.rooms());
        }
        seedCategories(hostel.getId());
        user.joinHostel(hostel, Role.WARDEN);
        usage.record(UsageService.Action.HOSTEL_CREATED);
        return user;
    }

    @Transactional(readOnly = true)
    public HostelLookup lookup(String code) {
        String normalised = normalise(code);
        Hostel hostel = findByCode(normalised);
        Role joinsAs = hostel.getStaffInviteCode().equals(normalised) ? Role.STAFF : Role.RESIDENT;
        List<BlockView> layout = joinsAs == Role.RESIDENT ? layout(hostel.getId()) : List.of();
        return new HostelLookup(hostel.getName(), hostel.getKind(), joinsAs, layout);
    }

    @Transactional
    public AppUser join(AuthUser me, JoinRequest req) {
        AppUser user = loadWithoutHostel(me);
        String code = normalise(req.code());
        Hostel hostel = findByCode(code);
        Role role = hostel.getStaffInviteCode().equals(code) ? Role.STAFF : Role.RESIDENT;
        user.joinHostel(hostel, role);
        if (req.roomId() != null) {
            user.setRoom(rooms.findByIdAndHostelId(req.roomId(), hostel.getId())
                    .orElseThrow(() -> AppException.notFound("Room")));
        }
        usage.record(UsageService.Action.HOSTEL_JOINED);
        return user;
    }

    /** Blocks with their rooms: two queries total, grouped in memory. */
    @Transactional(readOnly = true)
    public List<BlockView> layout(long hostelId) {
        Map<Long, List<RoomView>> roomsByBlock = rooms.findByHostelIdOrderByNumberAsc(hostelId).stream()
                .collect(Collectors.groupingBy(r -> r.getBlock().getId(),
                        Collectors.mapping(r -> new RoomView(r.getId(), r.getNumber()), Collectors.toList())));
        return blocks.findByHostelIdOrderByNameAsc(hostelId).stream()
                .map(b -> new BlockView(b.getId(), b.getName(), roomsByBlock.getOrDefault(b.getId(), List.of())))
                .toList();
    }

    Block addBlock(Long hostelId, String name, String roomSpec) {
        List<String> numbers = RoomRangeParser.parse(roomSpec);
        Block block = blocks.save(new Block(hostelId, name.trim()));
        List<Room> toSave = new ArrayList<>(numbers.size());
        numbers.forEach(n -> toSave.add(new Room(hostelId, block, n)));
        rooms.saveAll(toSave);
        return block;
    }

    private void seedCategories(Long hostelId) {
        for (DefaultCategories.Template t : DefaultCategories.ALL) {
            Category c = categories.save(new Category(hostelId, t.code(), t.name(), t.covers()));
            for (Priority p : Priority.values()) {
                slaPolicies.save(new SlaPolicy(hostelId, c.getId(), p, SlaCalculator.DEFAULT_TARGET_HOURS.get(p)));
            }
        }
    }

    private AppUser loadWithoutHostel(AuthUser me) {
        AppUser user = users.findWithHostelById(me.userId()).orElseThrow(() -> AppException.notFound("User"));
        if (user.getHostel() != null) {
            throw AppException.conflict("ALREADY_MEMBER", "You already belong to " + user.getHostel().getName());
        }
        return user;
    }

    private Hostel findByCode(String code) {
        return hostels.findByResidentInviteCode(code)
                .or(() -> hostels.findByStaffInviteCode(code))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "BAD_INVITE_CODE",
                        "That code doesn't match any hostel. Check it with your warden."));
    }

    private static void ensureUniqueBlockNames(List<BlockInput> inputs) {
        Set<String> seen = new HashSet<>();
        for (BlockInput b : inputs) {
            if (!seen.add(b.name().trim().toLowerCase(Locale.ROOT))) {
                throw AppException.badRequest("DUPLICATE_BLOCK", "Block \"" + b.name() + "\" is listed twice");
            }
        }
    }

    private static String normalise(String code) {
        return code.trim().toUpperCase(Locale.ROOT).replace(" ", "");
    }
}
