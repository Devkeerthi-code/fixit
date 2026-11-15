package com.fixit.ticket;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "visit_slot")
public class VisitSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(nullable = false)
    private LocalDate day;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_window", nullable = false)
    private TimeWindow timeWindow;

    protected VisitSlot() {}

    public VisitSlot(Long ticketId, LocalDate day, TimeWindow timeWindow) {
        this.ticketId = ticketId;
        this.day = day;
        this.timeWindow = timeWindow;
    }

    public Long getTicketId() { return ticketId; }
    public LocalDate getDay() { return day; }
    public TimeWindow getTimeWindow() { return timeWindow; }
}
