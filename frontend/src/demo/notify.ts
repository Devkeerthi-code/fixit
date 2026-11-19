import { getDb, nextId } from "./db";

export function notify(userId: number | null, ticketId: number, type: string, message: string): void {
  if (userId === null) return;
  getDb().notifications.push({ id: nextId(), userId, ticketId, type, message, read: false, createdAt: new Date().toISOString() });
}

export function notifyWardens(hostelId: number, ticketId: number, type: string, message: string): void {
  getDb()
    .users.filter((u) => u.hostelId === hostelId && u.role === "WARDEN")
    .forEach((w) => notify(w.id, ticketId, type, message));
}
