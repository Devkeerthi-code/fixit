import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  label?: ReactNode;
  variant?: "sheet" | "card";
  children: ReactNode;
}

/** Native <dialog>: focus trap, Escape and inert background come from the browser. */
export function Dialog({ open, onClose, title, label, variant = "card", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === "function") el.showModal();
      else el.setAttribute("open", "");
    } else if (!open && el.open) {
      if (typeof el.close === "function") el.close();
      else el.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={variant === "sheet" ? "sheet-dlg" : "card-dlg"}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={variant === "sheet" ? "sheet-dlg__inner" : "card-dlg__inner"}>
          <header className="dlg__head">
            {label && <p className="label">{label}</p>}
            <h2 className="dlg__title" id={titleId}>
              {title}
            </h2>
            <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
