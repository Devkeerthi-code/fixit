import { afterEach, describe, expect, it, vi } from "vitest";
import { spring } from "./spring";

afterEach(() => vi.unstubAllGlobals());

describe("spring", () => {
  it("jumps straight to the end when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), media: q }));
    const updates: number[] = [];
    let done = false;
    spring({ from: 0, to: 1, onUpdate: (v) => updates.push(v), onDone: () => (done = true) });
    expect(updates).toEqual([1]);
    expect(done).toBe(true);
  });

  it("settles exactly on the target when animating", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q }));
    let t = 0;
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    vi.spyOn(performance, "now").mockReturnValue(0);
    const updates: number[] = [];
    spring({ from: 0, to: 100, onUpdate: (v) => updates.push(v) });
    for (let i = 0; i < 400 && frames.length; i++) {
      t += 16;
      frames.shift()?.(t);
    }
    expect(updates.at(-1)).toBe(100);
    expect(Math.max(...updates)).toBeGreaterThan(100); // a real spring overshoots a little
  });
});
