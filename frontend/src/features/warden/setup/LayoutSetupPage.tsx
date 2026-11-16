import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { hostelApi } from "../../../api/hostel";
import { keys, useLayout } from "../../../api/queries";
import type { BlockView } from "../../../api/types";
import { Button } from "../../../components/ui/Button";
import { Field } from "../../../components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "../../../components/ui/States";
import { plural } from "../../../lib/format";
import { parseRoomRanges } from "../../../lib/roomRanges";
import { toast, toastError } from "../../../lib/toast";
import { RoomCount } from "../../onboarding/RoomCount";

function useSaveLayout(onDone: () => void, message: (before: number, after: number) => string) {
  const qc = useQueryClient();
  return (before: number) => ({
    onSuccess: (blocks: BlockView[]) => {
      qc.setQueryData(keys.layout, blocks);
      toast(message(before, blocks.reduce((n, b) => n + b.rooms.length, 0)));
      onDone();
    },
    onError: toastError,
  });
}

function AddBlock({ total }: { total: number }) {
  const [name, setName] = useState("");
  const [rooms, setRooms] = useState("");
  const [error, setError] = useState<string>();
  const handlers = useSaveLayout(() => { setName(""); setRooms(""); }, (b, a) => `Block added with ${plural(a - b, "room")}.`);
  const add = useMutation({ mutationFn: hostelApi.addBlock, ...handlers(total) });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseRoomRanges(rooms);
    if (!name.trim()) return setError("Name the block, e.g. C");
    if (!parsed.ok) return setError(parsed.error);
    setError(undefined);
    add.mutate({ name: name.trim(), rooms });
  };
  return (
    <form className="setup-card" onSubmit={submit} noValidate aria-labelledby="h-add-block">
      <div className="setup-card__head"><h2 id="h-add-block">Add a block</h2></div>
      <div className="block-row">
        <Field label="Block">{(p) => <input {...p} className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Rooms">
          {(p) => (
            <>
              <input {...p} className="input" maxLength={500} placeholder="101-120, 201-220" value={rooms} onChange={(e) => setRooms(e.target.value)} />
              <RoomCount spec={rooms} />
            </>
          )}
        </Field>
        <div className="self-end"><Button type="submit" variant="ink" size="small" pending={add.isPending}>Add block</Button></div>
      </div>
      {error && <p className="field__err" role="alert">{error}</p>}
    </form>
  );
}

function BlockCard({ block, total }: { block: BlockView; total: number }) {
  const [spec, setSpec] = useState("");
  const [open, setOpen] = useState(false);
  const handlers = useSaveLayout(() => setSpec(""), (b, a) => (a > b ? `${plural(a - b, "room")} added to ${block.name}.` : `Those rooms were already in ${block.name}.`));
  const add = useMutation({ mutationFn: (rooms: string) => hostelApi.addRooms(block.id, rooms), ...handlers(total) });
  const parsed = parseRoomRanges(spec);
  const shown = open ? block.rooms : block.rooms.slice(0, 24);
  return (
    <section className="setup-card" aria-labelledby={`b-${block.id}`}>
      <div className="setup-card__head">
        <h3 id={`b-${block.id}`}>Block {block.name}</h3>
        <span className="muted text-sm">{plural(block.rooms.length, "room")}</span>
      </div>
      {block.rooms.length ? (
        <div className="rooms">
          {shown.map((r) => <span key={r.id} className="room-chip">{r.number}</span>)}
          {block.rooms.length > 24 && (
            <Button variant="text" size="tiny" onClick={() => setOpen((o) => !o)}>{open ? "Show fewer" : `Show all ${block.rooms.length}`}</Button>
          )}
        </div>
      ) : (
        <p className="muted text-sm">No rooms yet.</p>
      )}
      <form className="form-actions items-start" noValidate onSubmit={(e) => { e.preventDefault(); if (parsed.ok) add.mutate(spec); }}>
        <Field label="Add rooms" className="flex-1 min-w-[12rem]">
          {(p) => (
            <>
              <input {...p} className="input input--sm" placeholder="e.g. 301-320" value={spec} onChange={(e) => setSpec(e.target.value)} maxLength={500} />
              {spec.trim() && <RoomCount spec={spec} />}
            </>
          )}
        </Field>
        <Button type="submit" variant="outline" size="small" className="mt-6" disabled={!parsed.ok} pending={add.isPending}>Add</Button>
      </form>
    </section>
  );
}

export function LayoutSetupPage() {
  const layout = useLayout();
  if (layout.isPending) return <Skeleton rows={3} label="Loading blocks" />;
  if (layout.isError) return <ErrorState error={layout.error} onRetry={() => void layout.refetch()} />;
  const total = layout.data.reduce((n, b) => n + b.rooms.length, 0);
  return (
    <div className="setup">
      <p className="muted">{plural(layout.data.length, "block")}, {plural(total, "room")}. Existing rooms are never duplicated, so pasting an overlapping range is safe.</p>
      {layout.data.length === 0 && <EmptyState title={<>No blocks <em>yet.</em></>} body="Add your first block below." />}
      {layout.data.map((b) => <BlockCard key={b.id} block={b} total={total} />)}
      <AddBlock total={total} />
    </div>
  );
}
