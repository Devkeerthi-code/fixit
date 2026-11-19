import type { InfiniteData } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { PageView, TicketSummary } from "../../api/types";
import { aTicket } from "../../test/fixtures";
import { testClient } from "../../test/render";
import { patchTicketInLists } from "./optimistic";

type Lists = InfiniteData<PageView<TicketSummary>>;

function listOf(...tickets: TicketSummary[]): Lists {
  return { pages: [{ items: tickets, page: 0, size: 20, total: tickets.length }], pageParams: [0] };
}

describe("patchTicketInLists", () => {
  it("updates the ticket in every cached list and can roll back", () => {
    const qc = testClient();
    const a = ["tickets", "list", { mine: true }];
    const b = ["tickets", "list", { status: ["ASSIGNED"] }];
    qc.setQueryData(a, listOf(aTicket({ id: 1 }), aTicket({ id: 2 })));
    qc.setQueryData(b, listOf(aTicket({ id: 1 })));

    const rollback = patchTicketInLists(qc, 1, { status: "IN_PROGRESS" });
    expect(qc.getQueryData<Lists>(a)?.pages[0]?.items.map((t) => t.status)).toEqual(["IN_PROGRESS", "ASSIGNED"]);
    expect(qc.getQueryData<Lists>(b)?.pages[0]?.items[0]?.status).toBe("IN_PROGRESS");

    rollback();
    expect(qc.getQueryData<Lists>(a)?.pages[0]?.items[0]?.status).toBe("ASSIGNED");
  });

  it("leaves non-list queries alone", () => {
    const qc = testClient();
    qc.setQueryData(["tickets", "detail", 1], { ticket: aTicket() });
    patchTicketInLists(qc, 12, { status: "CLOSED" });
    expect(qc.getQueryData<{ ticket: TicketSummary }>(["tickets", "detail", 1])?.ticket.status).toBe("ASSIGNED");
  });
});
