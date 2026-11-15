package com.fixit.ticket;

import com.fixit.common.AppException;
import com.fixit.security.AuthUser;
import com.fixit.ticket.TicketDtos.EventView;
import com.fixit.ticket.TicketDtos.PageView;
import com.fixit.ticket.TicketDtos.SlotView;
import com.fixit.ticket.TicketDtos.TicketDetail;
import com.fixit.ticket.TicketDtos.TicketSummary;
import com.fixit.user.AppUser;
import com.fixit.user.Role;
import com.fixit.user.UserRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read side of tickets: lists, detail, duplicate checks and photos. */
@Service
@Transactional(readOnly = true)
@PreAuthorize("isAuthenticated()")
public class TicketQueryService {

    public enum SortBy { RECENT, DUE }

    private static final int MAX_PAGE_SIZE = 50;

    private final TicketRepository tickets;
    private final TicketEventRepository events;
    private final TicketPhotoRepository photos;
    private final VisitSlotRepository slots;
    private final UserRepository users;
    private final TicketAccess access;
    private final TicketMapper mapper;
    private final TicketStateMachine stateMachine;

    public TicketQueryService(TicketRepository tickets, TicketEventRepository events, TicketPhotoRepository photos,
                              VisitSlotRepository slots, UserRepository users, TicketAccess access,
                              TicketMapper mapper, TicketStateMachine stateMachine) {
        this.tickets = tickets;
        this.events = events;
        this.photos = photos;
        this.slots = slots;
        this.users = users;
        this.access = access;
        this.mapper = mapper;
        this.stateMachine = stateMachine;
    }

    public PageView<TicketSummary> list(AuthUser me, TicketFilter filter, SortBy sortBy, int page, int size) {
        Sort sort = sortBy == SortBy.DUE
                ? Sort.by(Sort.Order.asc("slaDueAt"), Sort.Order.desc("id"))
                : Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), sort);
        Page<Ticket> result = tickets.findAll(filter.toSpec(me), request);
        return new PageView<>(mapper.summaries(result.getContent(), me), result.getNumber(), result.getSize(),
                result.getTotalElements());
    }

    public TicketDetail detail(AuthUser me, Long ticketId) {
        Ticket t = access.loadVisible(me, ticketId);
        List<TicketEvent> history = events.findByTicketIdOrderByCreatedAtAscIdAsc(t.getId());
        Instant startedAt = history.stream()
                .filter(e -> e.getToStatus() == TicketStatus.IN_PROGRESS)
                .map(TicketEvent::getCreatedAt)
                .max(Comparator.naturalOrder())
                .orElse(null);
        return new TicketDetail(
                mapper.summary(t, me),
                photos.findIdsByTicketId(t.getId()),
                slots.findByTicketIdOrderByDayAscTimeWindowAsc(t.getId()).stream()
                        .map(s -> new SlotView(s.getDay(), s.getTimeWindow())).toList(),
                t.getRating() == null ? null : t.getRating().intValue(),
                t.getRatingComment(),
                t.getAssignedAt(),
                startedAt,
                t.getResolvedAt(),
                t.getClosedAt(),
                stateMachine.available(t.getStatus(), access.rolesOf(me, t)),
                history.stream().map(TicketQueryService::toView).toList());
    }

    /**
     * Before raising a room ticket: is the same category already open for that room?
     * For common areas: is the same category already open in that block (so "affects me too" instead)?
     */
    public List<TicketSummary> duplicates(AuthUser me, Long categoryId, Long roomId, Long blockId) {
        long hostelId = me.requireHostel();
        List<Ticket> found;
        if (roomId != null) {
            found = tickets.findByHostelIdAndRoomIdAndCategoryIdAndCommonAreaFalseAndStatusIn(
                    hostelId, roomId, categoryId, TicketStatus.NOT_CLOSED);
        } else if (blockId != null) {
            found = tickets.findAll(new TicketFilter(TicketStatus.NOT_CLOSED, categoryId, blockId, null,
                    false, false, false, true).toSpec(me), PageRequest.of(0, 5)).getContent();
        } else {
            throw AppException.badRequest("BAD_REQUEST", "Pass roomId or blockId");
        }
        return mapper.summaries(found.stream().filter(t -> access.canSee(me, t)).toList(), me);
    }

    public TicketPhoto photo(AuthUser me, Long ticketId, Long photoId) {
        Ticket t = access.loadVisible(me, ticketId);
        return photos.findByIdAndTicketIdAndHostelId(photoId, t.getId(), t.getHostelId())
                .orElseThrow(() -> AppException.notFound("Photo"));
    }

    /** Active staff a warden can pick when reassigning. */
    public List<TicketDtos.Ref> assignableStaff(AuthUser me) {
        return users.findByHostelIdAndRoleAndActiveTrue(me.requireHostel(), Role.STAFF).stream()
                .sorted(Comparator.comparing(AppUser::getName))
                .map(u -> new TicketDtos.Ref(u.getId(), u.getName()))
                .toList();
    }

    private static EventView toView(TicketEvent e) {
        String actor = e.getActor() == null ? "FixIt" : e.getActor().getName();
        return new EventView(e.getType().name(), e.getFromStatus(), e.getToStatus(), e.getNote(), actor, e.getCreatedAt());
    }
}
