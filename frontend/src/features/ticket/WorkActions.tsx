import { useState } from "react";
import type { TicketAction, TicketDetail } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { toast } from "../../lib/toast";
import { ReassignDialog } from "./ReassignDialog";
import { useTicketAction } from "./useTicketAction";

/** Staff and warden buttons, shown only when the server says they would work. */
export function WorkActions({ detail }: { detail: TicketDetail }) {
  const { ticket, availableActions } = detail;
  const [assigning, setAssigning] = useState(false);
  const action = useTicketAction((d) => toast(d.ticket.status === "IN_PROGRESS" ? `Started ${d.ticket.code}. The resident has been told you're on the way.` : `${d.ticket.code} marked fixed. The resident will confirm.`));
  const can = (a: TicketAction) => availableActions.includes(a);
  if (!can("START") && !can("RESOLVE") && !can("ASSIGN")) return null;
  return (
    <div className="work-actions">
      {can("START") && (
        <Button size="small" pending={action.isPending} onClick={() => action.mutate({ ticketId: ticket.id, body: { action: "START", version: ticket.version } })}>
          Start, I'm on the way
        </Button>
      )}
      {can("RESOLVE") && (
        <Button size="small" pending={action.isPending} onClick={() => action.mutate({ ticketId: ticket.id, body: { action: "RESOLVE", version: ticket.version } })}>
          Mark fixed
        </Button>
      )}
      {can("ASSIGN") && (
        <Button size="small" variant="outline-olive" onClick={() => setAssigning(true)}>
          {ticket.assignee ? "Reassign" : "Assign"}
        </Button>
      )}
      <ReassignDialog ticket={assigning ? ticket : null} onClose={() => setAssigning(false)} />
    </div>
  );
}
