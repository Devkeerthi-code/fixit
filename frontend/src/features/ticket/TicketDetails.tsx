import type { EventView, TicketDetail } from "../../api/types";
import { ticketsApi } from "../../api/tickets";
import { formatDay, formatWhen, placeOf, PRIORITY_LABEL, STATUS_LABEL, WINDOW_LABEL } from "../../lib/format";

function describe(e: EventView): string {
  switch (e.type) {
    case "CREATED":
      return "Raised the ticket";
    case "ASSIGNED":
      return e.note ?? "Assigned";
    case "SLA_BREACHED":
      return "Missed its target time; the warden was alerted";
    case "AFFECTS_ME":
      return "Said it affects them too";
    case "RATED":
      return "Rated the fix";
    case "STATUS_CHANGED":
      return e.to ? `Moved to ${STATUS_LABEL[e.to].toLowerCase()}` : "Updated";
    default:
      return e.note ?? "Added a note";
  }
}

export function TicketBody({ detail }: { detail: TicketDetail }) {
  const { ticket } = detail;
  return (
    <div>
      <section className="detail-block" aria-labelledby="d-desc">
        <h2 id="d-desc">What's wrong</h2>
        <p className="detail-desc">{ticket.description}</p>
      </section>
      {detail.photoIds.length > 0 && (
        <section className="detail-block" aria-labelledby="d-photos">
          <h2 id="d-photos">Photos</h2>
          <div className="shots">
            {detail.photoIds.map((pid, i) => (
              <a key={pid} href={ticketsApi.photoUrl(ticket.id, pid)} target="_blank" rel="noreferrer">
                <img src={ticketsApi.photoUrl(ticket.id, pid)} alt={`Photo ${i + 1} of ${ticket.code}`} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
        </section>
      )}
      <section className="detail-block" aria-labelledby="d-slots">
        <h2 id="d-slots">When staff can come in</h2>
        {detail.visitSlots.length ? (
          <ul className="slot-list">
            {detail.visitSlots.map((s) => (
              <li key={`${s.day}-${s.window}`} className="slot">
                {WINDOW_LABEL[s.window]} <small>{formatDay(s.day)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted text-sm">Any time. No visit windows were picked.</p>
        )}
      </section>
    </div>
  );
}

export function TicketSide({ detail }: { detail: TicketDetail }) {
  const { ticket } = detail;
  const facts: Array<[string, string]> = [
    ["Where", placeOf(ticket)],
    ["Category", ticket.category.name],
    ["Urgency", PRIORITY_LABEL[ticket.priority]],
    ["Raised by", ticket.reporter?.name ?? "A resident"],
    ["With", ticket.assignee?.name ?? "Not assigned yet"],
    ["Target", formatWhen(ticket.slaDueAt)],
  ];
  if (ticket.commonArea) facts.push(["Affected", `${ticket.affectedCount} ${ticket.affectedCount === 1 ? "person" : "people"}`]);
  if (detail.rating) facts.push(["Rating", `${detail.rating}/5${detail.ratingComment ? `, "${detail.ratingComment}"` : ""}`]);
  return (
    <div>
      <section className="detail-block" aria-labelledby="d-facts">
        <h2 id="d-facts">Details</h2>
        <dl className="facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="detail-block" aria-labelledby="d-audit">
        <h2 id="d-audit">Everything that happened</h2>
        <ol className="audit">
          {detail.events.map((e, i) => (
            <li key={`${e.at}-${i}`}>
              <time dateTime={e.at}>{formatWhen(e.at)}</time>
              <p>
                {describe(e)}
                <small>{e.actor}{e.note && e.type !== "ASSIGNED" ? ` · "${e.note}"` : ""}</small>
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
