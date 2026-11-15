package com.fixit.ticket;

import com.fixit.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.Immutable;

/** One row of the audit log. Append-only: @Immutable stops Hibernate from ever issuing an UPDATE for it. */
@Entity
@Immutable
@Table(name = "ticket_event")
public class TicketEvent {

    public enum Type { CREATED, STATUS_CHANGED, ASSIGNED, SLA_BREACHED, AFFECTS_ME, RATED, NOTE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(name = "hostel_id", nullable = false)
    private Long hostelId;

    /** Null when the system acted (SLA job, auto-close). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private AppUser actor;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Type type;

    @Column(name = "from_status")
    @Enumerated(EnumType.STRING)
    private TicketStatus fromStatus;

    @Column(name = "to_status")
    @Enumerated(EnumType.STRING)
    private TicketStatus toStatus;

    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TicketEvent() {}

    public TicketEvent(Ticket ticket, AppUser actor, Type type, TicketStatus from, TicketStatus to,
                       String note, Instant at) {
        this.ticketId = ticket.getId();
        this.hostelId = ticket.getHostelId();
        this.actor = actor;
        this.type = type;
        this.fromStatus = from;
        this.toStatus = to;
        this.note = note;
        this.createdAt = at;
    }

    public Long getId() { return id; }
    public Long getTicketId() { return ticketId; }
    public AppUser getActor() { return actor; }
    public Type getType() { return type; }
    public TicketStatus getFromStatus() { return fromStatus; }
    public TicketStatus getToStatus() { return toStatus; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
