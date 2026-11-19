# 5. Tenant isolation through an explicit hostelId in every query

**Status:** accepted

## Context

Many hostels share one database. A resident of one hostel must never see, or be able to probe for, another hostel's tickets, rooms or people.

## Decision

- `hostelId` comes only from the verified JWT (`AuthUser`), never from a request parameter.
- Repositories expose `findByIdAndHostelId`, never a bare `findById`, for tenant data. List filters always add the hostel condition first.
- Cross-tenant access returns **404**, not 403, so it doesn't reveal that an id exists.

## Alternatives

- **Hibernate `@Filter`.** Less code, but easy to forget to enable on one code path, and the gap is invisible in review.
- **Postgres row-level security.** Strong, but harder to test and reason about with a connection pool that reuses sessions.

## Consequences

- Every tenant query is greppable, and a missing `hostelId` stands out in review.
- `HostelIsolationIT` attacks every id-taking endpoint from a second hostel and expects 404, and checks that lists and dashboards never leak.
- Row-level security stays on the list as a second layer for later.
