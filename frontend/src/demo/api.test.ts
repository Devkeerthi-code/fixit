import { beforeEach, describe, expect, it } from "vitest";
import { authApi } from "../api/auth";
import { isApiError } from "../api/errors";
import { dashboardApi } from "../api/inbox";
import { ticketsApi } from "../api/tickets";
import type { CreateTicketRequest } from "../api/types";
import { server } from "../test/server";
import { getDb, resetDb, save } from "./db";
import { PERSONAS } from "./seed";
import { demoHandlers } from "./start";

function viewAs(userId: number) {
  getDb().sessionUserId = userId;
  save();
}

const leakyTap: CreateTicketRequest = {
  categoryId: 101,
  commonArea: false,
  blockId: null,
  roomId: 105,
  locationNote: null,
  description: "Shower tap won't turn off fully",
  priority: "URGENT",
  visitSlots: [],
  confirmDuplicate: false,
};

beforeEach(() => {
  localStorage.clear();
  resetDb();
  server.use(...demoHandlers);
});

describe("demo API", () => {
  it("treats a visitor as signed out until they pick a role", async () => {
    expect(await authApi.me()).toBeNull();
    viewAs(PERSONAS.resident);
    expect(await authApi.me()).toMatchObject({ name: "Asha Verma", role: "RESIDENT", room: { label: "B-204" } });
  });

  it("shows a resident only their own tickets and shared common-area ones", async () => {
    viewAs(PERSONAS.resident);
    const page = await ticketsApi.list({}, 0);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((t) => t.reporter?.id === PERSONAS.resident || t.commonArea)).toBe(true);
  });

  it("auto-assigns a new plumbing ticket to the plumber and notifies him", async () => {
    viewAs(PERSONAS.resident);
    const created = await ticketsApi.create(leakyTap, [], "key-1");
    expect(created.ticket).toMatchObject({ status: "ASSIGNED", assignee: { name: "Ravi Kumar" }, roomLabel: "A-105" });
    const replay = await ticketsApi.create(leakyTap, [], "key-1");
    expect(replay.ticket.id).toBe(created.ticket.id);
    expect(getDb().notifications.some((n) => n.userId === PERSONAS.staff && n.ticketId === created.ticket.id)).toBe(true);
  });

  it("refuses a second open ticket for the same room and category unless confirmed", async () => {
    viewAs(PERSONAS.resident);
    await ticketsApi.create(leakyTap, [], "key-a");
    const error = await ticketsApi.create(leakyTap, [], "key-b").catch((e: unknown) => e);
    expect(isApiError(error) && error.code).toBe("DUPLICATE");
    await expect(ticketsApi.create({ ...leakyTap, confirmDuplicate: true }, [], "key-c")).resolves.toBeDefined();
  });

  it("runs a ticket from assigned to closed with the right person at each step", async () => {
    viewAs(PERSONAS.staff);
    let detail = await ticketsApi.detail(1);
    expect(detail.availableActions).toEqual(["START"]);
    detail = await ticketsApi.transition(1, { action: "START", version: detail.ticket.version });
    detail = await ticketsApi.transition(1, { action: "RESOLVE", version: detail.ticket.version });
    expect(detail.ticket.status).toBe("RESOLVED");

    viewAs(PERSONAS.resident);
    detail = await ticketsApi.detail(1);
    expect(detail.availableActions).toEqual(["CONFIRM", "REOPEN"]);
    detail = await ticketsApi.transition(1, { action: "CONFIRM", version: detail.ticket.version, rating: 4 });
    expect(detail).toMatchObject({ ticket: { status: "CLOSED" }, rating: 4 });
  });

  it("rejects an update made from an out-of-date copy", async () => {
    viewAs(PERSONAS.staff);
    const detail = await ticketsApi.detail(1);
    const error = await ticketsApi.transition(1, { action: "START", version: detail.ticket.version - 1 }).catch((e: unknown) => e);
    expect(isApiError(error) && error.isStale).toBe(true);
  });

  it("hides another resident's room ticket behind a 404", async () => {
    viewAs(PERSONAS.resident);
    const error = await ticketsApi.detail(3).catch((e: unknown) => e);
    expect(isApiError(error) && error.status).toBe(404);
  });

  it("gives the warden a dashboard built from the same tickets", async () => {
    viewAs(PERSONAS.warden);
    const dash = await dashboardApi.get({});
    const open = getDb().tickets.filter((t) => !["RESOLVED", "CLOSED"].includes(t.status)).length;
    expect(dash.summary.open).toBe(open);
    expect(dash.openByBlock.map((c) => c.label)).toContain("B");
  });
});
