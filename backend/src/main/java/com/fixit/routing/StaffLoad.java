package com.fixit.routing;

import java.time.Instant;

/** A staff member who could take a ticket, with how busy they are right now. */
public record StaffLoad(long staffId, long openTickets, Instant lastAssignedAt) {}
