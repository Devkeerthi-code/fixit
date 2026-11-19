import { describe, expect, it } from "vitest";
import { timeAgo } from "./format";

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
