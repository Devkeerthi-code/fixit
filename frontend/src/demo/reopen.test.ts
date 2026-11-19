import { beforeEach, describe, expect, it } from "vitest";
import { ticketsApi } from "../api/tickets";
import type { CreateTicketRequest } from "../api/types";
import { server } from "../test/server";
import { getDb, photos, resetDb, save } from "./db";
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

describe("reopening a fix that didn't hold", () => {
  it("sends it back to the same person with a fresh target time, and tells the warden", async () => {
    viewAs(PERSONAS.resident);
    const resolved = await ticketsApi.detail(4);
    const reopened = await ticketsApi.transition(4, { action: "REOPEN", version: resolved.ticket.version, note: "Still loose" });
    expect(reopened.ticket).toMatchObject({ status: "ASSIGNED", assignee: { name: "Suresh Babu" } });
    expect(Date.parse(reopened.ticket.slaDueAt)).toBeGreaterThan(Date.parse(resolved.ticket.slaDueAt));
    expect(getDb().notifications.some((n) => n.userId === PERSONAS.warden && n.type === "REOPENED" && n.ticketId === 4)).toBe(true);
  });

  it("needs a star rating to confirm", async () => {
    viewAs(PERSONAS.resident);
    const resolved = await ticketsApi.detail(4);
    await expect(ticketsApi.transition(4, { action: "CONFIRM", version: resolved.ticket.version })).rejects.toMatchObject({ code: "RATING_REQUIRED" });
  });
});

describe("photos", () => {
  // Electrical, because B-204 already has an open furniture ticket (FX-4) and that would be a duplicate.
  const flickeringLight: CreateTicketRequest = {
    categoryId: 102,
    commonArea: false,
    blockId: null,
    roomId: null,
    locationNote: null,
    description: "Tube light flickers all evening",
    priority: "LOW",
    visitSlots: [],
    confirmDuplicate: false,
  };

  it("keeps a photo with the ticket and serves it back", async () => {
    viewAs(PERSONAS.resident);
    const photo = new File([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], "light.jpg", { type: "image/jpeg" });
    const created = await ticketsApi.create(flickeringLight, [photo], "photo-key");
    expect(created.photoIds).toHaveLength(1);
    const url = new URL(ticketsApi.photoUrl(created.ticket.id, created.photoIds[0] ?? 0), window.location.origin);
    expect((await fetch(url)).status).toBe(200);
    expect(photos.size).toBe(1);
  });

  it("refuses a photo over 500 KB", async () => {
    viewAs(PERSONAS.resident);
    const big = new File([new Uint8Array(600 * 1024)], "big.jpg", { type: "image/jpeg" });
    await expect(ticketsApi.create(flickeringLight, [big], "big-key")).rejects.toMatchObject({ code: "BAD_PHOTO" });
  });
});
