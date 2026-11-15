package com.fixit.sla;

import com.fixit.common.AppProperties;
import com.fixit.notification.NotificationService;
import com.fixit.sla.SlaRepository.Breach;
import com.fixit.sla.SlaRepository.Resolved;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Escalates overdue tickets to the warden, exactly once per SLA cycle.
 * Idempotency comes from the database, not from memory: the escalation row's UNIQUE (ticket_id, sla_cycle)
 * means a crash, a retry or a second instance can never notify twice for the same breach.
 */
@Service
public class SlaEscalationService {

    static final int BATCH = 200;

    private final SlaRepository repo;
    private final NotificationService notifications;
    private final AppProperties props;
    private final Clock clock;

    public SlaEscalationService(SlaRepository repo, NotificationService notifications, AppProperties props, Clock clock) {
        this.repo = repo;
        this.notifications = notifications;
        this.props = props;
        this.clock = clock;
    }

    /** @return how many tickets were newly escalated */
    @Transactional
    public int escalateOverdue() {
        Instant now = Instant.now(clock);
        int escalated = 0;
        for (Breach breach : repo.lockOverdue(now, BATCH)) {
            if (!repo.recordEscalation(breach)) {
                continue; // already escalated this cycle
            }
            repo.markBreached(breach, now);
            String message = "FX-" + breach.number() + " missed its target time and needs your attention";
            notifications.notifyWardens(breach.hostelId(), breach.ticketId(), "SLA_BREACHED", message);
            notifications.notify(breach.assigneeId(), breach.hostelId(), breach.ticketId(), "SLA_BREACHED",
                    "FX-" + breach.number() + " is overdue and has been escalated");
            escalated++;
        }
        return escalated;
    }

    @Transactional
    public int autoCloseResolved() {
        Instant now = Instant.now(clock);
        Instant cutoff = now.minus(Duration.ofHours(props.sla().autoCloseHours()));
        int closed = 0;
        for (Resolved r : repo.lockResolvedBefore(cutoff, BATCH)) {
            if (repo.autoClose(r, now)) {
                closed++;
            }
        }
        return closed;
    }
}
