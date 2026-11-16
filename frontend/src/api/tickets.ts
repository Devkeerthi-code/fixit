import { request, toQuery } from "./client";
import type {
  AffectedView,
  AssignRequest,
  CreateTicketRequest,
  PageView,
  Ref,
  TicketDetail,
  TicketQuery,
  TicketSummary,
  TransitionRequest,
} from "./types";

export interface DuplicateQuery {
  categoryId: number;
  roomId?: number | null;
  blockId?: number | null;
}

export function buildCreateForm(ticket: CreateTicketRequest, photos: File[]): FormData {
  const form = new FormData();
  form.append("ticket", new Blob([JSON.stringify(ticket)], { type: "application/json" }));
  photos.slice(0, 3).forEach((p) => form.append("photos", p, p.name));
  return form;
}

export const ticketsApi = {
  list: (q: TicketQuery, page: number) =>
    request<PageView<TicketSummary>>(
      "/api/tickets" +
        toQuery({
          status: q.status,
          categoryId: q.categoryId,
          blockId: q.blockId,
          assigneeId: q.assigneeId,
          mine: q.mine,
          assignedToMe: q.assignedToMe,
          breached: q.breached,
          common: q.common,
          sort: q.sort,
          page,
          size: q.size ?? 20,
        }),
    ),
  duplicates: (q: DuplicateQuery) =>
    request<TicketSummary[]>(
      "/api/tickets/duplicates" + toQuery({ categoryId: q.categoryId, roomId: q.roomId, blockId: q.blockId }),
    ),
  create: (ticket: CreateTicketRequest, photos: File[], idempotencyKey: string) =>
    request<TicketDetail>("/api/tickets", {
      method: "POST",
      form: buildCreateForm(ticket, photos),
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  detail: (id: number) => request<TicketDetail>(`/api/tickets/${id}`),
  transition: (id: number, body: TransitionRequest) =>
    request<TicketDetail>(`/api/tickets/${id}/transitions`, { method: "POST", json: body }),
  assign: (id: number, body: AssignRequest) =>
    request<TicketDetail>(`/api/tickets/${id}/assign`, { method: "POST", json: body }),
  assignableStaff: () => request<Ref[]>("/api/tickets/assignable-staff"),
  affectsMe: (id: number, on: boolean) =>
    request<AffectedView>(`/api/tickets/${id}/affects-me`, { method: on ? "POST" : "DELETE" }),
  photoUrl: (ticketId: number, photoId: number) => `/api/tickets/${ticketId}/photos/${photoId}`,
};
