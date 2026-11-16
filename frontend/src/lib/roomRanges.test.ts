import { describe, expect, it } from "vitest";
import { MAX_ROOMS, parseRoomRanges, roomTotal } from "./roomRanges";

function rooms(input: string) {
  const r = parseRoomRanges(input);
  if (!r.ok) throw new Error(r.error);
  return r.rooms;
}

describe("parseRoomRanges", () => {
  it("expands ranges and singles, in order", () => {
    expect(rooms("101-103, G1")).toEqual(["101", "102", "103", "G1"]);
  });

  it("counts two floors the way the setup hint promises", () => {
    expect(rooms("101-120, 201-220")).toHaveLength(40);
  });

  it("keeps zero padding and prefixes", () => {
    expect(rooms("G01-G03")).toEqual(["G01", "G02", "G03"]);
  });

  it("accepts commas, semicolons and new lines, and drops duplicates", () => {
    expect(rooms("101-102;102\n103")).toEqual(["101", "102", "103"]);
  });

  it("uppercases single rooms", () => {
    expect(rooms("g1, b/2")).toEqual(["G1", "B/2"]);
  });

  it.each([
    ["", "Add at least one room, e.g. 101-120"],
    ["120-101", '"120-101" goes backwards'],
    ["A1-B5", '"A1-B5" mixes two prefixes'],
    ["room 1!", `"room 1!" isn't a room number or a range like 101-120`],
    [`1-${MAX_ROOMS + 1}`, `"1-${MAX_ROOMS + 1}" is more than ${MAX_ROOMS} rooms`],
  ])("rejects %j with a message the warden can act on", (input, message) => {
    expect(parseRoomRanges(input)).toEqual({ ok: false, error: message });
  });

  it("caps a block at the backend's limit", () => {
    expect(parseRoomRanges("1-300, 1001-1300")).toEqual({ ok: false, error: `A block can have at most ${MAX_ROOMS} rooms` });
  });

  it("totals several blocks, ignoring the ones still being typed", () => {
    expect(roomTotal(["101-120", "201-210", "oops!"])).toBe(30);
  });
});
