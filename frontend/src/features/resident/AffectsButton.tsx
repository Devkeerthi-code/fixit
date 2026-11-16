import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { keys } from "../../api/queries";
import { ticketsApi } from "../../api/tickets";
import type { TicketSummary } from "../../api/types";
import { vars } from "../../lib/cx";
import { spring } from "../../lib/spring";
import { toast, toastError } from "../../lib/toast";

interface Props {
  ticket: TicketSummary;
  isReporter: boolean;
  scale: number;
}

/** "Affects me too": the number pops on a stiff, under-damped spring and the bar fills with a softer one. */
export function AffectsButton({ ticket, isReporter, scale }: Props) {
  const qc = useQueryClient();
  const [count, setCount] = useState(ticket.affectedCount);
  const [mine, setMine] = useState(ticket.affectedByMe);
  const num = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const fillValue = useRef(Math.min(1, ticket.affectedCount / scale));
  const stops = useRef<Array<() => void>>([]);

  useEffect(() => {
    setCount(ticket.affectedCount);
    setMine(ticket.affectedByMe);
  }, [ticket.affectedCount, ticket.affectedByMe]);

  useEffect(() => {
    const s = stops;
    return () => s.current.forEach((stop) => stop());
  }, []);

  const animate = (next: number, pressed: boolean) => {
    stops.current.forEach((s) => s());
    const target = Math.min(1, next / scale);
    stops.current = [
      spring({ from: pressed ? 1.45 : 0.75, to: 1, stiffness: 520, damping: 14, onUpdate: (v) => { if (num.current) num.current.style.transform = `scale(${v})`; } }),
      spring({ from: fillValue.current, to: target, stiffness: 260, damping: 12, onUpdate: (v) => { fillValue.current = v; fill.current?.style.setProperty("--p", v.toFixed(4)); } }),
    ];
  };

  const mutation = useMutation({
    mutationFn: (on: boolean) => ticketsApi.affectsMe(ticket.id, on),
    onMutate: (on) => {
      const prev = { count, mine };
      const next = count + (on ? 1 : -1);
      setCount(next);
      setMine(on);
      animate(next, on);
      return prev;
    },
    onSuccess: (view, on) => {
      setCount(view.affectedCount);
      setMine(view.affectedByMe);
      if (on) toast(`Added your voice. ${view.affectedCount} people are waiting on this.`);
      void qc.invalidateQueries({ queryKey: keys.tickets });
    },
    onError: (e, _on, prev) => {
      if (prev) {
        setCount(prev.count);
        setMine(prev.mine);
        animate(prev.count, false);
      }
      toastError(e);
    },
  });

  const closed = ticket.status === "CLOSED";
  return (
    <div className="affects">
      <div className="affects__bar" aria-hidden="true">
        <span className="affects__fill" ref={fill} style={vars({ "--p": fillValue.current })} />
      </div>
      <button
        type="button"
        className="affects__btn"
        aria-pressed={mine}
        disabled={isReporter || closed}
        aria-busy={mutation.isPending || undefined}
        onClick={() => {
          if (!mutation.isPending) mutation.mutate(!mine);
        }}
      >
        <span className="affects__num" ref={num} aria-hidden="true">{count}</span>
        <span>{isReporter ? "You reported this" : "Affects me too"}</span>
        <span className="sr-only">, {count} {count === 1 ? "person" : "people"} affected{mine ? ", including you" : ""}</span>
      </button>
    </div>
  );
}
