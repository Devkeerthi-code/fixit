import { useWaking } from "../../hooks/useWaking";
import { MonogramArt } from "../ui/Monogram";

export const WAKING_TITLE = "Waking the server up.";
export const WAKING_BODY = "This takes up to a minute after a quiet spell.";

function Kettle() {
  return (
    <svg className="waking__kettle" viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <g>
        <path className="waking__steam" d="M11 6c-1-1.5 1-2.5 0-4" />
        <path className="waking__steam" d="M14 6c-1-1.5 1-2.5 0-4" />
        <path className="waking__steam" d="M17 6c-1-1.5 1-2.5 0-4" />
      </g>
      <path d="M6 24h16l-1.5-11h-13Z" />
      <path d="M9 13a5 5 0 0 1 10 0" />
      <path d="M20.5 15.5c3 0 3 4 0 4" />
    </svg>
  );
}

/** Calm, not an error: a free-tier backend sleeping after a quiet spell is normal. */
export function WakingNotice() {
  const isWaking = useWaking();
  if (!isWaking) return null;
  return (
    <div className="waking" role="status" aria-live="polite">
      <Kettle />
      <p>
        {WAKING_TITLE}
        <small>{WAKING_BODY} Keep this page open.</small>
      </p>
    </div>
  );
}

/** The first screen while we learn who you are. */
export function BootScreen() {
  const isWaking = useWaking();
  return (
    <main className="boot" id="main" aria-busy="true">
      <span className="monogram">
        <MonogramArt />
      </span>
      <span className="boot__line" aria-hidden="true" />
      <p className="boot__msg" role="status" aria-live="polite">
        {isWaking ? (
          <>
            <b>{WAKING_TITLE}</b>
            {WAKING_BODY}
          </>
        ) : (
          <span className="sr-only">Loading FixIt</span>
        )}
      </p>
    </main>
  );
}
