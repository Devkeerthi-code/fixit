/* Test-only builders. Nothing here ships in the app bundle. */
import type { BlockView, CategoryView, Me, Role, TicketDetail, TicketStatus, TicketSummary } from "../api/types";

export function aMe(role: Role = "RESIDENT", overrides: Partial<Me> = {}): Me {
  return {
    id: 7,
    name: "Asha Verma",
    email: "asha@example.test",
    role,
    platformAdmin: false,
    hostel: { id: 1, name: "Test Hostel", kind: "HOSTEL" },
    room: { id: 204, label: "B-204", blockId: 2, blockName: "B" },
    ...overrides,
  };
}

export const plumbing: CategoryView = {
  id: 11,
  code: "PLUMBING",
  name: "Plumbing",
  covers: "Taps, leaks, blocked drains, flush, geyser and water supply",
  active: true,
  slaHours: { LOW: 72, NORMAL: 24, URGENT: 4 },
};

export const blocks: BlockView[] = [
  { id: 1, name: "A", rooms: [{ id: 101, number: "101" }] },
  { id: 2, name: "B", rooms: [{ id: 204, number: "204" }] },
];

export function aTicket(overrides: Partial<TicketSummary> = {}): TicketSummary {
  return {
    id: 12,
    code: "FX-12",
    category: { id: 11, code: "PLUMBING", name: "Plumbing" },
    block: { id: 2, name: "B" },
    roomLabel: "B-204",
    commonArea: false,
    locationNote: null,
    description: "Bathroom tap keeps dripping all night",
    priority: "NORMAL",
    status: "ASSIGNED",
    reporter: { id: 7, name: "Asha Verma" },
    assignee: { id: 30, name: "Ravi Kumar" },
    createdAt: "2026-11-14T15:42:00Z",
    slaDueAt: "2099-01-01T00:00:00Z",
    slaBreached: false,
    affectedCount: 0,
    affectedByMe: false,
    version: 3,
    ...overrides,
  };
}

export function aDetail(status: TicketStatus, overrides: Partial<TicketDetail> = {}): TicketDetail {
  const reached = { OPEN: 0, REOPENED: 0, ASSIGNED: 1, IN_PROGRESS: 2, RESOLVED: 3, CLOSED: 3 }[status];
  return {
    ticket: aTicket({ status, assignee: reached >= 1 ? { id: 30, name: "Ravi Kumar" } : null }),
    photoIds: [],
    visitSlots: [],
    rating: status === "CLOSED" ? 5 : null,
    ratingComment: null,
    assignedAt: reached >= 1 ? "2026-11-15T03:10:00Z" : null,
    startedAt: reached >= 2 ? "2026-11-15T10:22:00Z" : null,
    resolvedAt: reached >= 3 ? "2026-11-15T10:51:00Z" : null,
    closedAt: status === "CLOSED" ? "2026-11-15T12:00:00Z" : null,
    availableActions: status === "RESOLVED" ? ["CONFIRM", "REOPEN"] : [],
    events: [],
    ...overrides,
  };
}

export function page<T>(items: T[]) {
  return { items, page: 0, size: 20, total: items.length };
}
