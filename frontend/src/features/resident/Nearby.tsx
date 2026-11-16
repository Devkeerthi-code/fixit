import { Link } from "react-router-dom";
import { useTicketList } from "../../api/queries";
import type { Me, TicketQuery } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Headline } from "../../components/ui/Headline";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { StatusPill } from "../../components/ui/StatusPill";
import { NOT_CLOSED_STATUSES, timeAgo } from "../../lib/format";
import { AffectsButton } from "./AffectsButton";

const NEARBY: TicketQuery = { common: true, status: NOT_CLOSED_STATUSES, sort: "RECENT", size: 10 };

/** Shared problems on the mustard surface: one ticket with thirty voices beats thirty tickets. */
export function Nearby({ me }: { me: Me }) {
  const list = useTicketList(NEARBY);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const scale = Math.max(10, ...items.map((t) => t.affectedCount));

  return (
    <section className="sheet sheet--corner" id="nearby" aria-labelledby="nearby-title">
      <div className="wrap nearby">
        <header className="nearby__head">
          <p className="label">( nearby )</p>
          <Headline id="nearby-title" lines={["Already", "_reported_", "nearby."]} />
          <p className="lede">Broken for you too? Tap once. One ticket with thirty voices gets fixed faster than thirty separate tickets.</p>
        </header>
        <div className="nearby__list">
          <div className="mustard-list">
            {list.isPending && <div className="py-5"><Skeleton rows={2} onDark label="Loading common-area issues" /></div>}
            {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
            {list.isSuccess && !items.length && (
              <EmptyState
                title={<>Nothing reported <em>in common areas.</em></>}
                body="Corridors, washrooms, Wi-Fi and the mess look fine right now. If something there breaks, switch on 'It's in a common area' when you raise it."
              />
            )}
            {items.length > 0 && (
              <ul>
                {items.map((t) => (
                  <li key={t.id} className="issue">
                    <div className="issue__top">
                      <span className="issue__cat">{t.category.name} · {t.block.name}{t.locationNote ? `, ${t.locationNote}` : ""}</span>
                      <StatusPill status={t.status} />
                    </div>
                    <h3 className="issue__title">
                      <Link to={`/tickets/${t.id}`}>{t.description.length > 90 ? t.description.slice(0, 90) + "…" : t.description}</Link>
                    </h3>
                    <p className="issue__meta">
                      {t.code} · reported {timeAgo(t.createdAt)}. {t.assignee ? `${t.assignee.name} is on it.` : "Waiting for someone to be assigned."}
                    </p>
                    <AffectsButton ticket={t} isReporter={t.reporter?.id === me.id} scale={scale} />
                  </li>
                ))}
              </ul>
            )}
            {list.hasNextPage && (
              <div className="more">
                <Button variant="outline-olive" size="small" pending={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>Show more</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
