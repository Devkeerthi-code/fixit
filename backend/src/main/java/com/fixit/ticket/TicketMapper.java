package com.fixit.ticket;

import com.fixit.hostel.Category;
import com.fixit.security.AuthUser;
import com.fixit.ticket.TicketDtos.CategoryRef;
import com.fixit.ticket.TicketDtos.Ref;
import com.fixit.ticket.TicketDtos.TicketSummary;
import com.fixit.user.AppUser;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Entity to DTO, with the "affects me too" numbers fetched for a whole page in two queries. */
@Component
public class TicketMapper {

    private final AffectedRepository affected;
    private final Clock clock;

    public TicketMapper(AffectedRepository affected, Clock clock) {
        this.affected = affected;
        this.clock = clock;
    }

    public List<TicketSummary> summaries(List<Ticket> tickets, AuthUser me) {
        List<Long> commonIds = tickets.stream().filter(Ticket::isCommonArea).map(Ticket::getId).toList();
        Map<Long, Long> counts = affected.countByTicket(commonIds);
        Set<Long> mine = affected.ticketsAffectingUser(commonIds, me.userId());
        return tickets.stream()
                .map(t -> summary(t, counts.getOrDefault(t.getId(), 0L), mine.contains(t.getId())))
                .toList();
    }

    public TicketSummary summary(Ticket t, AuthUser me) {
        return summaries(List.of(t), me).getFirst();
    }

    /** affectedCount includes the reporter, so a fresh common-area ticket shows "1 affected". */
    private TicketSummary summary(Ticket t, long othersAffected, boolean affectedByMe) {
        Category c = t.getCategory();
        Instant now = Instant.now(clock);
        boolean breached = t.getSlaBreachedAt() != null || (t.getStatus().isActive() && now.isAfter(t.getSlaDueAt()));
        return new TicketSummary(
                t.getId(),
                t.code(),
                new CategoryRef(c.getId(), c.getCode(), c.getName()),
                new Ref(t.getBlock().getId(), t.getBlock().getName()),
                t.getRoom() == null ? null : t.getRoom().label(),
                t.isCommonArea(),
                t.getLocationNote(),
                t.getDescription(),
                t.getPriority(),
                t.getStatus(),
                ref(t.getReporter()),
                ref(t.getAssignee()),
                t.getCreatedAt(),
                t.getSlaDueAt(),
                breached,
                t.isCommonArea() ? othersAffected + 1 : 0,
                affectedByMe,
                t.getVersion());
    }

    private static Ref ref(AppUser user) {
        return user == null ? null : new Ref(user.getId(), user.getName());
    }
}
