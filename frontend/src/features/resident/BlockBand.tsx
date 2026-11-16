import { useEffect, useRef, type RefObject } from "react";
import { blockLabel } from "../../lib/format";
import { prefersReducedMotion } from "../../lib/spring";

const WINDOWS: Array<[number, number]> = [
  [176, 250], [254, 250], [176, 320], [254, 320], [896, 250], [974, 250], [896, 320], [974, 320],
  [356, 148], [442, 148], [528, 148], [622, 148], [708, 148], [794, 148],
  [356, 212], [442, 212], [528, 212], [622, 212], [708, 212], [794, 212],
  [356, 276], [442, 276], [708, 276], [794, 276],
];

/** The door tag hangs from the knob as a damped pendulum; moving the pointer across the band nudges it. */
function useDoorTag(band: RefObject<HTMLElement>, tag: RefObject<SVGGElement>) {
  useEffect(() => {
    const el = tag.current;
    const area = band.current;
    if (!el || !area) return;
    const reduced = prefersReducedMotion();
    let angle = reduced ? 0 : 9;
    let vel = 0;
    let raf = 0;
    let lastX: number | null = null;
    const paint = () => {
      el.style.transform = `rotate(${angle}deg)`;
    };
    const tick = () => {
      vel += (-38 * angle - 2.6 * vel) * 0.016;
      angle += vel * 0.016;
      paint();
      if (Math.abs(angle) < 0.05 && Math.abs(vel) < 0.05) {
        angle = 0;
        paint();
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const kick = (impulse: number) => {
      if (reduced) return;
      vel = Math.max(-140, Math.min(140, vel + impulse));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (lastX !== null) kick((lastX - e.clientX) * 0.9);
      lastX = e.clientX;
    };
    const onLeave = () => {
      lastX = null;
    };
    const onTap = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("a, button")) kick(90);
    };
    if (reduced) paint();
    else raf = requestAnimationFrame(tick);
    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    area.addEventListener("click", onTap);
    return () => {
      cancelAnimationFrame(raf);
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
      area.removeEventListener("click", onTap);
    };
  }, [band, tag]);
}

export function BlockBand({ blockName, hostelName, roomLabel }: { blockName: string | null; hostelName: string; roomLabel: string | null }) {
  const band = useRef<HTMLElement>(null);
  const tag = useRef<SVGGElement>(null);
  useDoorTag(band, tag);
  const blockText = (blockName ?? "your block").toUpperCase();
  return (
    <section className="band" aria-label="Your block" ref={band}>
      <p className="label band__label">( {blockName ? `${blockLabel(blockName).toLowerCase()}, ` : ""}{hostelName.toLowerCase()} )</p>
      <svg className="band__art" viewBox="0 0 1200 440" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <path d="M0 0V6" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <symbol id="win" viewBox="0 0 50 46">
            <rect x="1" y="1" width="48" height="40" />
            <path d="M25 1v40M1 21h48" />
            <path d="M-3 44h56" />
            <rect x="2" y="2" width="10" height="38" fill="url(#hatch)" stroke="none" />
          </symbol>
        </defs>
        <g className="etch">
          <path d="M0 250C150 200 300 232 420 212S700 168 820 198 1050 186 1200 214" />
          <path d="M0 290C120 262 260 280 380 268M840 262c120-14 240-6 360 6" />
          <path d="M40 240l18-6M90 232l20-5M960 205l22-4M1010 200l20-3M1100 206l20 2M180 228l16-4" />
          <rect x="150" y="226" width="180" height="184" />
          <rect x="870" y="226" width="180" height="184" />
          <path d="M144 226h192M864 226h192" />
          <rect x="330" y="130" width="540" height="280" />
          <rect x="320" y="118" width="560" height="12" />
          <rect x="720" y="64" width="72" height="44" />
          <path d="M726 108v10M786 108v10M720 76h72M720 90h72" />
          <rect x="420" y="96" width="24" height="22" />
          {WINDOWS.map(([x, y]) => (
            <use key={`${x}-${y}`} href="#win" x={x} y={y} width="50" height="46" />
          ))}
          <path d="M492 206c22 6 50 6 36 0" />
          <path d="M498 208l-4 8 5 1v9h10v-9l5-1-4-8M514 210l-3 7 4 1v7h8v-7l4-1-3-7" />
          <path d="M560 410v-46a40 40 0 0 1 80 0v46" />
          <path d="M572 410v-44a28 28 0 0 1 56 0v44M600 338v72" />
          <text x="600" y="330" textAnchor="middle" className="etch__text">{blockText.length > 14 ? "YOUR BLOCK" : blockLabel(blockText).toUpperCase()}</text>
          <rect x="404" y="344" width="44" height="66" />
          <rect x="410" y="350" width="32" height="24" fill="url(#hatch)" stroke="none" />
          <text x="426" y="338" textAnchor="middle" className="etch__num">{roomLabel ?? ""}</text>
          <circle cx="440" cy="382" r="2.5" />
          <path d="M548 410h104M540 418h120M0 418h1200M0 426c60-4 140 4 220 0M980 428c70-6 150 0 220-2" />
          <path d="M96 418c-6-60 0-150 14-190 14 40 20 130 14 190" />
          <path d="M104 260l12 6M100 290l18 8M100 320l20 8M100 350l20 6M100 380l20 6" />
          <path d="M1086 418c-6-70 0-160 14-200 14 40 20 140 14 200" />
          <path d="M1094 250l12 6M1090 284l18 8M1090 318l20 8M1090 350l20 6M1090 384l20 6" />
          <path d="M14 418c-10-22 0-46 20-48-2-22 26-34 40-18 18-8 36 8 28 28 16 8 12 34-6 38" />
          <path d="M1140 418c-10-22 0-46 20-48-2-22 26-34 40-18" />
          <path d="M30 390l10-4M44 400l12-3M60 382l10-2" />
        </g>
        <g className="tag" ref={tag}>
          <path d="M440 382v12" className="tag__string" />
          <rect x="423" y="394" width="34" height="54" rx="5" className="tag__card" />
          <circle cx="440" cy="404" r="3.5" className="tag__hole" />
          <text x="440" y="424" textAnchor="middle" className="tag__text">please</text>
          <text x="440" y="438" textAnchor="middle" className="tag__text tag__text--b">fix it</text>
        </g>
      </svg>
      <div className="band__ctas">
        <a className="btn btn--gold" href="#report">Raise a complaint</a>
        <a className="btn btn--outline-olive" href="#tickets">Track my tickets</a>
      </div>
    </section>
  );
}
