package com.fixit.sla;

import com.fixit.ticket.Priority;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Works out when a ticket is due. Hostels can override targets per category; these are the defaults. */
@Component
public class SlaCalculator {

    public static final Map<Priority, Integer> DEFAULT_TARGET_HOURS = Map.of(
            Priority.URGENT, 4,
            Priority.NORMAL, 24,
            Priority.LOW, 72);

    public Instant dueAt(Instant from, Priority priority, Optional<Integer> configuredHours) {
        int hours = configuredHours.orElse(DEFAULT_TARGET_HOURS.get(priority));
        return from.plus(Duration.ofHours(hours));
    }

    public boolean isBreached(Instant dueAt, Instant now) {
        return now.isAfter(dueAt);
    }
}
