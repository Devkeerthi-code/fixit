package com.fixit.auth;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fixit.common.AppException;
import com.fixit.support.MutableClock;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class LoginRateLimiterTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-15T10:00:00Z"));
    private final LoginRateLimiter limiter = new LoginRateLimiter(clock);

    @Test
    void blocksAfterTooManyAttemptsAndRecoversAfterTheWindow() {
        for (int i = 0; i < LoginRateLimiter.MAX_ATTEMPTS; i++) {
            limiter.check("1.2.3.4", "a@x.com");
        }
        assertThatThrownBy(() -> limiter.check("1.2.3.4", "A@X.com")).isInstanceOf(AppException.class);

        clock.advance(LoginRateLimiter.WINDOW.plusSeconds(1));
        assertThatCode(() -> limiter.check("1.2.3.4", "a@x.com")).doesNotThrowAnyException();
    }

    @Test
    void limitsArePerIpAndEmail() {
        for (int i = 0; i < LoginRateLimiter.MAX_ATTEMPTS; i++) {
            limiter.check("1.2.3.4", "a@x.com");
        }
        assertThatCode(() -> limiter.check("5.6.7.8", "a@x.com")).doesNotThrowAnyException();
        assertThatCode(() -> limiter.check("1.2.3.4", "b@x.com")).doesNotThrowAnyException();
    }
}
