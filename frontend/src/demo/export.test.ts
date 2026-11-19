import { beforeEach, describe, expect, it } from "vitest";
import { dashboardApi } from "../api/inbox";
import { server } from "../test/server";
import { getDb, resetDb, save } from "./db";
import { PERSONAS } from "./seed";
import { demoHandlers } from "./start";

beforeEach(() => {
  localStorage.clear();
  resetDb();
  server.use(...demoHandlers);
});

async function download(userId: number) {
  getDb().sessionUserId = userId;
  save();
  return fetch(new URL(dashboardApi.exportUrl({}), window.location.origin));
}

describe("demo CSV export", () => {
  it("gives the warden a CSV of the hostel's tickets", async () => {
    const res = await download(PERSONAS.warden);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("fixit-demo-tickets.csv");
    const [header, ...rows] = (await res.text()).split("\n");
    expect(header).toBe("ticket,status,priority,created_at,description");
    expect(rows).toHaveLength(getDb().tickets.length);
  });

  it("quotes descriptions so commas don't break columns", async () => {
    const t = getDb().tickets[0];
    if (t) t.description = 'Tap "drips", loudly';
    const csv = await (await download(PERSONAS.warden)).text();
    expect(csv).toContain('"Tap ""drips"", loudly"');
  });

  it("is warden-only", async () => {
    expect((await download(PERSONAS.resident)).status).toBe(403);
  });
});
