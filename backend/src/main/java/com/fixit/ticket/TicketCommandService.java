package com.fixit.ticket;

import com.fixit.common.AppException;
import com.fixit.hostel.Block;
import com.fixit.hostel.BlockRepository;
import com.fixit.hostel.Category;
import com.fixit.hostel.CategoryRepository;
import com.fixit.hostel.Room;
import com.fixit.hostel.RoomRepository;
import com.fixit.hostel.SlaPolicy;
import com.fixit.hostel.SlaPolicyRepository;
import com.fixit.notification.NotificationService;
import com.fixit.routing.RoutingService;
import com.fixit.security.AuthUser;
import com.fixit.sla.SlaCalculator;
import com.fixit.ticket.PhotoValidator.ValidPhoto;
import com.fixit.ticket.TicketDtos.AffectedView;
import com.fixit.ticket.TicketDtos.AssignRequest;
import com.fixit.ticket.TicketDtos.CreateTicketRequest;
import com.fixit.ticket.TicketDtos.TransitionRequest;
import com.fixit.usage.UsageService;
import com.fixit.user.AppUser;
import com.fixit.user.Role;
import com.fixit.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Write side of tickets. Every change goes through the state machine and leaves an audit event. */
@Service
public class TicketCommandService {

    public record Created(Long ticketId, boolean replayed) {}

    private final TicketRepository tickets;
    private final TicketEventRepository events;
    private final TicketPhotoRepository photos;
    private final VisitSlotRepository slots;
    private final AffectedRepository affected;
    private final CategoryRepository categories;
    private final BlockRepository blocks;
    private final RoomRepository rooms;
    private final SlaPolicyRepository slaPolicies;
    private final UserRepository users;
    private final TicketAccess access;
    private final TicketStateMachine stateMachine;
    private final TicketNumbers numbers;
    private final PhotoValidator photoValidator;
    private final RoutingService routing;
    private final SlaCalculator sla;
    private final NotificationService notifications;
    private final UsageService usage;
    private final Clock clock;

    public TicketCommandService(TicketRepository tickets, TicketEventRepository events, TicketPhotoRepository photos,
                                VisitSlotRepository slots, AffectedRepository affected, CategoryRepository categories,
                                BlockRepository blocks, RoomRepository rooms, SlaPolicyRepository slaPolicies,
                                UserRepository users, TicketAccess access, TicketStateMachine stateMachine,
                                TicketNumbers numbers, PhotoValidator photoValidator, RoutingService routing,
                                SlaCalculator sla, NotificationService notifications, UsageService usage, Clock clock) {
        this.tickets = tickets;
        this.events = events;
        this.photos = photos;
        this.slots = slots;
        this.affected = affected;
        this.categories = categories;
        this.blocks = blocks;
        this.rooms = rooms;
        this.slaPolicies = slaPolicies;
        this.users = users;
        this.access = access;
        this.stateMachine = stateMachine;
        this.numbers = numbers;
        this.photoValidator = photoValidator;
        this.routing = routing;
        this.sla = sla;
        this.notifications = notifications;
        this.usage = usage;
        this.clock = clock;
    }

    @PreAuthorize("isAuthenticated()")
    @Transactional
    public Created create(AuthUser me, CreateTicketRequest req, List<MultipartFile> files, String idempotencyKey) {
        long hostelId = me.requireHostel();
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Ticket> replay = tickets.findByReporterIdAndIdempotencyKey(me.userId(), idempotencyKey);
            if (replay.isPresent()) {
                return new Created(replay.get().getId(), true);
            }
        }
        AppUser reporter = users.findWithHostelById(me.userId()).orElseThrow(() -> AppException.notFound("User"));
        Category category = categories.findByIdAndHostelId(req.categoryId(), hostelId)
                .filter(Category::isActive)
                .orElseThrow(() -> AppException.notFound("Category"));
        Location location = resolveLocation(req, reporter, hostelId);
        if (!req.confirmDuplicate()) {
            rejectDuplicate(me, req, location);
        }
        List<ValidPhoto> validPhotos = photoValidator.validate(files);

        Instant now = Instant.now(clock);
        Ticket ticket = tickets.save(new Ticket(hostelId, numbers.next(hostelId), reporter, category, location.block(),
                location.room(), req.commonArea(), blankToNull(req.locationNote()), req.description().trim(),
                req.priority(), dueAt(hostelId, category.getId(), req.priority(), now),
                blankToNull(idempotencyKey), now));
        events.save(new TicketEvent(ticket, reporter, TicketEvent.Type.CREATED, null, TicketStatus.OPEN, null, now));
        saveSlots(ticket, req);
        validPhotos.forEach(p -> photos.save(new TicketPhoto(ticket.getId(), hostelId, p.contentType(), p.bytes())));
        autoAssign(ticket, now);
        usage.record(UsageService.Action.TICKET_CREATED);
        return new Created(ticket.getId(), false);
    }

    @PreAuthorize("isAuthenticated()")
    @Transactional
    public void transition(AuthUser me, Long ticketId, TransitionRequest req) {
        if (req.action() == TicketAction.ASSIGN) {
            throw AppException.badRequest("USE_ASSIGN", "Use the assign endpoint to assign a ticket");
        }
        Ticket ticket = access.loadVisible(me, ticketId);
        ensureFresh(ticket, req.version());
        TicketStatus from = ticket.getStatus();
        TicketStatus to = stateMachine.next(from, req.action(), access.rolesOf(me, ticket));
        Instant now = Instant.now(clock);
        AppUser actor = users.getReferenceById(me.userId());

        if (req.action() == TicketAction.CONFIRM) {
            if (req.rating() == null) {
                throw AppException.badRequest("RATING_REQUIRED", "Rate the fix from 1 to 5 stars");
            }
            ticket.rate(req.rating(), blankToNull(req.note()));
        }
        ticket.moveTo(to, now);
        events.save(new TicketEvent(ticket, actor, TicketEvent.Type.STATUS_CHANGED, from, to, blankToNull(req.note()), now));
        afterTransition(ticket, req, now);
    }

    @PreAuthorize("hasRole('WARDEN')")
    @Transactional
    public void assign(AuthUser me, Long ticketId, AssignRequest req) {
        Ticket ticket = access.loadVisible(me, ticketId);
        ensureFresh(ticket, req.version());
        AppUser staff = users.findByIdAndHostelId(req.staffId(), ticket.getHostelId())
                .filter(u -> u.getRole() == Role.STAFF && u.isActive())
                .orElseThrow(() -> AppException.notFound("Staff member"));
        AppUser previous = ticket.getAssignee();
        TicketStatus from = ticket.getStatus();
        TicketStatus to = stateMachine.next(from, TicketAction.ASSIGN, EnumSet.of(ActorRole.WARDEN));
        Instant now = Instant.now(clock);
        ticket.assignTo(staff);
        ticket.moveTo(to, now);
        events.save(new TicketEvent(ticket, users.getReferenceById(me.userId()), TicketEvent.Type.ASSIGNED, from, to,
                "Assigned to " + staff.getName(), now));
        notifications.notify(staff.getId(), ticket.getHostelId(), ticket.getId(), "ASSIGNED",
                ticket.code() + " assigned to you: " + place(ticket));
        if (previous != null && !Objects.equals(previous.getId(), staff.getId())) {
            notifications.notify(previous.getId(), ticket.getHostelId(), ticket.getId(), "REASSIGNED",
                    ticket.code() + " was moved to " + staff.getName());
        }
    }

    @PreAuthorize("hasRole('RESIDENT') or hasRole('STAFF') or hasRole('WARDEN')")
    @Transactional
    public AffectedView setAffected(AuthUser me, Long ticketId, boolean affectsMe) {
        Ticket ticket = access.loadVisible(me, ticketId);
        if (!ticket.isCommonArea()) {
            throw AppException.badRequest("NOT_COMMON", "Only common-area issues can be shared");
        }
        boolean reporter = ticket.getReporter().getId() == me.userId();
        if (!reporter) {
            if (affectsMe && ticket.getStatus() != TicketStatus.CLOSED && affected.add(ticket.getId(), me.userId())) {
                events.save(new TicketEvent(ticket, users.getReferenceById(me.userId()), TicketEvent.Type.AFFECTS_ME,
                        null, null, null, Instant.now(clock)));
                usage.record(UsageService.Action.AFFECTS_ME);
            } else if (!affectsMe) {
                affected.remove(ticket.getId(), me.userId());
            }
        }
        long others = affected.countByTicket(List.of(ticket.getId())).getOrDefault(ticket.getId(), 0L);
        boolean mine = reporter || affected.ticketsAffectingUser(List.of(ticket.getId()), me.userId()).contains(ticket.getId());
        return new AffectedView(others + 1, mine);
    }

    private void afterTransition(Ticket ticket, TransitionRequest req, Instant now) {
        Long hostelId = ticket.getHostelId();
        Long reporterId = ticket.getReporter().getId();
        Long assigneeId = ticket.getAssignee() == null ? null : ticket.getAssignee().getId();
        switch (req.action()) {
            case START -> notifications.notify(reporterId, hostelId, ticket.getId(), "ON_THE_WAY",
                    assigneeName(ticket) + " is on the way for " + ticket.code());
            case RESOLVE -> notifications.notify(reporterId, hostelId, ticket.getId(), "RESOLVED",
                    ticket.code() + " is marked fixed. Please confirm it really is.");
            case CONFIRM -> {
                notifications.notify(assigneeId, hostelId, ticket.getId(), "CONFIRMED",
                        "Resident confirmed " + ticket.code() + " (" + req.rating() + "/5)");
                usage.record(UsageService.Action.TICKET_CLOSED);
            }
            case REOPEN -> reopen(ticket, now);
            default -> { }
        }
    }

    /** "Not fixed": new SLA cycle, and back to the same person if they're still around. */
    private void reopen(Ticket ticket, Instant now) {
        ticket.startNewSlaCycle(dueAt(ticket.getHostelId(), ticket.getCategory().getId(), ticket.getPriority(), now));
        AppUser previous = ticket.getAssignee();
        if (previous != null && previous.isActive()) {
            assignBySystem(ticket, previous, now, "Back to " + previous.getName() + " after the resident reopened it");
        } else {
            autoAssign(ticket, now);
        }
        notifications.notifyWardens(ticket.getHostelId(), ticket.getId(), "REOPENED",
                ticket.code() + " was reopened: the resident says it isn't fixed");
    }

    private void autoAssign(Ticket ticket, Instant now) {
        Optional<AppUser> staff = routing.pickStaff(ticket.getHostelId(), ticket.getCategory().getId(), ticket.getBlock().getId());
        if (staff.isPresent()) {
            assignBySystem(ticket, staff.get(), now, "Auto-assigned to " + staff.get().getName());
        } else {
            notifications.notifyWardens(ticket.getHostelId(), ticket.getId(), "UNASSIGNED",
                    ticket.code() + " needs someone: no staff handle " + ticket.getCategory().getName()
                            + " in " + ticket.getBlock().getName());
        }
    }

    private void assignBySystem(Ticket ticket, AppUser staff, Instant now, String note) {
        TicketStatus from = ticket.getStatus();
        TicketStatus to = stateMachine.next(from, TicketAction.ASSIGN, Set.of(ActorRole.SYSTEM));
        ticket.assignTo(staff);
        ticket.moveTo(to, now);
        events.save(new TicketEvent(ticket, null, TicketEvent.Type.ASSIGNED, from, to, note, now));
        notifications.notify(staff.getId(), ticket.getHostelId(), ticket.getId(), "ASSIGNED",
                ticket.code() + " assigned to you: " + place(ticket));
    }

    private record Location(Block block, Room room) {}

    private Location resolveLocation(CreateTicketRequest req, AppUser reporter, long hostelId) {
        if (req.commonArea()) {
            if (req.blockId() == null) {
                throw AppException.badRequest("BLOCK_REQUIRED", "Pick the block for this common-area issue");
            }
            Block block = blocks.findByIdAndHostelId(req.blockId(), hostelId).orElseThrow(() -> AppException.notFound("Block"));
            return new Location(block, null);
        }
        Long roomId = req.roomId() != null ? req.roomId() : (reporter.getRoom() == null ? null : reporter.getRoom().getId());
        if (roomId == null) {
            throw AppException.badRequest("ROOM_REQUIRED", "Add your room to your profile, or pick a room");
        }
        Room room = rooms.findByIdAndHostelId(roomId, hostelId).orElseThrow(() -> AppException.notFound("Room"));
        return new Location(room.getBlock(), room);
    }

    private void rejectDuplicate(AuthUser me, CreateTicketRequest req, Location location) {
        if (location.room() != null) {
            tickets.findByHostelIdAndRoomIdAndCategoryIdAndCommonAreaFalseAndStatusIn(me.requireHostel(),
                            location.room().getId(), req.categoryId(), TicketStatus.NOT_CLOSED)
                    .stream().findFirst()
                    .ifPresent(t -> {
                        throw AppException.conflict("DUPLICATE", "There's already an open "
                                + t.getCategory().getName() + " ticket for " + location.room().label() + " (" + t.code() + ")");
                    });
        }
    }

    private void saveSlots(Ticket ticket, CreateTicketRequest req) {
        if (req.visitSlots() == null) {
            return;
        }
        req.visitSlots().stream().distinct()
                .forEach(s -> slots.save(new VisitSlot(ticket.getId(), s.day(), s.window())));
    }

    private Instant dueAt(long hostelId, long categoryId, Priority priority, Instant from) {
        Optional<Integer> hours = slaPolicies.findByHostelIdAndCategoryIdAndPriority(hostelId, categoryId, priority)
                .map(SlaPolicy::getTargetHours);
        return sla.dueAt(from, priority, hours);
    }

    /** Client sends the version it saw; if the ticket moved on since, refuse instead of silently overwriting. */
    private static void ensureFresh(Ticket ticket, Long clientVersion) {
        if (!Objects.equals(ticket.getVersion(), clientVersion)) {
            throw AppException.conflict("STALE_UPDATE", "Someone else updated this ticket a moment ago. Refresh to see the latest.");
        }
    }

    private static String place(Ticket t) {
        String where = t.getRoom() != null ? t.getRoom().label() : t.getBlock().getName() + " common area";
        return t.getCategory().getName() + " in " + where;
    }

    private static String assigneeName(Ticket t) {
        return t.getAssignee() == null ? "Staff" : t.getAssignee().getName();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
