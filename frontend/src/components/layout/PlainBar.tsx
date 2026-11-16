import type { ReactNode } from "react";
import { useTheme } from "../../hooks/useTheme";
import { Icon } from "../ui/Icon";
import { MonogramArt } from "../ui/Monogram";

/** Top bar for screens outside the app shell (sign in, onboarding). */
export function PlainBar({ end }: { end?: ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="nav nav--plain">
      <span />
      <span className="monogram" aria-hidden="true">
        <MonogramArt />
      </span>
      <div className="nav__right">
        {end}
        <button className="icon-btn" type="button" onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
          <Icon name="sun" className="ico ico--sun" />
          <Icon name="moon" className="ico ico--moon" />
        </button>
      </div>
    </header>
  );
}
