import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { hostelApi } from "../../../api/hostel";
import { keys } from "../../../api/queries";
import type { HostelSettings } from "../../../api/types";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Field } from "../../../components/ui/Field";
import { ErrorState, Skeleton } from "../../../components/ui/States";
import { applyServerErrors } from "../../../lib/forms";
import { KINDS, KIND_LABEL } from "../../../lib/format";
import { toast, toastError } from "../../../lib/toast";
import { InviteCodes } from "../../onboarding/InviteCodes";

const schema = z.object({
  name: z.string().trim().min(1, "Name your hostel").max(120, "Keep it under 120 characters"),
  kind: z.enum(["HOSTEL", "CAMPUS", "SOCIETY"]),
});
type Values = z.infer<typeof schema>;

function NameForm({ settings }: { settings: HostelSettings }) {
  const qc = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: settings.name, kind: settings.kind } });
  useEffect(() => form.reset({ name: settings.name, kind: settings.kind }), [settings.name, settings.kind, form]);
  const save = useMutation({
    mutationFn: hostelApi.update,
    onSuccess: (s) => {
      qc.setQueryData(keys.settings, s);
      void qc.invalidateQueries({ queryKey: keys.me });
      toast("Saved.");
    },
    onError: (e) => applyServerErrors(e, form.setError, ["name", "kind"]),
  });
  return (
    <form className="setup-card" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} aria-labelledby="h-name">
      <div className="setup-card__head"><h2 id="h-name">Name and kind</h2><span className="muted text-sm">{settings.members} members</span></div>
      <div className="form-grid form-grid--2">
        <Field label="Name" error={form.formState.errors.name?.message}>
          {(p) => <input {...p} className="input" {...form.register("name")} />}
        </Field>
        <Field label="Kind">
          {(p) => (
            <select {...p} className="input" {...form.register("kind")}>
              {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          )}
        </Field>
      </div>
      <div className="form-actions">
        <Button type="submit" variant="ink" size="small" pending={save.isPending} disabled={!form.formState.isDirty}>Save</Button>
      </div>
    </form>
  );
}

function Codes({ settings }: { settings: HostelSettings }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const rotate = useMutation({
    mutationFn: hostelApi.rotateCodes,
    onSuccess: (s) => {
      qc.setQueryData(keys.settings, s);
      setConfirming(false);
      toast("New codes issued. The old ones no longer work.");
    },
    onError: toastError,
  });
  return (
    <section className="setup-card" aria-labelledby="h-codes">
      <div className="setup-card__head">
        <h2 id="h-codes">Invite codes</h2>
        <Button variant="danger" size="small" onClick={() => setConfirming(true)}>Issue new codes</Button>
      </div>
      <InviteCodes settings={settings} />
      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Issue new codes?" label="( invite codes )">
        <p>Anyone who already joined stays in. Only people who haven't joined yet will need the new codes. Use this if a code was shared outside the hostel.</p>
        <div className="card-dlg__actions">
          <Button variant="text" size="small" onClick={() => setConfirming(false)}>Keep current codes</Button>
          <Button variant="danger" size="small" pending={rotate.isPending} onClick={() => rotate.mutate()}>Issue new codes</Button>
        </div>
      </Dialog>
    </section>
  );
}

export function HostelSetupPage() {
  const settings = useQuery({ queryKey: keys.settings, queryFn: hostelApi.settings });
  if (settings.isPending) return <Skeleton rows={2} label="Loading hostel settings" />;
  if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;
  return (
    <div className="setup">
      <NameForm settings={settings.data} />
      <Codes settings={settings.data} />
    </div>
  );
}
