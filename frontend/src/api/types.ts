/* Mirrors the Spring Boot DTOs (records) one-to-one. Instants are ISO strings, LocalDates are "YYYY-MM-DD". */

export type Role = "RESIDENT" | "STAFF" | "WARDEN";
export type HostelKind = "HOSTEL" | "CAMPUS" | "SOCIETY";
export type TicketStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REOPENED";
export type TicketAction = "ASSIGN" | "START" | "RESOLVE" | "CONFIRM" | "REOPEN";
export type Priority = "LOW" | "NORMAL" | "URGENT";
export type TimeWindow = "MORNING" | "AFTERNOON" | "EVENING";
export type TicketSort = "RECENT" | "DUE";
export type EventType = "CREATED" | "STATUS_CHANGED" | "ASSIGNED" | "SLA_BREACHED" | "AFFECTS_ME" | "RATED" | "NOTE";

/* ---------- common/ApiError ---------- */
export interface FieldProblem {
  field: string;
  message: string;
}
export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  fieldErrors: FieldProblem[];
  timestamp: string;
}

/* ---------- auth/AuthDtos ---------- */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}

/* ---------- user/MeView ---------- */
export interface HostelRef {
  id: number;
  name: string;
  kind: HostelKind;
}
export interface RoomRef {
  id: number;
  label: string;
  blockId: number;
  blockName: string;
}
export interface Me {
  id: number;
  name: string;
  email: string;
  role: Role;
  platformAdmin: boolean;
  hostel: HostelRef | null;
  room: RoomRef | null;
}
export interface UpdateMeRequest {
  name?: string;
  roomId?: number;
}

/* ---------- hostel/HostelDtos ---------- */
export interface BlockInput {
  name: string;
  rooms: string;
}
export interface CreateHostelRequest {
  name: string;
  kind: HostelKind;
  blocks: BlockInput[];
}
export interface CodeRequest {
  code: string;
}
export interface JoinRequest {
  code: string;
  roomId?: number | null;
}
export interface UpdateHostelRequest {
  name: string;
  kind: HostelKind;
}
export interface RoomsRequest {
  rooms: string;
}
export type SlaHours = Partial<Record<Priority, number>>;
export interface UpdateCategoryRequest {
  name: string;
  covers: string;
  active: boolean;
  slaHours: Record<Priority, number>;
}
export interface SkillInput {
  categoryId: number;
  blockId: number | null;
}
export interface SetSkillsRequest {
  skills: SkillInput[];
}
export interface ActiveRequest {
  active: boolean;
}
export interface RoomView {
  id: number;
  number: string;
}
export interface BlockView {
  id: number;
  name: string;
  rooms: RoomView[];
}
export interface HostelLookup {
  name: string;
  kind: HostelKind;
  joinsAs: Role;
  blocks: BlockView[];
}
export interface HostelSettings {
  id: number;
  name: string;
  kind: HostelKind;
  residentInviteCode: string;
  staffInviteCode: string;
  members: number;
}
export interface CategoryView {
  id: number;
  code: string;
  name: string;
  covers: string;
  active: boolean;
  slaHours: SlaHours;
}
export interface SkillView {
  categoryId: number;
  blockId: number | null;
}
export interface StaffView {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  skills: SkillView[];
}

/* ---------- ticket/TicketDtos ---------- */
export interface SlotInput {
  day: string;
  window: TimeWindow;
}
export interface CreateTicketRequest {
  categoryId: number;
  commonArea: boolean;
  blockId: number | null;
  roomId: number | null;
  locationNote: string | null;
  description: string;
  priority: Priority;
  visitSlots: SlotInput[];
  confirmDuplicate: boolean;
}
export interface TransitionRequest {
  action: TicketAction;
  version: number;
  note?: string | null;
  rating?: number | null;
}
export interface AssignRequest {
  staffId: number;
  version: number;
}
export interface Ref {
  id: number;
  name: string;
}
export interface CategoryRef {
  id: number;
  code: string;
  name: string;
}
export interface TicketSummary {
  id: number;
  code: string;
  category: CategoryRef;
  block: Ref;
  roomLabel: string | null;
  commonArea: boolean;
  locationNote: string | null;
  description: string;
  priority: Priority;
  status: TicketStatus;
  reporter: Ref | null;
  assignee: Ref | null;
  createdAt: string;
  slaDueAt: string;
  slaBreached: boolean;
  affectedCount: number;
  affectedByMe: boolean;
  version: number;
}
export interface EventView {
  type: EventType;
  from: TicketStatus | null;
  to: TicketStatus | null;
  note: string | null;
  actor: string;
  at: string;
}
export interface SlotView {
  day: string;
  window: TimeWindow;
}
export interface TicketDetail {
  ticket: TicketSummary;
  photoIds: number[];
  visitSlots: SlotView[];
  rating: number | null;
  ratingComment: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  availableActions: TicketAction[];
  events: EventView[];
}
export interface AffectedView {
  affectedCount: number;
  affectedByMe: boolean;
}
export interface PageView<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
export interface TicketQuery {
  status?: TicketStatus[];
  categoryId?: number;
  blockId?: number;
  assigneeId?: number;
  mine?: boolean;
  assignedToMe?: boolean;
  breached?: boolean;
  common?: boolean;
  sort?: TicketSort;
  size?: number;
}

/* ---------- notification/NotificationService ---------- */
export interface NotificationView {
  id: number;
  ticketId: number | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}
export interface Inbox {
  items: NotificationView[];
  unread: number;
}

/* ---------- dashboard/DashboardService ---------- */
export interface Count {
  label: string;
  count: number;
}
export interface StaffLoad {
  id: number;
  name: string;
  open: number;
  resolved: number;
  avgRating: number | null;
}
export interface RecurringRoom {
  room: string;
  category: string;
  tickets: number;
}
export interface Summary {
  open: number;
  created: number;
  closed: number;
  avgResolutionHours: number | null;
  slaBreachRate: number;
  avgRating: number | null;
}
export interface Dashboard {
  from: string;
  to: string;
  summary: Summary;
  openByCategory: Count[];
  openByBlock: Count[];
  staff: StaffLoad[];
  recurringRooms: RecurringRoom[];
}
