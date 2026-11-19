# 3. The ticket lifecycle is a table of rules

**Status:** accepted

## Context

Six statuses, five actions, and four kinds of actor (reporter, assignee, warden, the system). Lifecycle rules spread across `if` statements in services are where "staff confirmed their own fix" bugs come from.

## Decision

`TicketStateMachine` holds one rule per action: the statuses it may start from, where it leads, and who may trigger it. Services ask it for the next status. The API asks it for `availableActions`, so the UI only shows buttons that will work.

## Alternatives

- **Spring Statemachine.** Persistence, guards and listeners, but far more than six states need, and harder to read in one screen.
- **A status enum with methods.** Close, but it mixes "who" into the domain object.

## Consequences

- The whole lifecycle fits on one screen, and `TicketStateMachineTest` checks every legal and illegal move exhaustively.
- The demo mirrors the same table in `frontend/src/demo/rules.ts`. A change in Java must be copied there, and `rules.test.ts` covers it.
