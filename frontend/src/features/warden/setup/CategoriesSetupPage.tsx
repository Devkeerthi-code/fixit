import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { hostelApi } from "../../../api/hostel";
import { keys, useCategories } from "../../../api/queries";
import type { CategoryView, Priority } from "../../../api/types";
import { Button } from "../../../components/ui/Button";
import { Field } from "../../../components/ui/Field";
import { Switch } from "../../../components/ui/Switch";
import { ErrorState, Skeleton } from "../../../components/ui/States";
import { cx } from "../../../lib/cx";
import { applyServerErrors } from "../../../lib/forms";
import { PRIORITIES, PRIORITY_LABEL } from "../../../lib/format";
import { toast } from "../../../lib/toast";

const hours = z.number({ invalid_type_error: "Enter hours" }).int("Whole hours").min(1, "At least 1 h").max(720, "At most 720 h");
const schema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(40, "Keep it under 40 characters"),
  covers: z.string().trim().min(1, "Say what it covers").max(200, "Keep it under 200 characters"),
  active: z.boolean(),
  LOW: hours,
  NORMAL: hours,
  URGENT: hours,
});
type Values = z.infer<typeof schema>;

const DEFAULT_HOURS: Record<Priority, number> = { LOW: 72, NORMAL: 24, URGENT: 4 };

function CategoryCard({ category }: { category: CategoryView }) {
  const qc = useQueryClient();
  const defaults: Values = {
    name: category.name,
    covers: category.covers,
    active: category.active,
    LOW: category.slaHours.LOW ?? DEFAULT_HOURS.LOW,
    NORMAL: category.slaHours.NORMAL ?? DEFAULT_HOURS.NORMAL,
    URGENT: category.slaHours.URGENT ?? DEFAULT_HOURS.URGENT,
  };
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { errors, isDirty } = form.formState;
  const save = useMutation({
    mutationFn: (v: Values) =>
      hostelApi.updateCategory(category.id, { name: v.name, covers: v.covers, active: v.active, slaHours: { LOW: v.LOW, NORMAL: v.NORMAL, URGENT: v.URGENT } }),
    onSuccess: (list, v) => {
      qc.setQueryData(keys.categories, list);
      form.reset(v);
      toast(`${v.name} saved.`);
    },
    onError: (e) => applyServerErrors(e, form.setError, ["name", "covers"], { "slaHours[LOW]": "LOW", "slaHours[NORMAL]": "NORMAL", "slaHours[URGENT]": "URGENT" }),
  });
  const active = form.watch("active");
  return (
    <form className={cx("setup-card", !active && "is-inactive")} noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} aria-labelledby={`c-${category.id}`}>
      <div className="setup-card__head">
        <h3 id={`c-${category.id}`}>{category.name}</h3>
        <Switch small label={active ? "Residents can pick it" : "Switched off"} {...form.register("active")} />
      </div>
      <div className="form-grid form-grid--2">
        <Field label="Name" error={errors.name?.message}>{(p) => <input {...p} className="input" {...form.register("name")} />}</Field>
        <Field label="What it covers" hint="Shown on the olive panel when residents pick it" error={errors.covers?.message}>
          {(p) => <input {...p} className="input" {...form.register("covers")} />}
        </Field>
      </div>
      <fieldset className="field">
        <legend className="field__label mb-2">Fix within (hours), by urgency</legend>
        <div className="sla-row">
          {PRIORITIES.map((p) => (
            <Field key={p} label={PRIORITY_LABEL[p]} error={errors[p]?.message}>
              {(ctl) => <input {...ctl} className="input input--sm" type="number" inputMode="numeric" min={1} max={720} {...form.register(p, { valueAsNumber: true })} />}
            </Field>
          ))}
        </div>
      </fieldset>
      <div className="form-actions">
        <Button type="submit" variant="ink" size="small" pending={save.isPending} disabled={!isDirty}>Save {category.name}</Button>
        {isDirty && <Button variant="text" size="small" onClick={() => form.reset(defaults)}>Undo changes</Button>}
      </div>
    </form>
  );
}

export function CategoriesSetupPage() {
  const categories = useCategories();
  if (categories.isPending) return <Skeleton rows={3} label="Loading categories" />;
  if (categories.isError) return <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />;
  return (
    <div className="setup">
      <p className="muted">Past the target time, a ticket is flagged overdue and you're notified. Switched-off categories disappear from the complaint form but keep their history.</p>
      {categories.data.map((c) => <CategoryCard key={c.id} category={c} />)}
    </div>
  );
}
