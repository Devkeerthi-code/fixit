import { describe, expect, it } from "vitest";
import { cx, vars } from "./cx";

describe("cx", () => {
  it("joins truthy class names and drops the rest", () => {
    expect(cx("btn", false, null, undefined, "btn--primary")).toBe("btn btn--primary");
    expect(cx()).toBe("");
  });

  it("passes CSS custom properties through untouched", () => {
    expect(vars({ "--p": 0.4, "--c": "red" })).toEqual({ "--p": 0.4, "--c": "red" });
  });
});
