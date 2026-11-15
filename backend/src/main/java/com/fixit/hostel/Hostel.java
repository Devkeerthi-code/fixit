package com.fixit.hostel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "hostel")
public class Hostel {

    public enum Kind { HOSTEL, CAMPUS, SOCIETY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;

    @Column(name = "resident_invite_code", nullable = false, unique = true)
    private String residentInviteCode;

    @Column(name = "staff_invite_code", nullable = false, unique = true)
    private String staffInviteCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Hostel() {}

    public Hostel(String name, Kind kind, String residentInviteCode, String staffInviteCode) {
        this.name = name;
        this.kind = kind;
        this.residentInviteCode = residentInviteCode;
        this.staffInviteCode = staffInviteCode;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }
    public String getResidentInviteCode() { return residentInviteCode; }
    public void setResidentInviteCode(String code) { this.residentInviteCode = code; }
    public String getStaffInviteCode() { return staffInviteCode; }
    public void setStaffInviteCode(String code) { this.staffInviteCode = code; }
    public Instant getCreatedAt() { return createdAt; }
}
