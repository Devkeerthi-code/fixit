import { beforeEach, describe, expect, it } from "vitest";
import { inboxApi } from "../api/inbox";
import { ticketsApi } from "../api/tickets";
import { server } from "../test/server";
import { getDb, resetDb, save } from "./db";
import { PERSONAS } from "./seed";
import { demoHandlers } from "./start";

function viewAs(userId: number) {
  getDb().sessionUserId = userId;
  save();
}

beforeEach(() => {
  localStorage.clear();
  resetDb();
  server.use(...demoHandlers);
});

describe("'affects me too' on common-area tickets", () => {
  it("counts the reporter plus everyone who joins, and lets them leave again", async () => {
    viewAs(PERSONAS.staff);
    expect((await ticketsApi.detail(2)).ticket.affectedCount).toBe(3);
    expect(await ticketsApi.affectsMe(2, true)).toEqual({ affectedCount: 4, affectedByMe: true });
    expect(await ticketsApi.affectsMe(2, false)).toEqual({ affectedCount: 3, affectedByMe: false });
  });

  it("refuses room tickets", async () => {
    viewAs(PERSONAS.resident);
    await expect(ticketsApi.affectsMe(1, true)).rejects.toMatchObject({ code: "NOT_COMMON" });
  });
});

describe("reassigning", () => {
  it("moves the ticket and tells both the new and the previous person", async () => {
    viewAs(PERSONAS.warden);
    const before = await ticketsApi.detail(1);
    expect(before.availableActions).toContain("ASSIGN");
    const after = await ticketsApi.assign(1, { staffId: 21, version: before.ticket.version });
    expect(after.ticket.assignee?.name).toBe("Suresh Babu");
    const sent = getDb().notifications.filter((n) => n.ticketId === 1).map((n) => [n.userId, n.type]);
    expect(sent).toEqual(expect.arrayContaining([[21, "ASSIGNED"], [PERSONAS.staff, "REASSIGNED"]]));
  });

  it("lists only active staff to pick from", async () => {
    viewAs(PERSONAS.warden);
    const suresh = getDb().users.find((u) => u.id === 21);
    if (suresh) suresh.active = false;
    expect(await ticketsApi.assignableStaff()).toEqual([{ id: PERSONAS.staff, name: "Ravi Kumar" }]);
  });
});

describe("notifications", () => {
  it("shows a person only their own and marks them read", async () => {
    viewAs(PERSONAS.staff);
    const inbox = await inboxApi.get();
    expect(inbox.unread).toBe(1);
    expect(inbox.items.every((n) => getDb().notifications.find((x) => x.id === n.id)?.userId === PERSONAS.staff)).toBe(true);
    await inboxApi.markAllRead();
    expect((await inboxApi.get()).unread).toBe(0);
  });
});
