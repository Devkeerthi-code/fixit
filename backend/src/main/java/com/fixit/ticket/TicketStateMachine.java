package com.fixit.ticket;

import static com.fixit.ticket.TicketStatus.ASSIGNED;
import static com.fixit.ticket.TicketStatus.CLOSED;
import static com.fixit.ticket.TicketStatus.IN_PROGRESS;
import static com.fixit.ticket.TicketStatus.OPEN;
import static com.fixit.ticket.TicketStatus.REOPENED;
import static com.fixit.ticket.TicketStatus.RESOLVED;

import com.fixit.common.AppException;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * The ticket lifecycle as data: for each action, which statuses it may start from, where it leads,
 * and who may trigger it. Anything not in this table is rejected.
 *
 * <pre>
 * OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED
 *                                       |
 *                                       +-> REOPENED -> ASSIGNED ...
 * </pre>
 */
@Component
public class TicketStateMachine {

    private record Rule(Set<TicketStatus> from, TicketStatus to, Set<ActorRole> allowedActors) {}

    private static final Map<TicketAction, Rule> RULES = new EnumMap<>(TicketAction.class);

    static {
        RULES.put(TicketAction.ASSIGN, new Rule(
                EnumSet.of(OPEN, ASSIGNED, IN_PROGRESS, REOPENED), ASSIGNED,
                EnumSet.of(ActorRole.WARDEN, ActorRole.SYSTEM)));
        RULES.put(TicketAction.START, new Rule(
                EnumSet.of(ASSIGNED), IN_PROGRESS,
                EnumSet.of(ActorRole.ASSIGNEE, ActorRole.WARDEN)));
        RULES.put(TicketAction.RESOLVE, new Rule(
                EnumSet.of(IN_PROGRESS), RESOLVED,
                EnumSet.of(ActorRole.ASSIGNEE, ActorRole.WARDEN)));
        RULES.put(TicketAction.CONFIRM, new Rule(
                EnumSet.of(RESOLVED), CLOSED,
                EnumSet.of(ActorRole.REPORTER, ActorRole.SYSTEM)));
        RULES.put(TicketAction.REOPEN, new Rule(
                EnumSet.of(RESOLVED), REOPENED,
                EnumSet.of(ActorRole.REPORTER)));
    }

    /**
     * Returns the status the ticket moves to, or throws if the move is illegal from {@code from}
     * or the actor isn't allowed to make it.
     */
    public TicketStatus next(TicketStatus from, TicketAction action, Set<ActorRole> actor) {
        Rule rule = RULES.get(action);
        if (!rule.from().contains(from)) {
            throw new AppException(HttpStatus.CONFLICT, "ILLEGAL_TRANSITION",
                    "Can't " + action.name().toLowerCase() + " a ticket that is " + describe(from));
        }
        if (Collections.disjoint(rule.allowedActors(), actor)) {
            throw AppException.forbidden("You can't " + action.name().toLowerCase() + " this ticket");
        }
        return rule.to();
    }

    /** Actions this actor could take right now. The UI uses it to show only buttons that will work. */
    public Set<TicketAction> available(TicketStatus from, Set<ActorRole> actor) {
        Set<TicketAction> result = EnumSet.noneOf(TicketAction.class);
        RULES.forEach((action, rule) -> {
            if (rule.from().contains(from) && !Collections.disjoint(rule.allowedActors(), actor)) {
                result.add(action);
            }
        });
        return result;
    }

    private static String describe(TicketStatus status) {
        return status.name().toLowerCase().replace('_', ' ');
    }
}
