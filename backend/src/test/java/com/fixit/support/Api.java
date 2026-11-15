package com.fixit.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fixit.security.AuthCookies;
import com.fixit.security.AuthUser;
import com.fixit.security.JwtService;
import com.fixit.user.Role;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Drives the real HTTP API through MockMvc, so tests go through filters, security and validation. */
@Component
public class Api {

    /** A signed-in person. The cookie holds a real JWT, checked by the real filter. */
    public record Actor(long id, Long hostelId, Role role, String email) {
        public Actor in(long hostelId, Role role) {
            return new Actor(id, hostelId, role, email);
        }
    }

    /** A hostel set up through the API: one warden, one staff member handling everything, two residents. */
    public record World(long hostelId, Actor warden, Actor staff, Actor resident, Actor neighbour,
                        String residentCode, String staffCode, Map<String, Long> categories,
                        List<Long> blockIds, List<Long> roomIds) {}

    private final MockMvc mvc;
    private final JwtService jwt;
    private final ObjectMapper json;

    public Api(MockMvc mvc, JwtService jwt, ObjectMapper json) {
        this.mvc = mvc;
        this.jwt = jwt;
        this.json = json;
    }

    public Cookie cookieFor(Actor a) {
        boolean admin = a.email().equals("root@fixit.test");
        return new Cookie(AuthCookies.ACCESS, jwt.issue(new AuthUser(a.id(), a.hostelId(), a.role(), admin)));
    }

    public Actor signUp(String name, String email) throws Exception {
        JsonNode me = read(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("name", name, "email", email, "password", "correct-horse-1"))))
                .andReturn());
        return new Actor(me.get("id").asLong(), null, null, email);
    }

    public World world(String tag) throws Exception {
        Actor warden = signUp("Warden " + tag, "warden-" + tag + "@fixit.test");
        JsonNode me = read(perform(warden, post("/api/hostels"), Map.of("name", "Hostel " + tag, "kind", "HOSTEL",
                "blocks", List.of(Map.of("name", "A", "rooms", "101-104"), Map.of("name", "B", "rooms", "201-204")))));
        long hostelId = me.get("hostel").get("id").asLong();
        warden = warden.in(hostelId, Role.WARDEN);

        JsonNode settings = read(perform(warden, get("/api/hostel"), null));
        String residentCode = settings.get("residentInviteCode").asText();
        String staffCode = settings.get("staffInviteCode").asText();

        JsonNode layout = read(perform(warden, get("/api/hostel/layout"), null));
        List<Long> blockIds = new ArrayList<>();
        List<Long> roomIds = new ArrayList<>();
        layout.forEach(b -> {
            blockIds.add(b.get("id").asLong());
            b.get("rooms").forEach(r -> roomIds.add(r.get("id").asLong()));
        });

        Map<String, Long> categories = new java.util.LinkedHashMap<>();
        read(perform(warden, get("/api/hostel/categories"), null))
                .forEach(c -> categories.put(c.get("code").asText(), c.get("id").asLong()));

        Actor staff = join(signUp("Staff " + tag, "staff-" + tag + "@fixit.test"), staffCode, null).in(hostelId, Role.STAFF);
        List<Map<String, Object>> skills = categories.values().stream()
                .map(id -> Map.<String, Object>of("categoryId", id)).toList();
        perform(warden, put("/api/hostel/team/" + staff.id() + "/skills"), Map.of("skills", skills));

        Actor resident = join(signUp("Resident " + tag, "res-" + tag + "@fixit.test"), residentCode, roomIds.get(0))
                .in(hostelId, Role.RESIDENT);
        Actor neighbour = join(signUp("Neighbour " + tag, "nb-" + tag + "@fixit.test"), residentCode, roomIds.get(1))
                .in(hostelId, Role.RESIDENT);
        return new World(hostelId, warden, staff, resident, neighbour, residentCode, staffCode, categories, blockIds, roomIds);
    }

    public Actor join(Actor a, String code, Long roomId) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("code", code);
        body.put("roomId", roomId);
        perform(a, post("/api/hostels/join"), body).andReturn();
        return a;
    }

    /** Raises a room ticket in the resident's own room (or a common-area one when blockId is given). */
    public ResultActions raise(Actor a, long categoryId, Long blockId, boolean confirmDuplicate, String idempotencyKey,
                               MockMultipartFile... photos) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("categoryId", categoryId);
        body.put("commonArea", blockId != null);
        body.put("blockId", blockId);
        body.put("description", "Tap in the washroom keeps dripping all night");
        body.put("priority", "NORMAL");
        body.put("confirmDuplicate", confirmDuplicate);
        var req = multipart("/api/tickets")
                .file(new MockMultipartFile("ticket", "", MediaType.APPLICATION_JSON_VALUE, json.writeValueAsBytes(body)));
        for (MockMultipartFile p : photos) {
            req.file(p);
        }
        if (idempotencyKey != null) {
            req.header("Idempotency-Key", idempotencyKey);
        }
        return mvc.perform(req.cookie(cookieFor(a)).with(csrf()));
    }

    public JsonNode raiseOk(Actor a, long categoryId, Long blockId) throws Exception {
        MvcResult r = raise(a, categoryId, blockId, true, null).andReturn();
        if (r.getResponse().getStatus() >= 300) {
            throw new AssertionError("Raise failed: " + r.getResponse().getContentAsString());
        }
        return read(r);
    }

    public ResultActions transition(Actor a, long ticketId, String action, long version, Integer rating) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("action", action);
        body.put("version", version);
        body.put("rating", rating);
        return perform(a, post("/api/tickets/" + ticketId + "/transitions"), body);
    }

    public ResultActions perform(Actor a, MockHttpServletRequestBuilder req, Object body) throws Exception {
        req.cookie(cookieFor(a)).with(csrf());
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        }
        return mvc.perform(req);
    }

    public JsonNode read(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    public JsonNode read(ResultActions actions) throws Exception {
        return read(actions.andReturn());
    }

    public MockMvc mvc() {
        return mvc;
    }
}
