import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { authApi } from "./auth";
import { hostelApi } from "./hostel";
import { dashboardApi, inboxApi, type DateRange } from "./inbox";
import { ticketsApi } from "./tickets";
import type { TicketQuery } from "./types";

export const keys = {
  me: ["me"] as const,
  layout: ["layout"] as const,
  categories: ["categories"] as const,
  settings: ["hostel-settings"] as const,
  team: ["team"] as const,
  staff: ["assignable-staff"] as const,
  inbox: ["inbox"] as const,
  tickets: ["tickets"] as const,
  ticketList: (q: TicketQuery) => ["tickets", "list", q] as const,
  ticket: (id: number) => ["tickets", "detail", id] as const,
  dashboard: (r: DateRange) => ["dashboard", r] as const,
};

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: authApi.me, staleTime: 5 * 60_000, retry: false });
}

export function useLayout(enabled = true) {
  return useQuery({ queryKey: keys.layout, queryFn: hostelApi.layout, staleTime: 10 * 60_000, enabled });
}

export function useCategories(enabled = true) {
  return useQuery({ queryKey: keys.categories, queryFn: hostelApi.categories, staleTime: 10 * 60_000, enabled });
}

export function useTicketList(q: TicketQuery) {
  return useInfiniteQuery({
    queryKey: keys.ticketList(q),
    queryFn: ({ pageParam }) => ticketsApi.list(q, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => ((last.page + 1) * last.size < last.total ? last.page + 1 : undefined),
  });
}

/** Only the total, for honest counts ("3 past SLA") without loading the tickets. */
export function useTicketCount(q: TicketQuery) {
  const query = { ...q, size: 1 };
  return useQuery({ queryKey: keys.ticketList(query), queryFn: () => ticketsApi.list(query, 0), select: (p) => p.total });
}

export function useTicket(id: number) {
  return useQuery({ queryKey: keys.ticket(id), queryFn: () => ticketsApi.detail(id), enabled: Number.isFinite(id) });
}

/** Polled every 30s, and only while the tab is visible (React Query pauses intervals in background tabs). */
export function useInbox(enabled: boolean) {
  return useQuery({
    queryKey: keys.inbox,
    queryFn: inboxApi.get,
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useDashboard(range: DateRange) {
  return useQuery({ queryKey: keys.dashboard(range), queryFn: () => dashboardApi.get(range) });
}
