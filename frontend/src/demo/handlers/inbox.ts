import { http, HttpResponse } from "msw";
import type { Count, Dashboard } from "../../api/types";
import { getDb, save, type DemoTicket } from "../db";
import { guard, noContent } from "../http";
import { isActive, isBreached } from "../rules";
import { roomLabel } from "../views";

const DAY_MS = 86_400_000;

function counts(tickets: DemoTicket[], label: (t: DemoTicket) => string): Count[] {
  const map = new Map<string, number>();
  tickets.forEach((t) => map.set(label(t), (map.get(label(t)) ?? 0) + 1));
  return [...map].map(([l, count]) => ({ label: l, count })).sort((a, b) => b.count - a.count);
}

function average(values: number[]): number | null {
  return values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : null;
}

export function buildDashboard(hostelId: number, from: string, to: string): Dashboard {
  const db = getDb();
  const start = Date.parse(from);
  const end = Date.parse(to) + DAY_MS;
  const all = db.tickets.filter((t) => t.hostelId === hostelId);
  const inRange = all.filter((t) => Date.parse(t.createdAt) >= start && Date.parse(t.createdAt) < end);
  const open = all.filter((t) => isActive(t.status));
  const closed = inRange.filter((t) => t.closedAt);
  const now = new Date();
  const categoryName = (t: DemoTicket) => db.categories.find((c) => c.id === t.categoryId)?.name ?? "Other";
  const blockName = (t: DemoTicket) => db.blocks.find((b) => b.id === t.blockId)?.name ?? "?";
  const staff = db.users.filter((u) => u.hostelId === hostelId && u.role === "STAFF");
  const roomRepeats = counts(inRange.filter((t) => t.roomId), (t) => `${roomLabel(t.roomId)}|${categoryName(t)}`);
  return {
    from,
    to,
    summary: {
      open: open.length,
      created: inRange.length,
      closed: closed.length,
      avgResolutionHours: average(
        closed.filter((t) => t.resolvedAt).map((t) => (Date.parse(t.resolvedAt ?? "") - Date.parse(t.createdAt)) / 3_600_000),
      ),
      slaBreachRate: inRange.length ? inRange.filter((t) => isBreached(t, now)).length / inRange.length : 0,
      avgRating: average(inRange.flatMap((t) => (t.rating ? [t.rating] : []))),
    },
    openByCategory: counts(open, categoryName),
    openByBlock: counts(open, blockName),
    staff: staff.map((s) => ({
      id: s.id,
      name: s.name,
      open: open.filter((t) => t.assigneeId === s.id).length,
      resolved: inRange.filter((t) => t.assigneeId === s.id && t.resolvedAt).length,
      avgRating: average(inRange.flatMap((t) => (t.assigneeId === s.id && t.rating ? [t.rating] : []))),
    })),
    recurringRooms: roomRepeats
      .filter((r) => r.count > 1)
      .map((r) => {
        const [room = "", category = ""] = r.label.split("|");
        return { room, category, tickets: r.count };
      }),
  };
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function range(request: Request) {
  const q = new URL(request.url).searchParams;
  const to = q.get("to") ?? isoDay(new Date());
  const from = q.get("from") ?? isoDay(new Date(Date.now() - 29 * DAY_MS));
  return { from, to };
}

export const inboxHandlers = [
  http.get("/api/notifications", () => {
    const g = guard();
    if (!g.ok) return g.response;
    const items = getDb()
      .notifications.filter((n) => n.userId === g.me.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 30);
    return HttpResponse.json({ items, unread: items.filter((n) => !n.read).length });
  }),

  http.post("/api/notifications/read", () => {
    const g = guard();
    if (!g.ok) return g.response;
    getDb().notifications.forEach((n) => {
      if (n.userId === g.me.id) n.read = true;
    });
    save();
    return noContent();
  }),

  http.get("/api/dashboard", ({ request }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const { from, to } = range(request);
    return HttpResponse.json(buildDashboard(g.me.hostelId, from, to));
  }),

  http.get("/api/dashboard/export.csv", ({ request }) => {
    const g = guard(["WARDEN"]);
    if (!g.ok) return g.response;
    const { from, to } = range(request);
    const rows = getDb()
      .tickets.filter((t) => t.hostelId === g.me.hostelId && t.createdAt.slice(0, 10) >= from && t.createdAt.slice(0, 10) <= to)
      .map((t) => [`FX-${t.number}`, t.status, t.priority, t.createdAt, `"${t.description.replace(/"/g, '""')}"`].join(","));
    const csv = ["ticket,status,priority,created_at,description", ...rows].join("\n");
    return new HttpResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="fixit-demo-tickets.csv"' },
    });
  }),
];
