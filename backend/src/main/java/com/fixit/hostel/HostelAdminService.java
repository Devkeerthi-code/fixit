package com.fixit.hostel;

import com.fixit.common.AppException;
import com.fixit.hostel.HostelDtos.BlockView;
import com.fixit.hostel.HostelDtos.CategoryView;
import com.fixit.hostel.HostelDtos.HostelSettings;
import com.fixit.hostel.HostelDtos.SetSkillsRequest;
import com.fixit.hostel.HostelDtos.SkillInput;
import com.fixit.hostel.HostelDtos.SkillView;
import com.fixit.hostel.HostelDtos.StaffView;
import com.fixit.hostel.HostelDtos.UpdateCategoryRequest;
import com.fixit.hostel.HostelDtos.UpdateHostelRequest;
import com.fixit.security.AuthUser;
import com.fixit.ticket.Priority;
import com.fixit.user.AppUser;
import com.fixit.user.Role;
import com.fixit.user.UserRepository;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Warden tools for the caller's own hostel. @PreAuthorize is checked by Spring before the method body runs;
 * hostelId always comes from the caller's token, so a warden can only ever touch their own hostel.
 */
@Service
public class HostelAdminService {

    private final HostelRepository hostels;
    private final BlockRepository blocks;
    private final RoomRepository rooms;
    private final CategoryRepository categories;
    private final SlaPolicyRepository slaPolicies;
    private final StaffSkillRepository skills;
    private final UserRepository users;
    private final HostelSetupService setup;
    private final InviteCodes inviteCodes;

    public HostelAdminService(HostelRepository hostels, BlockRepository blocks, RoomRepository rooms,
                              CategoryRepository categories, SlaPolicyRepository slaPolicies,
                              StaffSkillRepository skills, UserRepository users, HostelSetupService setup,
                              InviteCodes inviteCodes) {
        this.hostels = hostels;
        this.blocks = blocks;
        this.rooms = rooms;
        this.categories = categories;
        this.slaPolicies = slaPolicies;
        this.skills = skills;
        this.users = users;
        this.setup = setup;
        this.inviteCodes = inviteCodes;
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional(readOnly = true)
    public HostelSettings settings(AuthUser me) {
        return toSettings(hostel(me));
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional
    public HostelSettings update(AuthUser me, UpdateHostelRequest req) {
        Hostel h = hostel(me);
        h.setName(req.name().trim());
        h.setKind(req.kind());
        return toSettings(h);
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional
    public HostelSettings rotateCodes(AuthUser me) {
        Hostel h = hostel(me);
        h.setResidentInviteCode(inviteCodes.next());
        h.setStaffInviteCode(inviteCodes.next());
        return toSettings(h);
    }

    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public List<BlockView> layout(AuthUser me) {
        return setup.layout(me.requireHostel());
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional
    public List<BlockView> addBlock(AuthUser me, HostelDtos.BlockInput req) {
        long hostelId = me.requireHostel();
        if (blocks.existsByHostelIdAndNameIgnoreCase(hostelId, req.name().trim())) {
            throw AppException.conflict("DUPLICATE_BLOCK", "There is already a block called " + req.name());
        }
        setup.addBlock(hostelId, req.name(), req.rooms());
        return setup.layout(hostelId);
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional
    public List<BlockView> addRooms(AuthUser me, Long blockId, String roomSpec) {
        long hostelId = me.requireHostel();
        Block block = blocks.findByIdAndHostelId(blockId, hostelId).orElseThrow(() -> AppException.notFound("Block"));
        List<String> existing = rooms.findByBlockId(blockId).stream().map(Room::getNumber).toList();
        List<Room> fresh = RoomRangeParser.parse(roomSpec).stream()
                .filter(n -> !existing.contains(n))
                .map(n -> new Room(hostelId, block, n))
                .toList();
        rooms.saveAll(fresh);
        return setup.layout(hostelId);
    }

    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public List<CategoryView> categories(AuthUser me) {
        long hostelId = me.requireHostel();
        Map<Long, Map<Priority, Integer>> sla = slaPolicies.findByHostelId(hostelId).stream()
                .collect(Collectors.groupingBy(SlaPolicy::getCategoryId,
                        Collectors.toMap(SlaPolicy::getPriority, SlaPolicy::getTargetHours,
                                (a, b) -> a, () -> new EnumMap<>(Priority.class))));
        return categories.findByHostelIdOrderByIdAsc(hostelId).stream()
                .map(c -> new CategoryView(c.getId(), c.getCode(), c.getName(), c.getCovers(), c.isActive(),
                        sla.getOrDefault(c.getId(), Map.of())))
                .toList();
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional
    public List<CategoryView> updateCategory(AuthUser me, Long categoryId, UpdateCategoryRequest req) {
        long hostelId = me.requireHostel();
        Category c = categories.findByIdAndHostelId(categoryId, hostelId)
                .orElseThrow(() -> AppException.notFound("Category"));
        c.setName(req.name().trim());
        c.setCovers(req.covers().trim());
        c.setActive(req.active());
        req.slaHours().forEach((priority, hours) -> slaPolicies
                .findByHostelIdAndCategoryIdAndPriority(hostelId, categoryId, priority)
                .ifPresentOrElse(p -> p.setTargetHours(hours),
                        () -> slaPolicies.save(new SlaPolicy(hostelId, categoryId, priority, hours))));
        return categories(me);
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional(readOnly = true)
    public List<StaffView> team(AuthUser me) {
        long hostelId = me.requireHostel();
        Map<Long, List<SkillView>> skillsByStaff = skills.findByHostelId(hostelId).stream()
                .collect(Collectors.groupingBy(StaffSkill::getStaffId,
                        Collectors.mapping(s -> new SkillView(s.getCategoryId(), s.getBlockId()), Collectors.toList())));
        return users.findByHostelIdAndRoleInOrderByNameAsc(hostelId, List.of(Role.STAFF, Role.WARDEN)).stream()
                .map(u -> new StaffView(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isActive(),
                        skillsByStaff.getOrDefault(u.getId(), List.of())))
                .toList();
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional
    public List<StaffView> setSkills(AuthUser me, Long staffId, SetSkillsRequest req) {
        long hostelId = me.requireHostel();
        AppUser staff = users.findByIdAndHostelId(staffId, hostelId)
                .filter(u -> u.getRole() == Role.STAFF)
                .orElseThrow(() -> AppException.notFound("Staff member"));
        for (SkillInput s : req.skills()) {
            categories.findByIdAndHostelId(s.categoryId(), hostelId).orElseThrow(() -> AppException.notFound("Category"));
            if (s.blockId() != null) {
                blocks.findByIdAndHostelId(s.blockId(), hostelId).orElseThrow(() -> AppException.notFound("Block"));
            }
        }
        skills.deleteByHostelIdAndStaffId(hostelId, staff.getId());
        skills.flush();
        req.skills().stream().distinct()
                .forEach(s -> skills.save(new StaffSkill(hostelId, staff.getId(), s.categoryId(), s.blockId())));
        return team(me);
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional
    public List<StaffView> setActive(AuthUser me, Long userId, boolean active) {
        long hostelId = me.requireHostel();
        if (userId == me.userId()) {
            throw AppException.badRequest("SELF", "You can't deactivate yourself");
        }
        users.findByIdAndHostelId(userId, hostelId).orElseThrow(() -> AppException.notFound("Member")).setActive(active);
        return team(me);
    }

    private Hostel hostel(AuthUser me) {
        return hostels.findById(me.requireHostel()).orElseThrow(() -> AppException.notFound("Hostel"));
    }

    private HostelSettings toSettings(Hostel h) {
        return new HostelSettings(h.getId(), h.getName(), h.getKind(), h.getResidentInviteCode(),
                h.getStaffInviteCode(), users.countByHostelId(h.getId()));
    }
}
