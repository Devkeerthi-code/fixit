import type { Priority, TicketStatus, TicketSummary } from "../../api/types";
import { cx } from "../../lib/cx";
import { PRIORITY_LABEL, STATUS_CLASS, STATUS_LABEL, slaText } from "../../lib/format";

export function StatusPill({ status }: { status: TicketStatus }) {
  return <span className={cx("status", STATUS_CLASS[status])}>{STATUS_LABEL[status]}</span>;
}

export function PriorityTag({ priority }: { priority: Priority }) {
  return <span className={cx("prio", priority === "URGENT" && "prio--urgent")}>{PRIORITY_LABEL[priority]}</span>;
}

export function SlaTag({ ticket }: { ticket: Pick<TicketSummary, "slaDueAt" | "slaBreached" | "status"> }) {
  const text = slaText(ticket);
  const late = text.startsWith("Overdue");
  return <span className={cx("sla", late && "sla--breach")}>{text}</span>;
}
