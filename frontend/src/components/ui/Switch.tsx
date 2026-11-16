import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  label: ReactNode;
  small?: boolean;
}

export function Switch({ label, small, className, ...input }: Props) {
  return (
    <label className={cx("switch", small && "switch--sm", className)}>
      <input type="checkbox" role="switch" {...input} />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{label}</span>
    </label>
  );
}
