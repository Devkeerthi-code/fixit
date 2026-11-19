import { describe, expect, it } from "vitest";
import { aDetail } from "../test/fixtures";
import { timelineProgress, timelineSteps } from "./timeline";

describe("timelineSteps", () => {
  it("marks steps done up to the current status", () => {
    const steps = timelineSteps(aDetail("IN_PROGRESS"));
    expect(steps.map((s) => [s.key, s.done, s.current])).toEqual([
      ["reported", true, false],
      ["assigned", true, false],
      ["onway", true, true],
      ["fixed", false, false],
    ]);
    expect(steps[3]?.at).toBeNull();
  });

  it("names the assignee while waiting for them to set off", () => {
    expect(timelineSteps(aDetail("ASSIGNED"))[2]?.detail).toBe("You'll be told when Ravi Kumar sets off");
  });

  it("asks the resident to confirm once it's marked fixed", () => {
    const fixed = timelineSteps(aDetail("RESOLVED"))[3];
    expect(fixed).toMatchObject({ done: true, current: true, detail: "Waiting for you to confirm" });
  });

  it("has no current step once closed", () => {
    expect(timelineSteps(aDetail("CLOSED")).some((s) => s.current)).toBe(false);
  });

  it("starts a reopened ticket over at the first step", () => {
    const [first] = timelineSteps(aDetail("REOPENED"));
    expect(first).toMatchObject({ name: "Reopened", current: true });
  });

  it("mentions photos on the reported step", () => {
    expect(timelineSteps(aDetail("OPEN", { photoIds: [1, 2] }))[0]?.detail).toBe("By Asha Verma, with 2 photos");
  });
});

describe("timelineProgress", () => {
  it("runs from 0 to 1 across the four steps", () => {
    expect(timelineProgress("OPEN")).toBe(0);
    expect(timelineProgress("IN_PROGRESS")).toBeCloseTo(2 / 3);
    expect(timelineProgress("CLOSED")).toBe(1);
  });
});
