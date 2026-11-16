import { useMutation, useQueryClient } from "@tanstack/react-query";
import { keys } from "../../api/queries";
import { ticketsApi } from "../../api/tickets";
import type { TicketDetail, TicketSummary, TransitionRequest } from "../../api/types";
import { toastError } from "../../lib/toast";

interface Vars {
  ticketId: number;
  body: TransitionRequest;
}

/** START / RESOLVE / CONFIRM / REOPEN, always with the version the user saw. A 409 offers a refresh. */
export function useTicketAction(onDone?: (detail: TicketDetail) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, body }: Vars) => ticketsApi.transition(ticketId, body),
    onSuccess: (detail) => {
      qc.setQueryData(keys.ticket(detail.ticket.id), detail);
      void qc.invalidateQueries({ queryKey: ["tickets", "list"] });
      void qc.invalidateQueries({ queryKey: keys.inbox });
      onDone?.(detail);
    },
    onError: toastError,
  });
}

export function useAssign(onDone?: (detail: TicketDetail) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticket, staffId }: { ticket: Pick<TicketSummary, "id" | "version">; staffId: number }) =>
      ticketsApi.assign(ticket.id, { staffId, version: ticket.version }),
    onSuccess: (detail) => {
      qc.setQueryData(keys.ticket(detail.ticket.id), detail);
      void qc.invalidateQueries({ queryKey: ["tickets", "list"] });
      onDone?.(detail);
    },
    onError: toastError,
  });
}
