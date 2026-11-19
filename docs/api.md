# API reference

The live, always-current version is Swagger UI at `/docs` on a running backend (`http://localhost:8080/docs` locally). This page is the map.

**Conventions**
- JSON in and out. Instants are ISO-8601 UTC strings, dates are `YYYY-MM-DD`.
- Auth is the `fx_at` cookie. Every write needs the `X-XSRF-TOKEN` header, copied from the `XSRF-TOKEN` cookie.
- Errors always look like `{ status, code, message, fieldErrors[], timestamp }`. `code` is stable and meant for code, for example `DUPLICATE`, `STALE_UPDATE`, `RATING_REQUIRED` or `BAD_ROOMS`.
- Tickets you can't see return 404, never 403.

## Auth and profile

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/auth/csrf` | anyone | sets the `XSRF-TOKEN` cookie |
| POST | `/api/auth/register` | anyone | create an account and sign in |
| POST | `/api/auth/login` | anyone | sign in (rate-limited per IP + email) |
| POST | `/api/auth/refresh` | signed in | rotate the refresh token, issue a new access token |
| POST | `/api/auth/logout` | signed in | revoke this login everywhere |
| GET | `/api/me` | signed in | who you are, your hostel and room |
| PATCH | `/api/me` | signed in | change your name or room |

## Hostel setup

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/hostels` | signed in, no hostel | set up a hostel; you become its warden |
| POST | `/api/hostels/lookup` | signed in | preview an invite code: hostel name, role it grants, rooms |
| POST | `/api/hostels/join` | signed in, no hostel | join with an invite code (resident or staff code) |
| GET / PUT | `/api/hostel` | warden | name, type, invite codes, member count |
| POST | `/api/hostel/invite-codes/rotate` | warden | new codes; the old ones stop working |
| GET | `/api/hostel/layout` | member | blocks and rooms |
| POST | `/api/hostel/blocks` | warden | add a block with rooms like `101-120, G1` |
| POST | `/api/hostel/blocks/{blockId}/rooms` | warden | add rooms to a block |
| GET | `/api/hostel/categories` | member | categories with SLA hours per priority |
| PUT | `/api/hostel/categories/{categoryId}` | warden | rename, describe, switch off, change SLA hours |
| GET | `/api/hostel/team` | warden | staff and their skills |
| PUT | `/api/hostel/team/{staffId}/skills` | warden | which categories (and blocks) someone handles; drives auto-assignment |
| PUT | `/api/hostel/team/{userId}/active` | warden | switch a staff member off or on |

## Tickets

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/tickets` | member | multipart: JSON part `ticket` plus up to 3 `photos`. Send an `Idempotency-Key` header |
| GET | `/api/tickets` | member | list with `status`, `categoryId`, `blockId`, `assigneeId`, `mine`, `assignedToMe`, `breached`, `common`, `sort=RECENT\|DUE`, `page`, `size` |
| GET | `/api/tickets/duplicates` | member | open tickets a new one would duplicate |
| GET | `/api/tickets/assignable-staff` | warden | active staff for the reassign picker |
| GET | `/api/tickets/{id}` | can see it | detail, timeline events, `availableActions` |
| POST | `/api/tickets/{id}/transitions` | depends on action | `START`, `RESOLVE`, `CONFIRM` (needs `rating`) or `REOPEN`, with the `version` you saw |
| POST | `/api/tickets/{id}/assign` | warden | reassign, with the `version` you saw |
| POST / DELETE | `/api/tickets/{id}/affects-me` | member | join or leave a common-area issue |
| GET | `/api/tickets/{id}/photos/{photoId}` | can see it | the image bytes |

## Notifications, dashboard, platform

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/notifications` | member | your latest notifications and unread count |
| POST | `/api/notifications/read` | member | mark all read |
| GET | `/api/dashboard?from&to` | warden | KPIs, open by category and block, staff load, recurring rooms |
| GET | `/api/dashboard/export.csv?from&to` | warden | tickets in the range as CSV (formula-injection safe) |
| GET | `/api/platform/stats` | platform admin | aggregate usage counts across hostels |
