import { describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import { shouldRetry } from "./queryClient";

describe("shouldRetry", () => {
  it("retries network drops and 5xx up to twice", () => {
    expect(shouldRetry(0, new ApiError(0, "NETWORK", "offline"))).toBe(true);
    expect(shouldRetry(1, new ApiError(503, "UNAVAILABLE", "down"))).toBe(true);
    expect(shouldRetry(2, new ApiError(503, "UNAVAILABLE", "down"))).toBe(false);
  });

  it("never retries a timeout, which already waited 70 seconds", () => {
    expect(shouldRetry(0, new ApiError(0, "TIMEOUT", "slow"))).toBe(false);
  });

  it("never retries 4xx answers, which a retry can't fix", () => {
    expect(shouldRetry(0, new ApiError(404, "NOT_FOUND", "gone"))).toBe(false);
    expect(shouldRetry(0, new ApiError(409, "STALE_UPDATE", "stale"))).toBe(false);
  });

  it("retries an unknown error once", () => {
    expect(shouldRetry(0, new Error("?"))).toBe(true);
    expect(shouldRetry(1, new Error("?"))).toBe(false);
  });
});
