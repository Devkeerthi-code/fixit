import { useState, type MouseEvent } from "react";
import { authApi } from "../../api/auth";
import { errorFromResponse } from "../../api/errors";
import { dashboardApi, type DateRange } from "../../api/inbox";
import { useDashboard } from "../../api/queries";
import { Headline } from "../../components/ui/Headline";
import { Icon } from "../../components/ui/Icon";
import { ErrorState, Skeleton } from "../../components/ui/States";
import { blockLabel, formatDay } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { Bars, Kpis, Workload } from "./DashboardPanels";

function filenameFrom(res: Response): string {
  const match = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "");
  return match?.[1] ?? "fixit-tickets.csv";
}

/**
 * Fetches the CSV and saves it from memory instead of navigating to it, so a failure shows as a toast
 * rather than a raw error page. /api/me first refreshes an expired access token.
 */
async function download(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const href = e.currentTarget.getAttribute("href") ?? "";
  try {
    await authApi.me();
    const res = await fetch(new URL(href, window.location.origin), { credentials: "include" });
    if (!res.ok) throw await errorFromResponse(res);
    const url = URL.createObjectURL(await res.blob());
    const link = Object.assign(document.createElement("a"), { href: url, download: filenameFrom(res) });
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toastError(err);
  }
}

function RangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  return (
    <div className="range">
      <div className="field">
        <label className="field__label" htmlFor="r-from">From</label>
        <input id="r-from" type="date" className="input input--sm" value={range.from ?? ""} onChange={(e) => onChange({ ...range, from: e.target.value || undefined })} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="r-to">To</label>
        <input id="r-to" type="date" className="input input--sm" value={range.to ?? ""} onChange={(e) => onChange({ ...range, to: e.target.value || undefined })} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState<DateRange>({});
  const dash = useDashboard(range);
  const shown: DateRange = dash.data ? { from: dash.data.from, to: dash.data.to } : range;

  return (
    <div className="desk">
      <section className="wrap desk-head" aria-labelledby="dash-title">
        <p className="label">( warden desk )</p>
        <Headline as="h1" size="desk" id="dash-title" lines={["How things", "_are going._"]} />
        <div className="desk-head__row">
          <p className="lede">{dash.data ? `${formatDay(dash.data.from)} to ${formatDay(dash.data.to)}` : "The last 30 days"}. Open counts are live; everything else is for this period.</p>
          <div className="range">
            <RangePicker range={shown} onChange={setRange} />
            <a className="btn btn--gold" href={dashboardApi.exportUrl(shown)} onClick={(e) => void download(e)} download>
              <Icon name="download" />
              Export CSV
            </a>
          </div>
        </div>
      </section>
      <section className="wrap" aria-label="Key numbers">
        {dash.isPending && <Skeleton rows={2} label="Loading the dashboard" />}
        {dash.isError && <ErrorState error={dash.error} onRetry={() => void dash.refetch()} />}
        {dash.data && <Kpis s={dash.data.summary} />}
      </section>
      {dash.data && (
        <section className="wrap" aria-label="Breakdowns">
          <div className="board">
          <article className="panel">
            <h2 className="panel__title">Open by category</h2>
            <Bars rows={dash.data.openByCategory} empty="Nothing open. Every ticket is closed." />
          </article>
          <article className="panel">
            <h2 className="panel__title">Open by block</h2>
            <Bars rows={dash.data.openByBlock.map((c) => ({ ...c, label: blockLabel(c.label) }))} empty="No block has open tickets." />
          </article>
          <article className="panel">
            <h2 className="panel__title">Staff workload</h2>
            <Workload staff={dash.data.staff} />
          </article>
          <article className="panel panel--wide">
            <h2 className="panel__title">
              Rooms that keep breaking <span className="panel__sub">same room, same category, twice or more</span>
            </h2>
            {dash.data.recurringRooms.length ? (
              <table className="rtable">
                <thead><tr><th scope="col">Room</th><th scope="col">Category</th><th scope="col">Times</th></tr></thead>
                <tbody>
                  {dash.data.recurringRooms.map((r) => (
                    <tr key={`${r.room}-${r.category}`}>
                      <td><b>{r.room}</b></td>
                      <td>{r.category}</td>
                      <td><span className={r.tickets >= 4 ? "times is-danger" : "times"}>{r.tickets}×</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="panel__empty">No repeats in this period. When a room needs the same fix twice, it shows up here so you can fix it properly.</p>
            )}
          </article>
          </div>
        </section>
      )}
    </div>
  );
}
