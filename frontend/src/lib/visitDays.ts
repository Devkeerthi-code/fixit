/* Visit-slot calendar maths. Days are local "YYYY-MM-DD" strings, matching the backend's LocalDate. */
export const BOOK_AHEAD_DAYS = 14;
export const MAX_SLOTS = 6;
export const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function isoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Today up to and including today + 14. */
export function bookableDays(today: Date): string[] {
  return Array.from({ length: BOOK_AHEAD_DAYS + 1 }, (_, i) => isoDay(addDays(today, i)));
}

export interface MonthCell {
  iso: string | null;
  day: number | null;
}

/** A Monday-first month grid, padded with blank cells to whole weeks. */
export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: MonthCell[] = Array.from({ length: lead }, () => ({ iso: null, day: null }));
  for (let day = 1; day <= days; day++) cells.push({ iso: isoDay(new Date(year, month, day)), day });
  while (cells.length % 7) cells.push({ iso: null, day: null }); // whole weeks, so every row's rule runs full width
  return cells;
}

/** The months the bookable range touches (one or two), as [year, month] pairs. */
export function monthsInRange(days: string[]): Array<[number, number]> {
  const seen = new Map<string, [number, number]>();
  days.forEach((iso) => {
    const [y, m] = iso.split("-").map(Number);
    seen.set(`${y}-${m}`, [y ?? 0, (m ?? 1) - 1]);
  });
  return [...seen.values()];
}

export function monthName(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long" });
}
