package com.fixit.ticket;

import com.fixit.common.AppException;
import com.fixit.security.AuthUser;
import com.fixit.user.Role;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Object-level rules on top of the role checks:
 * wardens and staff see every ticket in their hostel; residents see their own tickets plus common-area ones.
 * A ticket you can't see is reported as 404, so its existence isn't revealed.
 */
@Component
public class TicketAccess {

    private final TicketRepository tickets;

    public TicketAccess(TicketRepository tickets) {
        this.tickets = tickets;
    }

    public Ticket loadVisible(AuthUser me, Long ticketId) {
        Ticket ticket = tickets.findByIdAndHostelId(ticketId, me.requireHostel())
                .orElseThrow(() -> AppException.notFound("Ticket"));
        if (!canSee(me, ticket)) {
            throw AppException.notFound("Ticket");
        }
        return ticket;
    }

    public boolean canSee(AuthUser me, Ticket ticket) {
        if (!Objects.equals(ticket.getHostelId(), me.hostelId())) {
            return false;
        }
        if (me.role() == Role.WARDEN || me.role() == Role.STAFF) {
            return true;
        }
        return ticket.isCommonArea() || ticket.getReporter().getId() == me.userId();
    }

    public Set<ActorRole> rolesOf(AuthUser me, Ticket ticket) {
        Set<ActorRole> roles = EnumSet.noneOf(ActorRole.class);
        if (ticket.getReporter().getId() == me.userId()) {
            roles.add(ActorRole.REPORTER);
        }
        if (ticket.getAssignee() != null && ticket.getAssignee().getId() == me.userId()) {
            roles.add(ActorRole.ASSIGNEE);
        }
        if (me.is(Role.WARDEN)) {
            roles.add(ActorRole.WARDEN);
        }
        return roles;
    }
}
