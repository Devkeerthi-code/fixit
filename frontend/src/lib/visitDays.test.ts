import { describe, expect, it } from "vitest";
import { addDays, bookableDays, BOOK_AHEAD_DAYS, isoDay, monthGrid, monthsInRange } from "./visitDays";

describe("visit-slot calendar maths", () => {
  it("writes local dates as YYYY-MM-DD with zero padding", () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("adds days across a month end without mutating the input", () => {
    const start = new Date(2026, 10, 29);
    expect(isoDay(addDays(start, 3))).toBe("2026-12-02");
    expect(isoDay(start)).toBe("2026-11-29");
  });

  it("offers today plus the next two weeks", () => {
    const days = bookableDays(new Date(2026, 10, 19));
    expect(days).toHaveLength(BOOK_AHEAD_DAYS + 1);
    expect(days[0]).toBe("2026-11-19");
    expect(days.at(-1)).toBe("2026-12-03");
  });

  it("builds a Monday-first grid padded to whole weeks", () => {
    const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(grid.length % 7).toBe(0);
    expect(grid.slice(0, 6).every((c) => c.iso === null)).toBe(true);
    expect(grid[6]).toEqual({ iso: "2026-11-01", day: 1 });
    expect(grid.filter((c) => c.day !== null)).toHaveLength(30);
  });

  it("lists the one or two months a range touches", () => {
    expect(monthsInRange(["2026-11-30", "2026-12-01", "2026-12-02"])).toEqual([
      [2026, 10],
      [2026, 11],
    ]);
    expect(monthsInRange(["2026-11-03", "2026-11-04"])).toEqual([[2026, 10]]);
  });
});
