package com.fixit.ticket;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** A photo stored as bytea in its own table so ticket queries never load image bytes. */
@Entity
@Table(name = "ticket_photo")
public class TicketPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(name = "hostel_id", nullable = false)
    private Long hostelId;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private int sizeBytes;

    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false)
    private byte[] bytes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected TicketPhoto() {}

    public TicketPhoto(Long ticketId, Long hostelId, String contentType, byte[] bytes) {
        this.ticketId = ticketId;
        this.hostelId = hostelId;
        this.contentType = contentType;
        this.bytes = bytes;
        this.sizeBytes = bytes.length;
    }

    public Long getId() { return id; }
    public Long getTicketId() { return ticketId; }
    public String getContentType() { return contentType; }
    public int getSizeBytes() { return sizeBytes; }
    public byte[] getBytes() { return bytes; }
}
