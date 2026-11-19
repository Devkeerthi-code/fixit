import { beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDb } from "./db";
import { PERSONAS } from "./seed";
import { detailView, meView, roomLabel, summaryView, teamView } from "./views";

beforeEach(() => {
  localStorage.clear();
  resetDb();
});

const user = (id: number) => {
  const u = getDb().users.find((x) => x.id === id);
  if (!u) throw new Error(`no user ${id}`);
  return u;
};
const ticket = (id: number) => {
  const t = getDb().tickets.find((x) => x.id === id);
  if (!t) throw new Error(`no ticket ${id}`);
  return t;
};

describe("demo views", () => {
  it("labels rooms as block-number, like the backend", () => {
    expect(roomLabel(204)).toBe("B-204");
    expect(roomLabel(null)).toBeNull();
  });

  it("builds the signed-in person with hostel and room", () => {
    expect(meView(user(PERSONAS.resident))).toMatchObject({
      role: "RESIDENT",
      hostel: { name: "Demo Hostel (sample data)" },
      room: { label: "B-204", blockName: "B" },
    });
    expect(meView(user(PERSONAS.warden)).room).toBeNull();
  });

  it("codes tickets FX-<number> and counts the reporter in 'affected'", () => {
    const s = summaryView(ticket(2), user(PERSONAS.resident));
    expect(s).toMatchObject({ code: "FX-2", commonArea: true, affectedCount: 3, affectedByMe: true });
    expect(summaryView(ticket(1), user(PERSONAS.resident)).affectedCount).toBe(0);
  });

  it("offers each viewer only the actions they can take", () => {
    expect(detailView(ticket(4), user(PERSONAS.resident)).availableActions).toEqual(["CONFIRM", "REOPEN"]);
    expect(detailView(ticket(4), user(PERSONAS.warden)).availableActions).toEqual([]);
    expect(detailView(ticket(3), user(PERSONAS.staff)).availableActions).toEqual(["RESOLVE"]);
  });

  it("lists staff alphabetically for the team screen, without wardens", () => {
    expect(teamView(1).map((s) => s.name)).toEqual(["Ravi Kumar", "Suresh Babu"]);
  });
});
