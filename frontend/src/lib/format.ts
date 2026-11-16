import type { HostelKind, Priority, TicketStatus, TicketSummary, TimeWindow } from "../api/types";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Reported",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "On the way",
  RESOLVED: "Fixed, please check",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

export const STATUS_CLASS: Record<TicketStatus, string> = {
  OPEN: "status--open",
  ASSIGNED: "status--assigned",
  IN_PROGRESS: "status--onway",
  RESOLVED: "status--fixed",
  CLOSED: "status--closed",
  REOPENED: "status--reopened",
};

export const PRIORITY_LABEL: Record<Priority, string> = { LOW: "Can wait", NORMAL: "Normal", URGENT: "Urgent" };
export const PRIORITY_HINT: Record<Priority, string> = {
  LOW: "a few days is fine",
  NORMAL: "within a day",
  URGENT: "flooding, sparks, no power",
};
export const PRIORITIES: Priority[] = ["LOW", "NORMAL", "URGENT"];

export const WINDOW_LABEL: Record<TimeWindow, string> = { MORNING: "Morning", AFTERNOON: "Afternoon", EVENING: "Evening" };
export const WINDOWS: TimeWindow[] = ["MORNING", "AFTERNOON", "EVENING"];

export const KIND_LABEL: Record<HostelKind, string> = { HOSTEL: "Hostel", CAMPUS: "Campus", SOCIETY: "Apartment society" };
export const KINDS: HostelKind[] = ["HOSTEL", "CAMPUS", "SOCIETY"];

export const ACTIVE_STATUSES: TicketStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "REOPENED"];
export const NOT_CLOSED_STATUSES: TicketStatus[] = [...ACTIVE_STATUSES, "RESOLVED"];
export const ALL_STATUSES: TicketStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REOPENED", "CLOSED"];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  return `${day}, ${time}`;
}

export function formatDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  if (diff < 2 * DAY) return "yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatHours(hours: number): string {
  if (hours < 24) return `${hours} h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} day${days === 1 ? "" : "s"}`;
}

function span(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  return `${Math.round(ms / DAY)} d`;
}

export function slaText(t: Pick<TicketSummary, "slaDueAt" | "slaBreached" | "status">, now = Date.now()): string {
  if (t.status === "CLOSED" || t.status === "RESOLVED") return "Done";
  const diff = new Date(t.slaDueAt).getTime() - now;
  if (t.slaBreached || diff < 0) return `Overdue ${span(Math.abs(diff))}`;
  return `Due in ${span(diff)}`;
}

export function placeOf(t: Pick<TicketSummary, "commonArea" | "roomLabel" | "block" | "locationNote">): string {
  if (!t.commonArea) return t.roomLabel ?? t.block.name;
  return t.locationNote ? `${blockLabel(t.block.name)} · ${t.locationNote}` : `${blockLabel(t.block.name)} common area`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "B" reads as "Block B"; a warden who already typed "Block B" or "Tower 2" keeps their own name. */
export function blockLabel(name: string): string {
  return /^\d+$|^[A-Za-z]{1,2}\d*$/.test(name.trim()) ? `Block ${name.trim()}` : name.trim();
}
