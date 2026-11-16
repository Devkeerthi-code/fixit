import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useCategories, useLayout } from "../../api/queries";
import type { BlockView, CategoryView, Me, TicketDetail, TimeWindow } from "../../api/types";
import { Headline } from "../../components/ui/Headline";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { WINDOW_LABEL, WINDOWS } from "../../lib/format";
import { MAX_SLOTS } from "../../lib/visitDays";
import { CategoryPanel, CategoryTabs } from "./CategoryPanel";
import { DetailsStep } from "./DetailsStep";
import { DuplicateNotice } from "./DuplicateNotice";
import type { Photo } from "./PhotoPicker";
import { Receipt } from "./Receipt";
import { defaultsFor, reportSchema, type ReportValues } from "./schema";
import { useRaiseTicket } from "./useRaiseTicket";
import { VisitCalendar } from "./VisitCalendar";
import { WhereStep } from "./WhereStep";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function ReportSection({ me }: { me: Me }) {
  return (
    <section className="section" id="report" aria-labelledby="report-title">
      <div className="wrap section-head">
        <p className="label">( raise a complaint )</p>
        <Headline id="report-title" lines={["Raise a complaint", "_in under_", "30 seconds."]} />
        <p className="lede">Four quick steps. Your room is already filled in, and nothing goes to staff until you press the button.</p>
      </div>
      <ReportFormLoader me={me} />
    </section>
  );
}

function ReportFormLoader({ me }: { me: Me }) {
  const categories = useCategories();
  const layout = useLayout();
  if (categories.isPending || layout.isPending) return <div className="wrap report"><Skeleton rows={2} label="Loading the complaint form" /></div>;
  if (categories.isError || layout.isError) {
    const error = categories.error ?? layout.error;
    return (
      <div className="wrap report">
        <ErrorState error={error} onRetry={() => { void categories.refetch(); void layout.refetch(); }} />
      </div>
    );
  }
  const active = categories.data.filter((c) => c.active);
  if (!active.length) {
    return (
      <div className="wrap report">
        <EmptyState title={<>No categories <em>switched on.</em></>} body="Your warden turns categories like Plumbing and Wi-Fi on under Setup. Ask them, then come back here." />
      </div>
    );
  }
  return <ReportForm me={me} categories={active} blocks={layout.data} />;
}

function ReportForm({ me, categories, blocks }: { me: Me; categories: CategoryView[]; blocks: BlockView[] }) {
  const [today] = useState(() => new Date());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [created, setCreated] = useState<TicketDetail | null>(null);
  const form = useForm<ReportValues>({ resolver: zodResolver(reportSchema), defaultValues: defaultsFor(me, categories[0]?.id ?? 0) });
  const values = form.watch();
  const category = categories.find((c) => c.id === values.categoryId);

  const raise = useRaiseTicket(form.setError, (detail) => {
    setCreated(detail);
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    form.reset({ ...defaultsFor(me, values.categoryId), priority: values.priority });
  });

  const { clearDupe } = raise;
  useEffect(() => clearDupe(), [values.categoryId, values.commonArea, values.blockId, values.roomId, clearDupe]);

  const setList = (name: "days" | "windows", next: string[] | TimeWindow[]) => {
    setCreated(null);
    form.setValue(name, next as never, { shouldValidate: form.formState.isSubmitted, shouldDirty: true });
  };
  const slotCount = values.days.length * values.windows.length;
  const blockName = values.commonArea ? (blocks.find((b) => b.id === values.blockId)?.name ?? null) : (me.room?.blockName ?? null);

  return (
    <form className="wrap report" noValidate onSubmit={form.handleSubmit((v) => void raise.submit(v, photos))} aria-label="Raise a complaint">
      <p className="step-cap"><span>01</span> Choose a category</p>
      <CategoryTabs categories={categories} selectedId={values.categoryId} onSelect={(id) => { setCreated(null); form.setValue("categoryId", id); }} />
      <div className="split">
        <CategoryPanel
          categories={categories}
          selectedId={values.categoryId}
          commonArea={values.commonArea}
          blockName={blockName}
          priority={values.priority}
          onDescribe={() => form.setFocus("description")}
        />
        <div className="split__form">
          <WhereStep me={me} form={form} blocks={blocks} />
          <DetailsStep form={form} categoryName={category?.name ?? "maintenance"} photos={photos} onPhotos={setPhotos} />
        </div>
      </div>

      <div className="booking">
        <fieldset className="booking__cal">
          <legend className="step-cap"><span>04</span> When can staff come in?</legend>
          <p className="booking__hint">Pick the days and windows when you or your roommate are in. Staff won't knock outside these. Skip it if any time works.</p>
          <VisitCalendar today={today} selected={values.days} onToggle={(iso) => setList("days", toggle(values.days, iso))} />
          <div className="windows" role="group" aria-label="Time windows">
            {WINDOWS.map((w) => (
              <label key={w} className="chip">
                <input type="checkbox" checked={values.windows.includes(w)} onChange={() => setList("windows", toggle(values.windows, w))} />
                <span>{WINDOW_LABEL[w]}</span>
              </label>
            ))}
          </div>
          <p className={slotCount > MAX_SLOTS || form.formState.errors.windows ? "field__err slots-count" : "field__help slots-count"} aria-live="polite">
            {form.formState.errors.windows?.message ??
              (slotCount ? `${values.days.length} × ${values.windows.length} = ${slotCount} of ${MAX_SLOTS} visit slots` : `Up to ${MAX_SLOTS} visit slots`)}
          </p>
        </fieldset>
        <Receipt
          me={me}
          values={values}
          category={category}
          blocks={blocks}
          photoCount={photos.length}
          pending={raise.pending}
          created={created}
          notice={
            raise.dupe && (
              <DuplicateNotice
                dupe={raise.dupe}
                pending={raise.pending}
                affectingId={raise.affectingId}
                onRaiseAnyway={() => void form.handleSubmit((v) => raise.submit(v, photos, true))()}
                onAffectsMe={raise.affectsMe}
              />
            )
          }
        />
      </div>
    </form>
  );
}
