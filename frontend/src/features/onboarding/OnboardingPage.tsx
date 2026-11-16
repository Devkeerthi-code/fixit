import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { hostelApi } from "../../api/hostel";
import { keys } from "../../api/queries";
import type { Me } from "../../api/types";
import { Footer } from "../../components/layout/AppShell";
import { PlainBar } from "../../components/layout/PlainBar";
import { Button } from "../../components/ui/Button";
import { Headline } from "../../components/ui/Headline";
import { ErrorState, Skeleton } from "../../components/ui/States";
import { Tabs } from "../../components/ui/Tabs";
import { useSignOut } from "../../hooks/useSignOut";
import { firstName } from "../../lib/format";
import { InviteCodes } from "./InviteCodes";
import { JoinWithCode } from "./JoinWithCode";
import { SetupHostel } from "./SetupHostel";

/** Shown once, right after the hostel is created, so the warden leaves with both codes. */
function ShareCodes({ me, onDone }: { me: Me; onDone: () => void }) {
  const settings = useQuery({ queryKey: keys.settings, queryFn: hostelApi.settings });
  return (
    <section className="setup-card" aria-labelledby="codes-title">
      <div className="setup-card__head">
        <h2 id="codes-title">{me.hostel?.name} is ready. Share these codes.</h2>
      </div>
      {settings.isPending && <Skeleton rows={1} label="Loading invite codes" />}
      {settings.isError && <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />}
      {settings.data && <InviteCodes settings={settings.data} />}
      <p className="muted text-sm">You can see and change these any time under Setup.</p>
      <div className="form-actions">
        <Button onClick={onDone}>Go to the dashboard</Button>
      </div>
    </section>
  );
}

export function OnboardingPage({ me }: { me: Me }) {
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [mode, setMode] = useState<"join" | "setup">("join");
  const [created, setCreated] = useState<Me | null>(null);

  return (
    <>
      <PlainBar
        end={
          <Button variant="text" size="small" pending={signOut.isPending} onClick={() => signOut.mutate()}>
            Sign out
          </Button>
        }
      />
      <main id="main" className="wrap onboard">
        <p className="label">( welcome, {firstName(me.name).toLowerCase()} )</p>
        <Headline as="h1" size="desk" lines={["One last step:", "_find your_", "hostel."]} />
        <div className="onboard__body">
          <aside className="onboard__aside">
            <p className="lede mt-0">Residents and staff join with the code their warden shares. Wardens set the place up once, in about two minutes.</p>
            {!created && (
              <Tabs
                items={[{ id: "join", label: "Join with a code" }, { id: "setup", label: "Set up your hostel" }]}
                selected={mode}
                onSelect={(id) => setMode(id === "setup" ? "setup" : "join")}
                label="How you're joining"
                panelId="onboard-panel"
                idPrefix="onboard"
                className="tabs--left tabs--two"
              />
            )}
          </aside>
          <div id="onboard-panel" role="tabpanel" aria-labelledby={`onboard-${mode}`}>
            {created ? (
              <ShareCodes me={created} onDone={() => qc.setQueryData(keys.me, created)} />
            ) : mode === "join" ? (
              <JoinWithCode />
            ) : (
              <SetupHostel onCreated={setCreated} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
