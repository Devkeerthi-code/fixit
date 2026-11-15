package com.fixit.hostel;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByHostelIdOrderByIdAsc(Long hostelId);

    Optional<Category> findByIdAndHostelId(Long id, Long hostelId);
}
