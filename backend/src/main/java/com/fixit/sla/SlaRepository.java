package com.fixit.sla;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The SQL behind SLA escalation, kept separate so the decision logic can be unit-tested with a mock. */
@Repository
public class SlaRepository {

    public record Breach(long ticketId, long hostelId, long number, int slaCycle, Long assigneeId) {}

    private final JdbcClient jdbc;

    public SlaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Overdue active tickets not yet escalated for their current cycle. FOR UPDATE SKIP LOCKED means that if
     * two app instances ever run the job together, each takes different rows instead of both taking the same.
     */
    public List<Breach> lockOverdue(Instant now, int limit) {
        return jdbc.sql("""
                SELECT t.id, t.hostel_id, t.number, t.sla_cycle, t.assignee_id
                FROM ticket t
                WHERE t.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED')
                  AND t.sla_due_at < :now
                  AND NOT EXISTS (SELECT 1 FROM escalation e WHERE e.ticket_id = t.id AND e.sla_cycle = t.sla_cycle)
                ORDER BY t.sla_due_at
                LIMIT :limit
                FOR UPDATE OF t SKIP LOCKED
                """)
                .param("now", Timestamp.from(now))
                .param("limit", limit)
                .query((rs, i) -> new Breach(rs.getLong("id"), rs.getLong("hostel_id"), rs.getLong("number"),
                        rs.getInt("sla_cycle"), (Long) rs.getObject("assignee_id")))
                .list();
    }

    /** @return true only for the first call per (ticket, cycle); the UNIQUE constraint makes repeats no-ops. */
    public boolean recordEscalation(Breach breach) {
        return jdbc.sql("""
                INSERT INTO escalation (ticket_id, hostel_id, sla_cycle) VALUES (:t, :h, :c)
                ON CONFLICT (ticket_id, sla_cycle) DO NOTHING
                """)
                .param("t", breach.ticketId()).param("h", breach.hostelId()).param("c", breach.slaCycle())
                .update() == 1;
    }

    /**
     * Plain SQL instead of a JPA save on purpose: it must not bump the ticket's @Version, or a staff member
     * updating the ticket at that moment would get a confusing "someone else changed it" error.
     */
    public void markBreached(Breach breach, Instant now) {
        Timestamp at = Timestamp.from(now);
        jdbc.sql("UPDATE ticket SET sla_breached_at = :at WHERE id = :id AND sla_breached_at IS NULL")
                .param("at", at).param("id", breach.ticketId()).update();
        jdbc.sql("""
                INSERT INTO ticket_event (ticket_id, hostel_id, actor_id, type, note, created_at)
                VALUES (:id, :h, NULL, 'SLA_BREACHED', 'Missed its target time; escalated to the warden', :at)
                """)
                .param("id", breach.ticketId()).param("h", breach.hostelId()).param("at", at).update();
    }

    public record Resolved(long ticketId, long hostelId, Long assigneeId) {}

    public List<Resolved> lockResolvedBefore(Instant cutoff, int limit) {
        return jdbc.sql("""
                SELECT id, hostel_id, assignee_id FROM ticket
                WHERE status = 'RESOLVED' AND resolved_at < :cutoff
                ORDER BY resolved_at LIMIT :limit
                FOR UPDATE SKIP LOCKED
                """)
                .param("cutoff", Timestamp.from(cutoff)).param("limit", limit)
                .query((rs, i) -> new Resolved(rs.getLong("id"), rs.getLong("hostel_id"), (Long) rs.getObject("assignee_id")))
                .list();
    }

    /** Auto-close is a real status change, so it bumps version and is written to the audit log. */
    public boolean autoClose(Resolved r, Instant now) {
        Timestamp at = Timestamp.from(now);
        int rows = jdbc.sql("""
                UPDATE ticket SET status = 'CLOSED', closed_at = :at, updated_at = :at, version = version + 1
                WHERE id = :id AND status = 'RESOLVED'
                """)
                .param("at", at).param("id", r.ticketId()).update();
        if (rows == 1) {
            jdbc.sql("""
                    INSERT INTO ticket_event (ticket_id, hostel_id, actor_id, type, from_status, to_status, note, created_at)
                    VALUES (:id, :h, NULL, 'STATUS_CHANGED', 'RESOLVED', 'CLOSED', 'Closed automatically: no reply from the resident', :at)
                    """)
                    .param("id", r.ticketId()).param("h", r.hostelId()).param("at", at).update();
        }
        return rows == 1;
    }
}
