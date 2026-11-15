package com.fixit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fixit.support.Api;
import com.fixit.support.Api.World;
import com.fixit.support.IntegrationTest;
import com.fixit.user.Role;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class TicketLifecycleIT extends IntegrationTest {

    @Autowired Api api;
    World w;
    long plumbing;

    @BeforeEach
    void setUp() throws Exception {
        w = api.world("l");
        plumbing = w.categories().get("PLUMBING");
    }

    @Test
    void newTicketIsAutoAssignedAndTheStaffMemberIsNotified() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), plumbing, null).get("ticket");
        assertThat(t.get("status").asText()).isEqualTo("ASSIGNED");
        assertThat(t.get("assignee").get("id").asLong()).isEqualTo(w.staff().id());
        assertThat(t.get("code").asText()).isEqualTo("FX-1");

        JsonNode inbox = api.read(api.perform(w.staff(), get("/api/notifications"), null));
        assertThat(inbox.get("unread").asLong()).isEqualTo(1);
    }

    @Test
    void routesToTheLeastBusyStaffMember() throws Exception {
        Api.Actor second = api.join(api.signUp("Second", "second@fixit.test"), w.staffCode(), null).in(w.hostelId(), Role.STAFF);
        api.perform(w.warden(), put("/api/hostel/team/" + second.id() + "/skills"),
                Map.of("skills", List.of(Map.of("categoryId", plumbing)))).andExpect(status().isOk());

        List<Long> assignees = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            assignees.add(api.raiseOk(w.resident(), plumbing, null).get("ticket").get("assignee").get("id").asLong());
        }
        assertThat(assignees).filteredOn(id -> id == w.staff().id()).hasSize(2);
        assertThat(assignees).filteredOn(id -> id == second.id()).hasSize(2);
    }

    @Test
    void ticketStaysOpenAndWardenIsToldWhenNobodyHandlesTheCategory() throws Exception {
        api.perform(w.warden(), put("/api/hostel/team/" + w.staff().id() + "/skills"), Map.of("skills", List.of()));
        JsonNode t = api.raiseOk(w.resident(), plumbing, null).get("ticket");
        assertThat(t.get("status").asText()).isEqualTo("OPEN");
        JsonNode inbox = api.read(api.perform(w.warden(), get("/api/notifications"), null));
        assertThat(inbox.get("items").get(0).get("type").asText()).isEqualTo("UNASSIGNED");
    }

    @Test
    void warnsAboutDuplicatesUnlessConfirmed() throws Exception {
        api.raiseOk(w.resident(), plumbing, null);
        JsonNode dupes = api.read(api.perform(w.resident(),
                get("/api/tickets/duplicates?categoryId=" + plumbing + "&roomId=" + w.roomIds().get(0)), null));
        assertThat(dupes).hasSize(1);

        api.raise(w.resident(), plumbing, null, false, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE"));
        api.raise(w.resident(), plumbing, null, true, null).andExpect(status().isCreated());
    }

    @Test
    void sameIdempotencyKeyReturnsTheSameTicket() throws Exception {
        long first = api.read(api.raise(w.resident(), plumbing, null, true, "key-123").andExpect(status().isCreated()))
                .get("ticket").get("id").asLong();
        long again = api.read(api.raise(w.resident(), plumbing, null, true, "key-123").andExpect(status().isOk()))
                .get("ticket").get("id").asLong();
        assertThat(again).isEqualTo(first);
        assertThat(jdbc.sql("SELECT count(*) FROM ticket").query(Long.class).single()).isEqualTo(1);
    }

    @Test
    void fullLifecycleWithAuditTrail() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), plumbing, null).get("ticket");
        long id = t.get("id").asLong();

        JsonNode started = api.read(api.transition(w.staff(), id, "START", t.get("version").asLong(), null).andExpect(status().isOk()));
        assertThat(started.get("ticket").get("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(started.get("startedAt").isNull()).isFalse();

        JsonNode resolved = api.read(api.transition(w.staff(), id, "RESOLVE", started.get("ticket").get("version").asLong(), null));
        assertThat(resolved.get("ticket").get("status").asText()).isEqualTo("RESOLVED");

        long v = resolved.get("ticket").get("version").asLong();
        api.transition(w.resident(), id, "CONFIRM", v, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RATING_REQUIRED"));
        JsonNode closed = api.read(api.transition(w.resident(), id, "CONFIRM", v, 4).andExpect(status().isOk()));
        assertThat(closed.get("ticket").get("status").asText()).isEqualTo("CLOSED");
        assertThat(closed.get("rating").asInt()).isEqualTo(4);
        assertThat(closed.get("availableActions")).isEmpty();

        List<String> trail = new ArrayList<>();
        closed.get("events").forEach(e -> trail.add(e.get("type").asText() + ":" + e.get("to").asText("")));
        assertThat(trail).containsExactly("CREATED:OPEN", "ASSIGNED:ASSIGNED", "STATUS_CHANGED:IN_PROGRESS",
                "STATUS_CHANGED:RESOLVED", "STATUS_CHANGED:CLOSED");
    }

    @Test
    void illegalTransitionsAndStaleVersionsAreRejected() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), plumbing, null).get("ticket");
        long id = t.get("id").asLong();
        long v = t.get("version").asLong();

        api.transition(w.staff(), id, "RESOLVE", v, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ILLEGAL_TRANSITION"));
        api.transition(w.staff(), id, "START", v, null).andExpect(status().isOk());
        // a second staff screen still holding the old version can't overwrite the newer state
        api.transition(w.staff(), id, "START", v, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_UPDATE"));
    }

    @Test
    void reopenStartsANewSlaCycleAndGoesBackToTheSameStaff() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), plumbing, null).get("ticket");
        long id = t.get("id").asLong();
        JsonNode s = api.read(api.transition(w.staff(), id, "START", t.get("version").asLong(), null)).get("ticket");
        JsonNode r = api.read(api.transition(w.staff(), id, "RESOLVE", s.get("version").asLong(), null)).get("ticket");

        JsonNode reopened = api.read(api.transition(w.resident(), id, "REOPEN", r.get("version").asLong(), null)).get("ticket");
        assertThat(reopened.get("status").asText()).isEqualTo("ASSIGNED");
        assertThat(reopened.get("assignee").get("id").asLong()).isEqualTo(w.staff().id());
        assertThat(jdbc.sql("SELECT sla_cycle FROM ticket WHERE id = :id").param("id", id).query(Integer.class).single())
                .isEqualTo(2);
    }

    @Test
    void wardenReassignsAndBothStaffAreTold() throws Exception {
        Api.Actor second = api.join(api.signUp("Second", "second2@fixit.test"), w.staffCode(), null).in(w.hostelId(), Role.STAFF);
        JsonNode t = api.raiseOk(w.resident(), plumbing, null).get("ticket");
        JsonNode moved = api.read(api.perform(w.warden(), post("/api/tickets/" + t.get("id").asLong() + "/assign"),
                Map.of("staffId", second.id(), "version", t.get("version").asLong())).andExpect(status().isOk()));
        assertThat(moved.get("ticket").get("assignee").get("id").asLong()).isEqualTo(second.id());
        assertThat(api.read(api.perform(second, get("/api/notifications"), null)).get("unread").asLong()).isEqualTo(1);
        assertThat(api.read(api.perform(w.staff(), get("/api/notifications"), null)).get("items").get(0).get("type").asText())
                .isEqualTo("REASSIGNED");
    }

    @Test
    void affectsMeTooIsIdempotentAndUndoable() throws Exception {
        long id = api.raiseOk(w.resident(), w.categories().get("WIFI"), w.blockIds().get(0)).get("ticket").get("id").asLong();
        String url = "/api/tickets/" + id + "/affects-me";

        api.perform(w.neighbour(), post(url), null).andExpect(jsonPath("$.affectedCount").value(2));
        api.perform(w.neighbour(), post(url), null).andExpect(jsonPath("$.affectedCount").value(2));
        api.perform(w.resident(), post(url), null).andExpect(jsonPath("$.affectedCount").value(2)); // reporter already counted
        api.perform(w.neighbour(), delete(url), null)
                .andExpect(jsonPath("$.affectedCount").value(1))
                .andExpect(jsonPath("$.affectedByMe").value(false));
    }

    @Test
    void photosAreServedOnlyAsTheBytesThatWereChecked() throws Exception {
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 9, 9, 9};
        JsonNode d = api.read(api.raise(w.resident(), plumbing, null, true, null,
                new org.springframework.mock.web.MockMultipartFile("photos", "a.jpg", "image/png", jpeg)));
        long photoId = d.get("photoIds").get(0).asLong();
        var res = api.perform(w.staff(), get("/api/tickets/" + d.get("ticket").get("id").asLong() + "/photos/" + photoId), null)
                .andExpect(status().isOk()).andReturn().getResponse();
        assertThat(res.getContentType()).isEqualTo("image/jpeg");
        assertThat(res.getContentAsByteArray()).isEqualTo(jpeg);
    }
}
