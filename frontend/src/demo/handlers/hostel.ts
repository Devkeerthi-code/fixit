import { http, HttpResponse } from "msw";
import type {
  BlockInput,
  CreateHostelRequest,
  HostelKind,
  JoinRequest,
  SetSkillsRequest,
  UpdateCategoryRequest,
  UpdateHostelRequest,
} from "../../api/types";
import { parseRoomRanges } from "../../lib/roomRanges";
import { getDb, nextId, save, type DemoBlock } from "../db";
import { fail, guard, notFound, readJson, sessionUser, text } from "../http";
import { defaultCategories } from "../seed";
import { layoutView, meView, settingsView, teamView } from "../views";

const KINDS: HostelKind[] = ["HOSTEL", "CAMPUS", "SOCIETY"];

function inviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function buildBlock(hostelId: number, input: Partial<BlockInput>): DemoBlock | string {
  const name = text(input.name);
  if (!name) return "Give every block a name";
  const parsed = parseRoomRanges(text(input.rooms));
  if (!parsed.ok) return parsed.error;
  const blockId = nextId();
  return { id: blockId, hostelId, name, rooms: parsed.rooms.map((number) => ({ id: nextId(), number })) };
}

function findByCode(code: string) {
  const c = code.trim().toUpperCase();
  return getDb().hostels.find((h) => h.residentCode === c || h.staffCode === c);
}

export const hostelHandlers = [
  http.post("/api/hostels", async ({ request }) => {
    const me = sessionUser();
    if (!me) return fail(401, "UNAUTHENTICATED", "Please sign in");
    const body = await readJson<CreateHostelRequest>(request);
    const name = text(body.name);
    if (!name || !KINDS.includes(body.kind as HostelKind)) return fail(400, "VALIDATION", "Add a name and a type");
    const db = getDb();
    const hostelId = nextId();
    const blocks: DemoBlock[] = [];
    for (const input of body.blocks ?? []) {
      const block = buildBlock(hostelId, input);
      if (typeof block === "string") return fail(400, "BAD_ROOMS", block);
      blocks.push(block);
    }
    db.hostels.push({ id: hostelId, name, kind: body.kind as HostelKind, residentCode: inviteCode(), staffCode: inviteCode() });
    db.blocks.push(...blocks);
    const first = db.seq + 1;
    db.seq += 6;
    db.categories.push(...defaultCategories(hostelId, first));
    me.hostelId = hostelId;
    me.role = "WARDEN";
    save();
    return HttpResponse.json(meView(me), { status: 201 });
  }),

  http.post("/api/hostels/lookup", async ({ request }) => {
    const body = await readJson<{ code: string }>(request);
    const hostel = findByCode(text(body.code));
    if (!hostel) return fail(404, "BAD_CODE", "That code doesn't match any hostel");
    return HttpResponse.json({
      name: hostel.name,
      kind: hostel.kind,
      joinsAs: hostel.staffCode === text(body.code).toUpperCase() ? "STAFF" : "RESIDENT",
      blocks: layoutView(hostel.id),
    });
  }),

  http.post("/api/hostels/join", async ({ request }) => {
    const me = sessionUser();
    if (!me) return fail(401, "UNAUTHENTICATED", "Please sign in");
    const body = await readJson<JoinRequest>(request);
    const code = text(body.code).toUpperCase();
    const hostel = findByCode(code);
    if (!hostel) return fail(404, "BAD_CODE", "That code doesn't match any hostel");
    me.hostelId = hostel.id;
    me.role = hostel.staffCode === code ? "STAFF" : "RESIDENT";
    me.roomId = me.role === "RESIDENT" && typeof body.roomId === "number" ? body.roomId : null;
    save();
    return HttpResponse.json(meView(me));
  }),

  http.get("/api/hostel", () => {
    const g = guard(["WARDEN"]);
    return g.ok ? HttpResponse.json(settingsView(g.me.hostelId)) : g.response;
  }),

  http.put("/api/hostel", async ({ request }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const body = await readJson<UpdateHostelRequest>(request);
    const hostel = getDb().hostels.find((h) => h.id === g.me.hostelId);
    if (!hostel) return notFound("Hostel");
    if (text(body.name)) hostel.name = text(body.name);
    if (KINDS.includes(body.kind as HostelKind)) hostel.kind = body.kind as HostelKind;
    save();
    return HttpResponse.json(settingsView(hostel.id));
  }),

  http.post("/api/hostel/invite-codes/rotate", () => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const hostel = getDb().hostels.find((h) => h.id === g.me.hostelId);
    if (!hostel) return notFound("Hostel");
    hostel.residentCode = inviteCode();
    hostel.staffCode = inviteCode();
    save();
    return HttpResponse.json(settingsView(hostel.id));
  }),

  http.get("/api/hostel/layout", () => {
    const g = guard();
    return g.ok ? HttpResponse.json(layoutView(g.me.hostelId)) : g.response;
  }),

  http.post("/api/hostel/blocks", async ({ request }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const block = buildBlock(g.me.hostelId, await readJson<BlockInput>(request));
    if (typeof block === "string") return fail(400, "BAD_ROOMS", block);
    getDb().blocks.push(block);
    save();
    return HttpResponse.json(layoutView(g.me.hostelId), { status: 201 });
  }),

  http.post("/api/hostel/blocks/:id/rooms", async ({ request, params }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const block = getDb().blocks.find((b) => b.id === Number(params.id) && b.hostelId === g.me.hostelId);
    if (!block) return notFound("Block");
    const parsed = parseRoomRanges(text((await readJson<{ rooms: string }>(request)).rooms));
    if (!parsed.ok) return fail(400, "BAD_ROOMS", parsed.error);
    const existing = new Set(block.rooms.map((r) => r.number));
    parsed.rooms.filter((n) => !existing.has(n)).forEach((number) => block.rooms.push({ id: nextId(), number }));
    save();
    return HttpResponse.json(layoutView(g.me.hostelId));
  }),

  http.get("/api/hostel/categories", () => {
    const g = guard();
    if (!g.ok) return g.response;
    return HttpResponse.json(getDb().categories.filter((c) => c.hostelId === g.me.hostelId));
  }),

  http.put("/api/hostel/categories/:id", async ({ request, params }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const category = getDb().categories.find((c) => c.id === Number(params.id) && c.hostelId === g.me.hostelId);
    if (!category) return notFound("Category");
    const body = await readJson<UpdateCategoryRequest>(request);
    if (text(body.name)) category.name = text(body.name);
    if (typeof body.covers === "string") category.covers = body.covers.trim();
    if (typeof body.active === "boolean") category.active = body.active;
    if (body.slaHours) category.slaHours = { ...category.slaHours, ...body.slaHours };
    save();
    return HttpResponse.json(getDb().categories.filter((c) => c.hostelId === g.me.hostelId));
  }),

  http.get("/api/hostel/team", () => {
    const g = guard(["WARDEN"]);
    return g.ok ? HttpResponse.json(teamView(g.me.hostelId)) : g.response;
  }),

  http.put("/api/hostel/team/:id/skills", async ({ request, params }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const staff = getDb().users.find((u) => u.id === Number(params.id) && u.hostelId === g.me.hostelId && u.role === "STAFF");
    if (!staff) return notFound("Staff member");
    staff.skills = (await readJson<SetSkillsRequest>(request)).skills ?? [];
    save();
    return HttpResponse.json(teamView(g.me.hostelId));
  }),

  http.put("/api/hostel/team/:id/active", async ({ request, params }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const staff = getDb().users.find((u) => u.id === Number(params.id) && u.hostelId === g.me.hostelId && u.role === "STAFF");
    if (!staff) return notFound("Staff member");
    const body = await readJson<{ active: boolean }>(request);
    staff.active = body.active === true;
    save();
    return HttpResponse.json(teamView(g.me.hostelId));
  }),
];
