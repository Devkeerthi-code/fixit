import { useEffect, useRef, useState, type PointerEvent } from "react";
import { spring, prefersReducedMotion } from "../../lib/spring";
import { toasts, type ToastItem } from "../../lib/toast";
import { Icon } from "./Icon";

const AUTO_DISMISS_MS = 5000;

/** A toast you can flick away: it keeps your throw velocity and springs back if the throw was too soft. */
function Toast({ item }: { item: ToastItem }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, dx: 0, lastX: 0, lastT: 0, vx: 0 });
  const timer = useRef<number>(0);
  const stop = useRef<() => void>(() => undefined);

  const paint = (x: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `translateX(${x}px)`;
    el.style.opacity = String(Math.max(0, 1 - Math.abs(x) / 260));
  };

  const dismiss = (direction: number) => {
    window.clearTimeout(timer.current);
    if (direction === 0 || prefersReducedMotion()) {
      toasts.dismiss(item.id);
      return;
    }
    stop.current();
    stop.current = spring({ from: drag.current.dx, to: direction * 480, stiffness: 180, damping: 20, velocity: drag.current.vx, onUpdate: paint, onDone: () => toasts.dismiss(item.id) });
  };

  const arm = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => toasts.dismiss(item.id), ms);
  };

  useEffect(() => {
    const timers = timer;
    const springs = stop;
    timers.current = window.setTimeout(() => toasts.dismiss(item.id), item.action ? AUTO_DISMISS_MS * 2 : AUTO_DISMISS_MS);
    return () => {
      window.clearTimeout(timers.current);
      springs.current();
    };
  }, [item.id, item.action]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    Object.assign(drag.current, { active: true, startX: e.clientX, lastX: e.clientX, lastT: performance.now(), dx: 0, vx: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
    window.clearTimeout(timer.current);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const now = performance.now();
    d.dx = e.clientX - d.startX;
    d.vx = ((e.clientX - d.lastX) / Math.max(1, now - d.lastT)) * 1000;
    d.lastX = e.clientX;
    d.lastT = now;
    paint(d.dx);
  };
  const onUp = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (Math.abs(d.dx) > 90 || Math.abs(d.vx) > 700) {
      dismiss(Math.sign(d.dx || d.vx));
      return;
    }
    stop.current();
    stop.current = spring({ from: d.dx, to: 0, stiffness: 420, damping: 24, velocity: d.vx, onUpdate: (x) => { d.dx = x; paint(x); } });
    arm(3000);
  };

  return (
    <div
      ref={ref}
      className={`toast toast--${item.tone}`}
      role={item.tone === "err" ? "alert" : "status"}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <Icon name={item.tone === "err" ? "alert" : "check"} />
      <p>{item.message}</p>
      {item.action && (
        <button type="button" className="toast__action" onClick={() => { item.action?.run(); toasts.dismiss(item.id); }}>
          {item.action.label}
        </button>
      )}
      <button type="button" className="toast__x" aria-label="Dismiss" onClick={() => dismiss(0)}>
        <Icon name="close" />
      </button>
    </div>
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => toasts.subscribe(setItems), []);
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <Toast key={t.id} item={t} />
      ))}
    </div>
  );
}
