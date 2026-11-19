import { afterEach, describe, expect, it } from "vitest";
import { ApiError, STALE_MESSAGE } from "../api/errors";
import { toast, toastError, toasts, type ToastItem } from "./toast";

function current(): ToastItem[] {
  let seen: ToastItem[] = [];
  toasts.subscribe((items) => (seen = items))();
  return seen;
}

afterEach(() => toasts.clear());

describe("toasts", () => {
  it("keeps only the three newest so the screen never fills up", () => {
    ["one", "two", "three", "four"].forEach((m) => toast(m));
    expect(current().map((t) => t.message)).toEqual(["two", "three", "four"]);
  });

  it("dismisses one toast by id", () => {
    const id = toast("saved");
    toast("other");
    toasts.dismiss(id);
    expect(current().map((t) => t.message)).toEqual(["other"]);
  });

  it("shows the server's message for API errors and a generic one otherwise", () => {
    toastError(new ApiError(400, "BAD_ROOMS", "\"12x\" isn't a room number"));
    toastError(new Error("boom"));
    expect(current().map((t) => [t.message, t.tone])).toEqual([
      ["\"12x\" isn't a room number", "err"],
      ["Something went wrong. Try again.", "err"],
    ]);
  });

  it("offers a Refresh action when someone else changed the ticket", () => {
    toastError(new ApiError(409, "STALE_UPDATE", STALE_MESSAGE));
    expect(current()[0]?.action?.label).toBe("Refresh");
  });
});
