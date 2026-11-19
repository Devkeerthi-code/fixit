# FixIt

[![CI](https://github.com/Devkeerthi-code/fixit/actions/workflows/ci.yml/badge.svg)](https://github.com/Devkeerthi-code/fixit/actions/workflows/ci.yml)
[![Demo on GitHub Pages](https://github.com/Devkeerthi-code/fixit/actions/workflows/pages.yml/badge.svg)](https://devkeerthi-code.github.io/fixit/)

Complaint and maintenance ticketing for hostels, campuses and apartment societies: residents report a problem in under 30 seconds, it goes straight to the right staff member, and anything left undone escalates to the warden on its own.

**Try it now:** [devkeerthi-code.github.io/fixit](https://devkeerthi-code.github.io/fixit/). A browser-only demo with sample data: tap **Resident**, **Staff** or **Warden** in the top bar to see each side. Nothing you type leaves your browser.

**Full app (with the real backend):** TODO: add the Vercel link after deploying · **API docs:** TODO: `https://<your-render-service>.onrender.com/docs`

## Who is this for and what problem does it solve?

**Hostel residents, wardens and maintenance staff** in college hostels, campuses and apartment societies.

Today, complaints such as a leaking tap, a dead fan, Wi-Fi down in Block B or broken mess food go into a paper register or the warden's WhatsApp. Then:

- complaints get lost in the chat scroll;
- nobody knows who is handling what, or whether anyone is;
- the same Wi-Fi outage is reported 20 times by 20 people;
- nothing escalates when work isn't done. The resident just keeps asking.

FixIt fixes each of those:
- **One ticket per problem.** Duplicates are caught before they're created, and common-area issues collect "affects me too" instead of 20 copies.
- **Clear ownership.** Every ticket is auto-assigned to the least-busy staff member who handles that category in that block.
- **Visible progress.** The resident sees a timeline: reported → assigned → on the way → fixed.
- **Automatic escalation.** If a ticket misses its target time, the warden is told, exactly once.

## Screenshots

Captured from the demo (sample data).

| Resident home | Ticket timeline |
|---|---|
| ![Resident home with room and open tickets](docs/screenshots/02-resident-home.png) | ![Timeline from reported to fixed](docs/screenshots/03-ticket-timeline.png) |
| **Staff queue** | **Warden dashboard** |
| ![Staff queue sorted by due time](docs/screenshots/04-staff-queue.png) | ![Warden dashboard with KPIs and workload](docs/screenshots/05-warden-dashboard.png) |

On a phone:

<p>
  <img src="docs/screenshots/06-phone-raise.png" alt="Raising a complaint on a phone" width="260">
  <img src="docs/screenshots/07-phone-dashboard.png" alt="Warden dashboard on a phone" width="260">
</p>

## Features

- **Multi-hostel.** Any hostel or society sets itself up from the website: name, blocks, rooms typed as ranges (`101-120, 201-220`), categories and staff. Residents and staff join with separate invite codes. Every query is scoped to the caller's hostel, and integration tests prove that hostels can't see each other.
- **Accounts.** Email + password (BCrypt), with JWT access + refresh tokens in httpOnly cookies. Refresh tokens rotate on every use, and reuse is detected. Roles are resident, staff, warden, and platform admin (from `ADMIN_EMAILS`).
- **Raise a complaint in under 30 seconds.**
  - Category tabs, each with a short line on what it covers.
  - Room auto-filled from the profile, or a common area.
  - Priority, up to 3 photos (resized in the browser) and preferred visit slots on a calendar.
- **Duplicates and common areas.** You're warned before creating a duplicate (same room + category still open). A common-area issue is one ticket with an "affects me too" counter.
- **Routing.** Auto-assign by category and block to the staff member with the fewest open tickets. Wardens can reassign.
- **Ticket lifecycle as an explicit state machine.** Open → Assigned → In progress → Resolved → Closed, plus Reopened. Illegal moves are rejected. The resident confirms the fix and rates it.
  - **Full audit log:** who did what, when.
  - **Optimistic locking:** two staff can't overwrite each other's updates.
- **SLAs.** Target hours per category and priority. A scheduled job escalates breaches to the warden idempotently: never twice for the same breach. Resolved tickets auto-close after 72 hours.
- **In-app notifications** for assignments, status changes and escalations.
- **Warden dashboard.** Open tickets by category and block, average resolution time, SLA breach rate, staff workload, rooms with recurring problems, and CSV export.
- **Usage tracking:** aggregate daily counts only, with no user ids or IPs.
- **API docs:** OpenAPI / Swagger UI at `/docs`.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Java 21, Spring Boot 3.5 (Web, Security, Data JPA, Validation, Actuator), Maven |
| Database | PostgreSQL 16 (Neon in production), Flyway migrations, Hibernate |
| Auth | Spring Security, BCrypt, JJWT (HS256), httpOnly cookies, CSRF double-submit |
| Frontend | React + TypeScript + Vite + Tailwind, React Router, TanStack Query, react-hook-form + zod |
| Tests | JUnit 5, Mockito, Testcontainers (real Postgres in Docker), MockMvc; Vitest + Testing Library + MSW |
| Delivery | Docker, docker-compose, GitHub Actions; Render (backend), Vercel (frontend), Neon (DB) |

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI[React SPA<br/>TanStack Query]
    end
    subgraph Vercel
        Static[Static files]
        Rewrite["/api/* rewrite"]
    end
    subgraph Render["Render (Docker)"]
        direction TB
        Filters[Security filter chain<br/>JWT cookie + CSRF]
        Controllers[Controllers<br/>DTOs + Bean Validation]
        Services[Services<br/>@PreAuthorize, @Transactional]
        Repos[Repositories<br/>Spring Data JPA + JdbcClient]
        Job[["@Scheduled SLA job"]]
        Filters --> Controllers --> Services --> Repos
        Job --> Services
    end
    DB[(Neon PostgreSQL<br/>Flyway schema)]
    UI -->|same origin| Static
    UI -->|fetch /api, cookies| Rewrite --> Filters
    Repos --> DB
```

**Request path, e.g. a staff member pressing "Start visit":**
1. The browser sends `POST /api/tickets/42/transitions` with the `fx_at` cookie and the `X-XSRF-TOKEN` header.
2. `JwtCookieFilter` verifies the JWT and puts an `AuthUser(userId, hostelId, role)` into the security context.
3. `TicketController` validates the body (`@Valid`) and calls `TicketCommandService.transition`.
4. That service loads the ticket by **id + hostelId**, checks the version the client saw, asks `TicketStateMachine` whether this actor may make this move, updates the ticket, appends an audit event and creates a notification. All of this happens in one database transaction.
5. Any exception becomes the same JSON error shape in `GlobalExceptionHandler`.

### Ticket state machine

```mermaid
stateDiagram-v2
  [*] --> OPEN: resident reports
  OPEN --> ASSIGNED: auto-route / warden
  ASSIGNED --> ASSIGNED: warden reassigns
  ASSIGNED --> IN_PROGRESS: staff starts ("on the way")
  IN_PROGRESS --> ASSIGNED: warden reassigns
  IN_PROGRESS --> RESOLVED: staff marks fixed
  RESOLVED --> CLOSED: resident confirms + rates (or 72h auto-close)
  RESOLVED --> REOPENED: resident says "not fixed"
  REOPENED --> ASSIGNED: back to same staff / re-routed
  CLOSED --> [*]
```

### Data model

```mermaid
erDiagram
  HOSTEL ||--o{ BLOCK : has
  BLOCK  ||--o{ ROOM : has
  HOSTEL ||--o{ CATEGORY : defines
  CATEGORY ||--o{ SLA_POLICY : "hours per priority"
  HOSTEL ||--o{ APP_USER : members
  APP_USER ||--o{ STAFF_SKILL : handles
  HOSTEL ||--o{ TICKET : owns
  TICKET ||--o{ TICKET_PHOTO : "max 3"
  TICKET ||--o{ VISIT_SLOT : preferred
  TICKET ||--o{ TICKET_EVENT : "audit log"
  TICKET ||--o{ TICKET_AFFECTED : "affects me too"
  TICKET ||--o{ ESCALATION : "one per SLA cycle"
  APP_USER ||--o{ NOTIFICATION : receives
  APP_USER ||--o{ REFRESH_TOKEN : sessions
```

The schema is in [`V1__init.sql`](backend/src/main/resources/db/migration/V1__init.sql). Highlights:
- UNIQUE constraints: `(hostel_id, number)`, `(ticket_id, sla_cycle)`, case-insensitive emails via `citext`.
- CHECK constraints: rating 1–5, photo ≤ 512 KB, a room ticket must have a room.
- A partial index on `sla_due_at` covers only open tickets.

## Java and Spring concepts used (and where)

These are the things I learned building this, with a pointer to where each one is in the code.

| Concept | What it is | Where |
|---|---|---|
| **Dependency injection** | Spring creates objects ("beans") and passes them into constructors, so classes don't build their own dependencies. That makes them easy to test with mocks. | Every `@Service` constructor, e.g. `TicketCommandService` |
| **Layered architecture** | Controller (HTTP) → Service (business rules, transactions) → Repository (database). Controllers never touch entities directly. | `ticket/` package |
| **DTOs + records** | Java `record`s are immutable data carriers. Entities stay inside the service layer, and records go over the wire. | `TicketDtos`, `HostelDtos` |
| **Bean Validation** | `@NotBlank`, `@Size`, `@Email` on request records. `@Valid` makes Spring reject bad input with 400 before my code runs. | `TicketDtos.CreateTicketRequest` |
| **Global exception handler** | One `@RestControllerAdvice` turns every exception into the same `{status, code, message, fieldErrors}` JSON. | `GlobalExceptionHandler` |
| **Spring Data JPA** | Repository interfaces whose method names become queries (`findByIdAndHostelId`). `JpaSpecificationExecutor` builds dynamic WHERE clauses. | `TicketRepository`, `TicketFilter` |
| **@Transactional** | Everything in the method commits together or rolls back together, e.g. a ticket, its audit event and its notification. | `TicketCommandService.create` |
| **Optimistic locking** | `@Version` adds `WHERE version = ?` to updates. If someone else saved first, zero rows match, and that becomes a 409 instead of a silent overwrite. | `Ticket.version` |
| **Flyway** | Versioned SQL migrations run on startup. Hibernate only *validates* the schema (`ddl-auto=validate`), it never changes it. | `db/migration/V1__init.sql` |
| **Spring Security filter chain** | Every request passes through filters. Mine reads the JWT cookie, and Spring's handles CSRF, then authorisation rules. | `SecurityConfig`, `JwtCookieFilter` |
| **Method security** | `@PreAuthorize("hasRole('WARDEN')")` on service methods: the role check sits next to the logic it protects. | `HostelAdminService`, `DashboardService` |
| **@Scheduled** | Runs a method on a timer in the background. `fixedDelay` means runs never overlap within one instance. | `SlaEscalationJob` |
| **@ConfigurationProperties** | Typed config: `app.*` from `application.yml` becomes the `AppProperties` record. | `AppProperties` |
| **Testcontainers** | Integration tests start a real PostgreSQL in Docker, so tests hit the same database engine as production, not H2. | `support/IntegrationTest` |

### How N+1 queries are avoided

"N+1" means loading 20 tickets with one query, then firing one more query per ticket for its category, room, assignee and so on: 1 + 20×5 queries. FixIt avoids it in four ways:

1. **`@EntityGraph`** on repository methods (`TicketRepository.findAll(spec, pageable)`) tells Hibernate to fetch category, block, room, reporter and assignee in the same SELECT with joins.
2. **Batch queries for derived data.** "Affects me too" counts for a whole page come from one `GROUP BY` query (`AffectedRepository.countByTicket`), not one count per ticket.
3. **Photos live in their own table** and are never loaded in lists, only by id when an `<img>` asks for one.
4. **`spring.jpa.open-in-view=false`**, so lazy loading can't sneak queries into the JSON rendering.

`PersistenceIT.listingTicketsCostsTheSameNumberOfQueriesForTwoOrTwelveTickets` proves it: listing 2 tickets and listing 12 run the same number of SQL statements (at most 2: the page and the count).

## Design decisions

1. **Photos stored in PostgreSQL (`bytea`), not object storage.**
   - *Why:* one free-tier service (Neon) instead of adding S3 or R2. Photos commit in the same transaction as the ticket, so there are no orphan files. Access control is the same code path as the ticket (`/api/tickets/{id}/photos/{pid}` checks hostel and visibility).
   - *Limits:* the browser resizes to a 1280px long side and under 450 KB. The server re-checks the size (≤ 512 KB, also a DB CHECK constraint), the count (≤ 3) and the magic bytes (JPEG/WebP only, never trusting `Content-Type`).
   - *Trade-off:* the database grows with images (about 1 MB per ticket at most), backups get bigger, and images don't come from a CDN. At scale I'd move them to object storage with signed URLs and keep only keys in Postgres.
2. **JWT in httpOnly cookies, served same-origin through a Vercel rewrite.**
   - *Why:* tokens in `localStorage` can be stolen by any XSS. httpOnly cookies can't be read by JavaScript.
   - *Same origin:* Vercel forwards `/api/*` to Render, so the browser sees one site. Cookies stay `SameSite=Lax`, there are no third-party-cookie problems, and CORS stays closed.
   - *CSRF:* cookies are sent automatically, so CSRF matters. Spring's double-submit token (`XSRF-TOKEN` cookie → `X-XSRF-TOKEN` header) covers it.
   - *Refresh tokens* are opaque, stored only as SHA-256 hashes, and rotated on every use. Reusing an old one revokes the whole login. There is a 20-second grace window, so two tabs refreshing at once don't log you out.
   - *Alternative considered:* server sessions. They're simpler, but they need sticky sessions or Redis on more than one instance.
3. **The state machine is a table of rules, not `if`s spread across services.** `TicketStateMachine` lists, for each action, the allowed "from" states, the target and who may trigger it. The whole lifecycle is reviewable in one screen, unit-tested exhaustively, and the UI asks it for `availableActions` so it only shows buttons that will work. *Alternative:* Spring Statemachine, which is too heavy for six states.
4. **SLA escalation is idempotent because of the database, not the code.**
   - `escalation` has `UNIQUE (ticket_id, sla_cycle)`, and the job does `INSERT … ON CONFLICT DO NOTHING`. Only when a row was actually inserted does it flag the ticket and notify. A crash halfway, a retry or two instances running at once can't double-notify.
   - `FOR UPDATE SKIP LOCKED` makes two instances split the work instead of fighting over it.
   - Reopening starts a new `sla_cycle`, so the same ticket can be escalated again for the new miss.
   - Marking a breach uses plain SQL that doesn't bump `@Version`, so staff aren't hit with false "someone else changed it" errors.
5. **Tenant isolation through explicit `hostelId` in every query.**
   - `hostelId` comes only from the verified JWT. Repositories have `findByIdAndHostelId`, never a bare `findById`, for tenant data.
   - Cross-tenant access returns 404, not 403, so it doesn't reveal that an id exists.
   - *Alternatives:* a Hibernate `@Filter`, which is easy to forget to enable on a code path, or Postgres row-level security, which is strong but harder to test and reason about with a connection pool. I chose the explicit, greppable version and backed it with `HostelIsolationIT`, which attacks every id-taking endpoint from another hostel.

## Run locally

**Requirements:** Java 21, Docker (for Postgres and the integration tests), Node 20+.

```bash
cp .env.example .env              # then set JWT_SECRET (and ADMIN_EMAILS)

# 1. Database + backend in Docker
docker compose up --build         # API on http://localhost:8080, Swagger UI on http://localhost:8080/docs

# 2. Frontend (separate terminal)
cd frontend && npm install && npm run dev   # http://localhost:3000 (proxies /api to the backend's PORT, default 8080)
```

To run the backend without Docker (needs JDK 21), point `DB_URL`, `DB_USERNAME` and `DB_PASSWORD` in `.env` at Neon or at a locally installed PostgreSQL (`jdbc:postgresql://localhost:5432/fixit`), then run `cd backend && ./mvnw spring-boot:run`. The app reads `../.env` itself and Flyway creates the schema on first start. If port 8080 is already in use, set `PORT=8081` in `.env`; the frontend proxy follows it.

### Tests

```bash
cd backend && ./mvnw verify          # unit + Testcontainers integration tests (needs Docker running)
cd backend && ./mvnw test -Punit     # unit tests only, no Docker needed
cd frontend && npm test -- --run && npm run lint && npm run build
```

| Suite | What it proves |
|---|---|
| `TicketStateMachineTest` | every legal transition works; every illegal one is 409; every actor rule (e.g. staff can't confirm their own fix) |
| `RoutingPolicyTest` | fewest open tickets wins; tie-breaks are fair and deterministic |
| `SlaCalculatorTest`, `SlaEscalationServiceTest` | due times; escalation happens once, even when the DB says it already happened |
| `RoomRangeParserTest`, `CsvWriterTest`, `PhotoValidatorTest`, `LoginRateLimiterTest` | input parsing, CSV escaping and formula-injection defusing, magic-byte checks, rate limits |
| `HostelIsolationIT` | every id-taking endpoint returns 404 when called from another hostel; lists and dashboards never leak |
| `SecurityRulesIT` | 401/403 rules per role, CSRF required, expired/tampered JWTs rejected, refresh rotation + reuse detection, no user enumeration |
| `TicketLifecycleIT` | auto-routing, duplicates, idempotent create, full lifecycle with audit trail, stale versions, reopen, reassign, "affects me too" |
| `SlaEscalationIT` | real-DB escalation exactly once per cycle, no version bump, re-escalation after reopen, 72h auto-close |
| `PersistenceIT` | `@Version` conflict, constant query count for lists (no N+1), DB constraints |

## Deploy (free tiers)

**1. Database: Neon**
1. Create a project at neon.tech and copy the connection string.
2. Convert it for Java: `postgresql://USER:PASS@HOST/DB?sslmode=require` becomes:
   - `DB_URL=jdbc:postgresql://HOST/DB?sslmode=require`
   - `DB_USERNAME=USER`
   - `DB_PASSWORD=PASS`
3. Use the host **without** `-pooler`, because Flyway migrations need a direct connection.

**2. Backend: Render (Docker)**
1. Push the repo to GitHub. In Render, choose *New → Blueprint* and pick the repo. `render.yaml` creates the `fixit-backend` web service from `backend/Dockerfile`.
2. Set these env vars:
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`;
   - `ADMIN_EMAILS`;
   - `APP_ORIGIN` = your Vercel URL;
   - `JWT_SECRET` is generated for you, and `COOKIE_SECURE=true` is already set.
3. Deploy. Flyway creates the schema on first start. Check `https://<service>.onrender.com/actuator/health`.
4. **Cold starts:** free Render services sleep after about 15 minutes idle. The first request after that takes roughly 30–60 seconds while the JVM starts, and the frontend shows a "waking up the server" state. The SLA job only runs while the service is awake. A free uptime pinger (e.g. UptimeRobot every 10 min on `/actuator/health`) keeps it warm, within Render's free hours.

**3. Frontend: Vercel**
1. In `frontend/vercel.json`, replace `YOUR-RENDER-SERVICE` with your Render service name. This rewrite is what makes the API same-origin.
2. In Vercel, *Add New → Project*, import the repo and set **Root Directory = `frontend`**. Framework: Vite. No env vars are needed.
3. Deploy, then put the Vercel URL in Render's `APP_ORIGIN` and in the "Live demo" line at the top of this README.

## Limitations and what breaks at scale

- **Render free tier sleeps.** There are cold starts and the SLA job pauses while it sleeps. Escalations still happen, but late, on the next wake-up.
- **Photos in Postgres** grow the database and skip any CDN. Past a few thousand photos, move them to object storage.
- **Rate limiting is in memory**, so it's per instance. With several instances it needs Redis or a gateway.
- **Notifications are polled every 30 seconds**, not pushed. Fine for hundreds of users. For thousands, use SSE or WebSockets.
- **Role changes take up to 15 minutes to apply.** The role lives in the access token, so a deactivated staff member keeps access until it expires. Refresh re-reads the user from the database.
- **Routing has no lock across concurrent creates.** Two tickets raised in the same instant may both go to the same least-busy person. That's harmless, but not perfectly balanced.
- **One hostel per user.** Staff working across several societies need separate accounts.
- **No email/SMS/WhatsApp notifications yet.** People must open the app to see updates.
- **The dashboard computes aggregates live.** Fine for one hostel's data. At very large volumes it would need materialised views or nightly rollups.

## What I learned

- How Spring Security's filter chain works end to end: why CSRF protection comes back the moment you put a JWT in a cookie, and why the custom filter must not be a `@Component` (or Boot registers it twice).
- That the database is the best place for invariants. The unique constraint behind idempotent escalation is simpler and more reliable than any in-memory "already sent" check.
- Optimistic locking needs two layers: `@Version` for concurrent writes in the database, plus the client sending the version it *saw*, so a stale screen can't overwrite newer work.
- How to measure N+1 instead of guessing: Hibernate statistics in an integration test.

## What I'd improve next

- WhatsApp/email notifications for assignments and escalations, since that's where residents already are.
- Move photos to object storage with signed URLs, and add an image thumbnail pipeline.
- Server-Sent Events for live ticket updates, and Postgres row-level security as a second isolation layer.

---

**GitHub "About":** Complaint & maintenance ticketing for hostels and societies: 30-second reporting, auto-routing, SLA escalation. Spring Boot 3 + React.

**Topics:** `spring-boot` · `java` · `react` · `postgresql` · `testcontainers`
