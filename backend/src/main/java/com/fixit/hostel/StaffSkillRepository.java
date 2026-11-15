package com.fixit.hostel;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

public interface StaffSkillRepository extends JpaRepository<StaffSkill, Long> {

    List<StaffSkill> findByHostelId(Long hostelId);

    @Modifying
    void deleteByHostelIdAndStaffId(Long hostelId, Long staffId);
}
