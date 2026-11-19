# How FixIt is tested

Three layers, each answering a different question.

## 1. Pure rules: is the logic right?

Fast unit tests with no Spring context and no database.

- **Backend:** `TicketStateMachineTest`, `RoutingPolicyTest`, `SlaCalculatorTest`, `RoomRangeParserTest`, `PhotoValidatorTest`, `CsvWriterTest`, `LoginRateLimiterTest`, `JwtServiceTest`, `InviteCodesTest`, `EntityColumnTypesTest`.
- **Frontend:** helpers in `src/lib` (dates, SLA wording, visit slots, timeline steps, retries, toasts, the spring) and the report form's zod schema.
- **Demo:** `src/demo/rules.test.ts` checks that the mirrored state machine, SLA and routing behave like the Java originals.

```bash
cd backend && ./mvnw test -Punit
cd frontend && npx vitest run src/lib src/demo/rules.test.ts
```

## 2. Against a real database: does it hold together?

`*IT` classes boot the whole app on a Testcontainers PostgreSQL, the same major version as production, and drive it through MockMvc.

- `HostelIsolationIT`: every id-taking endpoint, called from a second hostel, returns 404.
- `SecurityRulesIT`: 401/403 per role, CSRF required, tampered or expired JWTs rejected, refresh rotation and reuse detection.
- `TicketLifecycleIT`, `SlaEscalationIT`, `PersistenceIT`: lifecycle, idempotent escalation, `@Version` conflicts, and a constant query count for lists (no N+1).

These need Docker. GitHub Actions runs them on every push.

## 3. Through the UI: does a person get what they expect?

Vitest + Testing Library + MSW render real components against mocked API responses: role routing, the report form, the timeline, the API client's CSRF and refresh-on-401 behaviour.

The demo's own suites (`src/demo/*.test.ts(x)`) run the real API client against the in-browser handlers: sign-up, hostel setup, raising a ticket, the full lifecycle, reassigning, reopening, photos, notifications, the dashboard and CSV export, and switching roles in the demo bar.

## Before pushing

```bash
cd backend && ./mvnw verify
cd frontend && npm test -- --run && npm run lint && npm run build && npm run build:demo
```
