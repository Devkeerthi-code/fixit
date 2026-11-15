package com.fixit.ticket;

import java.util.EnumSet;
import java.util.Set;

public enum TicketStatus {
    OPEN,
    ASSIGNED,
    IN_PROGRESS,
    RESOLVED,
    CLOSED,
    REOPENED;

    /** Statuses where work is still owed to the resident, so the SLA clock is running. */
    public static final Set<TicketStatus> ACTIVE = EnumSet.of(OPEN, ASSIGNED, IN_PROGRESS, REOPENED);

    /** Everything that is not finished: active work plus "fixed, waiting for the resident to confirm". */
    public static final Set<TicketStatus> NOT_CLOSED = EnumSet.of(OPEN, ASSIGNED, IN_PROGRESS, REOPENED, RESOLVED);

    public boolean isActive() {
        return ACTIVE.contains(this);
    }
}
