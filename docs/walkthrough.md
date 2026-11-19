# A five-minute walkthrough

A script for showing FixIt in an interview or to a warden, using the live demo.

## 1. The problem (30 seconds)

Hostel complaints live in a paper register or the warden's WhatsApp. They get lost, nobody knows who's on what, and the same Wi-Fi outage is reported twenty times.

## 2. Resident (90 seconds)

1. Open the demo and tap **Resident**. Point out the room already filled in (B-204) and the open-ticket count.
2. Go to **Raise**, pick **Plumbing** and read the "covers" line. Type a description and pick a visit slot. The receipt on the side updates as you type.
3. Submit. It's auto-assigned to Ravi straight away, and the timeline shows *Reported → Assigned*.
4. Open **Nearby**: the Wi-Fi outage is one ticket with "affects me too", not twenty.

*What to say:* duplicate check before create, an idempotency key on submit, photos resized in the browser.

## 3. Staff (60 seconds)

1. Tap **Staff**. The queue is sorted by due time, and the overdue row has a red edge.
2. **Start** on the new ticket, then **Mark fixed**.

*What to say:* each button comes from the server's `availableActions`. Optimistic locking means two people can't overwrite each other.

## 4. Back to the resident (30 seconds)

Tap **Resident**, open the ticket and **Confirm** it with a rating, or **Reopen** it. A reopen goes back to the same person with a new target time, and the warden is told.

## 5. Warden (90 seconds)

1. Tap **Warden**. Walk through the KPIs: open now, past target, average time to fix, rating.
2. Open by category and block, staff workload, rooms with recurring problems.
3. **Setup**: rooms typed as ranges (`101-120`), category SLA hours, staff skills that drive auto-assignment.
4. **Export CSV**.

*What to say:* SLA escalation is idempotent because of a unique constraint, not code. Tenant isolation is an explicit `hostelId` in every query, tested from a second hostel.

## Likely questions

- *Why not microservices?* One team, one database, one deployable. The seams (routing, SLA, notifications) are separate services in code and could be split later.
- *What breaks first at scale?* Photos in Postgres, live dashboard aggregates, and polling notifications. See "Limitations" in the README.
- *How do you know the demo matches the real API?* The same rules are tested on both sides, and the demo returns the Java DTO shapes.
