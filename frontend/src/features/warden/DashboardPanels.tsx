import type { Count, Dashboard, StaffLoad } from "../../api/types";
import { vars } from "../../lib/cx";

export function Kpis({ s }: { s: Dashboard["summary"] }) {
  const rate = s.slaBreachRate;
  return (
    <dl className="olive-strip olive-strip--six">
      <div><dt>Open now</dt><dd>{s.open}</dd><p>not yet closed</p></div>
      <div><dt>Raised</dt><dd>{s.created}</dd><p>in this period</p></div>
      <div><dt>Closed</dt><dd>{s.closed}</dd><p>confirmed by residents</p></div>
      <div>
        <dt>Avg time to fix</dt>
        <dd>{s.avgResolutionHours ?? "–"}{s.avgResolutionHours !== null && <small>h</small>}</dd>
        <p>raised to marked fixed</p>
      </div>
      <div className={rate > 5 ? "is-alert" : undefined}>
        <dt>Past target</dt>
        <dd>{rate}<small>%</small></dd>
        <p>{rate > 5 ? "aim for under 5%" : "on track"}</p>
      </div>
      <div>
        <dt>Resident rating</dt>
        <dd>{s.avgRating ?? "–"}{s.avgRating !== null && <small>/5</small>}</dd>
        <p>{s.avgRating === null ? "no ratings yet" : "average of closed tickets"}</p>
      </div>
    </dl>
  );
}

/** Plain CSS bars: no chart library, so the warden chunk stays small on cheap phones. */
export function Bars({ rows, empty }: { rows: Count[]; empty: string }) {
  if (!rows.length) return <p className="panel__empty">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="bars__k" title={r.label}>{r.label}</span>
          <span className="bars__track" aria-hidden="true"><span className="bars__fill" style={vars({ "--p": r.count / max })} /></span>
          <span className="bars__n">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

export function Workload({ staff }: { staff: StaffLoad[] }) {
  if (!staff.length) return <p className="panel__empty">No staff yet. Share the staff code from Setup so tickets have someone to go to.</p>;
  const max = Math.max(...staff.map((s) => s.open), 1);
  return (
    <ul className="load">
      {staff.map((s) => (
        <li key={s.id}>
          <span>{s.name}</span>
          <span className="load__n">{s.open} open · {s.resolved} fixed{s.avgRating !== null ? ` · ${s.avgRating}/5` : ""}</span>
          <span className="load__track" aria-hidden="true"><span className="load__fill" style={vars({ "--p": s.open / max })} /></span>
        </li>
      ))}
    </ul>
  );
}
