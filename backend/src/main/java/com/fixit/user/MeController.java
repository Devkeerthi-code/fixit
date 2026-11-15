package com.fixit.user;

import com.fixit.auth.SessionService;
import com.fixit.common.AppException;
import com.fixit.hostel.RoomRepository;
import com.fixit.security.AuthUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@Tag(name = "Me", description = "The signed-in user's profile")
public class MeController {

    public record UpdateMeRequest(@Size(min = 1, max = 80) String name, Long roomId) {}

    private final UserRepository users;
    private final RoomRepository rooms;
    private final SessionService sessions;

    public MeController(UserRepository users, RoomRepository rooms, SessionService sessions) {
        this.users = users;
        this.rooms = rooms;
        this.sessions = sessions;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public MeView me(@AuthenticationPrincipal AuthUser me) {
        return MeView.of(load(me), me.platformAdmin());
    }

    @PatchMapping
    @Transactional
    public MeView update(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody UpdateMeRequest req) {
        AppUser user = load(me);
        if (req.name() != null && !req.name().isBlank()) {
            user.setName(req.name().trim());
        }
        if (req.roomId() != null) {
            user.setRoom(rooms.findByIdAndHostelId(req.roomId(), me.requireHostel())
                    .orElseThrow(() -> AppException.notFound("Room")));
        }
        return MeView.of(user, sessions.isPlatformAdmin(user.getEmail()));
    }

    private AppUser load(AuthUser me) {
        return users.findWithHostelById(me.userId()).orElseThrow(() -> AppException.notFound("User"));
    }
}
