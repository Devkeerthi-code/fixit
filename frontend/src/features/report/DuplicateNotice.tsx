import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { TicketSummary } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { StatusPill } from "../../components/ui/StatusPill";
import { formatWhen, placeOf } from "../../lib/format";

export type Duplicate =
  | { kind: "room"; ticket: TicketSummary }
  | { kind: "common"; tickets: TicketSummary[] }
  | { kind: "server"; message: string };

interface Props {
  dupe: Duplicate;
  pending: boolean;
  affectingId: number | null;
  onRaiseAnyway: () => void;
  onAffectsMe: (t: TicketSummary) => void;
}

function Meta({ t }: { t: TicketSummary }) {
  return (
    <p className="dupe__meta">
      {t.code} · "{t.description.length > 70 ? t.description.slice(0, 70) + "…" : t.description}" · raised {formatWhen(t.createdAt)}
    </p>
  );
}

/** Stops duplicate tickets before they are raised: point to the open one, or add your voice to it. */
export function DuplicateNotice({ dupe, pending, affectingId, onRaiseAnyway, onAffectsMe }: Props) {
  const heading = useRef<HTMLParagraphElement>(null);
  useEffect(() => heading.current?.focus(), [dupe]);

  return (
    <div className="dupe" role="status">
      <Icon name="alert" />
      <div className="min-w-0">
        {dupe.kind === "room" && (
          <>
            <p className="dupe__title" ref={heading} tabIndex={-1}>
              You already have an open {dupe.ticket.category.name} ticket for {placeOf(dupe.ticket)} ({dupe.ticket.code}).
            </p>
            <Meta t={dupe.ticket} />
            <div className="dupe__actions">
              <Link className="btn btn--small btn--gold" to={`/tickets/${dupe.ticket.id}`}>View it</Link>
              <Button size="small" variant="outline" pending={pending} onClick={onRaiseAnyway}>Raise anyway</Button>
            </div>
          </>
        )}
        {dupe.kind === "common" && (
          <>
            <p className="dupe__title" ref={heading} tabIndex={-1}>
              {dupe.tickets.length === 1 ? "Someone has already reported this here." : `${dupe.tickets.length} open reports already match.`} Is it the same problem?
            </p>
            <ul className="dupe__list">
              {dupe.tickets.map((t) => (
                <li key={t.id} className="dupe__item">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to={`/tickets/${t.id}`} className="font-bold">{placeOf(t)}</Link>
                    <StatusPill status={t.status} />
                  </div>
                  <Meta t={t} />
                  <div className="dupe__actions">
                    <Button
                      size="small"
                      disabled={t.affectedByMe}
                      pending={affectingId === t.id}
                      onClick={() => onAffectsMe(t)}
                    >
                      {t.affectedByMe ? `You're counted (${t.affectedCount})` : `Affects me too (${t.affectedCount})`}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="dupe__actions">
              <Button size="small" variant="outline" pending={pending} onClick={onRaiseAnyway}>It's a different problem, raise it</Button>
            </div>
          </>
        )}
        {dupe.kind === "server" && (
          <>
            <p className="dupe__title" ref={heading} tabIndex={-1}>{dupe.message}</p>
            <div className="dupe__actions">
              <Button size="small" variant="outline" pending={pending} onClick={onRaiseAnyway}>Raise anyway</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
