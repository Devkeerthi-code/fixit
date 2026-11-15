package com.fixit.ticket;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TicketPhotoRepository extends JpaRepository<TicketPhoto, Long> {

    /** Only ids, never bytes: the detail page lists photos, then loads each image by URL. */
    @Query("select p.id from TicketPhoto p where p.ticketId = :ticketId order by p.id")
    List<Long> findIdsByTicketId(Long ticketId);

    Optional<TicketPhoto> findByIdAndTicketIdAndHostelId(Long id, Long ticketId, Long hostelId);
}
