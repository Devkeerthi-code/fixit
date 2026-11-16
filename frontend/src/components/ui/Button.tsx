import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";

type Variant = "gold" | "outline" | "ink" | "outline-olive" | "text" | "text-olive" | "danger";
type Size = "normal" | "small" | "tiny";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pending?: boolean;
  pendingLabel?: string;
  wide?: boolean;
  children: ReactNode;
}

/** Pending buttons are disabled, so a double tap can never submit twice. */
export function Button({ variant = "gold", size = "normal", pending = false, pendingLabel, wide, className, children, disabled, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={cx("btn", `btn--${variant}`, size !== "normal" && `btn--${size}`, wide && "btn--wide", className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending && <span className="btn__spinner" aria-hidden="true" />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
