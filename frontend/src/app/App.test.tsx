import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { Me } from "../api/types";
import { aMe, blocks, page, plumbing } from "../test/fixtures";
import { renderWithProviders } from "../test/render";
import { API, server } from "../test/server";
import { App } from "./App";

function withMe(me: Me | null) {
  server.use(
    http.get(`${API}/me`, () =>
      me ? HttpResponse.json(me) : HttpResponse.json({ status: 401, code: "UNAUTHENTICATED", message: "Please sign in", fieldErrors: [], timestamp: "" }, { status: 401 }),
    ),
    http.post(`${API}/auth/refresh`, () => HttpResponse.json({ status: 401, code: "SESSION_EXPIRED", message: "Please sign in", fieldErrors: [], timestamp: "" }, { status: 401 })),
    http.get(`${API}/tickets`, () => HttpResponse.json(page([]))),
    http.get(`${API}/hostel/categories`, () => HttpResponse.json([plumbing])),
    http.get(`${API}/hostel/layout`, () => HttpResponse.json(blocks)),
    http.get(`${API}/dashboard`, () =>
      HttpResponse.json({
        from: "2026-10-18",
        to: "2026-11-16",
        summary: { open: 0, created: 0, closed: 0, avgResolutionHours: null, slaBreachRate: 0, avgRating: null },
        openByCategory: [],
        openByBlock: [],
        staff: [],
        recurringRooms: [],
      }),
    ),
  );
}

describe("role routing", () => {
  it("sends a resident from / to the resident home", async () => {
    withMe(aMe("RESIDENT"));
    renderWithProviders(<App />, { route: "/" });
    expect(await screen.findByRole("heading", { level: 1, name: "Your hostel, looked after." })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Raise a complaint in under 30 seconds." })).toBeInTheDocument();
  });

  it("sends staff to their queue", async () => {
    withMe(aMe("STAFF", { name: "Ravi Kumar", room: null }));
    renderWithProviders(<App />, { route: "/" });
    expect(await screen.findByRole("heading", { level: 1, name: /Ravi\./ })).toBeInTheDocument();
    expect(await screen.findByText((_, el) => el?.classList.contains("empty__title") === true && el.textContent === "Queue clear. Nice work.")).toBeInTheDocument();
  });

  it("sends a warden to the dashboard, loaded as a separate chunk", async () => {
    withMe(aMe("WARDEN", { room: null }));
    renderWithProviders(<App />, { route: "/" });
    expect(await screen.findByRole("heading", { level: 1, name: "How things are going." })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Export CSV/ })).toHaveAttribute("href", "/api/dashboard/export.csv?from=2026-10-18&to=2026-11-16");
  });

  it("keeps residents out of warden pages", async () => {
    withMe(aMe("RESIDENT"));
    renderWithProviders(<App />, { route: "/warden" });
    expect(await screen.findByRole("heading", { level: 1, name: "Your hostel, looked after." })).toBeInTheDocument();
  });

  it("asks someone without a hostel to join or set one up", async () => {
    withMe(aMe("RESIDENT", { hostel: null, room: null }));
    renderWithProviders(<App />, { route: "/home" });
    expect(await screen.findByRole("heading", { level: 1, name: "One last step: find your hostel." })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Join with a code" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows sign in to a visitor whose session can't be refreshed", async () => {
    withMe(null);
    renderWithProviders(<App />, { route: "/queue" });
    expect(await screen.findByRole("heading", { level: 1, name: "Report it once. See who's on it." })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Sign in" })).toBeInTheDocument();
  });
});
