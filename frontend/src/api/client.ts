import { ApiError, OFFLINE_MESSAGE, TIMEOUT_MESSAGE, errorFromResponse } from "./errors";
import { waking } from "./waking";

export const SLOW_AFTER_MS = 4_000;
export const TIMEOUT_MS = 70_000;
const CSRF_COOKIE = "XSRF-TOKEN";
const CSRF_HEADER = "X-XSRF-TOKEN";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
  headers?: Record<string, string>;
}

let refreshing: Promise<boolean> | null = null;
let sessionExpired: () => void = () => undefined;

/** Called once by the app so a dead session sends the user back to sign in. */
export function onSessionExpired(handler: () => void) {
  sessionExpired = handler;
}

export function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((part) => part.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function isUnsafe(method: string) {
  return method !== "GET" && method !== "HEAD";
}

/** One fetch with cookies, the CSRF header, a cold-start notice after 4s and a hard timeout. */
async function send(path: string, opts: RequestOptions = {}): Promise<Response> {
  const method = opts.method ?? "GET";
  if (isUnsafe(method) && !readCookie(CSRF_COOKIE)) {
    await initCsrf().catch(() => undefined);
  }
  const headers = new Headers(opts.headers);
  headers.set("Accept", "application/json");
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form; // the browser writes the multipart boundary itself
  }
  const token = readCookie(CSRF_COOKIE);
  if (isUnsafe(method) && token) headers.set(CSRF_HEADER, token);

  const controller = new AbortController();
  let markedSlow = false;
  const slowTimer = setTimeout(() => {
    markedSlow = true;
    waking.begin();
  }, SLOW_AFTER_MS);
  const timeoutTimer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(new URL(path, window.location.origin).toString(), {
      method,
      headers,
      body,
      credentials: "include",
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) throw new ApiError(0, "TIMEOUT", TIMEOUT_MESSAGE);
    throw new ApiError(0, "NETWORK", OFFLINE_MESSAGE);
  } finally {
    clearTimeout(slowTimer);
    clearTimeout(timeoutTimer);
    if (markedSlow) waking.end();
  }
}

/** Asks the server to set the XSRF-TOKEN cookie. Called when the app starts. */
export async function initCsrf(): Promise<void> {
  const res = await send("/api/auth/csrf");
  if (!res.ok) throw await errorFromResponse(res);
}

/** Single flight: every request that hits a 401 at the same time waits on the same refresh. */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = send("/api/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts);
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) res = await send(path, opts);
    if (res.status === 401) {
      const error = await errorFromResponse(res);
      sessionExpired();
      throw error;
    }
  }
  if (!res.ok) throw await errorFromResponse(res);
  return parse<T>(res);
}

export function toQuery(params: Record<string, string | number | boolean | readonly string[] | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false || value === "") return;
    if (Array.isArray(value)) value.forEach((v: string) => q.append(key, v));
    else q.append(key, String(value));
  });
  const s = q.toString();
  return s ? "?" + s : "";
}
