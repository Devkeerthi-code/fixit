package com.fixit.hostel;

import com.fixit.ticket.Priority;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, Long> {

    List<SlaPolicy> findByHostelId(Long hostelId);

    Optional<SlaPolicy> findByHostelIdAndCategoryIdAndPriority(Long hostelId, Long categoryId, Priority priority);
}
