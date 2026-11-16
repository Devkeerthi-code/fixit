import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { TicketSummary } from "../../api/types";
import { PriorityTag, SlaTag, StatusPill } from "../../components/ui/StatusPill";
import { cx } from "../../lib/cx";
import { placeOf, slaText } from "../../lib/format";

interface Props {
  items: TicketSummary[];
  caption: string;
  whoLabel: string;
  who: (t: TicketSummary) => string;
  actions: (t: TicketSummary) => ReactNode;
  pendingId?: number | null;
}

/** A dense table on desktop that becomes stacked cards below 860px (see desk.css). */
export function QueueTable({ items, caption, whoLabel, who, actions, pendingId }: Props) {
  return (
    <div className="table-wrap">
      <table className="qtable">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Issue</th>
            <th scope="col">Where</th>
            <th scope="col">Priority</th>
            <th scope="col">Target</th>
            <th scope="col">{whoLabel}</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className={cx(slaText(t).startsWith("Overdue") && "is-breach", pendingId === t.id && "is-pending")} aria-busy={pendingId === t.id || undefined}>
              <td className="q-id"><Link to={`/tickets/${t.id}`}>{t.code}</Link></td>
              <td className="q-issue">
                <b><Link to={`/tickets/${t.id}`}>{t.description.length > 70 ? t.description.slice(0, 70) + "…" : t.description}</Link></b>
                <span>{t.category.name}</span>
              </td>
              <td className="q-where">{placeOf(t)}</td>
              <td className="q-prio"><PriorityTag priority={t.priority} /></td>
              <td className="q-sla"><SlaTag ticket={t} /></td>
              <td className="q-who">{who(t)}</td>
              <td className="q-status"><StatusPill status={t.status} /></td>
              <td className="q-act">{actions(t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
