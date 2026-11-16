import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { prefersReducedMotion } from "../../lib/spring";

type Size = "hero" | "h2" | "desk";

interface Props {
  /** Up to three lines. Wrap words in underscores for the gold italic: "_after._" */
  lines: [string] | [string, string] | [string, string, string];
  size?: Size;
  as?: "h1" | "h2";
  id?: string;
  className?: string;
}

function useRevealed<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** Splits a line into masked words; segments between underscores become <em>. */
function renderLine(line: string, startIndex: number): { nodes: ReactNode[]; next: number } {
  let i = startIndex;
  const nodes: ReactNode[] = [];
  line.split("_").forEach((segment, segIndex) => {
    const words = segment.split(/\s+/).filter(Boolean);
    const rendered = words.map((word, wi) => (
      <Fragment key={`${segIndex}-${wi}`}>
        {wi > 0 && " "}
        <span className="w">
          <span style={{ "--i": i++ } as CSSProperties}>{word}</span>
        </span>
      </Fragment>
    ));
    if (!rendered.length) return;
    if (nodes.length) nodes.push(" ");
    nodes.push(segIndex % 2 === 1 ? <em key={segIndex}>{rendered}</em> : <span key={segIndex}>{rendered}</span>);
  });
  return { nodes, next: i };
}

/**
  The grid headline. Line 1 starts at column 1, line 2 at column 5, line 3 ends at column 12.
  The rule lives in base.css (.scatter); this component only feeds it lines.
*/
export function Headline({ lines, size = "h2", as: Tag = "h2", id, className }: Props) {
  const [ref, inView] = useRevealed<HTMLHeadingElement>();
  const label = lines.join(" ").replace(/_/g, "");
  let index = 0;
  return (
    <Tag ref={ref} id={id} aria-label={label} className={cx("scatter", `scatter--${size}`, inView && "is-in", className)}>
      {lines.map((line, n) => {
        const { nodes, next } = renderLine(line, index);
        index = next;
        return (
          <span key={n} className={`sc sc--${n + 1}`} aria-hidden="true">
            {nodes}
          </span>
        );
      })}
    </Tag>
  );
}
