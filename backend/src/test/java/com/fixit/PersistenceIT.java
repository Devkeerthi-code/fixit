package com.fixit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fixit.security.AuthUser;
import com.fixit.support.Api;
import com.fixit.support.Api.World;
import com.fixit.support.IntegrationTest;
import com.fixit.ticket.Ticket;
import com.fixit.ticket.TicketFilter;
import com.fixit.ticket.TicketQueryService;
import com.fixit.ticket.TicketRepository;
import com.fixit.ticket.TicketStatus;
import jakarta.persistence.EntityManagerFactory;
import java.time.Instant;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;

class PersistenceIT extends IntegrationTest {

    @Autowired Api api;
    @Autowired TicketRepository tickets;
    @Autowired TicketQueryService queries;
    @Autowired TransactionTemplate tx;
    @Autowired EntityManagerFactory emf;
    World w;

    @BeforeEach
    void setUp() throws Exception {
        w = api.world("p");
    }

    @Test
    void optimisticLockingStopsTheSecondOfTwoConcurrentWrites() throws Exception {
        long id = api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null).get("ticket").get("id").asLong();

        // two staff load the same ticket...
        Ticket first = tx.execute(s -> tickets.findById(id).orElseThrow());
        Ticket second = tx.execute(s -> tickets.findById(id).orElseThrow());

        // ...the first saves...
        first.moveTo(TicketStatus.IN_PROGRESS, Instant.now());
        tx.executeWithoutResult(s -> tickets.save(first));

        // ...the second, holding a stale @Version, is refused instead of silently overwriting
        second.moveTo(TicketStatus.RESOLVED, Instant.now());
        assertThatThrownBy(() -> tx.executeWithoutResult(s -> tickets.save(second)))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
        assertThat(tickets.findById(id).orElseThrow().getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
    }

    @Test
    void listingTicketsCostsTheSameNumberOfQueriesForTwoOrTwelveTickets() throws Exception {
        for (int i = 0; i < 2; i++) {
            api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null);
        }
        long few = hibernateQueriesForOnePage();
        for (int i = 0; i < 10; i++) {
            api.raiseOk(w.neighbour(), w.categories().get("ELECTRICAL"), null);
        }
        long many = hibernateQueriesForOnePage();
        assertThat(many).isEqualTo(few).isLessThanOrEqualTo(2); // page + count, no per-row lazy loads
    }

    private long hibernateQueriesForOnePage() {
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        AuthUser warden = new AuthUser(w.warden().id(), w.hostelId(), w.warden().role(), false);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(warden, null, warden.authorities()));
        try {
            stats.clear();
            var page = queries.list(warden, new TicketFilter(null, null, null, null, false, false, false, false),
                    TicketQueryService.SortBy.RECENT, 0, 20);
            page.items().forEach(t -> assertThat(t.assignee()).isNotNull());
            return stats.getPrepareStatementCount();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void databaseConstraintsBackUpTheRules() {
        // a room ticket must have a room
        assertThatThrownBy(() -> jdbc.sql("""
                INSERT INTO ticket (hostel_id, number, reporter_id, category_id, block_id, common_area, description,
                                    priority, status, sla_due_at)
                VALUES (:h, 999, :u, :c, :b, false, 'no room given here', 'NORMAL', 'OPEN', now())
                """).param("h", w.hostelId()).param("u", w.resident().id())
                .param("c", w.categories().get("PLUMBING")).param("b", w.blockIds().get(0)).update())
                .isInstanceOf(DataIntegrityViolationException.class);

        // ratings are 1..5
        assertThatThrownBy(() -> jdbc.sql("UPDATE ticket SET rating = 6").update())
                .isInstanceOf(DataIntegrityViolationException.class);

        // emails are unique regardless of case (citext)
        assertThatThrownBy(() -> jdbc.sql("""
                INSERT INTO app_user (email, password_hash, name) VALUES ('RES-P@FIXIT.TEST', 'x', 'Dup')
                """).update()).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void oneEscalationPerTicketPerCycleIsEnforcedByTheDatabase() throws Exception {
        long id = api.raiseOk(w.resident(), w.categories().get("PLUMBING"), null).get("ticket").get("id").asLong();
        String insert = "INSERT INTO escalation (ticket_id, hostel_id, sla_cycle) VALUES (:t, :h, 1)";
        jdbc.sql(insert).param("t", id).param("h", w.hostelId()).update();
        assertThatThrownBy(() -> jdbc.sql(insert).param("t", id).param("h", w.hostelId()).update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
