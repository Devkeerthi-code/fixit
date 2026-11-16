import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { keys, useMe, useTicketCount, useTicketList } from "../../api/queries";
import { ticketsApi } from "../../api/tickets";
import type { TicketQuery, TicketSummary } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Headline } from "../../components/ui/Headline";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { ACTIVE_STATUSES, firstName } from "../../lib/format";
import { toast, toastError } from "../../lib/toast";
import { patchTicketInLists } from "../desk/optimistic";
import { NO_FILTERS, type Filters } from "../desk/filters";
import { QueueFilters } from "../desk/QueueFilters";
import { QueueTable } from "../desk/QueueTable";

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Morning," : h < 17 ? "Afternoon," : "Evening,";
}

function toQuery(f: Filters): TicketQuery {
  return {
    assignedToMe: true,
    sort: "DUE",
    status: f.status ? [f.status] : ACTIVE_STATUSES,
    blockId: f.blockId ?? undefined,
    categoryId: f.categoryId ?? undefined,
    breached: f.overdue,
  };
}

/** Start and resolve straight from the row. The row moves on at once; a failure puts it back. */
function useRowAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ t, action }: { t: TicketSummary; action: "START" | "RESOLVE" }) => ticketsApi.transition(t.id, { action, version: t.version }),
    onMutate: ({ t, action }) => patchTicketInLists(qc, t.id, { status: action === "START" ? "IN_PROGRESS" : "RESOLVED" }),
    onSuccess: (detail) => {
      patchTicketInLists(qc, detail.ticket.id, detail.ticket);
      qc.setQueryData(keys.ticket(detail.ticket.id), detail);
      toast(detail.ticket.status === "IN_PROGRESS" ? `${detail.ticket.code} started. The resident knows you're coming.` : `${detail.ticket.code} marked fixed. Waiting for the resident to confirm.`);
    },
    onError: (e, _v, rollback) => {
      rollback?.();
      toastError(e);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["tickets", "list"] }),
  });
}

function Strip() {
  const active = useTicketCount({ assignedToMe: true, status: ACTIVE_STATUSES });
  const overdue = useTicketCount({ assignedToMe: true, status: ACTIVE_STATUSES, breached: true });
  const working = useTicketCount({ assignedToMe: true, status: ["IN_PROGRESS"] });
  const waiting = useTicketCount({ assignedToMe: true, status: ["RESOLVED"] });
  const n = (q: { data?: number }) => (q.data === undefined ? "–" : String(q.data));
  return (
    <dl className="olive-strip">
      <div><dt>In your queue</dt><dd>{n(active)}</dd></div>
      <div className={overdue.data ? "is-alert" : undefined}><dt>Past target</dt><dd>{n(overdue)}</dd></div>
      <div><dt>Working on</dt><dd>{n(working)}</dd></div>
      <div><dt>Waiting on residents</dt><dd>{n(waiting)}</dd></div>
    </dl>
  );
}

export function StaffQueuePage() {
  const { data: me } = useMe();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const query = useMemo(() => toQuery(filters), [filters]);
  const list = useTicketList(query);
  const act = useRowAction();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const filtered = filters !== NO_FILTERS;

  return (
    <div className="desk">
      <section className="wrap desk-head" aria-labelledby="staff-title">
        <p className="label">( your queue )</p>
        <Headline as="h1" size="desk" id="staff-title" lines={[greeting(), `_${firstName(me?.name ?? "")}._`]} />
        <p className="lede">Tickets assigned to you, the one due soonest on top. Overdue rows have a red edge.</p>
      </section>
      <section className="wrap" aria-label="Ticket queue">
        <Strip />
        <QueueFilters value={filters} onChange={setFilters} count={list.isSuccess ? `Showing ${items.length} of ${total}` : ""} allLabel="All open" />
        {list.isPending && <div className="pt-5"><Skeleton rows={3} label="Loading your queue" /></div>}
        {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
        {list.isSuccess && !items.length && (
          <EmptyState
            center
            title={filtered ? <>No tickets <em>match these filters.</em></> : <>Queue clear. <em>Nice work.</em></>}
            body={filtered ? "Try a different status or block." : "New tickets for your categories land here the moment a resident raises them."}
            action={filtered ? <Button variant="outline" size="small" onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button> : undefined}
          />
        )}
        {items.length > 0 && (
          <QueueTable
            items={items}
            caption="Tickets assigned to you"
            whoLabel="Reported by"
            who={(t) => t.reporter?.name ?? "Resident"}
            pendingId={act.isPending ? act.variables?.t.id : null}
            actions={(t) =>
              t.status === "ASSIGNED" ? (
                <Button size="tiny" disabled={act.isPending} onClick={() => act.mutate({ t, action: "START" })}>Start</Button>
              ) : t.status === "IN_PROGRESS" ? (
                <Button size="tiny" variant="ink" disabled={act.isPending} onClick={() => act.mutate({ t, action: "RESOLVE" })}>Mark fixed</Button>
              ) : null
            }
          />
        )}
        {list.hasNextPage && (
          <div className="more">
            <Button variant="outline" size="small" pending={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>Show more</Button>
          </div>
        )}
      </section>
    </div>
  );
}
