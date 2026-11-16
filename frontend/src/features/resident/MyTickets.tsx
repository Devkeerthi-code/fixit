import { useTicketList } from "../../api/queries";
import type { TicketQuery } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Headline } from "../../components/ui/Headline";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { TicketRows } from "./TicketRows";

const MINE: TicketQuery = { mine: true, sort: "RECENT", size: 10 };

export function MyTickets() {
  const list = useTicketList(MINE);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className="section" id="tickets" aria-labelledby="tickets-title">
      <div className="wrap">
        <p className="label">( my tickets )</p>
        <Headline id="tickets-title" lines={["Where", "_things_", "stand."]} />
        {list.isPending && <div className="tlist pt-6"><Skeleton rows={2} label="Loading your tickets" /></div>}
        {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
        {list.isSuccess && !items.length && (
          <EmptyState
            title={<>Nothing broken <em>right now.</em></>}
            body="When something needs fixing, raise it above. It takes thirty seconds and your ticket shows up here with every step."
            action={<a className="btn btn--outline btn--small" href="#report">Raise a complaint</a>}
          />
        )}
        {items.length > 0 && <TicketRows items={items} />}
        {list.hasNextPage && (
          <div className="more">
            <Button variant="outline" size="small" pending={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>Show older tickets</Button>
          </div>
        )}
      </div>
    </section>
  );
}
