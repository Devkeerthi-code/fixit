package com.fixit.hostel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hostel_id", nullable = false)
    private Long hostelId;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String covers;

    @Column(nullable = false)
    private boolean active = true;

    protected Category() {}

    public Category(Long hostelId, String code, String name, String covers) {
        this.hostelId = hostelId;
        this.code = code;
        this.name = name;
        this.covers = covers;
    }

    public Long getId() { return id; }
    public Long getHostelId() { return hostelId; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCovers() { return covers; }
    public void setCovers(String covers) { this.covers = covers; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
