/*
  The in-browser "database" behind the GitHub Pages demo. It lives in localStorage on the
  visitor's own device, so nothing they type in the demo leaves their browser.
*/
import type {
  EventView,
  HostelKind,
  Priority,
  Role,
  RoomView,
  SkillView,
  SlotView,
  TicketStatus,
} from "../api/types";
import { createSeed } from "./seed";

export interface DemoUser {
  id: number;
  name: string;
  email: string;
  /** Only accounts made inside the demo have one; the sample people accept any password. */
  password: string | null;
  role: Role;
  hostelId: number | null;
  roomId: number | null;
  active: boolean;
  skills: SkillView[];
}

export interface DemoHostel {
  id: number;
  name: string;
  kind: HostelKind;
  residentCode: string;
  staffCode: string;
}

export interface DemoBlock {
  id: number;
  hostelId: number;
  name: string;
  rooms: RoomView[];
}

export interface DemoCategory {
  id: number;
  hostelId: number;
  code: string;
  name: string;
  covers: string;
  active: boolean;
  slaHours: Record<Priority, number>;
}

export interface DemoTicket {
  id: number;
  hostelId: number;
  number: number;
  categoryId: number;
  blockId: number;
  roomId: number | null;
  commonArea: boolean;
  locationNote: string | null;
  description: string;
  priority: Priority;
  status: TicketStatus;
  reporterId: number;
  assigneeId: number | null;
  createdAt: string;
  slaDueAt: string;
  affectedBy: number[];
  version: number;
  photoIds: number[];
  visitSlots: SlotView[];
  rating: number | null;
  ratingComment: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  events: EventView[];
}

export interface DemoNotification {
  id: number;
  userId: number;
  ticketId: number | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DemoDb {
  seq: number;
  sessionUserId: number | null;
  users: DemoUser[];
  hostels: DemoHostel[];
  blocks: DemoBlock[];
  categories: DemoCategory[];
  tickets: DemoTicket[];
  notifications: DemoNotification[];
}

const STORAGE_KEY = "fixit-demo-db-v1";

/** Photos are kept in memory only: they are too big for localStorage and the demo doesn't need them after a reload. */
export const photos = new Map<number, Blob>();

let db: DemoDb = load();

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return dropMissingPhotos(JSON.parse(raw) as DemoDb);
  } catch {
    // private mode or corrupted data: start from the sample data instead
  }
  return createSeed(new Date());
}

function dropMissingPhotos(data: DemoDb): DemoDb {
  data.tickets.forEach((t) => {
    t.photoIds = t.photoIds.filter((id) => photos.has(id));
  });
  return data;
}

export function getDb(): DemoDb {
  return db;
}

export function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // storage full or blocked: the demo keeps working for this tab
  }
}

export function resetDb(): void {
  photos.clear();
  db = createSeed(new Date());
  save();
}

export function nextId(): number {
  db.seq += 1;
  return db.seq;
}
