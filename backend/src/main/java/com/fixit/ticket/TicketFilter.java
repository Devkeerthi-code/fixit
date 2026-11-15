package com.fixit.ticket;

import com.fixit.security.AuthUser;
import com.fixit.user.Role;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;

/**
 * List filters from the query string, turned into a JPA Specification (a type-safe WHERE clause).
 * The hostel condition is always added first and can't be switched off by any parameter.
 */
public record TicketFilter(
        Set<TicketStatus> status,
        Long categoryId,
        Long blockId,
        Long assigneeId,
        boolean mine,
        boolean assignedToMe,
        boolean breachedOnly,
        boolean commonOnly) {

    public Specification<Ticket> toSpec(AuthUser me) {
        long hostelId = me.requireHostel();
        return (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            where.add(cb.equal(root.get("hostelId"), hostelId));
            if (me.role() == Role.RESIDENT) {
                // residents only ever see their own tickets and shared common-area ones
                where.add(cb.or(cb.equal(root.get("reporter").get("id"), me.userId()), cb.isTrue(root.get("commonArea"))));
            }
            if (status != null && !status.isEmpty()) {
                where.add(root.get("status").in(status));
            }
            if (categoryId != null) {
                where.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (blockId != null) {
                where.add(cb.equal(root.get("block").get("id"), blockId));
            }
            if (assigneeId != null) {
                where.add(cb.equal(root.get("assignee").get("id"), assigneeId));
            }
            if (mine) {
                where.add(cb.equal(root.get("reporter").get("id"), me.userId()));
            }
            if (assignedToMe) {
                where.add(cb.equal(root.get("assignee").get("id"), me.userId()));
            }
            if (breachedOnly) {
                where.add(cb.isNotNull(root.get("slaBreachedAt")));
            }
            if (commonOnly) {
                where.add(cb.isTrue(root.get("commonArea")));
            }
            return cb.and(where.toArray(Predicate[]::new));
        };
    }
}
