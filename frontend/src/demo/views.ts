/* Turns demo records into the same DTO shapes the Spring Boot API returns. */
import type { BlockView, HostelSettings, Me, Ref, StaffView, TicketDetail, TicketSummary } from "../api/types";
import { getDb, type DemoTicket, type DemoUser } from "./db";
import { availableActions, isBreached, rolesOf } from "./rules";

export function userById(id: number | null): DemoUser | undefined {
  return getDb().users.find((u) => u.id === id);
}

function ref(id: number | null): Ref | null {
  const u = userById(id);
  return u ? { id: u.id, name: u.name } : null;
}

export function roomLabel(roomId: number | null): string | null {
  for (const block of getDb().blocks) {
    const room = block.rooms.find((r) => r.id === roomId);
    if (room) return `${block.name}-${room.number}`;
  }
  return null;
}

export function meView(user: DemoUser): Me {
  const db = getDb();
  const hostel = db.hostels.find((h) => h.id === user.hostelId);
  const block = db.blocks.find((b) => b.rooms.some((r) => r.id === user.roomId));
  const label = roomLabel(user.roomId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    platformAdmin: false,
    hostel: hostel ? { id: hostel.id, name: hostel.name, kind: hostel.kind } : null,
    room: block && label && user.roomId ? { id: user.roomId, label, blockId: block.id, blockName: block.name } : null,
  };
}

export function summaryView(t: DemoTicket, me: DemoUser): TicketSummary {
  const db = getDb();
  const category = db.categories.find((c) => c.id === t.categoryId);
  const block = db.blocks.find((b) => b.id === t.blockId);
  return {
    id: t.id,
    code: `FX-${t.number}`,
    category: { id: t.categoryId, code: category?.code ?? "", name: category?.name ?? "" },
    block: { id: t.blockId, name: block?.name ?? "" },
    roomLabel: roomLabel(t.roomId),
    commonArea: t.commonArea,
    locationNote: t.locationNote,
    description: t.description,
    priority: t.priority,
    status: t.status,
    reporter: ref(t.reporterId),
    assignee: ref(t.assigneeId),
    createdAt: t.createdAt,
    slaDueAt: t.slaDueAt,
    slaBreached: isBreached(t, new Date()),
    // Same as the backend: the count includes the reporter, so a fresh common-area ticket shows "1 affected".
    affectedCount: t.commonArea ? t.affectedBy.length + 1 : 0,
    affectedByMe: t.affectedBy.includes(me.id),
    version: t.version,
  };
}

export function detailView(t: DemoTicket, me: DemoUser): TicketDetail {
  return {
    ticket: summaryView(t, me),
    photoIds: t.photoIds,
    visitSlots: t.visitSlots,
    rating: t.rating,
    ratingComment: t.ratingComment,
    assignedAt: t.assignedAt,
    startedAt: t.startedAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    availableActions: availableActions(t.status, rolesOf(me, t)),
    events: t.events,
  };
}

export function layoutView(hostelId: number): BlockView[] {
  return getDb()
    .blocks.filter((b) => b.hostelId === hostelId)
    .map((b) => ({ id: b.id, name: b.name, rooms: b.rooms }));
}

export function teamView(hostelId: number): StaffView[] {
  return getDb()
    .users.filter((u) => u.hostelId === hostelId && u.role === "STAFF")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, skills: u.skills }));
}

export function settingsView(hostelId: number): HostelSettings {
  const db = getDb();
  const hostel = db.hostels.find((h) => h.id === hostelId);
  if (!hostel) throw new Error("Unknown demo hostel");
  return {
    id: hostel.id,
    name: hostel.name,
    kind: hostel.kind,
    residentInviteCode: hostel.residentCode,
    staffInviteCode: hostel.staffCode,
    members: db.users.filter((u) => u.hostelId === hostelId).length,
  };
}
