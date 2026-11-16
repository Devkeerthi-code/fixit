import { useMemo, useState } from "react";
import { useTicketList } from "../../api/queries";
import type { TicketQuery, TicketSummary } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Headline } from "../../components/ui/Headline";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { NOT_CLOSED_STATUSES } from "../../lib/format";
import { NO_FILTERS, type Filters } from "../desk/filters";
import { QueueFilters } from "../desk/QueueFilters";
import { QueueTable } from "../desk/QueueTable";
import { ReassignDialog } from "../ticket/ReassignDialog";

function toQuery(f: Filters): TicketQuery {
  return {
    sort: "DUE",
    status: f.status ? [f.status] : NOT_CLOSED_STATUSES,
    blockId: f.blockId ?? undefined,
    categoryId: f.categoryId ?? undefined,
    breached: f.overdue,
  };
}

export function AllTicketsPage() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [assigning, setAssigning] = useState<TicketSummary | null>(null);
  const query = useMemo(() => toQuery(filters), [filters]);
  const list = useTicketList(query);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const filtered = filters !== NO_FILTERS;

  return (
    <div className="desk">
      <section className="wrap desk-head" aria-labelledby="all-title">
        <p className="label">( all tickets )</p>
        <Headline as="h1" size="desk" id="all-title" lines={["Every ticket,", "_due soonest_", "first."]} />
        <p className="lede">Reassign anything that's stuck. Unassigned tickets mean nobody on the team handles that category in that block yet.</p>
      </section>
      <section className="wrap" aria-label="Tickets">
        <QueueFilters value={filters} onChange={setFilters} count={list.isSuccess ? `Showing ${items.length} of ${total}` : ""} allLabel="All not closed" />
        {list.isPending && <div className="pt-5"><Skeleton rows={3} label="Loading tickets" /></div>}
        {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
        {list.isSuccess && !items.length && (
          <EmptyState
            center
            title={filtered ? <>No tickets <em>match these filters.</em></> : <>Nothing open. <em>A quiet hostel.</em></>}
            body={filtered ? "Try another status, block or category." : "Share the resident code so people can start raising complaints."}
            action={filtered ? <Button variant="outline" size="small" onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button> : undefined}
          />
        )}
        {items.length > 0 && (
          <QueueTable
            items={items}
            caption="All tickets in your hostel"
            whoLabel="With"
            who={(t) => t.assignee?.name ?? "Unassigned"}
            actions={(t) =>
              t.status === "RESOLVED" || t.status === "CLOSED" ? null : (
                <Button size="tiny" variant="ink" onClick={() => setAssigning(t)}>{t.assignee ? "Reassign" : "Assign"}</Button>
              )
            }
          />
        )}
        {list.hasNextPage && (
          <div className="more">
            <Button variant="outline" size="small" pending={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>Show more</Button>
          </div>
        )}
      </section>
      <ReassignDialog ticket={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}
