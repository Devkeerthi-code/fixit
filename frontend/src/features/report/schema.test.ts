import { describe, expect, it } from "vitest";
import { aMe } from "../../test/fixtures";
import { defaultsFor, newIdempotencyKey, reportSchema, slotsOf, toRequest, type ReportValues } from "./schema";

const valid: ReportValues = { ...defaultsFor(aMe(), 11), description: "Bathroom tap keeps dripping" };

function errors(v: ReportValues): Record<string, string | undefined> {
  const r = reportSchema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("report form rules", () => {
  it("prefills the resident's room", () => {
    expect(defaultsFor(aMe())).toMatchObject({ roomId: 204, blockId: 2, commonArea: false, priority: "NORMAL" });
  });

  it("accepts a normal room complaint", () => {
    expect(errors(valid)).toEqual({});
  });

  it("asks for a 10+ character description", () => {
    expect(errors({ ...valid, description: "  leak   " }).description).toBe("Describe it in 10 to 1000 characters");
  });

  it("needs a block for common areas and a room otherwise", () => {
    expect(errors({ ...valid, commonArea: true, blockId: null }).blockId).toBe("Pick the block for this common-area issue");
    expect(errors({ ...valid, roomId: null }).roomId).toBe("Pick your room, or switch on common area");
  });

  it("needs a time window when days are picked, and caps the slots at six", () => {
    expect(errors({ ...valid, days: ["2026-11-20"] }).windows).toBe("Pick at least one time window for those days");
    const tooMany = { ...valid, days: ["2026-11-20", "2026-11-21", "2026-11-22"], windows: ["MORNING", "AFTERNOON", "EVENING"] as const };
    expect(errors({ ...tooMany, windows: [...tooMany.windows] }).windows).toMatch(/^Up to 6 visit slots/);
  });
});

describe("toRequest", () => {
  it("crosses days with windows in calendar order", () => {
    expect(slotsOf(["2026-11-21", "2026-11-20"], ["EVENING", "MORNING"])).toEqual([
      { day: "2026-11-20", window: "MORNING" },
      { day: "2026-11-20", window: "EVENING" },
      { day: "2026-11-21", window: "MORNING" },
      { day: "2026-11-21", window: "EVENING" },
    ]);
  });

  it("sends a room for room tickets and a block plus note for common areas", () => {
    expect(toRequest({ ...valid, locationNote: "ignored" }, false)).toMatchObject({ roomId: 204, blockId: null, locationNote: null });
    const common = toRequest({ ...valid, commonArea: true, locationNote: "  Mess hall " }, true);
    expect(common).toMatchObject({ roomId: null, blockId: 2, locationNote: "Mess hall", confirmDuplicate: true });
  });

  it("makes a fresh idempotency key each time", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
