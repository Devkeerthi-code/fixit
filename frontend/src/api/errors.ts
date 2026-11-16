import type { ApiErrorBody, FieldProblem } from "./types";

export const OFFLINE_MESSAGE = "You're offline, try again";
export const TIMEOUT_MESSAGE = "The server took too long to answer. Try again in a moment.";
export const STALE_MESSAGE = "Someone else updated this ticket. Refresh to see the latest";

/** Every failure the UI sees, whether the server answered or not. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldProblem[];

  constructor(status: number, code: string, message: string, fieldErrors: FieldProblem[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  get isStale(): boolean {
    return this.status === 409 && this.code === "STALE_UPDATE";
  }

  get isNetwork(): boolean {
    return this.code === "NETWORK" || this.code === "TIMEOUT";
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "code" in value && "message" in value;
}

/** Turns a non-2xx response into an ApiError, tolerating proxies that answer with HTML. */
export async function errorFromResponse(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (isErrorBody(body)) {
    if (res.status === 409 && body.code === "STALE_UPDATE") {
      return new ApiError(409, body.code, STALE_MESSAGE);
    }
    return new ApiError(res.status, body.code, body.message, body.fieldErrors ?? []);
  }
  if (res.status >= 500) {
    return new ApiError(res.status, "INTERNAL_ERROR", "Something went wrong on our side. Try again.");
  }
  return new ApiError(res.status, "HTTP_" + res.status, "That didn't work. Try again.");
}

export function messageOf(e: unknown): string {
  if (isApiError(e)) return e.message;
  return "Something went wrong. Try again.";
}
