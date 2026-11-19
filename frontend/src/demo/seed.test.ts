import { describe, expect, it } from "vitest";
import { createSeed, PERSONAS } from "./seed";

const db = createSeed(new Date("2026-11-19T12:00:00Z"));

describe("demo sample data", () => {
  it("is clearly labelled and uses reserved example.test emails only", () => {
    expect(db.hostels[0]?.name).toMatch(/sample data/);
    expect(db.users.every((u) => u.email.endsWith("@example.test"))).toBe(true);
  });

  it("stores no passwords", () => {
    expect(db.users.every((u) => u.password === null)).toBe(true);
  });

  it("has one person for each role the demo bar offers", () => {
    const role = (id: number) => db.users.find((u) => u.id === id)?.role;
    expect([role(PERSONAS.resident), role(PERSONAS.staff), role(PERSONAS.warden)]).toEqual(["RESIDENT", "STAFF", "WARDEN"]);
  });

  it("only points at categories, blocks, rooms and people that exist", () => {
    const roomIds = new Set(db.blocks.flatMap((b) => b.rooms.map((r) => r.id)));
    const userIds = new Set(db.users.map((u) => u.id));
    db.tickets.forEach((t) => {
      expect(db.categories.some((c) => c.id === t.categoryId)).toBe(true);
      expect(db.blocks.some((b) => b.id === t.blockId)).toBe(true);
      expect(t.roomId === null || roomIds.has(t.roomId)).toBe(true);
      expect(userIds.has(t.reporterId)).toBe(true);
      expect(t.assigneeId === null || userIds.has(t.assigneeId)).toBe(true);
    });
  });

  it("puts each room ticket's room inside its block", () => {
    db.tickets
      .filter((t) => t.roomId !== null)
      .forEach((t) => expect(db.blocks.find((b) => b.id === t.blockId)?.rooms.some((r) => r.id === t.roomId)).toBe(true));
  });

  it("shows every status somewhere, so each screen has something to show", () => {
    expect(new Set(db.tickets.map((t) => t.status))).toEqual(new Set(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REOPENED", "CLOSED"]));
  });

  it("keeps new ids clear of the sample ids", () => {
    const maxSampleId = Math.max(...db.users.map((u) => u.id), ...db.tickets.map((t) => t.id), ...db.categories.map((c) => c.id));
    expect(db.seq).toBeGreaterThan(maxSampleId);
  });
});
