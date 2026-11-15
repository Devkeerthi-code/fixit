package com.fixit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fixit.security.AuthCookies;
import com.fixit.support.Api;
import com.fixit.support.Api.World;
import com.fixit.support.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

class SecurityRulesIT extends IntegrationTest {

    @Autowired Api api;
    World w;

    @BeforeEach
    void setUp() throws Exception {
        w = api.world("s");
    }

    @Test
    void anonymousCallsGet401WithTheStandardErrorBody() throws Exception {
        api.mvc().perform(get("/api/tickets"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void expiredOrTamperedTokensAreRejected() throws Exception {
        Cookie valid = api.cookieFor(w.resident());
        api.mvc().perform(get("/api/me").cookie(new Cookie(AuthCookies.ACCESS, valid.getValue() + "x")))
                .andExpect(status().isUnauthorized());
        clock.advance(Duration.ofMinutes(16));
        api.mvc().perform(get("/api/me").cookie(valid)).andExpect(status().isUnauthorized());
    }

    @Test
    void stateChangingRequestsNeedTheCsrfToken() throws Exception {
        api.mvc().perform(post("/api/notifications/read").cookie(api.cookieFor(w.resident())))
                .andExpect(status().isForbidden());
    }

    @Test
    void residentsAndStaffCannotUseWardenTools() throws Exception {
        for (Api.Actor notWarden : new Api.Actor[]{w.resident(), w.staff()}) {
            api.perform(notWarden, get("/api/dashboard"), null).andExpect(status().isForbidden());
            api.perform(notWarden, get("/api/hostel"), null).andExpect(status().isForbidden());
            api.perform(notWarden, get("/api/hostel/team"), null).andExpect(status().isForbidden());
            api.perform(notWarden, post("/api/hostel/invite-codes/rotate"), null).andExpect(status().isForbidden());
        }
    }

    @Test
    void onlyWardensReassign() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null).get("ticket");
        Map<String, Object> body = Map.of("staffId", w.staff().id(), "version", t.get("version").asLong());
        api.perform(w.staff(), post("/api/tickets/" + t.get("id").asLong() + "/assign"), body).andExpect(status().isForbidden());
        api.perform(w.resident(), post("/api/tickets/" + t.get("id").asLong() + "/assign"), body).andExpect(status().isForbidden());
    }

    @Test
    void residentsSeeTheirOwnTicketsAndCommonAreasButNotNeighboursRooms() throws Exception {
        long privateTicket = api.raiseOk(w.neighbour(), w.categories().get("PLUMBING"), null).get("ticket").get("id").asLong();
        long commonTicket = api.raiseOk(w.neighbour(), w.categories().get("WIFI"), w.blockIds().get(0)).get("ticket").get("id").asLong();

        api.perform(w.resident(), get("/api/tickets/" + privateTicket), null).andExpect(status().isNotFound());
        api.perform(w.resident(), get("/api/tickets/" + commonTicket), null).andExpect(status().isOk());

        JsonNode list = api.read(api.perform(w.resident(), get("/api/tickets"), null));
        assertThat(list.get("total").asLong()).isEqualTo(1);
        assertThat(list.get("items").get(0).get("id").asLong()).isEqualTo(commonTicket);
    }

    @Test
    void residentCannotWorkOnTickets() throws Exception {
        JsonNode t = api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null).get("ticket");
        api.transition(w.resident(), t.get("id").asLong(), "START", t.get("version").asLong(), null)
                .andExpect(status().isForbidden());
    }

    @Test
    void platformStatsOnlyForAdminEmails() throws Exception {
        api.perform(w.warden(), get("/api/platform/stats"), null).andExpect(status().isForbidden());
        Api.Actor root = api.signUp("Root", "root@fixit.test");
        api.perform(root, get("/api/platform/stats"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hostels").value(1));
    }

    @Test
    void loginRefreshRotationAndReuseDetection() throws Exception {
        var login = api.mvc().perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"res-s@fixit.test\",\"password\":\"correct-horse-1\"}"))
                .andExpect(status().isOk()).andReturn();
        Cookie firstRefresh = login.getResponse().getCookie(AuthCookies.REFRESH);
        assertThat(login.getResponse().getCookie(AuthCookies.ACCESS).isHttpOnly()).isTrue();

        var refreshed = api.mvc().perform(post("/api/auth/refresh").cookie(firstRefresh)
                        .with(csrf()))
                .andExpect(status().isOk()).andReturn();
        Cookie secondRefresh = refreshed.getResponse().getCookie(AuthCookies.REFRESH);
        assertThat(secondRefresh.getValue()).isNotEqualTo(firstRefresh.getValue());

        // replaying the first token later looks like theft: the whole family is revoked
        clock.advance(Duration.ofMinutes(1));
        api.mvc().perform(post("/api/auth/refresh").cookie(firstRefresh)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
        api.mvc().perform(post("/api/auth/refresh").cookie(secondRefresh)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordAndUnknownEmailLookTheSame() throws Exception {
        String wrong = api.mvc().perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"res-s@fixit.test\",\"password\":\"nope-nope-nope\"}"))
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String unknown = api.mvc().perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost@fixit.test\",\"password\":\"nope-nope-nope\"}"))
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        assertThat(wrong.replaceAll("\"timestamp\":\"[^\"]+\"", ""))
                .isEqualTo(unknown.replaceAll("\"timestamp\":\"[^\"]+\"", ""));
    }

    @Test
    void validationErrorsListTheFields() throws Exception {
        api.mvc().perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"email\":\"not-an-email\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.length()").value(3));
    }
}
