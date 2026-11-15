package com.fixit.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "hostel_id", nullable = false)
    private Long hostelId;

    @Column(name = "ticket_id")
    private Long ticketId;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String message;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Notification() {}

    public Notification(Long userId, Long hostelId, Long ticketId, String type, String message, Instant at) {
        this.userId = userId;
        this.hostelId = hostelId;
        this.ticketId = ticketId;
        this.type = type;
        this.message = message;
        this.createdAt = at;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getTicketId() { return ticketId; }
    public String getType() { return type; }
    public String getMessage() { return message; }
    public Instant getReadAt() { return readAt; }
    public Instant getCreatedAt() { return createdAt; }
}
