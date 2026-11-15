package com.fixit.user;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @EntityGraph(attributePaths = {"hostel", "room", "room.block"})
    Optional<AppUser> findWithHostelById(Long id);

    Optional<AppUser> findByIdAndHostelId(Long id, Long hostelId);

    List<AppUser> findByHostelIdAndRoleAndActiveTrue(Long hostelId, Role role);

    @EntityGraph(attributePaths = {"room", "room.block"})
    List<AppUser> findByHostelIdAndRoleInOrderByNameAsc(Long hostelId, List<Role> roles);

    long countByHostelId(Long hostelId);
}
