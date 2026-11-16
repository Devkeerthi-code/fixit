import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { authApi } from "../../api/auth";
import { keys, useLayout, useMe } from "../../api/queries";
import type { Me } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Headline } from "../../components/ui/Headline";
import { RoomPicker } from "../../components/ui/RoomPicker";
import { ErrorState, Skeleton } from "../../components/ui/States";
import { useSignOut } from "../../hooks/useSignOut";
import { firstName } from "../../lib/format";
import { toast, toastError } from "../../lib/toast";

const ROLE_LABEL: Record<Me["role"], string> = { RESIDENT: "Resident", STAFF: "Staff", WARDEN: "Warden" };

function ProfileForm({ me }: { me: Me }) {
  const qc = useQueryClient();
  const layout = useLayout();
  const [name, setName] = useState(me.name);
  const [blockId, setBlockId] = useState<number | null>(me.room?.blockId ?? null);
  const [roomId, setRoomId] = useState<number | null>(me.room?.id ?? null);
  const [error, setError] = useState<string>();
  const save = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (next) => {
      qc.setQueryData(keys.me, next);
      toast("Profile saved.");
    },
    onError: toastError,
  });
  const dirty = name.trim() !== me.name || roomId !== (me.room?.id ?? null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length > 80) return setError("Use 1 to 80 characters");
    setError(undefined);
    save.mutate({ name: name.trim(), ...(roomId && roomId !== me.room?.id ? { roomId } : {}) });
  };
  return (
    <form className="setup-card" onSubmit={submit} noValidate aria-labelledby="p-title">
      <div className="setup-card__head">
        <h2 id="p-title">You</h2>
        <span className="muted text-sm">{ROLE_LABEL[me.role]} · {me.hostel?.name}</span>
      </div>
      <div className="form-grid form-grid--2">
        <Field label="Name" error={error}>
          {(p) => <input {...p} className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Email" hint="Used to sign in; it can't be changed here.">
          {(p) => <input {...p} className="input" value={me.email} readOnly />}
        </Field>
      </div>
      <div className="field">
        <span className="field__label">Your room</span>
        {layout.isPending && <Skeleton rows={1} label="Loading rooms" />}
        {layout.isError && <ErrorState error={layout.error} onRetry={() => void layout.refetch()} />}
        {layout.data && (
          <RoomPicker
            blocks={layout.data}
            blockId={blockId}
            roomId={roomId}
            onChange={(b, r) => {
              setBlockId(b);
              setRoomId(r);
            }}
          />
        )}
        <p className="field__help">Your room fills in every complaint you raise, so it's one less thing to type.</p>
      </div>
      <div className="form-actions">
        <Button type="submit" variant="ink" pending={save.isPending} disabled={!dirty}>Save profile</Button>
      </div>
    </form>
  );
}

export function ProfilePage() {
  const { data: me } = useMe();
  const signOut = useSignOut();
  if (!me) return null;
  return (
    <div className="desk">
      <section className="wrap desk-head" aria-labelledby="profile-title">
        <p className="label">( profile )</p>
        <Headline as="h1" size="desk" id="profile-title" lines={["Hello,", `_${firstName(me.name)}._`]} />
      </section>
      <div className="wrap setup">
        <ProfileForm me={me} />
        <section className="setup-card" aria-labelledby="so-title">
          <div className="setup-card__head"><h2 id="so-title">Sign out</h2></div>
          <p className="muted text-sm">Signs you out on this device. Your tickets stay as they are.</p>
          <div className="form-actions">
            <Button variant="danger" pending={signOut.isPending} pendingLabel="Signing out" onClick={() => signOut.mutate()}>Sign out</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
