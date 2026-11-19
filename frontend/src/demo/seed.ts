/* Sample data for the public demo. Every name here is made up and labelled as demo data in the UI. */
import type { Priority, TicketStatus } from "../api/types";
import type { DemoBlock, DemoCategory, DemoDb, DemoTicket, DemoUser } from "./db";
import { DEFAULT_SLA_HOURS, slaDueAt } from "./rules";

export const DEMO_HOSTEL_ID = 1;

export const PERSONAS = { resident: 10, staff: 20, warden: 30 } as const;

const CATEGORY_TEMPLATES: [string, string, string][] = [
  ["PLUMBING", "Plumbing", "Taps, leaks, blocked drains, flush, geyser and water supply"],
  ["ELECTRICAL", "Electrical", "Lights, fans, switches, sockets, MCB trips and power cuts"],
  ["WIFI", "Wi-Fi", "No signal, slow speed, router or LAN port not working"],
  ["FURNITURE", "Furniture", "Bed, table, chair, cupboard, door locks and windows"],
  ["HOUSEKEEPING", "Housekeeping", "Room and corridor cleaning, washrooms, garbage and pests"],
  ["MESS", "Mess", "Food quality, hygiene, timings and drinking water"],
];

export function defaultCategories(hostelId: number, firstId: number): DemoCategory[] {
  return CATEGORY_TEMPLATES.map(([code, name, covers], i) => ({
    id: firstId + i,
    hostelId,
    code,
    name,
    covers,
    active: true,
    slaHours: { ...DEFAULT_SLA_HOURS },
  }));
}

function roomsFor(blockId: number, numbers: string[]) {
  return numbers.map((number, i) => ({ id: blockId * 100 + i + 1, number }));
}

function range(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
}

const BLOCKS: DemoBlock[] = [
  { id: 1, hostelId: DEMO_HOSTEL_ID, name: "A", rooms: roomsFor(1, range(101, 112)) },
  { id: 2, hostelId: DEMO_HOSTEL_ID, name: "B", rooms: roomsFor(2, range(201, 212)) },
  { id: 3, hostelId: DEMO_HOSTEL_ID, name: "C", rooms: roomsFor(3, range(301, 308)) },
];

function person(id: number, name: string, role: DemoUser["role"], extra: Partial<DemoUser> = {}): DemoUser {
  const email = name.split(" ")[0]?.toLowerCase() + "@example.test";
  return { id, name, email, password: null, role, hostelId: DEMO_HOSTEL_ID, roomId: null, active: true, skills: [], ...extra };
}

const USERS: DemoUser[] = [
  person(PERSONAS.resident, "Asha Verma", "RESIDENT", { roomId: 204 }),
  person(11, "Kiran Rao", "RESIDENT", { roomId: 103 }),
  person(12, "Farhan Ali", "RESIDENT", { roomId: 302 }),
  person(PERSONAS.staff, "Ravi Kumar", "STAFF", {
    skills: [
      { categoryId: 101, blockId: null },
      { categoryId: 102, blockId: null },
    ],
  }),
  person(21, "Suresh Babu", "STAFF", {
    skills: [
      { categoryId: 103, blockId: null },
      { categoryId: 104, blockId: null },
      { categoryId: 105, blockId: null },
    ],
  }),
  person(PERSONAS.warden, "Meera Iyer", "WARDEN"),
];

interface TicketSeed {
  categoryId: number;
  roomId: number | null;
  blockId: number;
  description: string;
  priority: Priority;
  status: TicketStatus;
  reporterId: number;
  assigneeId: number | null;
  hoursAgo: number;
  locationNote?: string;
  affectedBy?: number[];
  rating?: number;
}

const TICKETS: TicketSeed[] = [
  { categoryId: 101, roomId: 204, blockId: 2, description: "Bathroom tap keeps dripping all night", priority: "NORMAL", status: "ASSIGNED", reporterId: 10, assigneeId: 20, hoursAgo: 5 },
  { categoryId: 103, roomId: null, blockId: 2, locationNote: "Second floor corridor router", description: "Wi-Fi drops every few minutes on the second floor", priority: "URGENT", status: "OPEN", reporterId: 11, assigneeId: null, hoursAgo: 7, affectedBy: [10, 12] },
  { categoryId: 102, roomId: 103, blockId: 1, description: "Ceiling fan makes a grinding noise at high speed", priority: "LOW", status: "IN_PROGRESS", reporterId: 11, assigneeId: 20, hoursAgo: 30 },
  { categoryId: 104, roomId: 204, blockId: 2, description: "Cupboard door hinge is broken", priority: "LOW", status: "RESOLVED", reporterId: 10, assigneeId: 21, hoursAgo: 50 },
  { categoryId: 105, roomId: null, blockId: 3, locationNote: "Ground floor washroom", description: "Washroom not cleaned since yesterday morning", priority: "NORMAL", status: "REOPENED", reporterId: 12, assigneeId: 21, hoursAgo: 40, affectedBy: [10] },
  { categoryId: 101, roomId: 302, blockId: 3, description: "Geyser not heating water", priority: "NORMAL", status: "CLOSED", reporterId: 12, assigneeId: 20, hoursAgo: 120, rating: 5 },
  { categoryId: 106, roomId: null, blockId: 1, locationNote: "Mess hall", description: "Drinking water cooler is leaking near the mess", priority: "NORMAL", status: "ASSIGNED", reporterId: 10, assigneeId: 20, hoursAgo: 28 },
];

const REACHED: Record<TicketStatus, number> = { OPEN: 0, REOPENED: 1, ASSIGNED: 1, IN_PROGRESS: 2, RESOLVED: 3, CLOSED: 4 };

function hoursBefore(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 3_600_000).toISOString();
}

function buildTicket(seed: TicketSeed, index: number, now: Date, users: DemoUser[]): DemoTicket {
  const created = new Date(now.getTime() - seed.hoursAgo * 3_600_000);
  const step = REACHED[seed.status];
  const at = (h: number) => hoursBefore(now, Math.max(seed.hoursAgo - h, 0.2));
  const nameOf = (id: number | null) => users.find((u) => u.id === id)?.name ?? "FixIt";
  const id = index + 1;
  return {
    id,
    hostelId: DEMO_HOSTEL_ID,
    number: id,
    categoryId: seed.categoryId,
    blockId: seed.blockId,
    roomId: seed.roomId,
    commonArea: seed.roomId === null,
    locationNote: seed.locationNote ?? null,
    description: seed.description,
    priority: seed.priority,
    status: seed.status,
    reporterId: seed.reporterId,
    assigneeId: seed.assigneeId,
    createdAt: created.toISOString(),
    slaDueAt: slaDueAt(created, DEFAULT_SLA_HOURS[seed.priority]),
    affectedBy: seed.affectedBy ?? [],
    version: step + 1,
    photoIds: [],
    visitSlots: [],
    rating: seed.rating ?? null,
    ratingComment: seed.rating ? "Fixed the same evening, thanks" : null,
    assignedAt: step >= 1 && seed.assigneeId ? at(1) : null,
    startedAt: step >= 2 ? at(2) : null,
    resolvedAt: step >= 3 ? at(3) : null,
    closedAt: step >= 4 ? at(4) : null,
    events: [
      { type: "CREATED", from: null, to: "OPEN", note: null, actor: nameOf(seed.reporterId), at: created.toISOString() },
      ...(seed.assigneeId
        ? [{ type: "ASSIGNED" as const, from: "OPEN" as const, to: "ASSIGNED" as const, note: null, actor: "FixIt", at: at(1) }]
        : []),
    ],
  };
}

export function createSeed(now: Date): DemoDb {
  const users = USERS.map((u) => ({ ...u, skills: [...u.skills] }));
  return {
    seq: 1000,
    sessionUserId: null,
    users,
    hostels: [{ id: DEMO_HOSTEL_ID, name: "Demo Hostel (sample data)", kind: "HOSTEL", residentCode: "DEMO-RES", staffCode: "DEMO-STF" }],
    blocks: BLOCKS.map((b) => ({ ...b, rooms: [...b.rooms] })),
    categories: defaultCategories(DEMO_HOSTEL_ID, 101),
    tickets: TICKETS.map((t, i) => buildTicket(t, i, now, users)),
    notifications: [
      { id: 1, userId: PERSONAS.staff, ticketId: 1, type: "ASSIGNED", message: "FX-1 assigned to you: B-204", read: false, createdAt: hoursBefore(now, 4.8) },
      { id: 2, userId: PERSONAS.resident, ticketId: 4, type: "RESOLVED", message: "FX-4 is marked fixed. Confirm it or reopen it", read: false, createdAt: hoursBefore(now, 3) },
      { id: 3, userId: PERSONAS.warden, ticketId: 5, type: "REOPENED", message: "FX-5 was reopened by the resident", read: false, createdAt: hoursBefore(now, 6) },
    ],
  };
}
