import { useId, type ReactNode } from "react";
import { cx } from "../../lib/cx";

export interface ControlProps {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
}

interface Props {
  label: ReactNode;
  optional?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}

/** Label, control, hint and error wired together with ids, so screen readers read all three. */
export function Field({ label, optional, hint, error, className, children }: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("field", className)}>
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__opt">{optional}</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {(hint || error) && (
        <div className="field__foot">
          {error ? <p className="field__err" id={errId}>{error}</p> : <span />}
          {hint && <p className="field__help" id={hintId}>{hint}</p>}
        </div>
      )}
    </div>
  );
}
