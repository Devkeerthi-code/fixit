package com.fixit.sla;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fixit.common.AppProperties;
import com.fixit.notification.NotificationService;
import com.fixit.sla.SlaRepository.Breach;
import com.fixit.sla.SlaRepository.Resolved;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SlaEscalationServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-15T12:00:00Z");

    @Mock SlaRepository repo;
    @Mock NotificationService notifications;

    private SlaEscalationService service;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties(null, false, "", "", new AppProperties.Sla(300_000, 72));
        service = new SlaEscalationService(repo, notifications, props, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void escalatesANewBreachAndNotifiesWardenAndAssignee() {
        Breach breach = new Breach(10, 1, 42, 1, 7L);
        when(repo.lockOverdue(NOW, SlaEscalationService.BATCH)).thenReturn(List.of(breach));
        when(repo.recordEscalation(breach)).thenReturn(true);

        assertThat(service.escalateOverdue()).isEqualTo(1);

        verify(repo).markBreached(breach, NOW);
        verify(notifications).notifyWardens(eq(1L), eq(10L), eq("SLA_BREACHED"), anyString());
        verify(notifications).notify(eq(7L), eq(1L), eq(10L), eq("SLA_BREACHED"), anyString());
    }

    @Test
    void neverEscalatesTheSameBreachTwice() {
        Breach breach = new Breach(10, 1, 42, 1, 7L);
        when(repo.lockOverdue(NOW, SlaEscalationService.BATCH)).thenReturn(List.of(breach));
        // the unique (ticket_id, sla_cycle) row already exists, e.g. a previous run crashed after inserting it
        when(repo.recordEscalation(breach)).thenReturn(false);

        assertThat(service.escalateOverdue()).isZero();

        verify(repo, never()).markBreached(any(), any());
        verify(notifications, never()).notifyWardens(anyLong(), anyLong(), anyString(), anyString());
    }

    @Test
    void escalatesOnlyTheNewOnesInAMixedBatch() {
        Breach fresh = new Breach(10, 1, 42, 2, null);
        Breach old = new Breach(11, 1, 43, 1, null);
        when(repo.lockOverdue(NOW, SlaEscalationService.BATCH)).thenReturn(List.of(fresh, old));
        when(repo.recordEscalation(fresh)).thenReturn(true);
        when(repo.recordEscalation(old)).thenReturn(false);

        assertThat(service.escalateOverdue()).isEqualTo(1);
        verify(repo).markBreached(fresh, NOW);
        verify(repo, never()).markBreached(eq(old), any());
    }

    @Test
    void autoClosesTicketsResolvedLongerThanTheConfiguredHours() {
        Instant cutoff = NOW.minus(Duration.ofHours(72));
        Resolved r = new Resolved(5, 1, 7L);
        when(repo.lockResolvedBefore(cutoff, SlaEscalationService.BATCH)).thenReturn(List.of(r));
        when(repo.autoClose(r, NOW)).thenReturn(true);

        assertThat(service.autoCloseResolved()).isEqualTo(1);
    }

    @Test
    void doesNothingWhenNothingIsOverdue() {
        when(repo.lockOverdue(any(), anyInt())).thenReturn(List.of());
        assertThat(service.escalateOverdue()).isZero();
        verify(notifications, never()).notifyWardens(anyLong(), anyLong(), anyString(), anyString());
    }
}
