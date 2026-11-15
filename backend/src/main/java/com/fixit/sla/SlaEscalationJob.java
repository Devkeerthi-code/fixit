package com.fixit.sla;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * @Scheduled runs this on a background thread. fixedDelay waits for the previous run to finish before
 * counting down again, so runs never overlap within one instance.
 */
@Component
@ConditionalOnProperty(name = "app.sla.job-enabled", havingValue = "true", matchIfMissing = true)
public class SlaEscalationJob {

    private static final Logger log = LoggerFactory.getLogger(SlaEscalationJob.class);

    private final SlaEscalationService service;

    public SlaEscalationJob(SlaEscalationService service) {
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${app.sla.job-delay-ms}", initialDelay = 30_000)
    public void run() {
        try {
            int escalated = service.escalateOverdue();
            int closed = service.autoCloseResolved();
            if (escalated + closed > 0) {
                log.info("SLA job: escalated {}, auto-closed {}", escalated, closed);
            }
        } catch (RuntimeException e) {
            // one failed run must not kill the scheduler; the next run picks the same rows up again
            log.error("SLA job failed", e);
        }
    }
}
