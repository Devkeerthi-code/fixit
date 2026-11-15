package com.fixit.routing;

import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** One SQL query returns every eligible staff member with their current open-ticket count. */
@Repository
public class StaffLoadQuery {

    private static final String SQL = """
            SELECT u.id AS staff_id,
                   count(t.id) FILTER (WHERE t.status IN ('ASSIGNED', 'IN_PROGRESS', 'REOPENED')) AS open_tickets,
                   max(t.assigned_at) AS last_assigned_at
            FROM app_user u
            LEFT JOIN ticket t ON t.assignee_id = u.id
            WHERE u.hostel_id = :hostelId
              AND u.role = 'STAFF'
              AND u.active
              AND EXISTS (SELECT 1 FROM staff_skill s
                          WHERE s.staff_id = u.id
                            AND s.category_id = :categoryId
                            AND (s.block_id IS NULL OR s.block_id = :blockId))
            GROUP BY u.id
            """;

    private final JdbcClient jdbc;

    public StaffLoadQuery(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<StaffLoad> eligibleStaff(long hostelId, long categoryId, long blockId) {
        return jdbc.sql(SQL)
                .param("hostelId", hostelId)
                .param("categoryId", categoryId)
                .param("blockId", blockId)
                .query((rs, i) -> {
                    Timestamp last = rs.getTimestamp("last_assigned_at");
                    return new StaffLoad(rs.getLong("staff_id"), rs.getLong("open_tickets"),
                            last == null ? null : last.toInstant());
                })
                .list();
    }
}
