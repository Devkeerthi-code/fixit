package com.fixit.ticket;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitSlotRepository extends JpaRepository<VisitSlot, Long> {

    List<VisitSlot> findByTicketIdOrderByDayAscTimeWindowAsc(Long ticketId);
}
