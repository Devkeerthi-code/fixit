import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import type { UseFormSetError } from "react-hook-form";
import { isApiError } from "../../api/errors";
import { keys } from "../../api/queries";
import { ticketsApi } from "../../api/tickets";
import type { TicketDetail, TicketSummary } from "../../api/types";
import { applyServerErrors } from "../../lib/forms";
import { toast, toastError } from "../../lib/toast";
import type { Duplicate } from "./DuplicateNotice";
import type { Photo } from "./PhotoPicker";
import { newIdempotencyKey, toRequest, type ReportValues } from "./schema";

interface Submission {
  values: ReportValues;
  photos: Photo[];
  confirm: boolean;
}

/**
  Raise flow: check for an open duplicate first, then send multipart with one Idempotency-Key per form
  session, so a retry after a dropped connection returns the same ticket instead of a second one.
*/
export function useRaiseTicket(setError: UseFormSetError<ReportValues>, onCreated: (t: TicketDetail) => void) {
  const qc = useQueryClient();
  const key = useRef(newIdempotencyKey());
  const [dupe, setDupe] = useState<Duplicate | null>(null);
  const [checking, setChecking] = useState(false);
  const clearDupe = useCallback(() => setDupe(null), []);
  const inFlight = useRef(false); // guards the gap between a tap and the re-render that disables the button

  const create = useMutation({
    mutationFn: ({ values, photos, confirm }: Submission) =>
      ticketsApi.create(toRequest(values, confirm), photos.map((p) => p.file), key.current),
    onSuccess: (detail) => {
      setDupe(null);
      key.current = newIdempotencyKey();
      void qc.invalidateQueries({ queryKey: keys.tickets });
      toast(`${detail.ticket.code} raised. ${detail.ticket.assignee ? `${detail.ticket.assignee.name} has it.` : "The warden will assign it."}`);
      onCreated(detail);
    },
    onError: (e) => {
      if (isApiError(e) && e.status === 409 && e.code === "DUPLICATE") {
        setDupe({ kind: "server", message: e.message });
        return;
      }
      applyServerErrors(e, setError, ["description", "locationNote", "priority", "categoryId", "blockId", "roomId"], {
        visitSlots: "windows",
      });
    },
  });

  const affects = useMutation({
    mutationFn: (t: TicketSummary) => ticketsApi.affectsMe(t.id, true),
    onSuccess: (view, t) => {
      setDupe((d) =>
        d?.kind === "common" ? { kind: "common", tickets: d.tickets.map((x) => (x.id === t.id ? { ...x, ...view } : x)) } : d,
      );
      void qc.invalidateQueries({ queryKey: keys.tickets });
      toast(`Added your voice. ${view.affectedCount} people are waiting on ${t.code}.`);
    },
    onError: toastError,
  });

  const submit = async (values: ReportValues, photos: Photo[], confirm = false) => {
    if (inFlight.current || create.isPending) return;
    if (!confirm) {
      inFlight.current = true;
      setChecking(true);
      try {
        const found = await ticketsApi.duplicates({
          categoryId: values.categoryId,
          roomId: values.commonArea ? null : values.roomId,
          blockId: values.commonArea ? values.blockId : null,
        });
        if (found.length) {
          setDupe(values.commonArea ? { kind: "common", tickets: found } : { kind: "room", ticket: found[0] as TicketSummary });
          return;
        }
      } catch (e) {
        toastError(e);
        return;
      } finally {
        inFlight.current = false;
        setChecking(false);
      }
    }
    create.mutate({ values, photos, confirm });
  };

  return {
    submit,
    dupe,
    clearDupe,
    pending: checking || create.isPending,
    affectsMe: (t: TicketSummary) => affects.mutate(t),
    affectingId: affects.isPending ? (affects.variables?.id ?? null) : null,
  };
}
