import type { TicketStatus } from "../../api/types";

export interface Filters {
  status: TicketStatus | "";
  blockId: number | null;
  categoryId: number | null;
  overdue: boolean;
}

export const NO_FILTERS: Filters = { status: "", blockId: null, categoryId: null, overdue: false };
