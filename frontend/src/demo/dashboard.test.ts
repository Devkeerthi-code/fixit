import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { buildDashboard } from "./handlers/inbox";
import { DEMO_HOSTEL_ID } from "./seed";

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  localStorage.clear();
  resetDb();
});

describe("demo dashboard numbers", () => {
  it("reports the breach rate as a percentage with one decimal, like the backend", () => {
    const { summary } = buildDashboard(DEMO_HOSTEL_ID, monthAgo, today);
    expect(summary.slaBreachRate).toBeGreaterThanOrEqual(0);
    expect(summary.slaBreachRate).toBeLessThanOrEqual(100);
    expect(Math.round(summary.slaBreachRate * 10)).toBe(summary.slaBreachRate * 10);
  });

  it("rounds averages to one decimal", () => {
    const { summary } = buildDashboard(DEMO_HOSTEL_ID, monthAgo, today);
    [summary.avgResolutionHours, summary.avgRating].forEach((v) => {
      if (v !== null) expect(Math.round(v * 10)).toBe(Math.round(v * 10 * 1e6) / 1e6);
    });
  });

  it("counts every sample ticket raised in the last month", () => {
    expect(buildDashboard(DEMO_HOSTEL_ID, monthAgo, today).summary.created).toBe(7);
  });

  it("returns nothing for a hostel with no tickets", () => {
    const empty = buildDashboard(999, monthAgo, today);
    expect(empty.summary).toMatchObject({ open: 0, created: 0, slaBreachRate: 0, avgRating: null });
    expect(empty.openByCategory).toEqual([]);
  });
});
