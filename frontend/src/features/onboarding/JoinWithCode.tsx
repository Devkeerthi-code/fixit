import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { hostelApi } from "../../api/hostel";
import { isApiError } from "../../api/errors";
import { keys } from "../../api/queries";
import type { HostelLookup } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { RoomPicker } from "../../components/ui/RoomPicker";
import { KIND_LABEL } from "../../lib/format";
import { toast, toastError } from "../../lib/toast";

function normalise(code: string) {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function JoinWithCode() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [found, setFound] = useState<HostelLookup | null>(null);
  const [blockId, setBlockId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);

  const lookup = useMutation({
    mutationFn: hostelApi.lookup,
    onSuccess: (h) => {
      setFound(h);
      setBlockId(null);
      setRoomId(null);
    },
    onError: (e) => {
      if (isApiError(e) && (e.status === 404 || e.status === 400)) setCodeError(e.message);
      else toastError(e);
    },
  });
  const join = useMutation({
    mutationFn: hostelApi.join,
    onSuccess: (me) => {
      toast(`Welcome to ${me.hostel?.name ?? "your hostel"}.`);
      qc.setQueryData(keys.me, me);
    },
    onError: toastError,
  });

  const onLookup = (e: FormEvent) => {
    e.preventDefault();
    const value = normalise(code);
    if (value.length < 4 || value.length > 12) {
      setCodeError("Codes are 4 to 12 letters and numbers, e.g. K7Q2MX");
      return;
    }
    setCodeError(undefined);
    lookup.mutate(value);
  };

  const resident = found?.joinsAs === "RESIDENT";
  return (
    <div className="setup">
      <form className="setup-card" onSubmit={onLookup} noValidate aria-label="Find your hostel">
        <div className="setup-card__head">
          <h2>Enter your invite code</h2>
        </div>
        <Field label="Invite code" hint="Your warden has it. It's on the notice board too." error={codeError}>
          {(p) => (
            <input
              {...p}
              className="input input--code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setFound(null);
              }}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={14}
            />
          )}
        </Field>
        <div className="form-actions">
          <Button type="submit" variant="ink" pending={lookup.isPending} pendingLabel="Checking">
            Find my hostel
          </Button>
        </div>
      </form>

      {found && (
        <section className="found" aria-live="polite" aria-label="Hostel found">
          <p className="label">( {KIND_LABEL[found.kind].toLowerCase()} found )</p>
          <p className="found__name">{found.name}</p>
          <p className="found__meta">
            {resident ? "You'll join as a resident. Pick your room so your complaints are filled in for you." : "You'll join as staff. Tickets assigned to you will show up in your queue."}
          </p>
          {resident && (
            <RoomPicker
              blocks={found.blocks}
              blockId={blockId}
              roomId={roomId}
              onChange={(b, r) => {
                setBlockId(b);
                setRoomId(r);
              }}
            />
          )}
          <div className="form-actions">
            <Button pending={join.isPending} pendingLabel="Joining" onClick={() => join.mutate({ code: normalise(code), roomId })}>
              Join {found.name}
            </Button>
            {resident && !roomId && <span className="found__meta">You can add your room later in your profile.</span>}
          </div>
        </section>
      )}
    </div>
  );
}
