import { Link, NavLink, Outlet } from "react-router-dom";
import type { Me } from "../../api/types";
import { useTheme } from "../../hooks/useTheme";
import { homePathFor } from "../../lib/roleHome";
import { Icon } from "../ui/Icon";
import { MonogramArt } from "../ui/Monogram";
import { NotificationBell } from "./Notifications";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

function linksFor(me: Me): NavItem[] {
  switch (me.role) {
    case "WARDEN":
      return [
        { to: "/warden", label: "Dashboard", end: true },
        { to: "/warden/tickets", label: "Tickets" },
        { to: "/warden/setup", label: "Setup" },
        { to: "/raise", label: "Raise" },
      ];
    case "STAFF":
      return [
        { to: "/queue", label: "My queue" },
        { to: "/raise", label: "Raise" },
      ];
    default:
      return [
        { to: "/home#report", label: "Raise" },
        { to: "/home#nearby", label: "Nearby" },
        { to: "/home#tickets", label: "My tickets" },
      ];
  }
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button className="icon-btn" type="button" onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      <Icon name="sun" className="ico ico--sun" />
      <Icon name="moon" className="ico ico--moon" />
    </button>
  );
}

function TopBar({ me }: { me: Me }) {
  return (
    <header className="nav">
      <div className="nav__left-tools">
        <ThemeButton />
      </div>
      <nav className="nav__links" aria-label="Main">
        {linksFor(me).map((item) =>
          item.to.includes("#") ? (
            <Link key={item.to} to={item.to} className="nav__link">
              {item.label}
            </Link>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav__link">
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
      <Link className="monogram" to={homePathFor(me)} aria-label="FixIt, home">
        <MonogramArt />
      </Link>
      <div className="nav__right">
        <span className="hidden min-[960px]:contents">
          <ThemeButton />
        </span>
        <NotificationBell />
        <NavLink to="/profile" className="nav__me" aria-label={`Your profile, ${me.name}`}>
          {me.name.trim().charAt(0).toUpperCase() || <Icon name="user" />}
        </NavLink>
      </div>
    </header>
  );
}

export function Footer({ hostel }: { hostel?: string }) {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <p className="footer__big" aria-hidden="true">
          Fix<em>It</em>
        </p>
        <div className="footer__row">
          <p>{hostel ? `${hostel}, looked after.` : "Hostel and campus complaints, tracked to the fix."}</p>
          <p>Photos stay inside your hostel. Staff never see your phone number.</p>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ me }: { me: Me }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopBar me={me} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <Footer hostel={me.hostel?.name} />
    </>
  );
}
