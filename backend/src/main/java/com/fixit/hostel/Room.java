package com.fixit.hostel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "room")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hostel_id", nullable = false)
    private Long hostelId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "block_id")
    private Block block;

    @Column(nullable = false)
    private String number;

    protected Room() {}

    public Room(Long hostelId, Block block, String number) {
        this.hostelId = hostelId;
        this.block = block;
        this.number = number;
    }

    public Long getId() { return id; }
    public Long getHostelId() { return hostelId; }
    public Block getBlock() { return block; }
    public String getNumber() { return number; }

    /** Human label like "B-204". */
    public String label() {
        return block.getName() + "-" + number;
    }
}
