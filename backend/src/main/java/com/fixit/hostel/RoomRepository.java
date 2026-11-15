package com.fixit.hostel;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Long> {

    @EntityGraph(attributePaths = "block")
    Optional<Room> findByIdAndHostelId(Long id, Long hostelId);

    List<Room> findByHostelIdOrderByNumberAsc(Long hostelId);

    List<Room> findByBlockId(Long blockId);
}
