import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { hostelApi } from "../../api/hostel";
import type { Me } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { applyServerErrors } from "../../lib/forms";
import { KINDS, KIND_LABEL } from "../../lib/format";
import { parseRoomRanges, roomTotal } from "../../lib/roomRanges";
import { RoomCount } from "./RoomCount";

const blockSchema = z.object({
  name: z.string().trim().min(1, "Name the block, e.g. A").max(40, "Keep it under 40 characters"),
  rooms: z
    .string()
    .max(500, "Split this block into smaller ranges")
    .superRefine((v, ctx) => {
      const p = parseRoomRanges(v);
      if (!p.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: p.error });
    }),
});

const schema = z
  .object({
    name: z.string().trim().min(1, "Name your hostel").max(120, "Keep it under 120 characters"),
    kind: z.enum(["HOSTEL", "CAMPUS", "SOCIETY"]),
    blocks: z.array(blockSchema).min(1, "Add at least one block").max(30, "Up to 30 blocks; add more later"),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.blocks.forEach((b, i) => {
      const key = b.name.trim().toLowerCase();
      if (key && seen.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["blocks", i, "name"], message: "This block is listed twice" });
      seen.add(key);
    });
  });

type Values = z.infer<typeof schema>;

export function SetupHostel({ onCreated }: { onCreated: (me: Me) => void }) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", kind: "HOSTEL", blocks: [{ name: "A", rooms: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "blocks" });
  const blocks = form.watch("blocks");
  const total = roomTotal(blocks.map((b) => b.rooms));
  const { errors } = form.formState;

  const create = useMutation({
    mutationFn: hostelApi.create,
    onSuccess: onCreated,
    onError: (e) => applyServerErrors(e, form.setError, ["name", "kind"]),
  });

  return (
    <form className="setup" noValidate onSubmit={form.handleSubmit((v) => create.mutate(v))} aria-label="Set up your hostel">
      <div className="setup-card">
        <div className="setup-card__head">
          <h2>The place</h2>
        </div>
        <Field label="Name" error={errors.name?.message}>
          {(p) => <input {...p} className="input" placeholder="e.g. Sahyadri Boys Hostel" {...form.register("name")} />}
        </Field>
        <fieldset className="field">
          <legend className="field__label mb-2">What kind of place</legend>
          <div className="seg">
            {KINDS.map((k) => (
              <label key={k} className="seg__opt">
                <input type="radio" value={k} {...form.register("kind")} />
                <span><b>{KIND_LABEL[k]}</b></span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="setup-card">
        <div className="setup-card__head">
          <h2>Blocks and rooms</h2>
          <p className="total-rooms" aria-live="polite">
            <em>{total}</em> {total === 1 ? "room" : "rooms"}
          </p>
        </div>
        <p className="muted text-sm">Type ranges, not lists. "101-120, 201-220" makes 40 rooms. Single rooms like G1 work too.</p>
        <div className="blocks-editor">
          {fields.map((f, i) => {
            const e = errors.blocks?.[i];
            return (
              <div key={f.id} className="block-row">
                <Field label="Block" error={e?.name?.message}>
                  {(p) => <input {...p} className="input" {...form.register(`blocks.${i}.name`)} />}
                </Field>
                <Field label="Rooms" error={e?.rooms?.message}>
                  {(p) => (
                    <>
                      <input {...p} className="input" placeholder="101-120, 201-220" autoComplete="off" {...form.register(`blocks.${i}.rooms`)} />
                      {!e?.rooms && <RoomCount spec={blocks[i]?.rooms ?? ""} />}
                    </>
                  )}
                </Field>
                <div className="self-end">
                  <Button variant="text" size="small" onClick={() => remove(i)} disabled={fields.length === 1} aria-label={`Remove block ${blocks[i]?.name || i + 1}`}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {errors.blocks?.root?.message && <p className="field__err">{errors.blocks.root.message}</p>}
        <div className="form-actions">
          <Button variant="ink" size="small" onClick={() => append({ name: "", rooms: "" })} disabled={fields.length >= 30}>
            <Icon name="plus" />
            Add a block
          </Button>
        </div>
      </div>

      <div className="form-actions">
        <Button type="submit" pending={create.isPending} pendingLabel="Setting up">
          Set up and become the warden
        </Button>
        <span className="muted text-sm">Six categories with sensible repair times are added for you. You can edit them.</span>
      </div>
    </form>
  );
}
