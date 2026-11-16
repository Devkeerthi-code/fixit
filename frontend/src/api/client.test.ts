import { http, HttpResponse, delay } from "msw";
import { describe, expect, it, vi } from "vitest";
import { API, server } from "../test/server";
import { onSessionExpired, request } from "./client";
import { ApiError, OFFLINE_MESSAGE, STALE_MESSAGE } from "./errors";

describe("request", () => {
  it("sends cookies' CSRF token as X-XSRF-TOKEN on writes only", async () => {
    document.cookie = "XSRF-TOKEN=tok-123; path=/";
    const seen: Array<string | null> = [];
    server.use(
      http.get(`${API}/me`, ({ request: r }) => {
        seen.push(r.headers.get("X-XSRF-TOKEN"));
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${API}/notifications/read`, ({ request: r }) => {
        seen.push(r.headers.get("X-XSRF-TOKEN"));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await request("/api/me");
    await expect(request("/api/notifications/read", { method: "POST" })).resolves.toBeUndefined();
    expect(seen).toEqual([null, "tok-123"]);
  });

  it("asks for a CSRF cookie first when a write has none", async () => {
    const csrf = vi.fn();
    server.use(
      http.get(`${API}/auth/csrf`, () => {
        csrf();
        return new HttpResponse(null, { status: 204, headers: { "Set-Cookie": "XSRF-TOKEN=fresh; Path=/" } });
      }),
      http.post(`${API}/notifications/read`, () => new HttpResponse(null, { status: 204 })),
    );
    await request("/api/notifications/read", { method: "POST" });
    expect(csrf).toHaveBeenCalledTimes(1);
  });

  it("refreshes once for many concurrent 401s, then retries each request", async () => {
    let refreshed = false;
    let refreshCalls = 0;
    server.use(
      http.post(`${API}/auth/refresh`, async () => {
        refreshCalls += 1;
        await delay(20);
        refreshed = true;
        return HttpResponse.json({ id: 7 });
      }),
      http.get(`${API}/tickets/:id`, ({ params }) =>
        refreshed ? HttpResponse.json({ id: Number(params.id) }) : HttpResponse.json({ status: 401, code: "UNAUTHENTICATED", message: "Please sign in", fieldErrors: [], timestamp: "" }, { status: 401 }),
      ),
    );
    const results = await Promise.all([1, 2, 3].map((id) => request<{ id: number }>(`/api/tickets/${id}`)));
    expect(results.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(refreshCalls).toBe(1);
  });

  it("sends the user to sign in when the refresh fails", async () => {
    const expired = vi.fn();
    onSessionExpired(expired);
    server.use(
      http.post(`${API}/auth/refresh`, () => HttpResponse.json({ status: 401, code: "SESSION_EXPIRED", message: "Please sign in", fieldErrors: [], timestamp: "" }, { status: 401 })),
      http.get(`${API}/tickets`, () => HttpResponse.json({ status: 401, code: "UNAUTHENTICATED", message: "Please sign in", fieldErrors: [], timestamp: "" }, { status: 401 })),
    );
    await expect(request("/api/tickets")).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
    onSessionExpired(() => undefined);
  });

  it("never tries to refresh a 401 from the auth endpoints themselves", async () => {
    const refresh = vi.fn();
    server.use(
      http.post(`${API}/auth/refresh`, () => {
        refresh();
        return HttpResponse.json({});
      }),
      http.post(`${API}/auth/login`, () => HttpResponse.json({ status: 401, code: "BAD_CREDENTIALS", message: "Wrong email or password", fieldErrors: [], timestamp: "" }, { status: 401 })),
    );
    await expect(request("/api/auth/login", { method: "POST", json: {} })).rejects.toThrow("Wrong email or password");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("maps a body into a typed ApiError with field errors", async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json({ status: 400, code: "VALIDATION_FAILED", message: "Some fields need another look", fieldErrors: [{ field: "password", message: "Use 8 to 72 characters" }], timestamp: "" }, { status: 400 }),
      ),
    );
    const error = await request("/api/auth/register", { method: "POST", json: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: "VALIDATION_FAILED", fieldErrors: [{ field: "password", message: "Use 8 to 72 characters" }] });
  });

  it("rewrites a stale update into the refresh message", async () => {
    server.use(
      http.post(`${API}/tickets/12/transitions`, () =>
        HttpResponse.json({ status: 409, code: "STALE_UPDATE", message: "Someone else updated this ticket a moment ago.", fieldErrors: [], timestamp: "" }, { status: 409 }),
      ),
    );
    const error = (await request("/api/tickets/12/transitions", { method: "POST", json: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error.isStale).toBe(true);
    expect(error.message).toBe(STALE_MESSAGE);
  });

  it("says 'offline' when the network fails", async () => {
    server.use(http.get(`${API}/me`, () => HttpResponse.error()));
    await expect(request("/api/me")).rejects.toMatchObject({ code: "NETWORK", message: OFFLINE_MESSAGE });
  });
});
