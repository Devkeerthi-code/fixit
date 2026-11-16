import { request, toQuery } from "./client";
import type { Dashboard, Inbox } from "./types";

export const inboxApi = {
  get: () => request<Inbox>("/api/notifications"),
  markAllRead: () => request<undefined>("/api/notifications/read", { method: "POST" }),
};

export interface DateRange {
  from?: string;
  to?: string;
}

export const dashboardApi = {
  get: (range: DateRange) => request<Dashboard>("/api/dashboard" + toQuery({ from: range.from, to: range.to })),
  exportUrl: (range: DateRange) => "/api/dashboard/export.csv" + toQuery({ from: range.from, to: range.to }),
};
