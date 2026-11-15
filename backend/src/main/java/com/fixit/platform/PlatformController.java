package com.fixit.platform;

import com.fixit.usage.UsageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** For the people running FixIt (ADMIN_EMAILS): totals only, never ticket contents. */
@RestController
@RequestMapping("/api/platform")
@Tag(name = "Platform", description = "Usage counts for platform admins")
public class PlatformController {

    public record Stats(long hostels, long users, long tickets, Map<String, Long> usage) {}

    private final JdbcClient jdbc;
    private final UsageService usage;

    public PlatformController(JdbcClient jdbc, UsageService usage) {
        this.jdbc = jdbc;
        this.usage = usage;
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public Stats stats() {
        return new Stats(count("hostel"), count("app_user"), count("ticket"), usage.totals());
    }

    private long count(String table) {
        return jdbc.sql("SELECT count(*) FROM " + table).query(Long.class).single();
    }
}
