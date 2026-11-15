package com.fixit.auth;

import com.fixit.common.AppException;
import com.fixit.common.AppProperties;
import com.fixit.security.AuthCookies;
import com.fixit.security.AuthUser;
import com.fixit.security.JwtService;
import com.fixit.user.AppUser;
import com.fixit.user.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Issues, rotates and revokes the access + refresh token pair. */
@Service
public class SessionService {

    /**
     * Two tabs can refresh at the same moment with the same cookie. A token revoked only seconds ago
     * is treated as that race, not as theft, so users aren't logged out for opening two tabs.
     */
    private static final Duration REUSE_GRACE = Duration.ofSeconds(20);

    private final SecureRandom random = new SecureRandom();
    private final RefreshTokenRepository tokens;
    private final UserRepository users;
    private final JwtService jwt;
    private final AuthCookies cookies;
    private final AppProperties props;
    private final Clock clock;

    public SessionService(RefreshTokenRepository tokens, UserRepository users, JwtService jwt,
                          AuthCookies cookies, AppProperties props, Clock clock) {
        this.tokens = tokens;
        this.users = users;
        this.jwt = jwt;
        this.cookies = cookies;
        this.props = props;
        this.clock = clock;
    }

    public AuthUser principalFor(AppUser user) {
        return new AuthUser(user.getId(), user.hostelId(), user.getRole(), isPlatformAdmin(user.getEmail()));
    }

    public boolean isPlatformAdmin(String email) {
        return props.adminEmailList().contains(email.toLowerCase(Locale.ROOT));
    }

    /** Starts a new token family (login, register, or after joining a hostel). */
    @Transactional
    public void start(AppUser user, HttpServletResponse response) {
        issue(user, UUID.randomUUID(), response);
    }

    @Transactional(noRollbackFor = AppException.class)
    public AppUser rotate(String rawRefreshToken, HttpServletResponse response) {
        Instant now = Instant.now(clock);
        RefreshToken current = tokens.findByTokenHash(hash(rawRefreshToken))
                .orElseThrow(SessionService::invalid);
        if (current.getExpiresAt().isBefore(now)) {
            throw invalid();
        }
        if (current.getRevokedAt() != null && current.getRevokedAt().isBefore(now.minus(REUSE_GRACE))) {
            // an old token came back: assume it was stolen and end every session from that login
            tokens.revokeFamily(current.getFamilyId(), now);
            throw invalid();
        }
        current.revoke(now);
        AppUser user = users.findWithHostelById(current.getUserId())
                .filter(AppUser::isActive)
                .orElseThrow(SessionService::invalid);
        issue(user, current.getFamilyId(), response);
        return user;
    }

    @Transactional
    public void end(String rawRefreshToken) {
        tokens.findByTokenHash(hash(rawRefreshToken))
                .ifPresent(t -> tokens.revokeFamily(t.getFamilyId(), Instant.now(clock)));
    }

    private void issue(AppUser user, UUID family, HttpServletResponse response) {
        Instant now = Instant.now(clock);
        String raw = newRawToken();
        tokens.save(new RefreshToken(user.getId(), hash(raw), family, now.plus(props.jwt().refreshTtl()), now));
        cookies.write(response, jwt.issue(principalFor(user)), raw);
    }

    private String newRawToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static AppException invalid() {
        return new AppException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "Your session ended. Please sign in again.");
    }
}
