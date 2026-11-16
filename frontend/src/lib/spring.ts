/* A tiny damped-spring integrator. Real physics (force = -k·x - c·v) instead of a canned easing curve. */
export interface SpringOptions {
  from: number;
  to: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  onUpdate: (value: number) => void;
  onDone?: () => void;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : true;
}

export function spring({ from, to, stiffness = 320, damping = 26, mass = 1, velocity = 0, onUpdate, onDone }: SpringOptions): () => void {
  if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
    onUpdate(to);
    onDone?.();
    return () => undefined;
  }
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    const force = -stiffness * (x - to) - damping * v;
    v += (force / mass) * dt;
    x += v * dt;
    if (Math.abs(v) < 0.01 && Math.abs(x - to) < 0.001) {
      onUpdate(to);
      onDone?.();
      return;
    }
    onUpdate(x);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
