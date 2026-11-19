package com.fixit.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fixit.common.AppProperties;
import com.fixit.support.MutableClock;
import com.fixit.user.Role;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "test-only-secret-that-is-long-enough-for-hs256";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-19T10:00:00Z"));
    private final JwtService jwt = new JwtService(props(SECRET), clock);

    private static AppProperties props(String secret) {
        return new AppProperties(new AppProperties.Jwt(secret, Duration.ofMinutes(15), Duration.ofDays(14)),
                false, "", "", new AppProperties.Sla(300_000, 72));
    }

    @Test
    void aTokenCarriesTheUserHostelAndRole() {
        AuthUser warden = new AuthUser(7, 3L, Role.WARDEN, false);

        assertThat(jwt.parse(jwt.issue(warden))).contains(warden);
    }

    @Test
    void someoneWithoutAHostelHasNoRoleInTheToken() {
        AuthUser newcomer = new AuthUser(9, null, null, true);

        assertThat(jwt.parse(jwt.issue(newcomer))).contains(newcomer);
    }

    @Test
    void anExpiredTokenIsRejected() {
        String token = jwt.issue(new AuthUser(7, 3L, Role.STAFF, false));
        clock.advance(Duration.ofMinutes(16));

        assertThat(jwt.parse(token)).isEmpty();
    }

    @Test
    void aTamperedTokenIsRejected() {
        String token = jwt.issue(new AuthUser(7, 3L, Role.RESIDENT, false));
        String[] parts = token.split("\\.");
        String forged = parts[0] + "." + parts[1] + "x." + parts[2];

        assertThat(jwt.parse(forged)).isEmpty();
        assertThat(jwt.parse("not-a-jwt")).isEmpty();
    }

    @Test
    void aTokenSignedWithAnotherSecretIsRejected() {
        JwtService other = new JwtService(props(SECRET + "-different"), clock);

        assertThat(jwt.parse(other.issue(new AuthUser(7, 3L, Role.WARDEN, false)))).isEmpty();
    }

    @Test
    void refusesToStartWithAShortSecret() {
        assertThatThrownBy(() -> new JwtService(props("too-short"), clock))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }
}
