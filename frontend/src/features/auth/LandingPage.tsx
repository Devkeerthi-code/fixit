import { useState } from "react";
import { Footer } from "../../components/layout/AppShell";
import { PlainBar } from "../../components/layout/PlainBar";
import { Headline } from "../../components/ui/Headline";
import { Tabs } from "../../components/ui/Tabs";
import { vars } from "../../lib/cx";
import { RegisterForm, SignInForm } from "./AuthForms";

const HOW = [
  { name: "Reported", detail: "Pick a category, add a photo, choose when you're in. Thirty seconds." },
  { name: "Assigned", detail: "It goes straight to the staff member who handles that, in your block." },
  { name: "On the way", detail: "You get a note when they start, so nobody knocks at a bad time." },
  { name: "Fixed", detail: "You confirm it really is fixed and rate the visit. Or reopen it." },
];

export function LandingPage() {
  const [tab, setTab] = useState<"signin" | "register">("signin");
  return (
    <>
      <PlainBar />
      <main id="main">
        <div className="wrap landing">
          <section className="landing__intro" aria-labelledby="landing-title">
            <p className="label">( fixit )</p>
            <Headline as="h1" size="desk" id="landing-title" lines={["Report it once.", "_See who's_", "on it."]} />
            <p className="landing__line">
              FixIt is where people in hostels, campuses and apartment societies report what's broken, and see it go from reported to fixed.
            </p>
          </section>
          <section className="landing__auth" aria-label="Sign in or create an account">
            <div className="auth-card">
              <Tabs
                items={[{ id: "signin", label: "Sign in" }, { id: "register", label: "Create account" }]}
                selected={tab}
                onSelect={(id) => setTab(id === "register" ? "register" : "signin")}
                label="Account"
                panelId="auth-panel"
                idPrefix="auth"
                className="tabs--two"
              />
              <div id="auth-panel" role="tabpanel" aria-labelledby={`auth-${tab}`}>
                {tab === "signin" ? <SignInForm /> : <RegisterForm />}
              </div>
            </div>
          </section>
        </div>
        <section className="how" aria-labelledby="how-title">
          <div className="wrap">
            <p className="label">( how it works )</p>
            <h2 className="how__title" id="how-title">
              From a dripping tap to <em>fixed</em>, in four steps you can watch.
            </h2>
            <ol className="timeline" style={vars({ "--progress": 1 })}>
              {HOW.map((s, i) => (
                <li key={s.name} className="tl-step is-done" style={vars({ "--i": i })}>
                  <span className="tl-step__dot" aria-hidden="true" />
                  <p className="tl-step__name">{s.name}</p>
                  <p className="tl-step__detail">{s.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
