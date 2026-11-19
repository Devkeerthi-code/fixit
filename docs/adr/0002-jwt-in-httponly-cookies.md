# 2. JWT access tokens in httpOnly cookies, same origin

**Status:** accepted

## Context

The SPA is on Vercel and the API on Render. Tokens kept in `localStorage` can be read by any script that gets onto the page. Cross-site cookies are increasingly blocked by browsers.

## Decision

- Short-lived (15 min) HS256 access tokens in an httpOnly `fx_at` cookie.
- Opaque refresh tokens in `fx_rt`, scoped to `/api/auth`, stored server-side only as SHA-256 hashes and rotated on every use. Reuse of an old one revokes the whole login family, with a 20-second grace window for two tabs refreshing at once.
- Vercel rewrites `/api/*` to Render, so the browser only ever talks to one origin. Cookies stay `SameSite=Lax` and CORS stays closed in production.
- Because cookies are sent automatically, CSRF protection is on: Spring's double-submit `XSRF-TOKEN` cookie and `X-XSRF-TOKEN` header.

## Alternatives

- **Server sessions.** Simpler, but they need sticky sessions or Redis once there's more than one instance.
- **Bearer tokens in memory.** No CSRF, but every reload loses the session unless the refresh token lives somewhere readable.

## Consequences

- Role changes take up to 15 minutes to reach an existing access token. Refresh re-reads the user.
- The frontend client must fetch a CSRF cookie before its first write, and again after sign-in, which clears it.
