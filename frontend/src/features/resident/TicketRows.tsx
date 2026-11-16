import { Link } from "react-router-dom";
import type { TicketSummary } from "../../api/types";
import { Icon } from "../../components/ui/Icon";
import { StatusPill } from "../../components/ui/StatusPill";
import { placeOf, timeAgo } from "../../lib/format";

export function TicketRows({ items }: { items: TicketSummary[] }) {
  return (
    <ul className="tlist">
      {items.map((t) => (
        <li key={t.id}>
          <Link to={`/tickets/${t.id}`} className="trow">
            <span className="trow__id">{t.code}</span>
            <span className="trow__body">
              <span className="trow__title">{t.description.length > 80 ? t.description.slice(0, 80) + "…" : t.description}</span>
              <span className="trow__meta">{t.category.name} · {placeOf(t)} · {timeAgo(t.createdAt)}{t.assignee ? ` · ${t.assignee.name}` : ""}</span>
            </span>
            <span className="trow__end">
              <StatusPill status={t.status} />
              <Icon name="arrow" className="ico trow__arrow" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
