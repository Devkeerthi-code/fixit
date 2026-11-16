import { z } from "zod";
import type { CreateTicketRequest, Me, TimeWindow } from "../../api/types";
import { MAX_SLOTS } from "../../lib/visitDays";

export const reportSchema = z
  .object({
    categoryId: z.number({ required_error: "Choose a category" }).int().positive("Choose a category"),
    commonArea: z.boolean(),
    blockId: z.number().int().positive().nullable(),
    roomId: z.number().int().positive().nullable(),
    locationNote: z.string().trim().max(80, "Keep the location under 80 characters"),
    description: z.string().trim().min(10, "Describe it in 10 to 1000 characters").max(1000, "Describe it in 10 to 1000 characters"),
    priority: z.enum(["LOW", "NORMAL", "URGENT"]),
    days: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    windows: z.array(z.enum(["MORNING", "AFTERNOON", "EVENING"])),
  })
  .superRefine((v, ctx) => {
    if (v.commonArea && !v.blockId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["blockId"], message: "Pick the block for this common-area issue" });
    if (!v.commonArea && !v.roomId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roomId"], message: "Pick your room, or switch on common area" });
    if (v.days.length && !v.windows.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["windows"], message: "Pick at least one time window for those days" });
    if (v.days.length * v.windows.length > MAX_SLOTS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["windows"], message: `Up to ${MAX_SLOTS} visit slots, e.g. 3 days × 2 windows` });
    }
  });

export type ReportValues = z.infer<typeof reportSchema>;

export function defaultsFor(me: Me, categoryId = 0): ReportValues {
  return {
    categoryId,
    commonArea: false,
    blockId: me.room?.blockId ?? null,
    roomId: me.room?.id ?? null,
    locationNote: "",
    description: "",
    priority: "NORMAL",
    days: [],
    windows: [],
  };
}

const WINDOW_ORDER: TimeWindow[] = ["MORNING", "AFTERNOON", "EVENING"];

/** Every chosen day crossed with every chosen window, in calendar order. */
export function slotsOf(days: string[], windows: TimeWindow[]) {
  const sortedWindows = WINDOW_ORDER.filter((w) => windows.includes(w));
  return [...days].sort().flatMap((day) => sortedWindows.map((window) => ({ day, window })));
}

export function toRequest(v: ReportValues, confirmDuplicate: boolean): CreateTicketRequest {
  return {
    categoryId: v.categoryId,
    commonArea: v.commonArea,
    blockId: v.commonArea ? v.blockId : null,
    roomId: v.commonArea ? null : v.roomId,
    locationNote: v.commonArea && v.locationNote.trim() ? v.locationNote.trim() : null,
    description: v.description.trim(),
    priority: v.priority,
    visitSlots: slotsOf(v.days, v.windows),
    confirmDuplicate,
  };
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
