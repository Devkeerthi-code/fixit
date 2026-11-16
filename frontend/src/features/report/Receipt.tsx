import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BlockView, CategoryView, Me, TicketDetail } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { blockLabel, formatDay, formatHours, PRIORITY_LABEL, WINDOW_LABEL } from "../../lib/format";
import type { ReportValues } from "./schema";

interface Props {
  me: Me;
  values: ReportValues;
  category: CategoryView | undefined;
  blocks: BlockView[];
  photoCount: number;
  pending: boolean;
  created: TicketDetail | null;
  notice: ReactNode;
}

function placeLabel(me: Me, v: ReportValues, blocks: BlockView[]): { title: string; where: string; block: string | null } {
  const block = blocks.find((b) => b.id === v.blockId);
  if (v.commonArea) {
    const name = block?.name ?? "Common area";
    return { title: blockLabel(name), where: v.locationNote.trim() ? `${blockLabel(name)} · ${v.locationNote.trim()}` : `${blockLabel(name)} common area`, block: block?.name ?? null };
  }
  if (me.room && v.roomId === me.room.id) return { title: me.room.label, where: `Your room, ${me.room.label}`, block: me.room.blockName };
  const room = block?.rooms.find((r) => r.id === v.roomId);
  return room && block ? { title: `${block.name}-${room.number}`, where: `${block.name}-${room.number}`, block: block.name } : { title: "your room", where: "Pick a room", block: null };
}

function visitLabel(v: ReportValues): string {
  if (!v.days.length) return "Any time";
  const days = [...v.days].sort().map(formatDay).join(", ");
  return v.windows.length ? `${days} · ${v.windows.map((w) => WINDOW_LABEL[w]).join(", ")}` : `${days} · pick a window`;
}

/** The live "Your ticket" card: every choice above lands here, so nothing is a surprise after sending. */
export function Receipt({ me, values, category, blocks, photoCount, pending, created, notice }: Props) {
  const place = placeLabel(me, values, blocks);
  const hours = category?.slaHours[values.priority];
  const rows: Array<[string, string]> = [
    ["Where", place.where],
    ["Urgency", PRIORITY_LABEL[values.priority]],
    ["Photos", photoCount ? `${photoCount} added` : "None"],
    ["Visit", visitLabel(values)],
    ["Goes to", category ? `${category.name} staff${place.block ? `, ${blockLabel(place.block)}` : ""}` : "Choose a category"],
  ];
  return (
    <aside className="receipt" aria-labelledby="receipt-title">
      <p className="receipt__k">Your ticket</p>
      <h3 className="receipt__title" id="receipt-title">
        {category?.name ?? "New ticket"}, {place.title}
      </h3>
      <dl className="receipt__list">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd key={v}>{v}</dd>
          </div>
        ))}
      </dl>
      {hours !== undefined && (
        <div className="receipt__total">
          <span>Escalates</span>
          <b>to the warden after {formatHours(hours)} unfixed</b>
        </div>
      )}
      {notice}
      {created && (
        <div className="receipt__done" role="status">
          <p>
            <b>{created.ticket.code}</b> raised.{" "}
            {created.ticket.assignee ? `${created.ticket.assignee.name} has it.` : "The warden will assign it."}
          </p>
          <Link className="btn btn--small btn--outline-olive justify-self-start" to={`/tickets/${created.ticket.id}`}>
            Track {created.ticket.code}
          </Link>
        </div>
      )}
      <Button type="submit" wide pending={pending} pendingLabel="Raising ticket">
        Raise ticket
      </Button>
      <p className="receipt__fine">You get a ticket number straight away. Nothing goes to staff until you press the button.</p>
    </aside>
  );
}
