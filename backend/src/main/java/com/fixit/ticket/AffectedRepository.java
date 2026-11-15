package com.fixit.ticket;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * "Affects me too" rows. Plain SQL here: the table is just (ticket_id, user_id), and its primary key
 * makes adding the same person twice a no-op via ON CONFLICT DO NOTHING.
 */
@Repository
public class AffectedRepository {

    private final JdbcClient jdbc;

    public AffectedRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** @return true if a new row was added */
    public boolean add(long ticketId, long userId) {
        int rows = jdbc.sql("INSERT INTO ticket_affected (ticket_id, user_id) VALUES (:t, :u) ON CONFLICT DO NOTHING")
                .param("t", ticketId).param("u", userId).update();
        return rows == 1;
    }

    public boolean remove(long ticketId, long userId) {
        return jdbc.sql("DELETE FROM ticket_affected WHERE ticket_id = :t AND user_id = :u")
                .param("t", ticketId).param("u", userId).update() == 1;
    }

    /** One grouped query for a whole page of tickets, instead of one COUNT per ticket. */
    public Map<Long, Long> countByTicket(Collection<Long> ticketIds) {
        Map<Long, Long> counts = new HashMap<>();
        if (ticketIds.isEmpty()) {
            return counts;
        }
        jdbc.sql("SELECT ticket_id, count(*) AS n FROM ticket_affected WHERE ticket_id IN (:ids) GROUP BY ticket_id")
                .param("ids", ticketIds)
                .query((rs, i) -> counts.put(rs.getLong("ticket_id"), rs.getLong("n")))
                .list();
        return counts;
    }

    public Set<Long> ticketsAffectingUser(Collection<Long> ticketIds, long userId) {
        if (ticketIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(jdbc.sql("SELECT ticket_id FROM ticket_affected WHERE user_id = :u AND ticket_id IN (:ids)")
                .param("u", userId).param("ids", ticketIds)
                .query(Long.class).list());
    }
}
