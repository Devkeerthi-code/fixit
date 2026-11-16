import { useState } from "react";
import type { CategoryView, Priority } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { blockLabel, formatHours } from "../../lib/format";

interface Props {
  categories: CategoryView[];
  selectedId: number;
  commonArea: boolean;
  blockName: string | null;
  priority: Priority;
  onDescribe: () => void;
}

function coveredItems(covers: string): string[] {
  return covers.split(/,|\band\b/).map((s) => s.trim()).filter(Boolean);
}

function Sprig() {
  return (
    <svg className="split__etch" viewBox="0 0 200 200" aria-hidden="true">
      <g className="etch">
        <path d="M20 180c40-30 60-80 70-150M90 30c-20 10-30 30-26 50 18-8 28-28 26-50M78 80c-22 4-36 20-36 40 20-4 34-20 36-40M70 120c-20 6-30 22-28 40 18-6 28-22 28-40M92 60c18 2 32 16 34 34-18-2-32-16-34-34M84 104c18 4 30 18 30 36-18-4-30-18-30-36" />
      </g>
    </svg>
  );
}

/** Outlined category boxes over an olive panel that explains what the category covers. */
interface TabsProps {
  categories: CategoryView[];
  selectedId: number;
  onSelect: (id: number) => void;
}

export function CategoryTabs({ categories, selectedId, onSelect }: TabsProps) {
  return (
    <Tabs
      items={categories.map((c) => ({ id: String(c.id), label: c.name }))}
      selected={String(selectedId)}
      onSelect={(id) => onSelect(Number(id))}
      label="Issue category"
      panelId="cat-panel"
      idPrefix="cat"
    />
  );
}

export function CategoryPanel({ categories, selectedId, commonArea, blockName, priority, onDescribe }: Props) {
  const [showCovered, setShowCovered] = useState(false);
  const cat = categories.find((c) => c.id === selectedId);
  if (!cat) return null;
  const hours = cat.slaHours[priority];
  return (
    <div className="split__panel on-olive" id="cat-panel" role="tabpanel" aria-labelledby={`cat-${cat.id}`} tabIndex={0}>
      <div className="split__swap" key={cat.id}>
        <h3 className="split__title">
          <span>{cat.name}</span>
          <em>{commonArea ? "in a common area" : "in your room"}</em>
        </h3>
        <ul className="split__meta">
          {hours !== undefined && <li>Target: fixed within {formatHours(hours)}</li>}
          <li>Goes to {cat.name.toLowerCase()} staff{blockName ? `, ${blockLabel(blockName)}` : ""}</li>
        </ul>
        <p className="split__body">{cat.covers}</p>
      </div>
      <div className="relative z-[1] mt-12 flex flex-wrap gap-2">
        <Button onClick={onDescribe}>Describe it</Button>
        <Button variant="outline-olive" aria-expanded={showCovered} aria-controls="covered" onClick={() => setShowCovered((s) => !s)}>
          What's covered
        </Button>
      </div>
      {showCovered && (
        <ul className="relative z-[1] mt-6 grid max-w-sm" id="covered">
          {coveredItems(cat.covers).map((item) => (
            <li key={item} className="border-b border-olive-line py-3 text-sm font-semibold first-letter:uppercase">{item}</li>
          ))}
        </ul>
      )}
      <Sprig />
    </div>
  );
}
