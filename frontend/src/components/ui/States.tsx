import type { ReactNode } from "react";
import { messageOf } from "../../api/errors";
import { cx } from "../../lib/cx";
import { Button } from "./Button";
import { Icon } from "./Icon";

/** A small house with a tick being drawn: "nothing broken right now". */
function HouseArt() {
  return (
    <svg viewBox="0 0 120 80" className="empty__art" aria-hidden="true">
      <path d="M10 70h100" />
      <path d="M30 70V34l30-22 30 22v36" />
      <path d="M52 70V50h16v20" />
      <path d="m46 32 8 8 16-16" className="empty__tick" />
    </svg>
  );
}

interface EmptyProps {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  center?: boolean;
  art?: boolean;
}

export function EmptyState({ title, body, action, center, art = true }: EmptyProps) {
  return (
    <div className={cx("empty", center && "empty--center")}>
      {art && <HouseArt />}
      <p className="empty__title">{title}</p>
      {body && <p className="empty__body">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Couldn't load this" }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div className="err" role="alert">
      <p className="err__title">
        <Icon name="alert" />
        {title}
      </p>
      <p className="err__body">{messageOf(error)}</p>
      {onRetry && (
        <Button variant="outline" size="small" onClick={onRetry}>
          <Icon name="retry" />
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ rows = 3, onDark, label = "Loading" }: { rows?: number; onDark?: boolean; label?: string }) {
  return (
    <div className={cx("skel", onDark && "skel--on-dark")} aria-busy="true" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel">
          <span className="skel__line skel__line--s" />
          <span className="skel__line skel__line--l" />
          <span className="skel__line skel__line--m" />
        </div>
      ))}
    </div>
  );
}
