import type { TicketDetail, TicketStatus } from "../api/types";

export interface TimelineStep {
  key: "reported" | "assigned" | "onway" | "fixed";
  name: string;
  detail: string;
  at: string | null;
  done: boolean;
  current: boolean;
}

/** How far along the four calm steps a status is. A reopened ticket starts over at "reported". */
const REACHED: Record<TicketStatus, number> = {
  OPEN: 0,
  REOPENED: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
  CLOSED: 3,
};

export function timelineSteps(d: TicketDetail): TimelineStep[] {
  const { ticket } = d;
  const reached = REACHED[ticket.status];
  const who = ticket.assignee?.name;
  const reopened = ticket.status === "REOPENED";
  const raw: Array<Omit<TimelineStep, "done" | "current">> = [
    {
      key: "reported",
      name: reopened ? "Reopened" : "Reported",
      detail: reopened
        ? "Back in the queue; the warden has been told"
        : `By ${ticket.reporter?.name ?? "a resident"}${d.photoIds.length ? `, with ${d.photoIds.length} photo${d.photoIds.length > 1 ? "s" : ""}` : ""}`,
      at: ticket.createdAt,
    },
    { key: "assigned", name: "Assigned", detail: reached >= 1 && who ? `${who} has it` : "Waiting for someone to pick it up", at: d.assignedAt },
    {
      key: "onway",
      name: "On the way",
      detail: reached >= 2 ? `${who ?? "Staff"} started the work` : who ? `You'll be told when ${who} sets off` : "Starts once someone is assigned",
      at: d.startedAt,
    },
    {
      key: "fixed",
      name: "Fixed",
      detail: ticket.status === "CLOSED" ? "Confirmed by the resident" : ticket.status === "RESOLVED" ? "Waiting for you to confirm" : "You'll be asked to confirm it",
      at: d.resolvedAt,
    },
  ];
  return raw.map((step, i) => ({
    ...step,
    at: i <= reached ? step.at : null,
    done: i <= reached,
    current: i === reached && ticket.status !== "CLOSED",
  }));
}

export function timelineProgress(status: TicketStatus): number {
  return REACHED[status] / 3;
}
