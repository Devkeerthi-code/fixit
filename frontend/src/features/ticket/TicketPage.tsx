import { Link, useNavigate, useParams } from "react-router-dom";
import { isApiError } from "../../api/errors";
import { useTicket } from "../../api/queries";
import { Icon } from "../../components/ui/Icon";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { PriorityTag, SlaTag, StatusPill } from "../../components/ui/StatusPill";
import { placeOf } from "../../lib/format";
import { ConfirmFix } from "./ConfirmFix";
import { TicketBody, TicketSide } from "./TicketDetails";
import { Timeline } from "./Timeline";
import { WorkActions } from "./WorkActions";

function splitTitle(text: string): [string, string] {
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return [text, ""];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

export function TicketPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ticketId = Number(id);
  const query = useTicket(ticketId);

  const back = (
    <button type="button" className="back bg-transparent" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
      <Icon name="chev" /> Back
    </button>
  );

  if (!Number.isFinite(ticketId) || (query.isError && isApiError(query.error) && query.error.status === 404)) {
    return (
      <div className="wrap desk-head">
        {back}
        <EmptyState title={<>We couldn't find <em>that ticket.</em></>} body="It may belong to another hostel, or the link is old." action={<Link className="btn btn--outline btn--small" to="/">Go home</Link>} />
      </div>
    );
  }
  if (query.isPending) {
    return (
      <div className="wrap desk-head">
        {back}
        <div className="ticket"><Skeleton rows={2} onDark label="Loading ticket" /></div>
      </div>
    );
  }
  if (query.isError) {
    return <div className="wrap desk-head">{back}<ErrorState error={query.error} onRetry={() => void query.refetch()} /></div>;
  }

  const detail = query.data;
  const { ticket } = detail;
  const [first, rest] = splitTitle(ticket.description.length > 90 ? ticket.description.slice(0, 90) + "…" : ticket.description);
  return (
    <div className="wrap desk-head">
      {back}
      <article className="ticket on-olive" aria-labelledby="ticket-title">
        <header className="ticket__head">
          <div className="min-w-0">
            <p className="ticket__id">{ticket.code} · {ticket.category.name} · {placeOf(ticket)}</p>
            <h1 className="ticket__title" id="ticket-title">
              {first} {rest && <em>{rest}</em>}
            </h1>
          </div>
          <div className="ticket__badges">
            <StatusPill status={ticket.status} />
            <PriorityTag priority={ticket.priority} />
            <SlaTag ticket={ticket} />
          </div>
        </header>
        <Timeline detail={detail} />
        <ConfirmFix detail={detail} />
        <WorkActions detail={detail} />
      </article>
      <div className="detail-grid">
        <TicketBody detail={detail} />
        <TicketSide detail={detail} />
      </div>
    </div>
  );
}
