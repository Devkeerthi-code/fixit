import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMe } from "../api/queries";
import { getDb, resetDb, save } from "./db";
import { PERSONAS } from "./seed";
import "./demo.css";

const VIEWS = [
  { key: "resident", label: "Resident", hint: "Asha, room B-204", id: PERSONAS.resident },
  { key: "staff", label: "Staff", hint: "Ravi, plumber", id: PERSONAS.staff },
  { key: "warden", label: "Warden", hint: "Meera, runs the hostel", id: PERSONAS.warden },
] as const;

/** Always-visible strip on the public demo: says it's sample data and lets visitors switch role in one tap. */
export function DemoBar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const current = useMe().data?.id ?? null;

  function viewAs(userId: number) {
    getDb().sessionUserId = userId;
    save();
    qc.clear();
    navigate("/", { replace: true });
  }

  function reset() {
    resetDb();
    qc.clear();
    navigate("/signin", { replace: true });
  }

  return (
    <aside className="demo-bar" aria-label="Demo controls">
      <p className="demo-bar__note">
        <strong>Demo</strong> with sample data, saved only in this browser.
      </p>
      <div className="demo-bar__views" role="group" aria-label="View the app as">
        <span className="demo-bar__label">View as</span>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className="demo-bar__view"
            aria-pressed={current === v.id}
            title={v.hint}
            onClick={() => viewAs(v.id)}
          >
            {v.label}
          </button>
        ))}
        <button type="button" className="demo-bar__reset" onClick={reset}>
          Reset
        </button>
      </div>
    </aside>
  );
}
