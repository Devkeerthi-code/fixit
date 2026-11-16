import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { keys } from "../../api/queries";
import { ticketsApi } from "../../api/tickets";
import type { TicketSummary } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Field } from "../../components/ui/Field";
import { ErrorState, Skeleton } from "../../components/ui/States";
import { toast } from "../../lib/toast";
import { useAssign } from "./useTicketAction";

/** Warden picks someone from the active staff list; the ticket's version guards against a race. */
export function ReassignDialog({ ticket, onClose }: { ticket: TicketSummary | null; onClose: () => void }) {
  const staff = useQuery({ queryKey: keys.staff, queryFn: ticketsApi.assignableStaff, enabled: !!ticket });
  const [staffId, setStaffId] = useState<number | null>(null);
  const assign = useAssign((d) => {
    toast(`${d.ticket.code} assigned to ${d.ticket.assignee?.name ?? "staff"}.`);
    onClose();
  });
  useEffect(() => setStaffId(ticket?.assignee?.id ?? null), [ticket]);

  return (
    <Dialog open={!!ticket} onClose={onClose} title={ticket ? `Assign ${ticket.code}` : "Assign"} label="( reassign )">
      {ticket && (
        <>
          <p className="muted text-sm">{ticket.category.name} · {ticket.description.slice(0, 120)}</p>
          {staff.isPending && <Skeleton rows={1} label="Loading staff" />}
          {staff.isError && <ErrorState error={staff.error} onRetry={() => void staff.refetch()} />}
          {staff.data && staff.data.length === 0 && (
            <p className="field__err">No active staff yet. Share the staff code from Setup, then come back.</p>
          )}
          {staff.data && staff.data.length > 0 && (
            <Field label="Who should fix it">
              {(p) => (
                <select {...p} className="input" value={staffId ?? ""} onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Choose a person</option>
                  {staff.data.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.id === ticket.assignee?.id ? " (current)" : ""}</option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <div className="card-dlg__actions">
            <Button variant="text" size="small" onClick={onClose}>Cancel</Button>
            <Button
              size="small"
              disabled={!staffId || staffId === ticket.assignee?.id}
              pending={assign.isPending}
              onClick={() => staffId && assign.mutate({ ticket, staffId })}
            >
              Assign
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
