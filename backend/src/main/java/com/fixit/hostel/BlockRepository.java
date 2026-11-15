package com.fixit.hostel;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockRepository extends JpaRepository<Block, Long> {

    List<Block> findByHostelIdOrderByNameAsc(Long hostelId);

    Optional<Block> findByIdAndHostelId(Long id, Long hostelId);

    boolean existsByHostelIdAndNameIgnoreCase(Long hostelId, String name);
}
