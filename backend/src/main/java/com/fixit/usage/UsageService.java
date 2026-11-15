package com.fixit.usage;

import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Privacy-respecting usage tracking: one counter per action per day. No user ids, no IPs,
 * so "used by N people" claims come from aggregate numbers only.
 */
@Service
public class UsageService {

    public enum Action { USER_REGISTERED, HOSTEL_CREATED, HOSTEL_JOINED, TICKET_CREATED, TICKET_CLOSED, AFFECTS_ME, CSV_EXPORTED }

    private final JdbcClient jdbc;
    private final Clock clock;

    public UsageService(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public void record(Action action) {
        jdbc.sql("""
                INSERT INTO usage_counter (day, action, count) VALUES (:day, :action, 1)
                ON CONFLICT (day, action) DO UPDATE SET count = usage_counter.count + 1
                """)
                .param("day", LocalDate.now(clock))
                .param("action", action.name())
                .update();
    }

    public Map<String, Long> totals() {
        Map<String, Long> totals = new LinkedHashMap<>();
        jdbc.sql("SELECT action, sum(count) AS total FROM usage_counter GROUP BY action ORDER BY action")
                .query((rs, i) -> totals.put(rs.getString("action"), rs.getLong("total")))
                .list();
        return totals;
    }
}
