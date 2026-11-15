package com.fixit.routing;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class RoutingPolicyTest {

    private final RoutingPolicy policy = new RoutingPolicy();
    private final Instant t0 = Instant.parse("2026-11-01T10:00:00Z");

    @Test
    void picksStaffWithFewestOpenTickets() {
        List<StaffLoad> staff = List.of(
                new StaffLoad(1, 5, t0),
                new StaffLoad(2, 1, t0),
                new StaffLoad(3, 3, t0));
        assertThat(policy.choose(staff)).contains(2L);
    }

    @Test
    void onATiePicksWhoeverWaitedLongestSinceLastAssignment() {
        List<StaffLoad> staff = List.of(
                new StaffLoad(1, 2, t0.plusSeconds(3600)),
                new StaffLoad(2, 2, t0));
        assertThat(policy.choose(staff)).contains(2L);
    }

    @Test
    void neverAssignedStaffComeFirstOnATie() {
        List<StaffLoad> staff = List.of(
                new StaffLoad(1, 0, t0),
                new StaffLoad(2, 0, null));
        assertThat(policy.choose(staff)).contains(2L);
    }

    @Test
    void fullTieIsBrokenByLowestIdSoTheResultIsDeterministic() {
        List<StaffLoad> staff = List.of(new StaffLoad(9, 1, t0), new StaffLoad(4, 1, t0));
        assertThat(policy.choose(staff)).contains(4L);
    }

    @Test
    void noCandidatesMeansNobody() {
        assertThat(policy.choose(List.of())).isEmpty();
    }
}
