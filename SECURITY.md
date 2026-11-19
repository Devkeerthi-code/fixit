# Security

FixIt stores residents' names, emails and room numbers, so security reports are taken seriously.

## Reporting a problem

Please **don't open a public issue**. Use GitHub's private reporting instead:
[Report a vulnerability](https://github.com/Devkeerthi-code/fixit/security/advisories/new).

Include what you found, how to reproduce it, and what someone could do with it. I'll reply within a week.

## What's in scope

- Anything that lets one hostel see or change another hostel's data. Every query is scoped by the `hostelId` in the verified JWT, and `HostelIsolationIT` tests this, so a gap here is the most serious kind of bug.
- Getting around sign-in, role checks (`@PreAuthorize`), CSRF protection or refresh-token rotation.
- Uploads that get past the photo checks (size, count, JPEG/WebP magic bytes).
- CSV export formula injection (cells starting with `=`, `+`, `-` or `@` are defused).

## Out of scope

- The GitHub Pages demo. It has no server and no real data: everything runs in your own browser.
- Rate limits on the free hosting tiers, and cold-start delays on Render.
