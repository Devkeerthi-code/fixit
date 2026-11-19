import { beforeEach, describe, expect, it } from "vitest";
import { authApi } from "../api/auth";
import { isApiError } from "../api/errors";
import { hostelApi } from "../api/hostel";
import { server } from "../test/server";
import { getDb, resetDb, save } from "./db";
import { PERSONAS } from "./seed";
import { demoHandlers } from "./start";

function viewAs(userId: number) {
  getDb().sessionUserId = userId;
  save();
}

const newAccount = () => authApi.register({ name: "New Person", email: "new@example.test", password: "long-enough-1" });

beforeEach(() => {
  localStorage.clear();
  resetDb();
  server.use(...demoHandlers);
});

describe("setting up a hostel in the demo", () => {
  it("makes the creator warden of a new hostel with blocks, rooms and default categories", async () => {
    await newAccount();
    const me = await hostelApi.create({ name: "Lakeview PG", kind: "HOSTEL", blocks: [{ name: "A", rooms: "101-105, G1" }] });
    expect(me).toMatchObject({ role: "WARDEN", hostel: { name: "Lakeview PG" } });
    const [block] = await hostelApi.layout();
    expect(block?.rooms.map((r) => r.number)).toEqual(["101", "102", "103", "104", "105", "G1"]);
    expect((await hostelApi.categories()).map((c) => c.code)).toContain("WIFI");
  });

  it("explains a bad room range instead of creating anything", async () => {
    await newAccount();
    const e = await hostelApi.create({ name: "X", kind: "HOSTEL", blocks: [{ name: "A", rooms: "120-101" }] }).catch((x: unknown) => x);
    expect(isApiError(e) && e.message).toBe('"120-101" goes backwards');
    expect(getDb().hostels).toHaveLength(1);
  });
});

describe("joining with an invite code", () => {
  it("previews the hostel and joins as a resident with a room", async () => {
    await newAccount();
    expect(await hostelApi.lookup("demo-res")).toMatchObject({ name: "Demo Hostel (sample data)", joinsAs: "RESIDENT" });
    expect(await hostelApi.join({ code: "DEMO-RES", roomId: 301 })).toMatchObject({ role: "RESIDENT", room: { label: "C-301" } });
  });

  it("joins staff through the staff code", async () => {
    await newAccount();
    expect(await hostelApi.join({ code: "DEMO-STF" })).toMatchObject({ role: "STAFF", room: null });
  });

  it("rejects an unknown code", async () => {
    await newAccount();
    const e = await hostelApi.lookup("NOPE").catch((x: unknown) => x);
    expect(isApiError(e) && e.code).toBe("BAD_CODE");
  });
});

describe("warden setup screens", () => {
  it("adds a block and more rooms, skipping rooms that already exist", async () => {
    viewAs(PERSONAS.warden);
    const d = (await hostelApi.addBlock({ name: "D", rooms: "401-402" })).find((b) => b.name === "D");
    expect(d?.rooms).toHaveLength(2);
    const after = await hostelApi.addRooms(d?.id ?? 0, "402-404");
    expect(after.find((b) => b.name === "D")?.rooms.map((r) => r.number)).toEqual(["401", "402", "403", "404"]);
  });

  it("edits a category's name, text and SLA hours", async () => {
    viewAs(PERSONAS.warden);
    const list = await hostelApi.updateCategory(103, { name: "Internet", covers: "Wi-Fi and LAN", active: true, slaHours: { LOW: 48, NORMAL: 12, URGENT: 2 } });
    expect(list.find((c) => c.id === 103)).toMatchObject({ name: "Internet", slaHours: { URGENT: 2 } });
  });

  it("changes a staff member's skills and can switch them off", async () => {
    viewAs(PERSONAS.warden);
    let team = await hostelApi.setSkills(PERSONAS.staff, { skills: [{ categoryId: 101, blockId: 2 }] });
    expect(team.find((s) => s.id === PERSONAS.staff)?.skills).toEqual([{ categoryId: 101, blockId: 2 }]);
    team = await hostelApi.setActive(PERSONAS.staff, false);
    expect(team.find((s) => s.id === PERSONAS.staff)?.active).toBe(false);
  });

  it("rotates both invite codes", async () => {
    viewAs(PERSONAS.warden);
    const before = await hostelApi.settings();
    const after = await hostelApi.rotateCodes();
    expect(after.residentInviteCode).not.toBe(before.residentInviteCode);
    expect(after.staffInviteCode).not.toBe(before.staffInviteCode);
  });

  it("keeps residents out of warden-only endpoints", async () => {
    viewAs(PERSONAS.resident);
    const e = await hostelApi.team().catch((x: unknown) => x);
    expect(isApiError(e) && e.status).toBe(403);
  });
});
