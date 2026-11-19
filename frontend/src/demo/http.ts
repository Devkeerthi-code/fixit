import { HttpResponse } from "msw";
import type { ApiErrorBody, FieldProblem } from "../api/types";
import { getDb, type DemoUser } from "./db";
import { userById } from "./views";

export function fail(status: number, code: string, message: string, fieldErrors: FieldProblem[] = []) {
  const body: ApiErrorBody = { status, code, message, fieldErrors, timestamp: new Date().toISOString() };
  return HttpResponse.json(body, { status });
}

export const notFound = (what: string) => fail(404, "NOT_FOUND", `${what} not found`);
export const forbidden = (message = "You can't do that here") => fail(403, "FORBIDDEN", message);
export const noContent = () => new HttpResponse(null, { status: 204 });

export function sessionUser(): DemoUser | null {
  const db = getDb();
  return userById(db.sessionUserId) ?? null;
}

export type Signed = DemoUser & { hostelId: number };

type Guarded = { ok: true; me: Signed } | { ok: false; response: Response };

/** Same checks as the backend's security filter: signed in, belongs to a hostel, and (optionally) has the role. */
export function guard(roles?: DemoUser["role"][]): Guarded {
  const me = sessionUser();
  if (!me) return { ok: false, response: fail(401, "UNAUTHENTICATED", "Please sign in") };
  if (me.hostelId === null) return { ok: false, response: fail(409, "NO_HOSTEL", "Join or set up a hostel first") };
  if (roles && !roles.includes(me.role)) return { ok: false, response: forbidden() };
  return { ok: true, me: me as Signed };
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) ?? {}) as Partial<T>;
  } catch {
    return {};
  }
}

export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
