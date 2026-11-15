package com.fixit.hostel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "block")
public class Block {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hostel_id", nullable = false)
    private Long hostelId;

    @Column(nullable = false)
    private String name;

    protected Block() {}

    public Block(Long hostelId, String name) {
        this.hostelId = hostelId;
        this.name = name;
    }

    public Long getId() { return id; }
    public Long getHostelId() { return hostelId; }
    public String getName() { return name; }
}
