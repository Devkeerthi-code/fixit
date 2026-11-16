import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { CreateTicketRequest } from "../../api/types";
import { aDetail, aMe, aTicket, blocks, plumbing } from "../../test/fixtures";
import { renderWithProviders } from "../../test/render";
import { API, server } from "../../test/server";
import { ReportSection } from "./ReportForm";

interface Captured {
  key: string | null;
  csrf: string | null;
  contentType: string | null;
  ticket: CreateTicketRequest;
  photos: number;
}

function setup({ duplicates = [] as ReturnType<typeof aTicket>[], failFirstPost = false } = {}) {
  const posts: Captured[] = [];
  const dupeQueries: string[] = [];
  let attempt = 0;
  document.cookie = "XSRF-TOKEN=csrf-abc; path=/";
  server.use(
    http.get(`${API}/hostel/categories`, () => HttpResponse.json([plumbing])),
    http.get(`${API}/hostel/layout`, () => HttpResponse.json(blocks)),
    http.get(`${API}/tickets/duplicates`, ({ request }) => {
      dupeQueries.push(new URL(request.url).search);
      return HttpResponse.json(duplicates);
    }),
    http.post(`${API}/tickets`, async ({ request }) => {
      attempt += 1;
      const form = await request.formData();
      const part = form.get("ticket");
      const ticket = JSON.parse(typeof part === "string" ? part : await (part as Blob).text()) as CreateTicketRequest;
      posts.push({
        key: request.headers.get("Idempotency-Key"),
        csrf: request.headers.get("X-XSRF-TOKEN"),
        contentType: part instanceof Blob ? part.type : "text",
        ticket,
        photos: form.getAll("photos").length,
      });
      if (failFirstPost && attempt === 1) return HttpResponse.error();
      return HttpResponse.json(aDetail("ASSIGNED", { ticket: aTicket({ id: 40, code: "FX-40", status: "ASSIGNED" }) }), { status: 201 });
    }),
  );
  renderWithProviders(<ReportSection me={aMe()} />);
  return { posts, dupeQueries };
}

async function describeIssue(user: ReturnType<typeof userEvent.setup>) {
  const box = await screen.findByLabelText("Describe it in a line or two");
  await user.type(box, "Tap drips all night and keeps me awake");
}

describe("Raise a complaint", () => {
  it("warns about an open ticket for the same room, then raises anyway with confirmDuplicate", async () => {
    const user = userEvent.setup();
    const { posts, dupeQueries } = setup({ duplicates: [aTicket()] });
    await describeIssue(user);
    await user.click(screen.getByRole("button", { name: "Raise ticket" }));

    expect(await screen.findByText("You already have an open Plumbing ticket for B-204 (FX-12).")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View it" })).toHaveAttribute("href", "/tickets/12");
    expect(dupeQueries[0]).toBe("?categoryId=11&roomId=204");
    expect(posts).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Raise anyway" }));
    await waitFor(() => expect(posts).toHaveLength(1));
    const sent = posts[0];
    expect(sent?.ticket).toMatchObject({
      categoryId: 11,
      commonArea: false,
      roomId: 204,
      blockId: null,
      description: "Tap drips all night and keeps me awake",
      priority: "NORMAL",
      visitSlots: [],
      confirmDuplicate: true,
    });
    expect(sent?.contentType).toBe("application/json");
    expect(sent?.csrf).toBe("csrf-abc");
    expect(sent?.key).toMatch(/^[0-9a-f-]{32,36}$/);
    expect(await screen.findByText(/FX-40 raised\./, { selector: ".toast p" })).toBeInTheDocument();
  });

  it("reuses the same Idempotency-Key when a dropped submit is retried", async () => {
    const user = userEvent.setup();
    const { posts } = setup({ failFirstPost: true });
    await describeIssue(user);
    await user.click(screen.getByRole("button", { name: "Raise ticket" }));
    expect(await screen.findByText("You're offline, try again")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Raise ticket" }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[0]?.key).toBeTruthy();
    expect(posts[1]?.key).toBe(posts[0]?.key);
    expect(posts[1]?.ticket.confirmDuplicate).toBe(false);
  });

  it("offers 'Affects me too' instead of a new ticket for a common area", async () => {
    const user = userEvent.setup();
    const shared = aTicket({ id: 55, code: "FX-55", commonArea: true, roomLabel: null, locationNote: "2nd floor washroom", affectedCount: 4, reporter: { id: 99, name: "Neighbour" } });
    let affected = 0;
    const { posts, dupeQueries } = setup({ duplicates: [shared] });
    server.use(
      http.post(`${API}/tickets/55/affects-me`, () => {
        affected += 1;
        return HttpResponse.json({ affectedCount: 5, affectedByMe: true });
      }),
    );
    await user.click(await screen.findByRole("switch", { name: "It's in a common area" }));
    await describeIssue(user);
    await user.click(screen.getByRole("button", { name: "Raise ticket" }));

    await user.click(await screen.findByRole("button", { name: "Affects me too (4)" }));
    await waitFor(() => expect(affected).toBe(1));
    expect(await screen.findByRole("button", { name: "You're counted (5)" })).toBeDisabled();
    expect(dupeQueries[0]).toBe("?categoryId=11&blockId=2");
    expect(posts).toHaveLength(0);
  });

  it("blocks a description that is too short before anything is sent", async () => {
    const user = userEvent.setup();
    const { posts, dupeQueries } = setup();
    await user.type(await screen.findByLabelText("Describe it in a line or two"), "leak");
    await user.click(screen.getByRole("button", { name: "Raise ticket" }));
    expect(await screen.findByText("Describe it in 10 to 1000 characters")).toBeInTheDocument();
    expect(dupeQueries).toHaveLength(0);
    expect(posts).toHaveLength(0);
  });

  it("turns picked days and windows into visit slots", async () => {
    const user = userEvent.setup();
    const { posts } = setup();
    await describeIssue(user);
    const firstDay = (await screen.findAllByRole("button", { pressed: false })).find((b) => b.classList.contains("cal__day"));
    if (!firstDay) throw new Error("no bookable day");
    await user.click(firstDay);
    await user.click(screen.getByRole("checkbox", { name: "Evening" }));
    await user.click(screen.getByRole("button", { name: "Raise ticket" }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]?.ticket.visitSlots).toEqual([{ day: firstDay.getAttribute("data-day"), window: "EVENING" }]);
  });
});
