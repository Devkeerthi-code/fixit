# Contributing

Thanks for looking. FixIt is small on purpose, so changes are easiest to review when they stay small too.

## Getting set up

See [Run locally](README.md#run-locally). The quickest way to see the UI is the demo mode, which needs no backend:

```bash
cd frontend && npm install && npm run dev:demo
```

## Before you open a pull request

```bash
cd backend && ./mvnw verify            # or ./mvnw test -Punit without Docker
cd frontend && npm test -- --run && npm run lint && npm run build && npm run build:demo
```

## Conventions

- **Commits:** conventional messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`), one logical change each.
- **Backend:** tenant data is always loaded by id **and** `hostelId`. Rules that decide who may do what belong in `TicketStateMachine` or `@PreAuthorize`, not in controllers.
- **Frontend:** strict TypeScript, no `any`. API types in `src/api/types.ts` mirror the Java DTOs one to one.
- **Demo:** if you change a business rule in Java, change its mirror in `frontend/src/demo/rules.ts` and the matching test.
- **UI copy:** plain and specific. "Ravi is on the way" beats "Status updated successfully".
- **Data:** never put real residents' names, rooms or emails in tests, screenshots or issues. Use `@example.test` addresses.
