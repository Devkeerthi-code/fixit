import { describe, expect, it } from "vitest";
import { aMe } from "../test/fixtures";
import { homePathFor } from "./roleHome";

describe("homePathFor", () => {
  it("sends each role to its own home", () => {
    expect(homePathFor(aMe("RESIDENT"))).toBe("/home");
    expect(homePathFor(aMe("STAFF"))).toBe("/queue");
    expect(homePathFor(aMe("WARDEN"))).toBe("/warden");
  });

  it("asks people without a hostel to join or set one up", () => {
    expect(homePathFor(aMe("RESIDENT", { hostel: null, room: null }))).toBe("/welcome");
  });

  it("sends signed-out visitors to sign in", () => {
    expect(homePathFor(null)).toBe("/signin");
    expect(homePathFor(undefined)).toBe("/signin");
  });
});
