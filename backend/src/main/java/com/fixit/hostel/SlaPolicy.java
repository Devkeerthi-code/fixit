package com.fixit.hostel;

import com.fixit.ticket.Priority;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "sla_policy")
public class SlaPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hostel_id", nullable = false)
    private Long hostelId;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Column(name = "target_hours", nullable = false)
    private int targetHours;

    protected SlaPolicy() {}

    public SlaPolicy(Long hostelId, Long categoryId, Priority priority, int targetHours) {
        this.hostelId = hostelId;
        this.categoryId = categoryId;
        this.priority = priority;
        this.targetHours = targetHours;
    }

    public Long getId() { return id; }
    public Long getHostelId() { return hostelId; }
    public Long getCategoryId() { return categoryId; }
    public Priority getPriority() { return priority; }
    public int getTargetHours() { return targetHours; }
    public void setTargetHours(int targetHours) { this.targetHours = targetHours; }
}
