import { http, HttpResponse } from "msw";
import type { LoginRequest, RegisterRequest, UpdateMeRequest } from "../../api/types";
import { getDb, nextId, save } from "../db";
import { fail, noContent, readJson, sessionUser, text } from "../http";
import { meView } from "../views";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function findByEmail(email: string) {
  return getDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function startSession(userId: number) {
  getDb().sessionUserId = userId;
  save();
}

export const authHandlers = [
  http.get("/api/auth/csrf", () => noContent()),

  http.post("/api/auth/login", async ({ request }) => {
    const body = await readJson<LoginRequest>(request);
    const user = findByEmail(text(body.email));
    // Sample people have no password, so any password signs them in; demo-made accounts must match.
    if (!user || (user.password !== null && user.password !== body.password)) {
      return fail(401, "BAD_CREDENTIALS", "That email and password don't match");
    }
    startSession(user.id);
    return HttpResponse.json(meView(user));
  }),

  http.post("/api/auth/register", async ({ request }) => {
    const body = await readJson<RegisterRequest>(request);
    const name = text(body.name);
    const email = text(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || !EMAIL.test(email) || password.length < 8) {
      return fail(400, "VALIDATION", "Check the highlighted fields");
    }
    if (findByEmail(email)) return fail(409, "EMAIL_TAKEN", "An account with this email already exists");
    const user = { id: nextId(), name, email, password, role: "RESIDENT" as const, hostelId: null, roomId: null, active: true, skills: [] };
    getDb().users.push(user);
    startSession(user.id);
    return HttpResponse.json(meView(user), { status: 201 });
  }),

  http.post("/api/auth/refresh", () => {
    const me = sessionUser();
    return me ? HttpResponse.json(meView(me)) : fail(401, "SESSION_EXPIRED", "Please sign in");
  }),

  http.post("/api/auth/logout", () => {
    getDb().sessionUserId = null;
    save();
    return noContent();
  }),

  http.get("/api/me", () => {
    const me = sessionUser();
    return me ? HttpResponse.json(meView(me)) : fail(401, "UNAUTHENTICATED", "Please sign in");
  }),

  http.patch("/api/me", async ({ request }) => {
    const me = sessionUser();
    if (!me) return fail(401, "UNAUTHENTICATED", "Please sign in");
    const body = await readJson<UpdateMeRequest>(request);
    const name = text(body.name);
    if (name) me.name = name;
    if (typeof body.roomId === "number") me.roomId = body.roomId;
    save();
    return HttpResponse.json(meView(me));
  }),
];
