package com.fixit.hostel;

import com.fixit.auth.SessionService;
import com.fixit.common.AppException;
import com.fixit.hostel.HostelDtos.ActiveRequest;
import com.fixit.hostel.HostelDtos.BlockInput;
import com.fixit.hostel.HostelDtos.BlockView;
import com.fixit.hostel.HostelDtos.CategoryView;
import com.fixit.hostel.HostelDtos.CodeRequest;
import com.fixit.hostel.HostelDtos.CreateHostelRequest;
import com.fixit.hostel.HostelDtos.HostelLookup;
import com.fixit.hostel.HostelDtos.HostelSettings;
import com.fixit.hostel.HostelDtos.JoinRequest;
import com.fixit.hostel.HostelDtos.RoomsRequest;
import com.fixit.hostel.HostelDtos.SetSkillsRequest;
import com.fixit.hostel.HostelDtos.StaffView;
import com.fixit.hostel.HostelDtos.UpdateCategoryRequest;
import com.fixit.hostel.HostelDtos.UpdateHostelRequest;
import com.fixit.security.AuthUser;
import com.fixit.user.AppUser;
import com.fixit.user.MeView;
import com.fixit.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Hostel", description = "Create or join a hostel, and warden setup: blocks, rooms, categories, SLAs, staff")
public class HostelController {

    private final HostelSetupService setup;
    private final HostelAdminService admin;
    private final SessionService sessions;
    private final UserRepository users;

    public HostelController(HostelSetupService setup, HostelAdminService admin, SessionService sessions,
                            UserRepository users) {
        this.setup = setup;
        this.admin = admin;
        this.sessions = sessions;
        this.users = users;
    }

    @PostMapping("/api/hostels")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Set up a new hostel; you become its warden")
    public MeView create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody CreateHostelRequest req,
                         HttpServletResponse res) {
        AppUser user = setup.create(me, req);
        return refreshedSession(user.getId(), res);
    }

    @PostMapping("/api/hostels/lookup")
    @Operation(summary = "Check an invite code before joining (shows hostel name and rooms)")
    public HostelLookup lookup(@Valid @RequestBody CodeRequest req) {
        return setup.lookup(req.code());
    }

    @PostMapping("/api/hostels/join")
    @Operation(summary = "Join a hostel with an invite code")
    public MeView join(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody JoinRequest req,
                       HttpServletResponse res) {
        AppUser user = setup.join(me, req);
        return refreshedSession(user.getId(), res);
    }

    @GetMapping("/api/hostel")
    public HostelSettings settings(@AuthenticationPrincipal AuthUser me) {
        return admin.settings(me);
    }

    @PutMapping("/api/hostel")
    public HostelSettings update(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody UpdateHostelRequest req) {
        return admin.update(me, req);
    }

    @PostMapping("/api/hostel/invite-codes/rotate")
    @Operation(summary = "Issue new invite codes; old ones stop working")
    public HostelSettings rotateCodes(@AuthenticationPrincipal AuthUser me) {
        return admin.rotateCodes(me);
    }

    @GetMapping("/api/hostel/layout")
    public List<BlockView> layout(@AuthenticationPrincipal AuthUser me) {
        return admin.layout(me);
    }

    @PostMapping("/api/hostel/blocks")
    public List<BlockView> addBlock(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody BlockInput req) {
        return admin.addBlock(me, req);
    }

    @PostMapping("/api/hostel/blocks/{blockId}/rooms")
    @Operation(summary = "Add rooms using ranges like 101-120, 201-205")
    public List<BlockView> addRooms(@AuthenticationPrincipal AuthUser me, @PathVariable Long blockId,
                                    @Valid @RequestBody RoomsRequest req) {
        return admin.addRooms(me, blockId, req.rooms());
    }

    @GetMapping("/api/hostel/categories")
    public List<CategoryView> categories(@AuthenticationPrincipal AuthUser me) {
        return admin.categories(me);
    }

    @PutMapping("/api/hostel/categories/{categoryId}")
    public List<CategoryView> updateCategory(@AuthenticationPrincipal AuthUser me, @PathVariable Long categoryId,
                                             @Valid @RequestBody UpdateCategoryRequest req) {
        return admin.updateCategory(me, categoryId, req);
    }

    @GetMapping("/api/hostel/team")
    public List<StaffView> team(@AuthenticationPrincipal AuthUser me) {
        return admin.team(me);
    }

    @PutMapping("/api/hostel/team/{staffId}/skills")
    @Operation(summary = "Which categories (and blocks) a staff member handles; drives auto-assignment")
    public List<StaffView> setSkills(@AuthenticationPrincipal AuthUser me, @PathVariable Long staffId,
                                     @Valid @RequestBody SetSkillsRequest req) {
        return admin.setSkills(me, staffId, req);
    }

    @PutMapping("/api/hostel/team/{userId}/active")
    public List<StaffView> setActive(@AuthenticationPrincipal AuthUser me, @PathVariable Long userId,
                                     @RequestBody ActiveRequest req) {
        return admin.setActive(me, userId, req.active());
    }

    /** Role and hostel live inside the JWT, so after joining we issue a fresh token pair. */
    private MeView refreshedSession(Long userId, HttpServletResponse res) {
        AppUser user = users.findWithHostelById(userId).orElseThrow(() -> AppException.notFound("User"));
        sessions.start(user, res);
        return MeView.of(user, sessions.isPlatformAdmin(user.getEmail()));
    }
}
