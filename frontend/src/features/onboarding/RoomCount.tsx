import { cx } from "../../lib/cx";
import { parseRoomRanges } from "../../lib/roomRanges";

/** Live preview of what a room range expands to: "40 rooms: 101 to 120, 201 to 220". */
export function RoomCount({ spec, id }: { spec: string; id?: string }) {
  if (!spec.trim()) return <p className="block-row__count" id={id}>e.g. 101-120, 201-220</p>;
  const parsed = parseRoomRanges(spec);
  if (!parsed.ok) return <p className="field__err" id={id}>{parsed.error}</p>;
  const { rooms } = parsed;
  const sample = rooms.length > 2 ? `${rooms[0]} to ${rooms[rooms.length - 1]}` : rooms.join(", ");
  return (
    <p className={cx("block-row__count", "is-ok")} id={id} aria-live="polite">
      {rooms.length} {rooms.length === 1 ? "room" : "rooms"} · {sample}
    </p>
  );
}
