import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TicketStatus } from "../../api/types";
import { aDetail } from "../../test/fixtures";
import { Timeline } from "./Timeline";

const KEYS = ["reported", "assigned", "onway", "fixed"] as const;

function doneSteps() {
  return KEYS.filter((k) => screen.getByTestId(`step-${k}`).classList.contains("is-done"));
}

function currentStep() {
  return KEYS.find((k) => screen.getByTestId(`step-${k}`).getAttribute("aria-current") === "step");
}

describe("Timeline", () => {
  it.each<[TicketStatus, number, (typeof KEYS)[number] | undefined, string]>([
    ["OPEN", 1, "reported", "0"],
    ["ASSIGNED", 2, "assigned", "0.3333333333333333"],
    ["IN_PROGRESS", 3, "onway", "0.6666666666666666"],
    ["RESOLVED", 4, "fixed", "1"],
    ["CLOSED", 4, undefined, "1"],
    ["REOPENED", 1, "reported", "0"],
  ])("%s lights %i steps", (status, done, current, progress) => {
    const { container } = render(<Timeline detail={aDetail(status)} />);
    expect(doneSteps()).toEqual(KEYS.slice(0, done));
    expect(currentStep()).toBe(current);
    expect((container.querySelector(".timeline") as HTMLElement).style.getPropertyValue("--progress")).toBe(progress);
  });

  it("shows 'Waiting' for steps not reached and a time for reached ones", () => {
    render(<Timeline detail={aDetail("ASSIGNED")} />);
    expect(screen.getByTestId("step-onway")).toHaveTextContent("Waiting");
    expect(screen.getByTestId("step-fixed")).toHaveTextContent("Waiting");
    expect(screen.getByTestId("step-assigned")).not.toHaveTextContent("Waiting");
    expect(screen.getByTestId("step-assigned")).toHaveTextContent("Ravi Kumar has it");
  });

  it("describes steps not reached yet in the future tense, never as if they happened", () => {
    render(<Timeline detail={aDetail("ASSIGNED")} />);
    expect(screen.getByTestId("step-onway")).toHaveTextContent("You'll be told when Ravi Kumar sets off");
    expect(screen.getByTestId("step-onway")).not.toHaveTextContent("started the work");
    expect(screen.getByTestId("step-fixed")).toHaveTextContent("You'll be asked to confirm it");
  });

  it("names a reopened ticket honestly and ignores the old work timestamps", () => {
    render(<Timeline detail={aDetail("REOPENED", { startedAt: "2026-11-15T10:22:00Z", resolvedAt: "2026-11-15T10:51:00Z" })} />);
    expect(screen.getByTestId("step-reported")).toHaveTextContent("Reopened");
    expect(screen.getByTestId("step-fixed")).toHaveTextContent("Waiting");
  });

  it("asks the resident to confirm once it is marked fixed", () => {
    render(<Timeline detail={aDetail("RESOLVED")} />);
    expect(screen.getByTestId("step-fixed")).toHaveTextContent("Waiting for you to confirm");
  });
});
