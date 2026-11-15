package com.fixit.common;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code app.*} settings in application.yml. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        boolean cookieSecure,
        String allowedOrigins,
        String adminEmails,
        Sla sla) {

    public record Jwt(String secret, Duration accessTtl, Duration refreshTtl) {}

    public record Sla(long jobDelayMs, int autoCloseHours) {}

    public List<String> adminEmailList() {
        return splitCsv(adminEmails).stream().map(e -> e.toLowerCase(Locale.ROOT)).toList();
    }

    public List<String> allowedOriginList() {
        return splitCsv(allowedOrigins);
    }

    private static List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
