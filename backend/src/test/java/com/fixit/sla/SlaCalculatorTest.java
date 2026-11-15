package com.fixit.sla;

import static org.assertj.core.api.Assertions.assertThat;

import com.fixit.ticket.Priority;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SlaCalculatorTest {

    private final SlaCalculator calc = new SlaCalculator();
    private final Instant created = Instant.parse("2026-11-10T08:00:00Z");

    @Test
    void usesHostelConfiguredHoursWhenPresent() {
        assertThat(calc.dueAt(created, Priority.NORMAL, Optional.of(6)))
                .isEqualTo(Instant.parse("2026-11-10T14:00:00Z"));
    }

    @Test
    void fallsBackToDefaultsPerPriority() {
        assertThat(calc.dueAt(created, Priority.URGENT, Optional.empty())).isEqualTo(created.plusSeconds(4 * 3600));
        assertThat(calc.dueAt(created, Priority.NORMAL, Optional.empty())).isEqualTo(created.plusSeconds(24 * 3600));
        assertThat(calc.dueAt(created, Priority.LOW, Optional.empty())).isEqualTo(created.plusSeconds(72 * 3600));
    }

    @Test
    void breachedOnlyAfterTheDueMoment() {
        Instant due = created.plusSeconds(3600);
        assertThat(calc.isBreached(due, due)).isFalse();
        assertThat(calc.isBreached(due, due.plusSeconds(1))).isTrue();
        assertThat(calc.isBreached(due, due.minusSeconds(1))).isFalse();
    }
}
