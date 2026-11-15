package com.fixit.user;

import com.fixit.hostel.Hostel;
import com.fixit.hostel.Room;
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

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    // LAZY: loading a user must not drag the hostel and room along unless asked
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hostel_id")
    private Hostel hostel;

    @Enumerated(EnumType.STRING)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AppUser() {}

    public AppUser(String email, String passwordHash, String name) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
    }

    public void joinHostel(Hostel hostel, Role role) {
        this.hostel = hostel;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Hostel getHostel() { return hostel; }
    public Role getRole() { return role; }
    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }

    /** Avoids initialising the lazy proxy when only the id is needed. */
    public Long hostelId() {
        return hostel == null ? null : hostel.getId();
    }
}
