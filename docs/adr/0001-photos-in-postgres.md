# 1. Store ticket photos in PostgreSQL

**Status:** accepted

## Context

A resident's photo of a leak is often the fastest way for staff to know what to bring. Photos are small (the browser resizes them to a 1280px long side and under 450 KB), there are at most three per ticket, and the whole app has to run on free tiers.

## Decision

Store photos as `bytea` in a `ticket_photo` table, written in the same transaction as the ticket. Serve them through `/api/tickets/{id}/photos/{photoId}`, which runs the same hostel and visibility checks as the ticket itself.

## Alternatives

- **S3 / Cloudflare R2 with signed URLs.** The better design at scale, but it means a second free account, a second set of credentials, and orphaned files when a ticket insert fails after the upload.

## Consequences

- No orphan files, and one access-control path to test.
- The server re-checks size (≤ 512 KB, also a `CHECK` constraint), count (≤ 3) and magic bytes (JPEG/WebP only).
- The database and its backups grow with images, and nothing comes from a CDN. Past a few thousand photos, move them to object storage and keep only keys in Postgres.
