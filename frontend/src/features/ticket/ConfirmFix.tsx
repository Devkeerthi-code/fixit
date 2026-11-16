import { useId, useState, type FormEvent } from "react";
import type { TicketDetail } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { cx } from "../../lib/cx";
import { firstName } from "../../lib/format";
import { toast } from "../../lib/toast";
import { useTicketAction } from "./useTicketAction";

const WORDS = ["Tap a star", "Still a problem", "Poor", "Okay", "Good", "Spot on"];

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const name = useId();
  const lit = hover || value;
  return (
    <div className="stars" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>
          <input type="radio" className="sr-only" name={name} id={`${name}-${n}`} value={n} checked={value === n} onChange={() => onChange(n)} />
          <label htmlFor={`${name}-${n}`} className={cx(n <= lit && "is-lit")} onMouseEnter={() => setHover(n)}>
            <span className="sr-only">{n} star{n > 1 ? "s" : ""}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8Z" /></svg>
          </label>
        </span>
      ))}
    </div>
  );
}

/** "Is it fixed?" Confirm with a required 1-5 star rating, or reopen with a note. */
export function ConfirmFix({ detail }: { detail: TicketDetail }) {
  const { ticket, availableActions } = detail;
  const [mode, setMode] = useState<"ask" | "rate" | "reopen">("ask");
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const action = useTicketAction((d) => {
    if (d.ticket.status === "REOPENED" || d.ticket.status === "ASSIGNED") toast(`${d.ticket.code} reopened. ${d.ticket.assignee ? `${d.ticket.assignee.name} has been told.` : "The warden has been told."}`);
    setMode("ask");
  });
  const who = ticket.assignee ? firstName(ticket.assignee.name) : "Staff";

  if (ticket.status === "CLOSED") {
    return (
      <div className="confirm">
        <p className="confirm__done">
          <Icon name="check" />
          Closed{detail.rating ? `, rated ${detail.rating}/5` : ""}. Thanks, that helps {who} and the warden.
        </p>
      </div>
    );
  }
  if (!availableActions.includes("CONFIRM") && !availableActions.includes("REOPEN")) return null;

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "rate" && !rating) return setError("Pick 1 to 5 stars");
    if (mode === "reopen" && note.trim().length < 3) return setError("Tell them what's still wrong");
    setError(undefined);
    action.mutate({
      ticketId: ticket.id,
      body: mode === "rate"
        ? { action: "CONFIRM", version: ticket.version, rating, note: note.trim() || null }
        : { action: "REOPEN", version: ticket.version, note: note.trim() },
    });
  };

  return (
    <div className="confirm">
      {mode === "ask" && (
        <>
          <p className="confirm__title">{who} marked this fixed. <em>Is it?</em></p>
          <div className="confirm__actions">
            {availableActions.includes("CONFIRM") && <Button size="small" onClick={() => setMode("rate")}>Yes, it's fixed</Button>}
            {availableActions.includes("REOPEN") && <Button size="small" variant="outline-olive" onClick={() => setMode("reopen")}>No, still broken</Button>}
          </div>
        </>
      )}
      {mode !== "ask" && (
        <form className="confirm__form" onSubmit={send} noValidate>
          <fieldset>
            <legend className="confirm__title">{mode === "rate" ? <>How was <em>the visit?</em></> : <>What's <em>still wrong?</em></>}</legend>
            {mode === "rate" && (
              <>
                <Stars value={rating} onChange={(n) => { setRating(n); setError(undefined); }} />
                <p className="rate__word" aria-live="polite">{WORDS[rating]}</p>
              </>
            )}
          </fieldset>
          <div className="field">
            <label className="field__label" htmlFor={`note-${ticket.id}`}>
              {mode === "rate" ? <>A note for {who} <span className="field__opt">optional</span></> : "Note"}
            </label>
            <textarea
              id={`note-${ticket.id}`}
              className="input input--area"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === "rate" ? "e.g. quick and tidy" : "e.g. still drips at night"}
              aria-invalid={mode === "reopen" && !!error ? true : undefined}
            />
          </div>
          {error && <p className="field__err" role="alert">{error}</p>}
          <div className="confirm__actions">
            <Button type="submit" size="small" pending={action.isPending} pendingLabel="Sending">
              {mode === "rate" ? "Close the ticket" : "Reopen it"}
            </Button>
            <Button size="small" variant="text-olive" onClick={() => { setMode("ask"); setError(undefined); }}>Back</Button>
          </div>
        </form>
      )}
    </div>
  );
}
