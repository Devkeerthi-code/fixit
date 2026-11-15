package com.fixit.auth;

import com.fixit.common.AppException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Sliding-window limit on login/register attempts per (IP, email). In memory, so it is per instance:
 * fine for one Render instance, would need Redis with several (see README limitations).
 */
@Component
public class LoginRateLimiter {

    static final int MAX_ATTEMPTS = 10;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public void check(String ip, String email) {
        Instant now = Instant.now(clock);
        String key = ip + "|" + email.toLowerCase();
        Deque<Instant> window = attempts.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && window.peekFirst().isBefore(now.minus(WINDOW))) {
                window.pollFirst();
            }
            if (window.size() >= MAX_ATTEMPTS) {
                throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                        "Too many attempts. Try again in a few minutes.");
            }
            window.addLast(now);
        }
    }
}
