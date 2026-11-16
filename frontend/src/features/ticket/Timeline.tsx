import type { TicketDetail } from "../../api/types";
import { cx, vars } from "../../lib/cx";
import { formatWhen } from "../../lib/format";
import { timelineProgress, timelineSteps } from "../../lib/timeline";

/** Reported, assigned, on the way, fixed. The gold rule grows to the current step; each reached step eases in. */
export function Timeline({ detail }: { detail: TicketDetail }) {
  const steps = timelineSteps(detail);
  return (
    <ol className="timeline" style={vars({ "--progress": timelineProgress(detail.ticket.status) })} aria-label="Progress">
      {steps.map((s, i) => (
        <li
          key={s.key}
          className={cx("tl-step", s.done && "is-done", s.current && "is-current")}
          style={vars({ "--i": i })}
          aria-current={s.current ? "step" : undefined}
          data-testid={`step-${s.key}`}
        >
          <span className="tl-step__dot" aria-hidden="true" />
          <p className="tl-step__name">{s.name}</p>
          <p className="tl-step__detail">{s.detail}</p>
          <p className="tl-step__time">{s.done ? (s.at ? formatWhen(s.at) : "Done") : "Waiting"}</p>
        </li>
      ))}
    </ol>
  );
}
