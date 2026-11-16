import { useCategories, useLayout } from "../../api/queries";
import type { TicketStatus } from "../../api/types";
import { Switch } from "../../components/ui/Switch";
import { ALL_STATUSES, blockLabel, STATUS_LABEL } from "../../lib/format";
import type { Filters } from "./filters";


interface Props {
  value: Filters;
  onChange: (f: Filters) => void;
  count: string;
  allLabel: string;
}

export function QueueFilters({ value, onChange, count, allLabel }: Props) {
  const blocks = useLayout();
  const categories = useCategories();
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <div className="filters" role="search" aria-label="Filter tickets">
      <div className="field field--inline">
        <label className="field__label field__label--inline" htmlFor="f-status">Status</label>
        <select id="f-status" className="input" value={value.status} onChange={(e) => set({ status: e.target.value as TicketStatus | "" })}>
          <option value="">{allLabel}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
      <div className="field field--inline">
        <label className="field__label field__label--inline" htmlFor="f-block">Block</label>
        <select id="f-block" className="input" value={value.blockId ?? ""} onChange={(e) => set({ blockId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">All blocks</option>
          {blocks.data?.map((b) => (
            <option key={b.id} value={b.id}>{blockLabel(b.name)}</option>
          ))}
        </select>
      </div>
      <div className="field field--inline">
        <label className="field__label field__label--inline" htmlFor="f-cat">Category</label>
        <select id="f-cat" className="input" value={value.categoryId ?? ""} onChange={(e) => set({ categoryId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <Switch small label="Overdue only" checked={value.overdue} onChange={(e) => set({ overdue: e.target.checked })} />
      <p className="filters__count" aria-live="polite">{count}</p>
    </div>
  );
}
