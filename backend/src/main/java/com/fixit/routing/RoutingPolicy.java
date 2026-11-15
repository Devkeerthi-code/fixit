package com.fixit.routing;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Picks who gets a new ticket: fewest open tickets wins. Ties go to whoever has waited longest
 * since their last assignment (never-assigned first), then lowest id so the result is deterministic.
 * Pure logic, no database, so it is unit-tested directly.
 */
@Component
public class RoutingPolicy {

    private static final Comparator<StaffLoad> ORDER = Comparator
            .comparingLong(StaffLoad::openTickets)
            .thenComparing(s -> s.lastAssignedAt() == null ? Instant.MIN : s.lastAssignedAt())
            .thenComparingLong(StaffLoad::staffId);

    public Optional<Long> choose(List<StaffLoad> candidates) {
        return candidates.stream().min(ORDER).map(StaffLoad::staffId);
    }
}
