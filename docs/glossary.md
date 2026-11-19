# Glossary

Words that mean something specific in FixIt.

- **Hostel.** Any place FixIt is set up for: a college hostel, a campus, or an apartment society. Every piece of data belongs to exactly one.
- **Block.** A building or wing inside a hostel ("A", "Tower 2"). Short names are shown as "Block A".
- **Room label.** Block and room number together, e.g. `B-204`.
- **Common area.** A corridor, washroom, mess hall or router that many people share. One ticket, with an "affects me too" count, instead of one per person.
- **Category.** The kind of problem (Plumbing, Electrical, Wi-Fi, Furniture, Housekeeping, Mess). Each has a "covers" line and target hours per priority.
- **Priority.** *Can wait*, *Normal* or *Urgent* (flooding, sparks, no power). It sets the target time.
- **SLA / target time.** When a ticket should be fixed by: creation time plus the category's hours for that priority. Defaults: 4 h urgent, 24 h normal, 72 h can wait.
- **Breach / past target.** Still open after its target time. The warden is told once per cycle.
- **SLA cycle.** Starts at 1. Reopening a ticket starts a new cycle with a fresh target time, so a second miss can be escalated again.
- **Assignee.** The staff member working on a ticket. Picked automatically (matching skill, fewest open tickets) or by the warden.
- **Skill.** A category a staff member handles, optionally limited to one block.
- **Invite code.** Eight characters without look-alikes (no 0/O, 1/I/L). Residents and staff have separate codes, and the warden can rotate them.
- **Version.** A number on every ticket that goes up on each change. Updates send the version they saw, so a stale screen can't overwrite newer work.
- **Visit slot.** A day plus a morning, afternoon or evening window when the resident is in, up to six per ticket.
