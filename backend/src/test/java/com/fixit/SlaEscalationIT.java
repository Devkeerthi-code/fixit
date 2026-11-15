package com.fixit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.fasterxml.jackson.databind.JsonNode;
import com.fixit.sla.SlaEscalationService;
import com.fixit.support.Api;
import com.fixit.support.Api.World;
import com.fixit.support.IntegrationTest;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class SlaEscalationIT extends IntegrationTest {

    @Autowired Api api;
    @Autowired SlaEscalationService sla;
    World w;

    @BeforeEach
    void setUp() throws Exception {
        w = api.world("sla");
    }

    private long countWardenNotices() {
        return jdbc.sql("SELECT count(*) FROM notification WHERE user_id = :u AND type = 'SLA_BREACHED'")
                .param("u", w.warden().id()).query(Long.class).single();
    }

    @Test
    void escalatesAnOverdueTicketExactlyOnce() throws Exception {
        long id = api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null).get("ticket").get("id").asLong();

        assertThat(sla.escalateOverdue()).isZero(); // not due yet

        clock.advance(Duration.ofHours(25)); // NORMAL priority default is 24h
        assertThat(sla.escalateOverdue()).isEqualTo(1);
        assertThat(sla.escalateOverdue()).isZero();
        assertThat(sla.escalateOverdue()).isZero();

        assertThat(countWardenNotices()).isEqualTo(1);
        assertThat(jdbc.sql("SELECT count(*) FROM escalation WHERE ticket_id = :id").param("id", id).query(Long.class).single())
                .isEqualTo(1);
        JsonNode detail = api.read(api.perform(w.warden(), get("/api/tickets/" + id), null));
        assertThat(detail.get("ticket").get("slaBreached").asBoolean()).isTrue();
        assertThat(detail.get("events").get(detail.get("events").size() - 1).get("type").asText()).isEqualTo("SLA_BREACHED");
    }

    @Test
    void breachMarkingDoesNotBumpTheVersionStaffAreHolding() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null).get("ticket");
        clock.advance(Duration.ofHours(25));
        sla.escalateOverdue();
        // staff's screen still has the pre-escalation version, and the update still goes through
        api.transition(w.staff(), t.get("id").asLong(), "START", t.get("version").asLong(), null)
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
    }

    @Test
    void aReopenedTicketCanBeEscalatedAgainInItsNewCycle() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null).get("ticket");
        long id = t.get("id").asLong();
        clock.advance(Duration.ofHours(25));
        assertThat(sla.escalateOverdue()).isEqualTo(1);

        JsonNode s = api.read(api.transition(w.staff(), id, "START", t.get("version").asLong(), null)).get("ticket");
        JsonNode r = api.read(api.transition(w.staff(), id, "RESOLVE", s.get("version").asLong(), null)).get("ticket");
        api.transition(w.resident(), id, "REOPEN", r.get("version").asLong(), null);

        clock.advance(Duration.ofHours(25));
        assertThat(sla.escalateOverdue()).isEqualTo(1);
        assertThat(countWardenNotices()).isEqualTo(2);
    }

    @Test
    void resolvedTicketsAutoCloseAfter72Hours() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null).get("ticket");
        long id = t.get("id").asLong();
        JsonNode s = api.read(api.transition(w.staff(), id, "START", t.get("version").asLong(), null)).get("ticket");
        api.transition(w.staff(), id, "RESOLVE", s.get("version").asLong(), null);

        clock.advance(Duration.ofHours(71));
        assertThat(sla.autoCloseResolved()).isZero();
        clock.advance(Duration.ofHours(2));
        assertThat(sla.autoCloseResolved()).isEqualTo(1);
        assertThat(sla.autoCloseResolved()).isZero();
        assertThat(api.read(api.perform(w.resident(), get("/api/tickets/" + id), null)).get("ticket").get("status").asText())
                .isEqualTo("CLOSED");
    }
}
