import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "../api/errors";
import { toastError } from "./toast";

/**
  Puts server-side fieldErrors on the matching inputs, and toasts the summary message.
  Field names from Spring look like "blocks[0].rooms"; `map` translates the ones that differ from the form.
*/
export function applyServerErrors<T extends FieldValues>(
  e: unknown,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
  map: Record<string, Path<T>> = {},
) {
  if (isApiError(e) && e.fieldErrors.length) {
    let placed = 0;
    e.fieldErrors.forEach((f) => {
      const name = map[f.field] ?? (fields.includes(f.field as Path<T>) ? (f.field as Path<T>) : undefined);
      if (name) {
        setError(name, { type: "server", message: f.message });
        placed += 1;
      }
    });
    if (placed === e.fieldErrors.length) return;
  }
  toastError(e);
}
