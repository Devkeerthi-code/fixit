import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/errors";
import { applyServerErrors } from "./forms";
import { toasts, type ToastItem } from "./toast";

type Form = { name: string; rooms: string };

function toastMessages(): string[] {
  let seen: ToastItem[] = [];
  toasts.subscribe((items) => (seen = items))();
  return seen.map((t) => t.message);
}

describe("applyServerErrors", () => {
  it("puts each server field error on its input and skips the toast when all were placed", () => {
    const setError = vi.fn();
    const e = new ApiError(400, "VALIDATION", "Check the form", [{ field: "blocks[0].rooms", message: "Bad range" }]);
    applyServerErrors<Form>(e, setError, ["name", "rooms"], { "blocks[0].rooms": "rooms" });
    expect(setError).toHaveBeenCalledWith("rooms", { type: "server", message: "Bad range" });
    expect(toastMessages()).toEqual([]);
  });

  it("toasts the summary when a field can't be matched", () => {
    const setError = vi.fn();
    const e = new ApiError(400, "VALIDATION", "Check the form", [{ field: "somethingElse", message: "?" }]);
    applyServerErrors<Form>(e, setError, ["name", "rooms"]);
    expect(setError).not.toHaveBeenCalled();
    expect(toastMessages()).toEqual(["Check the form"]);
  });

  it("toasts errors without field details", () => {
    applyServerErrors<Form>(new ApiError(409, "EMAIL_TAKEN", "Email already used"), vi.fn(), ["name"]);
    expect(toastMessages()).toEqual(["Email already used"]);
  });
});
