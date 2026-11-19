import { describe, expect, it } from "vitest";
import { slaText, timeAgo } from "./format";

const NOW = Date.parse("2026-11-19T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("timeAgo", () => {
  it("says 'just now' under a minute", () => {
    expect(timeAgo(ago(30_000), NOW)).toBe("just now");
  });

  it("counts whole minutes, then whole hours", () => {
    expect(timeAgo(ago(5 * 60_000), NOW)).toBe("5 min ago");
    expect(timeAgo(ago(3 * 3_600_000 + 59 * 60_000), NOW)).toBe("3 h ago");
  });

  it("says 'yesterday' between one and two days", () => {
    expect(timeAgo(ago(30 * 3_600_000), NOW)).toBe("yesterday");
  });

  it("falls back to a short date after two days", () => {
    expect(timeAgo("2026-11-10T08:00:00Z", NOW)).toBe("10 Nov");
  });
});

describe("slaText", () => {
  const due = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();

  it("shows time left while the ticket is on track", () => {
    expect(slaText({ slaDueAt: due(5), slaBreached: false, status: "ASSIGNED" }, NOW)).toBe("Due in 5 h");
    expect(slaText({ slaDueAt: due(0.25), slaBreached: false, status: "OPEN" }, NOW)).toBe("Due in 15 min");
  });

  it("shows how late it is once the target has passed", () => {
    expect(slaText({ slaDueAt: due(-50), slaBreached: true, status: "IN_PROGRESS" }, NOW)).toBe("Overdue 2 d");
  });

  it("never shows less than one minute", () => {
    expect(slaText({ slaDueAt: due(0.001), slaBreached: false, status: "OPEN" }, NOW)).toBe("Due in 1 min");
  });

  it("says Done for fixed and closed tickets, even if they were late", () => {
    expect(slaText({ slaDueAt: due(-10), slaBreached: true, status: "RESOLVED" }, NOW)).toBe("Done");
    expect(slaText({ slaDueAt: due(-10), slaBreached: true, status: "CLOSED" }, NOW)).toBe("Done");
  });
});
