package com.fixit.user;

import com.fixit.security.AuthUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

    private final ProfileService profile;

    public MeController(ProfileService profile) {
        this.profile = profile;
    }

    @GetMapping
    public MeView me(@AuthenticationPrincipal AuthUser me) {
        return profile.me(me);
    }

    @PatchMapping
    public MeView update(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody UpdateMeRequest req) {
        return profile.update(me, req.name(), req.roomId());
    }
}
