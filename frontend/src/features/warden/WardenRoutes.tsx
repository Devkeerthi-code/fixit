import type { ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { AllTicketsPage } from "./AllTicketsPage";
import { HostelSetupPage } from "./setup/HostelSetupPage";
import { LayoutSetupPage } from "./setup/LayoutSetupPage";
import { CategoriesSetupPage } from "./setup/CategoriesSetupPage";
import { TeamSetupPage } from "./setup/TeamSetupPage";

const SETUP = [
  { to: "/warden/setup", label: "Hostel and codes", end: true },
  { to: "/warden/setup/layout", label: "Blocks and rooms" },
  { to: "/warden/setup/categories", label: "Categories" },
  { to: "/warden/setup/team", label: "Team" },
];

function SetupNav() {
  return (
    <nav className="subnav" aria-label="Setup">
      {SETUP.map((s) => (
        <NavLink key={s.to} to={s.to} end={s.end}>{s.label}</NavLink>
      ))}
    </nav>
  );
}

function SetupFrame({ children }: { children: ReactNode }) {
  return (
    <div className="desk">
      <section className="wrap desk-head" aria-labelledby="setup-title">
        <p className="label">( setup )</p>
        <h1 className="h-panel" id="setup-title">Set up once, adjust whenever.</h1>
      </section>
      <div className="wrap">
        <SetupNav />
        {children}
      </div>
    </div>
  );
}

/** Loaded as its own chunk: residents and staff never download the warden screens. */
export default function WardenRoutes() {
  return (
    <Routes>
      <Route index element={<DashboardPage />} />
      <Route path="tickets" element={<AllTicketsPage />} />
      <Route path="setup" element={<SetupFrame><HostelSetupPage /></SetupFrame>} />
      <Route path="setup/layout" element={<SetupFrame><LayoutSetupPage /></SetupFrame>} />
      <Route path="setup/categories" element={<SetupFrame><CategoriesSetupPage /></SetupFrame>} />
      <Route path="setup/team" element={<SetupFrame><TeamSetupPage /></SetupFrame>} />
      <Route path="*" element={<Navigate to="/warden" replace />} />
    </Routes>
  );
}
