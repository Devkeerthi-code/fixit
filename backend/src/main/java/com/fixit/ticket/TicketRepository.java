package com.fixit.ticket;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * N+1 note: a ticket row shows its category, block, room, reporter and assignee. Loading those lazily
 * would fire one extra query per ticket per relation. {@link EntityGraph} tells Hibernate to fetch them
 * in the same SELECT with joins, so a page of 20 tickets costs one query (plus one COUNT for paging).
 */
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    @Override
    @EntityGraph(attributePaths = {"category", "block", "room", "room.block", "reporter", "assignee"})
    Page<Ticket> findAll(Specification<Ticket> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "block", "room", "room.block", "reporter", "assignee"})
    Optional<Ticket> findByIdAndHostelId(Long id, Long hostelId);

    Optional<Ticket> findByReporterIdAndIdempotencyKey(Long reporterId, String idempotencyKey);

    @EntityGraph(attributePaths = {"category", "block", "room", "room.block", "reporter", "assignee"})
    List<Ticket> findByHostelIdAndRoomIdAndCategoryIdAndCommonAreaFalseAndStatusIn(
            Long hostelId, Long roomId, Long categoryId, Collection<TicketStatus> statuses);
}
