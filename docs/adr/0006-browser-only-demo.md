# 6. The public demo runs against an in-browser API

**Status:** accepted

## Context

Recruiters and wardens need to see FixIt working in seconds, as each role, without signing up. A hosted demo backend on the free tier sleeps (30 to 60 seconds to wake), and a shared demo database fills with strangers' junk.

## Decision

- `npm run build:demo` builds the same React app with `VITE_DEMO=true` and base `/fixit/`.
- Before the first render, the app registers an MSW service worker. Handlers in `frontend/src/demo/handlers` answer every `/api` endpoint with the same JSON shapes as Spring Boot, backed by a small store in `localStorage`.
- Sample data is clearly labelled ("Demo Hostel (sample data)", `@example.test` emails, no passwords). A bar at the top switches between resident, staff and warden, and resets.
- GitHub Pages serves it from `.github/workflows/pages.yml`. `404.html` is a copy of `index.html` so deep links work.

## Alternatives

- **A seeded demo backend on Render.** More realistic, but cold starts, moderation and nightly resets.
- **Static screenshots or a video.** No moving parts, but nothing to click.

## Consequences

- The UI code is untouched. It still calls `fetch("/api/...")`, and production builds never load the demo code (dynamic import behind the flag).
- Business rules exist twice: Java is the source of truth and `src/demo/rules.ts` is a mirror. Tests on both sides catch drift in the common cases, and one did catch a mismatch in the breach-rate format.
- Each visitor's demo is private to their browser. It can't show two people working on one ticket at the same time.
