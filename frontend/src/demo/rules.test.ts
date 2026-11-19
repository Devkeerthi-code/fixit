import { describe, expect, it } from "vitest";
import type { DemoUser } from "./db";
import { availableActions, isBreached, nextStatus, pickAssignee, slaDueAt } from "./rules";

function staff(id: number, skills: DemoUser["skills"], active = true): DemoUser {
  return { id, name: `Staff ${id}`, email: `s${id}@example.test`, password: null, role: "STAFF", hostelId: 1, roomId: null, active, skills };
}

describe("demo ticket rules (mirror of TicketStateMachine)", () => {
  it("lets only the reporter confirm or reopen a resolved ticket", () => {
    expect(availableActions("RESOLVED", ["REPORTER"])).toEqual(["CONFIRM", "REOPEN"]);
    expect(availableActions("RESOLVED", ["ASSIGNEE"])).toEqual([]);
  });

  it("gives the warden assign plus the assignee's actions", () => {
    expect(availableActions("ASSIGNED", ["WARDEN"])).toEqual(["ASSIGN", "START"]);
    expect(availableActions("CLOSED", ["WARDEN"])).toEqual([]);
  });

  it("rejects a move from the wrong status with 409", () => {
    expect(nextStatus("OPEN", "RESOLVE", ["ASSIGNEE"])).toEqual({ ok: false, status: 409, message: "Can't resolve a ticket that is open" });
  });

  it("rejects the wrong person with 403", () => {
    expect(nextStatus("RESOLVED", "CONFIRM", ["WARDEN"])).toMatchObject({ ok: false, status: 403 });
  });

  it("moves through the happy path", () => {
    expect(nextStatus("ASSIGNED", "START", ["ASSIGNEE"])).toEqual({ ok: true, to: "IN_PROGRESS" });
    expect(nextStatus("IN_PROGRESS", "RESOLVE", ["ASSIGNEE"])).toEqual({ ok: true, to: "RESOLVED" });
    expect(nextStatus("RESOLVED", "CONFIRM", ["REPORTER"])).toEqual({ ok: true, to: "CLOSED" });
  });
});

describe("demo SLA", () => {
  it("adds the target hours to the creation time", () => {
    expect(slaDueAt(new Date("2026-11-19T10:00:00Z"), 4)).toBe("2026-11-19T14:00:00.000Z");
  });

  it("only counts active tickets as breached", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    expect(isBreached({ status: "OPEN", slaDueAt: "2026-11-19T00:00:00Z" }, now)).toBe(true);
    expect(isBreached({ status: "CLOSED", slaDueAt: "2026-11-19T00:00:00Z" }, now)).toBe(false);
  });
});

describe("demo routing (mirror of RoutingPolicy)", () => {
  const plumberAnywhere = staff(1, [{ categoryId: 5, blockId: null }]);
  const plumberBlockB = staff(2, [{ categoryId: 5, blockId: 2 }]);

  it("picks the skilled person with the fewest open tickets", () => {
    const load = (id: number) => (id === 1 ? 3 : 0);
    expect(pickAssignee([plumberAnywhere, plumberBlockB], load, 5, 2)?.id).toBe(2);
  });

  it("skips people whose skill is limited to another block", () => {
    expect(pickAssignee([plumberBlockB], () => 0, 5, 1)).toBeNull();
  });

  it("skips deactivated staff", () => {
    expect(pickAssignee([staff(3, [{ categoryId: 5, blockId: null }], false)], () => 0, 5, 1)).toBeNull();
  });
});
