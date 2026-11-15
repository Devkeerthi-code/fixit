package com.fixit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fixit.support.Api;
import com.fixit.support.Api.World;
import com.fixit.support.IntegrationTest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;

/**
 * Two hostels, A and B. Everyone in B tries to reach A's data through every endpoint that takes an id.
 * All must fail with 404 (not 403, so B can't even learn that the id exists).
 */
class HostelIsolationIT extends IntegrationTest {

    @Autowired Api api;

    World a;
    World b;
    long ticketA;
    long commonTicketA;
    long photoA;

    @BeforeEach
    void twoHostels() throws Exception {
        a = api.world("a");
        b = api.world("b");
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1, 2, 3, 4, 5};
        JsonNode t = api.read(api.raise(a.resident(), a.categories().get("PLUMBING"), null, true, null,
                new MockMultipartFile("photos", "tap.jpg", "image/jpeg", jpeg)));
        ticketA = t.get("ticket").get("id").asLong();
        photoA = t.get("photoIds").get(0).asLong();
        commonTicketA = api.raiseOk(a.resident(), a.categories().get("WIFI"), a.blockIds().get(0)).get("ticket").get("id").asLong();
    }

    @Test
    void ticketEndpointsReturn404AcrossHostels() throws Exception {
        for (Api.Actor intruder : List.of(b.warden(), b.staff(), b.resident())) {
            api.perform(intruder, get("/api/tickets/" + ticketA), null).andExpect(status().isNotFound());
            api.perform(intruder, get("/api/tickets/" + ticketA + "/photos/" + photoA), null).andExpect(status().isNotFound());
            api.perform(intruder, post("/api/tickets/" + commonTicketA + "/affects-me"), null).andExpect(status().isNotFound());
            api.perform(intruder, delete("/api/tickets/" + commonTicketA + "/affects-me"), null).andExpect(status().isNotFound());
            api.transition(intruder, ticketA, "START", 0, null).andExpect(status().isNotFound());
        }
        api.perform(b.warden(), post("/api/tickets/" + ticketA + "/assign"), Map.of("staffId", b.staff().id(), "version", 1))
                .andExpect(status().isNotFound());
    }

    @Test
    void wardenCannotAssignTheirTicketToAnotherHostelsStaff() throws Exception {
        long ticketB = api.raiseOk(b.resident(), b.categories().get("PLUMBING"), null).get("ticket").get("id").asLong();
        long version = api.read(api.perform(b.warden(), get("/api/tickets/" + ticketB), null)).get("ticket").get("version").asLong();
        api.perform(b.warden(), post("/api/tickets/" + ticketB + "/assign"), Map.of("staffId", a.staff().id(), "version", version))
                .andExpect(status().isNotFound());
    }

    @Test
    void listsOnlyEverShowTheCallersHostel() throws Exception {
        api.raiseOk(b.resident(), b.categories().get("ELECTRICAL"), null);
        for (Api.Actor viewer : List.of(b.warden(), b.staff())) {
            JsonNode page = api.read(api.perform(viewer, get("/api/tickets?size=50"), null));
            assertThat(page.get("total").asLong()).isEqualTo(1);
            page.get("items").forEach(t -> assertThat(t.get("id").asLong()).isNotIn(ticketA, commonTicketA));
        }
        // filtering by another hostel's block or category id just finds nothing
        JsonNode filtered = api.read(api.perform(b.warden(),
                get("/api/tickets?blockId=" + a.blockIds().get(0) + "&categoryId=" + a.categories().get("PLUMBING")), null));
        assertThat(filtered.get("total").asLong()).isZero();
    }

    @Test
    void duplicateCheckCannotProbeAnotherHostelsRooms() throws Exception {
        JsonNode found = api.read(api.perform(b.resident(), get("/api/tickets/duplicates?categoryId="
                + a.categories().get("PLUMBING") + "&roomId=" + a.roomIds().get(0)), null));
        assertThat(found).isEmpty();
    }

    @Test
    void setupEndpointsRejectAnotherHostelsIds() throws Exception {
        api.perform(b.warden(), put("/api/hostel/categories/" + a.categories().get("MESS")), Map.of(
                "name", "Mess", "covers", "x covers", "active", false, "slaHours", Map.of("LOW", 1, "NORMAL", 1, "URGENT", 1)))
                .andExpect(status().isNotFound());
        api.perform(b.warden(), put("/api/hostel/team/" + a.staff().id() + "/skills"), Map.of("skills", List.of()))
                .andExpect(status().isNotFound());
        api.perform(b.warden(), put("/api/hostel/team/" + b.staff().id() + "/skills"),
                Map.of("skills", List.of(Map.of("categoryId", a.categories().get("MESS"))))).andExpect(status().isNotFound());
        api.perform(b.warden(), post("/api/hostel/blocks/" + a.blockIds().get(0) + "/rooms"), Map.of("rooms", "999"))
                .andExpect(status().isNotFound());
        api.perform(b.warden(), put("/api/hostel/team/" + a.resident().id() + "/active"), Map.of("active", false))
                .andExpect(status().isNotFound());
        api.perform(b.resident(), patch("/api/me"), Map.of("roomId", a.roomIds().get(0))).andExpect(status().isNotFound());
    }

    @Test
    void raisingWithAnotherHostelsRoomOrCategoryFails() throws Exception {
        api.raise(b.resident(), a.categories().get("PLUMBING"), null, true, null).andExpect(status().isNotFound());
        api.raise(b.resident(), b.categories().get("WIFI"), a.blockIds().get(0), true, null).andExpect(status().isNotFound());
    }

    @Test
    void dashboardCountsOnlyTheWardensHostel() throws Exception {
        JsonNode dash = api.read(api.perform(b.warden(), get("/api/dashboard"), null));
        assertThat(dash.get("summary").get("created").asLong()).isZero();
        String csv = api.perform(b.warden(), get("/api/dashboard/export.csv"), null).andReturn().getResponse().getContentAsString();
        assertThat(csv.lines().count()).isEqualTo(1); // header only
    }
}
