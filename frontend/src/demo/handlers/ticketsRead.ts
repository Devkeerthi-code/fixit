import { http, HttpResponse } from "msw";
import type { TicketStatus } from "../../api/types";
import { getDb, photos, type DemoTicket } from "../db";
import { guard, notFound, type Signed } from "../http";
import { isActive, isBreached } from "../rules";
import { detailView, summaryView } from "../views";

/** Residents see their own tickets plus common-area ones; staff and wardens see the whole hostel. */
export function visibleTickets(me: Signed): DemoTicket[] {
  return getDb().tickets.filter(
    (t) => t.hostelId === me.hostelId && (me.role !== "RESIDENT" || t.reporterId === me.id || t.commonArea),
  );
}

export function findVisible(me: Signed, id: number): DemoTicket | undefined {
  return visibleTickets(me).find((t) => t.id === id);
}

function matches(t: DemoTicket, q: URLSearchParams, me: Signed, now: Date): boolean {
  const statuses = q.getAll("status") as TicketStatus[];
  const num = (key: string) => (q.has(key) ? Number(q.get(key)) : null);
  const flag = (key: string) => q.get(key) === "true";
  if (statuses.length && !statuses.includes(t.status)) return false;
  if (num("categoryId") !== null && t.categoryId !== num("categoryId")) return false;
  if (num("blockId") !== null && t.blockId !== num("blockId")) return false;
  if (num("assigneeId") !== null && t.assigneeId !== num("assigneeId")) return false;
  if (flag("mine") && t.reporterId !== me.id) return false;
  if (flag("assignedToMe") && t.assigneeId !== me.id) return false;
  if (flag("breached") && !isBreached(t, now)) return false;
  if (flag("common") && !t.commonArea) return false;
  return true;
}

function bySort(sort: string | null) {
  return sort === "DUE"
    ? (a: DemoTicket, b: DemoTicket) => Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt) || b.id - a.id
    : (a: DemoTicket, b: DemoTicket) => b.id - a.id;
}

export const ticketReadHandlers = [
  http.get("/api/tickets", ({ request }) => {
    const g = guard();
    if (!g.ok) return g.response;
    const q = new URL(request.url).searchParams;
    const now = new Date();
    const page = Math.max(Number(q.get("page") ?? 0), 0);
    const size = Math.min(Math.max(Number(q.get("size") ?? 20), 1), 100);
    const all = visibleTickets(g.me).filter((t) => matches(t, q, g.me, now)).sort(bySort(q.get("sort")));
    const items = all.slice(page * size, page * size + size).map((t) => summaryView(t, g.me));
    return HttpResponse.json({ items, page, size, total: all.length });
  }),

  http.get("/api/tickets/duplicates", ({ request }) => {
    const g = guard();
    if (!g.ok) return g.response;
    const q = new URL(request.url).searchParams;
    const categoryId = Number(q.get("categoryId"));
    const roomId = q.has("roomId") ? Number(q.get("roomId")) : null;
    const blockId = q.has("blockId") ? Number(q.get("blockId")) : null;
    const dupes = getDb().tickets.filter(
      (t) =>
        t.hostelId === g.me.hostelId &&
        isActive(t.status) &&
        t.categoryId === categoryId &&
        (roomId !== null ? t.roomId === roomId : t.commonArea && t.blockId === blockId),
    );
    return HttpResponse.json(dupes.slice(0, 3).map((t) => summaryView(t, g.me)));
  }),

  http.get("/api/tickets/assignable-staff", () => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const staff = getDb().users.filter((u) => u.hostelId === g.me.hostelId && u.role === "STAFF" && u.active);
    return HttpResponse.json(staff.map((u) => ({ id: u.id, name: u.name })));
  }),

  http.get("/api/tickets/:id", ({ params }) => {
    const g = guard();
    if (!g.ok) return g.response;
    const ticket = findVisible(g.me, Number(params.id));
    return ticket ? HttpResponse.json(detailView(ticket, g.me)) : notFound("Ticket");
  }),

  http.get("/api/tickets/:id/photos/:photoId", ({ params }) => {
    const g = guard();
    if (!g.ok) return g.response;
    const ticket = findVisible(g.me, Number(params.id));
    const blob = photos.get(Number(params.photoId));
    if (!ticket || !blob || !ticket.photoIds.includes(Number(params.photoId))) return notFound("Photo");
    return new HttpResponse(blob, { headers: { "Content-Type": blob.type || "image/jpeg" } });
  }),
];
