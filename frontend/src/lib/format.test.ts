import { describe, expect, it } from "vitest";
import { blockLabel, firstName, formatHours, placeOf, plural, slaText, timeAgo } from "./format";

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

describe("blockLabel and placeOf", () => {
  it("reads a short block code as 'Block X' but keeps names the warden typed", () => {
    expect(blockLabel("B")).toBe("Block B");
    expect(blockLabel("2")).toBe("Block 2");
    expect(blockLabel("A1")).toBe("Block A1");
    expect(blockLabel("Tower 2")).toBe("Tower 2");
    expect(blockLabel(" Block C ")).toBe("Block C");
  });

  const block = { id: 2, name: "B" };

  it("uses the room label for room tickets", () => {
    expect(placeOf({ commonArea: false, roomLabel: "B-204", block, locationNote: null })).toBe("B-204");
  });

  it("describes common areas by block and the note, if any", () => {
    expect(placeOf({ commonArea: true, roomLabel: null, block, locationNote: null })).toBe("Block B common area");
    expect(placeOf({ commonArea: true, roomLabel: null, block, locationNote: "Mess hall" })).toBe("Block B · Mess hall");
  });
});

describe("small wording helpers", () => {
  it("formats SLA hours as hours, then days", () => {
    expect(formatHours(4)).toBe("4 h");
    expect(formatHours(24)).toBe("1 day");
    expect(formatHours(36)).toBe("1.5 days");
    expect(formatHours(72)).toBe("3 days");
  });

  it("pluralises with an optional irregular form", () => {
    expect(plural(1, "ticket")).toBe("1 ticket");
    expect(plural(0, "ticket")).toBe("0 tickets");
    expect(plural(2, "person", "people")).toBe("2 people");
  });

  it("takes the first name, ignoring extra spaces", () => {
    expect(firstName("  Ravi   Kumar ")).toBe("Ravi");
    expect(firstName("Meera")).toBe("Meera");
  });
});
