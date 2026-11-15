package com.fixit.hostel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** "This staff member handles this category, in this block (or every block when blockId is null)." */
@Entity
@Table(name = "staff_skill")
public class StaffSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hostel_id", nullable = false)
    private Long hostelId;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "block_id")
    private Long blockId;

    protected StaffSkill() {}

    public StaffSkill(Long hostelId, Long staffId, Long categoryId, Long blockId) {
        this.hostelId = hostelId;
        this.staffId = staffId;
        this.categoryId = categoryId;
        this.blockId = blockId;
    }

    public Long getId() { return id; }
    public Long getHostelId() { return hostelId; }
    public Long getStaffId() { return staffId; }
    public Long getCategoryId() { return categoryId; }
    public Long getBlockId() { return blockId; }
}
