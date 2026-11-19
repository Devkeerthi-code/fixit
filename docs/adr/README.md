# Architecture decision records

Short notes on the choices that shape FixIt: what the situation was, what was decided, what else was considered, and what it costs.

| # | Decision | Status |
|---|---|---|
| 1 | [Store ticket photos in PostgreSQL](0001-photos-in-postgres.md) | accepted |
| 2 | [JWT access tokens in httpOnly cookies, same origin](0002-jwt-in-httponly-cookies.md) | accepted |
| 3 | [The ticket lifecycle is a table of rules](0003-state-machine-as-a-table.md) | accepted |
| 4 | [SLA escalation is made idempotent by the database](0004-idempotent-sla-escalation.md) | accepted |
| 5 | [Tenant isolation through an explicit hostelId in every query](0005-explicit-tenant-isolation.md) | accepted |
| 6 | [The public demo runs against an in-browser API](0006-browser-only-demo.md) | accepted |

A new decision gets the next number. A replaced one keeps its file and changes its status to "superseded by N".
