package com.fixit.dashboard;

import com.fixit.security.AuthUser;
import com.fixit.usage.UsageService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Warden metrics. Each number is one aggregate SQL query (GROUP BY in Postgres), so the dashboard costs
 * a fixed handful of queries no matter how many tickets exist, instead of loading tickets into Java.
 */
@Service
@PreAuthorize("hasRole('WARDEN')")
@Transactional(readOnly = true)
public class DashboardService {

    public record Count(String label, long count) {}

    public record StaffLoad(Long id, String name, long open, long resolved, Double avgRating) {}

    public record RecurringRoom(String room, String category, long tickets) {}

    public record Summary(long open, long created, long closed, Double avgResolutionHours,
                          double slaBreachRate, Double avgRating) {}

    public record Dashboard(LocalDate from, LocalDate to, Summary summary, List<Count> openByCategory,
                            List<Count> openByBlock, List<StaffLoad> staff, List<RecurringRoom> recurringRooms) {}

    private static final String OPEN = "('OPEN','ASSIGNED','IN_PROGRESS','REOPENED','RESOLVED')";

    private final JdbcClient jdbc;
    private final UsageService usage;
    private final Clock clock;

    public DashboardService(JdbcClient jdbc, UsageService usage, Clock clock) {
        this.jdbc = jdbc;
        this.usage = usage;
        this.clock = clock;
    }

    public Dashboard dashboard(AuthUser me, LocalDate from, LocalDate to) {
        long h = me.requireHostel();
        Range r = range(from, to);
        return new Dashboard(r.fromDate(), r.toDate(), summary(h, r), openBy(h, "c.name", "category c ON c.id = t.category_id"),
                openBy(h, "b.name", "block b ON b.id = t.block_id"), staff(h, r), recurring(h, r));
    }

    public String exportCsv(AuthUser me, LocalDate from, LocalDate to) {
        long h = me.requireHostel();
        Range r = range(from, to);
        CsvWriter csv = new CsvWriter().row(List.of("ticket", "created_at", "category", "block", "room", "common_area",
                "priority", "status", "assignee", "sla_due_at", "sla_breached", "resolved_at", "closed_at", "rating", "description"));
        jdbc.sql("""
                SELECT t.number, t.created_at, c.name AS category, b.name AS block, r.number AS room, t.common_area,
                       t.priority, t.status, a.name AS assignee, t.sla_due_at, t.sla_breached_at IS NOT NULL AS breached,
                       t.resolved_at, t.closed_at, t.rating, t.description
                FROM ticket t
                JOIN category c ON c.id = t.category_id
                JOIN block b ON b.id = t.block_id
                LEFT JOIN room r ON r.id = t.room_id
                LEFT JOIN app_user a ON a.id = t.assignee_id
                WHERE t.hostel_id = :h AND t.created_at >= :from AND t.created_at < :to
                ORDER BY t.number
                """)
                .param("h", h).param("from", r.from()).param("to", r.to())
                .query(rs -> {
                    List<Object> row = new ArrayList<>();
                    row.add("FX-" + rs.getLong("number"));
                    row.add(instant(rs.getTimestamp("created_at")));
                    row.add(rs.getString("category"));
                    row.add(rs.getString("block"));
                    row.add(rs.getString("room"));
                    row.add(rs.getBoolean("common_area") ? "yes" : "no");
                    row.add(rs.getString("priority"));
                    row.add(rs.getString("status"));
                    row.add(rs.getString("assignee"));
                    row.add(instant(rs.getTimestamp("sla_due_at")));
                    row.add(rs.getBoolean("breached") ? "yes" : "no");
                    row.add(instant(rs.getTimestamp("resolved_at")));
                    row.add(instant(rs.getTimestamp("closed_at")));
                    row.add(rs.getObject("rating"));
                    row.add(rs.getString("description"));
                    csv.row(row);
                });
        usage.record(UsageService.Action.CSV_EXPORTED);
        return csv.toString();
    }

    private Summary summary(long h, Range r) {
        return jdbc.sql("""
                SELECT
                  (SELECT count(*) FROM ticket WHERE hostel_id = :h AND status IN %s) AS open_now,
                  count(*) AS created,
                  count(*) FILTER (WHERE status = 'CLOSED') AS closed,
                  avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) FILTER (WHERE resolved_at IS NOT NULL) AS avg_hours,
                  count(*) FILTER (WHERE sla_breached_at IS NOT NULL) AS breached,
                  avg(rating) AS avg_rating
                FROM ticket
                WHERE hostel_id = :h AND created_at >= :from AND created_at < :to
                """.formatted(OPEN))
                .param("h", h).param("from", r.from()).param("to", r.to())
                .query((rs, i) -> {
                    long created = rs.getLong("created");
                    long breached = rs.getLong("breached");
                    return new Summary(rs.getLong("open_now"), created, rs.getLong("closed"),
                            round(rs.getObject("avg_hours", Double.class)),
                            created == 0 ? 0 : Math.round(1000.0 * breached / created) / 10.0,
                            round(rs.getObject("avg_rating", Double.class)));
                })
                .single();
    }

    private List<Count> openBy(long h, String labelColumn, String join) {
        return jdbc.sql("""
                SELECT %s AS label, count(*) AS n FROM ticket t JOIN %s
                WHERE t.hostel_id = :h AND t.status IN %s
                GROUP BY %s ORDER BY n DESC, label
                """.formatted(labelColumn, join, OPEN, labelColumn))
                .param("h", h)
                .query((rs, i) -> new Count(rs.getString("label"), rs.getLong("n")))
                .list();
    }

    private List<StaffLoad> staff(long h, Range r) {
        return jdbc.sql("""
                SELECT u.id, u.name,
                       count(t.id) FILTER (WHERE t.status IN ('ASSIGNED','IN_PROGRESS','REOPENED')) AS open,
                       count(t.id) FILTER (WHERE t.resolved_at >= :from AND t.resolved_at < :to) AS resolved,
                       avg(t.rating) FILTER (WHERE t.closed_at >= :from AND t.closed_at < :to) AS avg_rating
                FROM app_user u
                LEFT JOIN ticket t ON t.assignee_id = u.id
                WHERE u.hostel_id = :h AND u.role = 'STAFF' AND u.active
                GROUP BY u.id, u.name
                ORDER BY open DESC, u.name
                """)
                .param("h", h).param("from", r.from()).param("to", r.to())
                .query((rs, i) -> new StaffLoad(rs.getLong("id"), rs.getString("name"), rs.getLong("open"),
                        rs.getLong("resolved"), round(rs.getObject("avg_rating", Double.class))))
                .list();
    }

    /** Same room, same category, two or more times in the period: worth fixing properly, not patching again. */
    private List<RecurringRoom> recurring(long h, Range r) {
        return jdbc.sql("""
                SELECT b.name || '-' || rm.number AS room, c.name AS category, count(*) AS n
                FROM ticket t
                JOIN room rm ON rm.id = t.room_id
                JOIN block b ON b.id = rm.block_id
                JOIN category c ON c.id = t.category_id
                WHERE t.hostel_id = :h AND t.created_at >= :from AND t.created_at < :to
                GROUP BY b.name, rm.number, c.name
                HAVING count(*) >= 2
                ORDER BY n DESC, room
                LIMIT 10
                """)
                .param("h", h).param("from", r.from()).param("to", r.to())
                .query((rs, i) -> new RecurringRoom(rs.getString("room"), rs.getString("category"), rs.getLong("n")))
                .list();
    }

    private record Range(LocalDate fromDate, LocalDate toDate, Timestamp from, Timestamp to) {}

    /** Inclusive dates from the UI, half-open [from, to+1 day) in SQL. Defaults to the last 30 days. */
    private Range range(LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now(clock);
        LocalDate start = from != null ? from : end.minusDays(29);
        if (start.isAfter(end)) {
            LocalDate tmp = start;
            start = end;
            end = tmp;
        }
        return new Range(start, end,
                Timestamp.from(start.atStartOfDay().toInstant(ZoneOffset.UTC)),
                Timestamp.from(end.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
    }

    private static Double round(Double value) {
        return value == null ? null : Math.round(value * 10) / 10.0;
    }

    private static String instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant().toString();
    }
}
