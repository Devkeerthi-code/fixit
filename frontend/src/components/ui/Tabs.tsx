import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { cx } from "../../lib/cx";
import { spring } from "../../lib/spring";

export interface TabItem {
  id: string;
  label: string;
}

interface Props {
  items: TabItem[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
  panelId: string;
  idPrefix: string;
  className?: string;
}

type Box = { x: number; y: number; w: number; h: number };

/** Springs the olive ink box (position and size) under the selected tab. */
function findTab(list: HTMLElement | null, id: string): HTMLElement | undefined {
  return [...(list?.querySelectorAll<HTMLElement>("[data-tab]") ?? [])].find((el) => el.dataset.tab === id);
}

function useInk(list: RefObject<HTMLDivElement>, selected: string) {
  const ink = useRef<HTMLSpanElement>(null);
  const cur = useRef<Box | null>(null);
  const stops = useRef<Array<() => void>>([]);

  useLayoutEffect(() => {
    const el = ink.current;
    const measure = (): Box | null => {
      const target = findTab(list.current, selected);
      return target ? { x: target.offsetLeft, y: target.offsetTop, w: target.offsetWidth, h: target.offsetHeight } : null;
    };
    const paint = (b: Box) => {
      if (!el) return;
      el.style.transform = `translate(${b.x}px, ${b.y}px)`;
      el.style.width = `${b.w}px`;
      el.style.height = `${b.h}px`;
    };
    const next = measure();
    if (!next || !el) return;
    if (!cur.current) {
      cur.current = next;
      paint(next);
    } else {
      stops.current.forEach((s) => s());
      const box = cur.current;
      stops.current = (Object.keys(next) as Array<keyof Box>).map((k) =>
        spring({ from: box[k], to: next[k], stiffness: 420, damping: 30, onUpdate: (v) => { box[k] = v; paint(box); } }),
      );
    }
    // the grid reflows between 3-up and one row, so snap the ink when the tab boxes move
    const snap = () => {
      const b = measure();
      stops.current.forEach((s) => s());
      if (b) {
        cur.current = b;
        paint(b);
      }
    };
    window.addEventListener("resize", snap);
    return () => window.removeEventListener("resize", snap);
  }, [list, selected]);

  return ink;
}

/** Outlined category boxes. Arrow keys move and select; only the selected tab is in the Tab order. */
export function Tabs({ items, selected, onSelect, label, panelId, idPrefix, className }: Props) {
  const list = useRef<HTMLDivElement>(null);
  const ink = useInk(list, selected);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
    const target = map[e.key];
    if (target === undefined) return;
    e.preventDefault();
    const next = items[(target + items.length) % items.length];
    if (!next) return;
    onSelect(next.id);
    findTab(list.current, next.id)?.focus();
  };

  return (
    <div className={cx("tabs", className)} role="tablist" aria-label={label} ref={list}>
      <span className="tabs__ink" aria-hidden="true" ref={ink} />
      {items.map((item, i) => {
        const on = item.id === selected;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${idPrefix}-${item.id}`}
            data-tab={item.id}
            className="tabs__tab"
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
