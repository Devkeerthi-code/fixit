import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { PageView, TicketSummary } from "../../api/types";

type Lists = InfiniteData<PageView<TicketSummary>>;

/** Patches one ticket in every cached list, returning a snapshot so the change can be rolled back. */
export function patchTicketInLists(qc: QueryClient, id: number, patch: Partial<TicketSummary>) {
  const filter = { queryKey: ["tickets", "list"] };
  const snapshot = qc.getQueriesData<Lists>(filter);
  qc.setQueriesData<Lists>(filter, (data) =>
    data?.pages
      ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map((t) => (t.id === id ? { ...t, ...patch } : t)) })) }
      : data,
  );
  return () => snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
}
