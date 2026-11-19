import { describe, expect, it } from "vitest";
import { toQuery } from "./client";
import { buildCreateForm } from "./tickets";
import type { CreateTicketRequest } from "./types";

const ticket: CreateTicketRequest = {
  categoryId: 11,
  commonArea: false,
  blockId: null,
  roomId: 204,
  locationNote: null,
  description: "Bathroom tap keeps dripping",
  priority: "NORMAL",
  visitSlots: [],
  confirmDuplicate: false,
};

describe("buildCreateForm", () => {
  it("sends the ticket as a JSON part and at most three photos", async () => {
    const photos = Array.from({ length: 4 }, (_, i) => new File(["x"], `p${i}.jpg`, { type: "image/jpeg" }));
    const form = buildCreateForm(ticket, photos);
    const part = form.get("ticket");
    expect(part).toBeInstanceOf(Blob);
    expect(JSON.parse(await (part as Blob).text())).toEqual(ticket);
    expect(form.getAll("photos")).toHaveLength(3);
  });
});

describe("toQuery", () => {
  it("drops empty values and repeats arrays", () => {
    expect(toQuery({ status: ["OPEN", "ASSIGNED"], mine: true, breached: false, blockId: undefined, q: "", page: 0 })).toBe(
      "?status=OPEN&status=ASSIGNED&mine=true&page=0",
    );
  });

  it("returns an empty string when nothing is set", () => {
    expect(toQuery({ a: undefined, b: null })).toBe("");
  });
});
