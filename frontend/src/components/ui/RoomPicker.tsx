import { useId } from "react";
import type { BlockView } from "../../api/types";
import { blockLabel } from "../../lib/format";

interface Props {
  blocks: BlockView[];
  blockId: number | null;
  roomId: number | null;
  onChange: (blockId: number | null, roomId: number | null) => void;
  className?: string;
  required?: boolean;
}

/** Block first, then that block's rooms, so nobody scrolls through 400 room numbers. */
export function RoomPicker({ blocks, blockId, roomId, onChange, className, required }: Props) {
  const id = useId();
  const block = blocks.find((b) => b.id === blockId) ?? null;
  return (
    <div className={className ?? "form-grid form-grid--2"}>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-b`}>Block</label>
        <select
          id={`${id}-b`}
          className="input"
          value={blockId ?? ""}
          required={required}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null, null)}
        >
          <option value="">Choose a block</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>{blockLabel(b.name)}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-r`}>Room</label>
        <select
          id={`${id}-r`}
          className="input"
          value={roomId ?? ""}
          disabled={!block}
          required={required}
          onChange={(e) => onChange(blockId, e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{block ? "Choose your room" : "Pick a block first"}</option>
          {block?.rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.number}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
