package com.fixit.ticket;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Per-hostel ticket numbers (FX-1, FX-2 ...). UPDATE ... RETURNING increments and reads in one atomic
 * statement; the row lock it takes means two tickets created at once can never get the same number.
 */
@Component
public class TicketNumbers {

    private final JdbcClient jdbc;

    public TicketNumbers(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public long next(long hostelId) {
        return jdbc.sql("UPDATE hostel SET ticket_seq = ticket_seq + 1 WHERE id = :id RETURNING ticket_seq")
                .param("id", hostelId)
                .query(Long.class)
                .single();
    }
}
