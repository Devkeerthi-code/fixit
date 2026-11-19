/* Mirrors the backend's TicketStateMachine, SlaCalculator and RoutingPolicy, so the demo behaves like the real app. */
import type { Priority, TicketAction, TicketStatus } from "../api/types";
import type { DemoTicket, DemoUser } from "./db";

export type ActorRole = "REPORTER" | "ASSIGNEE" | "WARDEN";

interface Rule {
  from: TicketStatus[];
  to: TicketStatus;
  actors: ActorRole[];
}

const RULES: Record<Exclude<TicketAction, "ASSIGN">, Rule> = {
  START: { from: ["ASSIGNED"], to: "IN_PROGRESS", actors: ["ASSIGNEE", "WARDEN"] },
  RESOLVE: { from: ["IN_PROGRESS"], to: "RESOLVED", actors: ["ASSIGNEE", "WARDEN"] },
  CONFIRM: { from: ["RESOLVED"], to: "CLOSED", actors: ["REPORTER"] },
  REOPEN: { from: ["RESOLVED"], to: "REOPENED", actors: ["REPORTER"] },
};

const ASSIGNABLE: TicketStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "REOPENED"];
const ACTIVE: TicketStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "REOPENED"];

export const DEFAULT_SLA_HOURS: Record<Priority, number> = { URGENT: 4, NORMAL: 24, LOW: 72 };

export function isActive(status: TicketStatus): boolean {
  return ACTIVE.includes(status);
}

export function rolesOf(user: DemoUser, ticket: DemoTicket): ActorRole[] {
  const roles: ActorRole[] = [];
  if (ticket.reporterId === user.id) roles.push("REPORTER");
  if (ticket.assigneeId === user.id) roles.push("ASSIGNEE");
  if (user.role === "WARDEN") roles.push("WARDEN");
  return roles;
}

export function availableActions(status: TicketStatus, roles: ActorRole[]): TicketAction[] {
  const actions: TicketAction[] = [];
  if (ASSIGNABLE.includes(status) && roles.includes("WARDEN")) actions.push("ASSIGN");
  (Object.keys(RULES) as (keyof typeof RULES)[]).forEach((action) => {
    const rule = RULES[action];
    if (rule.from.includes(status) && rule.actors.some((a) => roles.includes(a))) actions.push(action);
  });
  return actions;
}

export type Transition = { ok: true; to: TicketStatus } | { ok: false; status: 403 | 409; message: string };

export function nextStatus(from: TicketStatus, action: Exclude<TicketAction, "ASSIGN">, roles: ActorRole[]): Transition {
  const rule = RULES[action];
  const verb = action.toLowerCase();
  if (!rule.from.includes(from)) {
    return { ok: false, status: 409, message: `Can't ${verb} a ticket that is ${from.toLowerCase().replace("_", " ")}` };
  }
  if (!rule.actors.some((a) => roles.includes(a))) {
    return { ok: false, status: 403, message: `You can't ${verb} this ticket` };
  }
  return { ok: true, to: rule.to };
}

export function slaDueAt(createdAt: Date, hours: number): string {
  return new Date(createdAt.getTime() + hours * 3_600_000).toISOString();
}

export function isBreached(ticket: Pick<DemoTicket, "status" | "slaDueAt">, now: Date): boolean {
  return isActive(ticket.status) && now.getTime() > Date.parse(ticket.slaDueAt);
}

/** Picks the active staff member whose skills cover this category and block, with the fewest open tickets. */
export function pickAssignee(
  staff: DemoUser[],
  openLoad: (userId: number) => number,
  categoryId: number,
  blockId: number,
): DemoUser | null {
  const skilled = staff.filter(
    (s) =>
      s.role === "STAFF" &&
      s.active &&
      s.skills.some((k) => k.categoryId === categoryId && (k.blockId === null || k.blockId === blockId)),
  );
  if (skilled.length === 0) return null;
  return skilled.reduce((best, s) => (openLoad(s.id) < openLoad(best.id) ? s : best));
}
