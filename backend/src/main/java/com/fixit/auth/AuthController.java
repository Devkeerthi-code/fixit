package com.fixit.auth;

import com.fixit.auth.AuthDtos.LoginRequest;
import com.fixit.auth.AuthDtos.RegisterRequest;
import com.fixit.common.AppException;
import com.fixit.security.AuthCookies;
import com.fixit.user.AppUser;
import com.fixit.user.MeView;
import com.fixit.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Sign up, sign in, refresh and sign out. Tokens are set as httpOnly cookies.")
public class AuthController {

    private final AuthService auth;
    private final SessionService sessions;
    private final LoginRateLimiter limiter;
    private final AuthCookies cookies;
    private final UserRepository users;

    public AuthController(AuthService auth, SessionService sessions, LoginRateLimiter limiter,
                          AuthCookies cookies, UserRepository users) {
        this.auth = auth;
        this.sessions = sessions;
        this.limiter = limiter;
        this.cookies = cookies;
        this.users = users;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an account and sign in")
    public MeView register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http, HttpServletResponse res) {
        limiter.check(http.getRemoteAddr(), req.email());
        AppUser user = auth.register(req);
        sessions.start(user, res);
        return MeView.of(user, sessions.isPlatformAdmin(user.getEmail()));
    }

    @PostMapping("/login")
    @Operation(summary = "Sign in with email and password")
    public MeView login(@Valid @RequestBody LoginRequest req, HttpServletRequest http, HttpServletResponse res) {
        limiter.check(http.getRemoteAddr(), req.email());
        AppUser user = auth.login(req);
        sessions.start(user, res);
        return me(user.getId());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Swap the refresh cookie for a new token pair (rotation)")
    public MeView refresh(HttpServletRequest http, HttpServletResponse res) {
        String raw = AuthCookies.read(http, AuthCookies.REFRESH)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "Please sign in"));
        try {
            AppUser user = sessions.rotate(raw, res);
            return MeView.of(user, sessions.isPlatformAdmin(user.getEmail()));
        } catch (AppException e) {
            cookies.clear(res);
            throw e;
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Sign out everywhere this login was used")
    public ResponseEntity<Void> logout(HttpServletRequest http, HttpServletResponse res) {
        AuthCookies.read(http, AuthCookies.REFRESH).ifPresent(sessions::end);
        cookies.clear(res);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/csrf")
    @Operation(summary = "Sets the XSRF-TOKEN cookie; call once when the app loads")
    public ResponseEntity<Void> csrf() {
        return ResponseEntity.noContent().build();
    }

    private MeView me(Long userId) {
        AppUser user = users.findWithHostelById(userId).orElseThrow(() -> AppException.notFound("User"));
        return MeView.of(user, sessions.isPlatformAdmin(user.getEmail()));
    }
}
