# The browser-only demo

**Live:** https://devkeerthi-code.github.io/fixit/

## What a visitor sees

A dark bar across the top says it's a demo with sample data, saved only in their browser. **View as** switches the whole app to:

- **Resident**, Asha in room B-204: her tickets, nearby common-area issues, and the 30-second report form.
- **Staff**, Ravi the plumber: his queue sorted by due time, with Start and Mark fixed.
- **Warden**, Meera: the dashboard, all tickets, reassigning, and the setup screens (blocks, rooms, categories, team).

**Reset** puts the sample data back and signs out. Visitors can also sign up as someone new and set up their own hostel, or join the sample one with the codes `DEMO-RES` (residents) and `DEMO-STF` (staff).

## How it works

| Piece | File |
|---|---|
| Starts the service worker before the first render | `src/main.tsx`, `src/demo/start.ts` |
| Store in `localStorage`, photos in memory | `src/demo/db.ts` |
| Sample data (labelled, `@example.test`, no passwords) | `src/demo/seed.ts` |
| Mirrored business rules | `src/demo/rules.ts` |
| Same JSON shapes as the Java DTOs | `src/demo/views.ts` |
| One handler file per API area | `src/demo/handlers/*.ts` |
| The bar | `src/demo/DemoBar.tsx`, `src/demo/demo.css` |

Production builds never include any of this: `main.tsx` imports it dynamically, and only when `VITE_DEMO` is `"true"` (set in `frontend/.env.demo`).

## Running and building

```bash
cd frontend
npm run dev:demo     # http://localhost:3000/fixit/
npm run build:demo   # frontend/dist, plus 404.html so deep links work on Pages
```

## Refreshing the screenshots

The images in `docs/screenshots` come from the demo build, captured with headless Chrome at 1440×900 and 390×844 (phone, 2× density). Capture them as each role after **Reset**, so the sample data matches.

## Keeping it honest

When a rule changes in Java (who can do what, SLA maths, routing, response shapes), change the mirror in `src/demo` in the same pull request, and its test.
