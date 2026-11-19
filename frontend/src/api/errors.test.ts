import { describe, expect, it } from "vitest";
import { ApiError, errorFromResponse, messageOf } from "./errors";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("errorFromResponse", () => {
  it("keeps the server's code, message and field errors", async () => {
    const e = await errorFromResponse(json(400, { status: 400, code: "BAD_ROOMS", message: "Bad", fieldErrors: [{ field: "rooms", message: "x" }], timestamp: "" }));
    expect(e).toMatchObject({ status: 400, code: "BAD_ROOMS", message: "Bad", fieldErrors: [{ field: "rooms", message: "x" }] });
  });

  it("hides HTML error pages from proxies behind a friendly 5xx message", async () => {
    const e = await errorFromResponse(new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(e).toMatchObject({ code: "INTERNAL_ERROR", message: "Something went wrong on our side. Try again." });
  });

  it("gives other bodiless failures a generic code with the status", async () => {
    expect(await errorFromResponse(new Response(null, { status: 418 }))).toMatchObject({ code: "HTTP_418" });
  });
});

describe("ApiError helpers", () => {
  it("knows network and stale errors apart", () => {
    expect(new ApiError(0, "TIMEOUT", "slow").isNetwork).toBe(true);
    expect(new ApiError(409, "STALE_UPDATE", "stale").isStale).toBe(true);
    expect(new ApiError(409, "DUPLICATE", "dupe").isStale).toBe(false);
  });

  it("turns anything into a message a person can read", () => {
    expect(messageOf(new ApiError(404, "NOT_FOUND", "Ticket not found"))).toBe("Ticket not found");
    expect(messageOf("oops")).toBe("Something went wrong. Try again.");
  });
});
