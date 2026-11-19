import { http, HttpResponse } from "msw";
import type { AssignRequest, CreateTicketRequest, TicketAction, TransitionRequest } from "../../api/types";
import { getDb, nextId, photos, save, type DemoTicket } from "../db";
import { fail, guard, notFound, readJson, type Signed } from "../http";
import { notify, notifyWardens } from "../notify";
import { isActive, nextStatus, pickAssignee, rolesOf, slaDueAt } from "../rules";
import { detailView, roomLabel, userById } from "../views";
import { findVisible } from "./ticketsRead";

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 500 * 1024;
const replays = new Map<string, number>();

function code(t: DemoTicket) {
  return `FX-${t.number}`;
}

function place(t: DemoTicket) {
  return roomLabel(t.roomId) ?? t.locationNote ?? "common area";
}

function addEvent(t: DemoTicket, event: Omit<DemoTicket["events"][number], "at">) {
  t.events.push({ ...event, at: new Date().toISOString() });
}

function moveTo(t: DemoTicket, to: DemoTicket["status"]) {
  const now = new Date().toISOString();
  t.status = to;
  t.version += 1;
  if (to === "ASSIGNED") t.assignedAt = now;
  if (to === "IN_PROGRESS") t.startedAt = now;
  if (to === "RESOLVED") t.resolvedAt = now;
  if (to === "CLOSED") t.closedAt = now;
}

function openLoad(userId: number) {
  return getDb().tickets.filter((t) => t.assigneeId === userId && isActive(t.status)).length;
}

function assignBySystem(t: DemoTicket, staffId: number, note: string) {
  const from = t.status;
  t.assigneeId = staffId;
  moveTo(t, "ASSIGNED");
  addEvent(t, { type: "ASSIGNED", from, to: "ASSIGNED", note, actor: "FixIt" });
  notify(staffId, t.id, "ASSIGNED", `${code(t)} assigned to you: ${place(t)}`);
}

function autoAssign(t: DemoTicket) {
  const staff = getDb().users.filter((u) => u.hostelId === t.hostelId);
  const pick = pickAssignee(staff, openLoad, t.categoryId, t.blockId);
  if (pick) assignBySystem(t, pick.id, `Auto-assigned to ${pick.name}`);
  else notifyWardens(t.hostelId, t.id, "UNASSIGNED", `${code(t)} needs someone: no staff handle this category here`);
}

type Location = { ok: true; blockId: number; roomId: number | null } | { ok: false; response: Response };

function resolveLocation(me: Signed, req: Partial<CreateTicketRequest>): Location {
  const blocks = getDb().blocks.filter((b) => b.hostelId === me.hostelId);
  if (req.commonArea) {
    const block = blocks.find((b) => b.id === req.blockId);
    if (!block) return { ok: false, response: fail(400, "BLOCK_REQUIRED", "Pick the block for this common-area issue") };
    return { ok: true, blockId: block.id, roomId: null };
  }
  const roomId = req.roomId ?? me.roomId;
  const block = blocks.find((b) => b.rooms.some((r) => r.id === roomId));
  if (!roomId || !block) return { ok: false, response: fail(400, "ROOM_REQUIRED", "Add your room to your profile, or pick a room") };
  return { ok: true, blockId: block.id, roomId };
}

async function readPhotos(form: FormData): Promise<number[] | string> {
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (files.length > MAX_PHOTOS) return `Attach up to ${MAX_PHOTOS} photos`;
  if (files.some((f) => f.size > MAX_PHOTO_BYTES)) return "Each photo must be under 500 KB";
  return files.map((file) => {
    const id = nextId();
    photos.set(id, file);
    return id;
  });
}

async function createTicket(me: Signed, request: Request): Promise<Response> {
  const key = request.headers.get("Idempotency-Key");
  const replay = key ? replays.get(`${me.id}:${key}`) : undefined;
  const existing = replay ? findVisible(me, replay) : undefined;
  if (existing) return HttpResponse.json(detailView(existing, me));

  const form = await request.formData();
  const part = form.get("ticket");
  const req = (part instanceof Blob ? JSON.parse(await part.text()) : {}) as Partial<CreateTicketRequest>;
  const db = getDb();
  const category = db.categories.find((c) => c.id === req.categoryId && c.hostelId === me.hostelId && c.active);
  if (!category) return notFound("Category");
  const description = typeof req.description === "string" ? req.description.trim() : "";
  if (description.length < 5) return fail(400, "VALIDATION", "Describe the problem in a few words");
  const location = resolveLocation(me, req);
  if (!location.ok) return location.response;
  const duplicate = db.tickets.find(
    (t) => t.hostelId === me.hostelId && location.roomId && t.roomId === location.roomId && t.categoryId === category.id && t.status !== "CLOSED",
  );
  if (duplicate && !req.confirmDuplicate) {
    return fail(409, "DUPLICATE", `There's already an open ${category.name} ticket for ${roomLabel(location.roomId)} (${code(duplicate)})`);
  }
  const photoIds = await readPhotos(form);
  if (typeof photoIds === "string") return fail(400, "BAD_PHOTO", photoIds);

  const priority = req.priority ?? "NORMAL";
  const now = new Date();
  const number = Math.max(0, ...db.tickets.filter((t) => t.hostelId === me.hostelId).map((t) => t.number)) + 1;
  const ticket: DemoTicket = {
    id: nextId(),
    hostelId: me.hostelId,
    number,
    categoryId: category.id,
    blockId: location.blockId,
    roomId: location.roomId,
    commonArea: req.commonArea === true,
    locationNote: req.locationNote?.trim() || null,
    description,
    priority,
    status: "OPEN",
    reporterId: me.id,
    assigneeId: null,
    createdAt: now.toISOString(),
    slaDueAt: slaDueAt(now, category.slaHours[priority]),
    affectedBy: [],
    version: 0,
    photoIds,
    visitSlots: req.visitSlots ?? [],
    rating: null,
    ratingComment: null,
    assignedAt: null,
    startedAt: null,
    resolvedAt: null,
    closedAt: null,
    events: [{ type: "CREATED", from: null, to: "OPEN", note: null, actor: me.name, at: now.toISOString() }],
  };
  db.tickets.push(ticket);
  autoAssign(ticket);
  if (key) replays.set(`${me.id}:${key}`, ticket.id);
  save();
  return HttpResponse.json(detailView(ticket, me), { status: 201 });
}

function afterTransition(t: DemoTicket, action: TicketAction, rating: number | null) {
  const assignee = userById(t.assigneeId);
  if (action === "START") notify(t.reporterId, t.id, "ON_THE_WAY", `${assignee?.name ?? "Staff"} is on the way for ${code(t)}`);
  if (action === "RESOLVE") notify(t.reporterId, t.id, "RESOLVED", `${code(t)} is marked fixed. Please confirm it really is.`);
  if (action === "CONFIRM") notify(t.assigneeId, t.id, "CONFIRMED", `Resident confirmed ${code(t)} (${rating}/5)`);
  if (action === "REOPEN") {
    const category = getDb().categories.find((c) => c.id === t.categoryId);
    t.slaDueAt = slaDueAt(new Date(), category?.slaHours[t.priority] ?? 24);
    if (assignee?.active) assignBySystem(t, assignee.id, `Back to ${assignee.name} after the resident reopened it`);
    else autoAssign(t);
    notifyWardens(t.hostelId, t.id, "REOPENED", `${code(t)} was reopened: the resident says it isn't fixed`);
  }
}

const stale = () => fail(409, "STALE_UPDATE", "Someone else updated this ticket a moment ago. Refresh to see the latest.");

export const ticketWriteHandlers = [
  http.post("/api/tickets", async ({ request }) => {
    const g = guard();
    return g.ok ? createTicket(g.me, request) : g.response;
  }),

  http.post("/api/tickets/:id/transitions", async ({ request, params }) => {
    const g = guard();
    if (!g.ok) return g.response;
    const ticket = findVisible(g.me, Number(params.id));
    if (!ticket) return notFound("Ticket");
    const req = await readJson<TransitionRequest>(request);
    if (!req.action || req.action === "ASSIGN") return fail(400, "USE_ASSIGN", "Use the assign endpoint to assign a ticket");
    if (req.version !== ticket.version) return stale();
    const result = nextStatus(ticket.status, req.action, rolesOf(g.me, ticket));
    if (!result.ok) return fail(result.status, result.status === 409 ? "ILLEGAL_TRANSITION" : "FORBIDDEN", result.message);
    if (req.action === "CONFIRM") {
      if (!req.rating) return fail(400, "RATING_REQUIRED", "Rate the fix from 1 to 5 stars");
      ticket.rating = req.rating;
      ticket.ratingComment = req.note?.trim() || null;
    }
    const from = ticket.status;
    moveTo(ticket, result.to);
    addEvent(ticket, { type: "STATUS_CHANGED", from, to: result.to, note: req.note?.trim() || null, actor: g.me.name });
    afterTransition(ticket, req.action, req.rating ?? null);
    save();
    return HttpResponse.json(detailView(ticket, g.me));
  }),

  http.post("/api/tickets/:id/assign", async ({ request, params }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const ticket = findVisible(g.me, Number(params.id));
    if (!ticket) return notFound("Ticket");
    const req = await readJson<AssignRequest>(request);
    if (req.version !== ticket.version) return stale();
    const staff = getDb().users.find((u) => u.id === req.staffId && u.hostelId === g.me.hostelId && u.role === "STAFF" && u.active);
    if (!staff) return notFound("Staff member");
    if (!isActive(ticket.status)) return fail(409, "ILLEGAL_TRANSITION", "Can't assign a ticket that is finished");
    const previous = ticket.assigneeId;
    const from = ticket.status;
    ticket.assigneeId = staff.id;
    moveTo(ticket, "ASSIGNED");
    addEvent(ticket, { type: "ASSIGNED", from, to: "ASSIGNED", note: `Assigned to ${staff.name}`, actor: g.me.name });
    notify(staff.id, ticket.id, "ASSIGNED", `${code(ticket)} assigned to you: ${place(ticket)}`);
    if (previous !== null && previous !== staff.id) notify(previous, ticket.id, "REASSIGNED", `${code(ticket)} was moved to ${staff.name}`);
    save();
    return HttpResponse.json(detailView(ticket, g.me));
  }),

  ...(["post", "delete"] as const).map((method) =>
    http[method]("/api/tickets/:id/affects-me", ({ params }) => {
      const g = guard();
      if (!g.ok) return g.response;
      const ticket = findVisible(g.me, Number(params.id));
      if (!ticket) return notFound("Ticket");
      if (!ticket.commonArea) return fail(400, "NOT_COMMON", "Only common-area issues can be shared");
      const reporter = ticket.reporterId === g.me.id;
      if (!reporter && method === "post" && ticket.status !== "CLOSED" && !ticket.affectedBy.includes(g.me.id)) {
        ticket.affectedBy.push(g.me.id);
        addEvent(ticket, { type: "AFFECTS_ME", from: null, to: null, note: null, actor: g.me.name });
      }
      if (method === "delete") ticket.affectedBy = ticket.affectedBy.filter((id) => id !== g.me.id);
      save();
      return HttpResponse.json({ affectedCount: ticket.affectedBy.length + 1, affectedByMe: reporter || ticket.affectedBy.includes(g.me.id) });
    }),
  ),
];
