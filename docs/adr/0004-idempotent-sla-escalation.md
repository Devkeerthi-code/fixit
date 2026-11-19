# 4. SLA escalation is made idempotent by the database

**Status:** accepted

## Context

A scheduled job finds tickets past their target time and tells the warden. On free hosting the service sleeps, restarts and can briefly run twice during a deploy. A warden who gets the same "FX-12 is overdue" three times stops reading them.

## Decision

- `escalation` has `UNIQUE (ticket_id, sla_cycle)`. The job runs `INSERT … ON CONFLICT DO NOTHING` and only flags the ticket and notifies when a row was actually inserted.
- Candidates are selected with `FOR UPDATE SKIP LOCKED`, so two instances split the work instead of blocking each other.
- Reopening a ticket starts a new `sla_cycle`, so a second miss can be escalated again.
- The breach flag is set with plain SQL that doesn't bump `@Version`, so staff don't get false "someone else changed this" errors.

## Alternatives

- **An in-memory "already sent" set.** Lost on every restart, and wrong with two instances.
- **A distributed lock (ShedLock).** Prevents parallel runs but not a crash between notifying and recording.

## Consequences

- A crash halfway, a retry, or two instances running at once can't double-notify. `SlaEscalationIT` checks this against a real Postgres.
- While the free Render service sleeps, escalations are late, not lost: they happen on the next wake-up.
