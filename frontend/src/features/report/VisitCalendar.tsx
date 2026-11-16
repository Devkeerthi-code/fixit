import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../../components/ui/Icon";
import { cx } from "../../lib/cx";
import { WEEKDAYS, addDays, bookableDays, isoDay, monthGrid, monthName, monthsInRange } from "../../lib/visitDays";

interface Props {
  today: Date;
  selected: string[];
  onToggle: (iso: string) => void;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/** Mo-Su month grid. Bookable from today to two weeks out; arrow keys move between days. */
export function VisitCalendar({ today, selected, onToggle }: Props) {
  const days = useMemo(() => bookableDays(today), [today]);
  const bookable = useMemo(() => new Set(days), [days]);
  const months = useMemo(() => monthsInRange(days), [days]);
  const [monthIndex, setMonthIndex] = useState(0);
  const [focusIso, setFocusIso] = useState(days[0] ?? isoDay(today));
  const shouldFocus = useRef(false);
  const grid = useRef<HTMLDivElement>(null);
  const [year, month] = months[monthIndex] ?? [today.getFullYear(), today.getMonth()];
  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const todayIso = isoDay(today);
  const visibleFocus = cells.some((c) => c.iso === focusIso && bookable.has(focusIso))
    ? focusIso
    : cells.find((c) => c.iso && bookable.has(c.iso))?.iso;

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focusIso}"]`)?.focus();
  }, [focusIso, monthIndex]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, iso: string) => {
    let next: string | undefined;
    if (e.key in KEY_STEP) next = isoDay(addDays(parseIso(iso), KEY_STEP[e.key] ?? 0));
    if (e.key === "Home") next = days[0];
    if (e.key === "End") next = days[days.length - 1];
    if (!next) return;
    e.preventDefault();
    if (!bookable.has(next)) return;
    const [ny, nm] = next.split("-").map(Number);
    const target = months.findIndex(([y, m]) => y === ny && m === (nm ?? 1) - 1);
    if (target >= 0) setMonthIndex(target);
    shouldFocus.current = true;
    setFocusIso(next);
  };

  const label = `${monthName(year, month)} ${year}`;
  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" className="cal__nav" disabled={monthIndex === 0} onClick={() => setMonthIndex((i) => i - 1)} aria-label="Previous month">
          <Icon name="chev" />
        </button>
        <p className="cal__month" aria-live="polite">
          {monthName(year, month)} <em>{year}</em>
        </p>
        <button
          type="button"
          className="cal__nav cal__nav--next"
          disabled={monthIndex >= months.length - 1}
          onClick={() => setMonthIndex((i) => i + 1)}
          aria-label={monthIndex >= months.length - 1 ? "Next month, visits book two weeks ahead" : "Next month"}
        >
          <Icon name="chev" />
        </button>
      </div>
      <div className="cal__grid" role="group" aria-label={`Visit days in ${label}`} ref={grid}>
        {WEEKDAYS.map((d) => (
          <span key={d} className="cal__wd" aria-hidden="true">{d}</span>
        ))}
        {cells.map((c, i) => {
          if (!c.iso) return <span key={`blank-${i}`} className="cal__cell" />;
          const iso = c.iso;
          const can = bookable.has(iso);
          const on = selected.includes(iso);
          const long = parseIso(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
          return (
            <span key={iso} className="cal__cell">
              <button
                type="button"
                className={cx("cal__day", iso === todayIso && "is-today")}
                data-day={iso}
                disabled={!can}
                aria-pressed={can ? on : undefined}
                aria-label={`${long}${iso === todayIso ? ", today" : ""}${can ? "" : ", not bookable"}`}
                tabIndex={iso === visibleFocus ? 0 : -1}
                onClick={() => {
                  setFocusIso(iso);
                  onToggle(iso);
                }}
                onKeyDown={(e) => onKey(e, iso)}
              >
                <span>{c.day}</span>
                {iso === todayIso && <small aria-hidden="true">today</small>}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
