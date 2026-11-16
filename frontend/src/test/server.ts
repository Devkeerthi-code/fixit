import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const API = "http://localhost:5173/api";

/** Defaults every test can rely on; tests add their own handlers with server.use(). */
export const server = setupServer(
  http.get(`${API}/auth/csrf`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/notifications`, () => HttpResponse.json({ items: [], unread: 0 })),
);
