import { isApiError } from "../api/errors";
import { queryClient } from "./queryClient";

export interface ToastAction {
  label: string;
  run: () => void;
}
export interface ToastItem {
  id: number;
  message: string;
  tone: "ok" | "err";
  action?: ToastAction;
}

type Listener = (items: ToastItem[]) => void;
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(items));
}

export const toasts = {
  subscribe(l: Listener) {
    listeners.add(l);
    l(items);
    return () => {
      listeners.delete(l);
    };
  },
  dismiss(id: number) {
    items = items.filter((t) => t.id !== id);
    emit();
  },
  clear() {
    items = [];
    emit();
  },
};

export function toast(message: string, tone: ToastItem["tone"] = "ok", action?: ToastAction) {
  const item: ToastItem = { id: nextId++, message, tone, action };
  items = [...items.slice(-2), item];
  emit();
  return item.id;
}

/** The one place API errors become toasts. A stale update offers to reload the latest ticket. */
export function toastError(e: unknown) {
  if (isApiError(e) && e.isStale) {
    toast(e.message, "err", { label: "Refresh", run: () => void queryClient.invalidateQueries({ queryKey: ["tickets"] }) });
    return;
  }
  toast(isApiError(e) ? e.message : "Something went wrong. Try again.", "err");
}
