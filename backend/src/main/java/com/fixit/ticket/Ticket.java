package com.fixit.ticket;

import com.fixit.hostel.Block;
import com.fixit.hostel.Category;
import com.fixit.hostel.Room;
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
import jakarta.persistence.Version;
import java.time.Instant;

@Entity
@Table(name = "ticket")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hostel_id", nullable = false, updatable = false)
    private Long hostelId;

    @Column(nullable = false, updatable = false)
    private Long number;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", updatable = false)
    private AppUser reporter;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "block_id")
    private Block block;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(name = "common_area", nullable = false)
    private boolean commonArea;

    @Column(name = "location_note")
    private String locationNote;

    @Column(nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status = TicketStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private AppUser assignee;

    /**
     * Optimistic locking: Hibernate adds "WHERE version = ?" to every UPDATE and bumps it.
     * If two staff save the same ticket, the second UPDATE matches zero rows and fails with 409.
     */
    @Version
    private Long version;

    @Column(name = "sla_due_at", nullable = false)
    private Instant slaDueAt;

    @Column(name = "sla_cycle", nullable = false)
    private int slaCycle = 1;

    @Column(name = "sla_breached_at")
    private Instant slaBreachedAt;

    private Short rating;

    @Column(name = "rating_comment")
    private String ratingComment;

    @Column(name = "idempotency_key", updatable = false)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Ticket() {}

    public Ticket(Long hostelId, Long number, AppUser reporter, Category category, Block block, Room room,
                  boolean commonArea, String locationNote, String description, Priority priority,
                  Instant slaDueAt, String idempotencyKey, Instant now) {
        this.hostelId = hostelId;
        this.number = number;
        this.reporter = reporter;
        this.category = category;
        this.block = block;
        this.room = room;
        this.commonArea = commonArea;
        this.locationNote = locationNote;
        this.description = description;
        this.priority = priority;
        this.slaDueAt = slaDueAt;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Moves to a status already approved by {@link TicketStateMachine} and stamps the matching time. */
    public void moveTo(TicketStatus next, Instant now) {
        this.status = next;
        this.updatedAt = now;
        switch (next) {
            case ASSIGNED -> this.assignedAt = now;
            case RESOLVED -> this.resolvedAt = now;
            case CLOSED -> this.closedAt = now;
            default -> { }
        }
    }

    public void assignTo(AppUser staff) {
        this.assignee = staff;
    }

    /** Reopening restarts the SLA clock as a new cycle, so it can be escalated again if missed. */
    public void startNewSlaCycle(Instant dueAt) {
        this.slaCycle++;
        this.slaDueAt = dueAt;
        this.slaBreachedAt = null;
        this.resolvedAt = null;
    }

    public void rate(int stars, String comment) {
        this.rating = (short) stars;
        this.ratingComment = comment;
    }

    public String code() {
        return "FX-" + number;
    }

    public Long getId() { return id; }
    public Long getHostelId() { return hostelId; }
    public Long getNumber() { return number; }
    public AppUser getReporter() { return reporter; }
    public Category getCategory() { return category; }
    public Block getBlock() { return block; }
    public Room getRoom() { return room; }
    public boolean isCommonArea() { return commonArea; }
    public String getLocationNote() { return locationNote; }
    public String getDescription() { return description; }
    public Priority getPriority() { return priority; }
    public TicketStatus getStatus() { return status; }
    public AppUser getAssignee() { return assignee; }
    public Long getVersion() { return version; }
    public Instant getSlaDueAt() { return slaDueAt; }
    public int getSlaCycle() { return slaCycle; }
    public Instant getSlaBreachedAt() { return slaBreachedAt; }
    public Short getRating() { return rating; }
    public String getRatingComment() { return ratingComment; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getAssignedAt() { return assignedAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public Instant getClosedAt() { return closedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
