package com.fixit.hostel;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HostelRepository extends JpaRepository<Hostel, Long> {

    Optional<Hostel> findByResidentInviteCode(String code);

    Optional<Hostel> findByStaffInviteCode(String code);

    boolean existsByResidentInviteCodeOrStaffInviteCode(String residentCode, String staffCode);
}
