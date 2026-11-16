import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { initCsrf, onSessionExpired } from "../api/client";
import { keys, useMe } from "../api/queries";
import { AppShell } from "../components/layout/AppShell";
import { BootScreen, WakingNotice } from "../components/layout/Waking";
import { ErrorState, Skeleton } from "../components/ui/States";
import { Toaster } from "../components/ui/Toaster";
import { LandingPage } from "../features/auth/LandingPage";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { RaisePage } from "../features/report/RaisePage";
import { ResidentHome } from "../features/resident/ResidentHome";
import { StaffQueuePage } from "../features/staff/StaffQueuePage";
import { TicketPage } from "../features/ticket/TicketPage";
import { NotFoundPage } from "./NotFoundPage";
import { HomeRedirect, RequireRole } from "./guards";

const WardenRoutes = lazy(() => import("../features/warden/WardenRoutes"));

function useSessionWiring() {
  const qc = useQueryClient();
  useEffect(() => {
    void initCsrf().catch(() => undefined);
    onSessionExpired(() => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.me[0] });
      qc.setQueryData(keys.me, null);
    });
  }, [qc]);
}

function SignedOutOnly({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  return me ? <HomeRedirect /> : <>{children}</>;
}

function NeedsHostel() {
  const { data: me } = useMe();
  if (!me) return <Navigate to="/signin" replace />;
  if (me.hostel) return <HomeRedirect />;
  return <OnboardingPage me={me} />;
}

function Signed() {
  const { data: me } = useMe();
  if (!me) return <Navigate to="/signin" replace />;
  if (!me.hostel) return <Navigate to="/welcome" replace />;
  return <AppShell me={me} />;
}

export function App() {
  useSessionWiring();
  const me = useMe();

  if (me.isPending) return <BootScreen />;
  if (me.isError) {
    return (
      <main className="boot" id="main">
        <ErrorState title="Couldn't reach FixIt" error={me.error} onRetry={() => void me.refetch()} />
      </main>
    );
  }

  return (
    <>
      <WakingNotice />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/signin" element={<SignedOutOnly><LandingPage /></SignedOutOnly>} />
        <Route path="/welcome" element={<NeedsHostel />} />
        <Route element={<Signed />}>
          <Route path="/home" element={<RequireRole roles={["RESIDENT"]}><ResidentHome /></RequireRole>} />
          <Route path="/raise" element={<RequireRole><RaisePage /></RequireRole>} />
          <Route path="/tickets/:id" element={<RequireRole><TicketPage /></RequireRole>} />
          <Route path="/queue" element={<RequireRole roles={["STAFF", "WARDEN"]}><StaffQueuePage /></RequireRole>} />
          <Route
            path="/warden/*"
            element={
              <RequireRole roles={["WARDEN"]}>
                <Suspense fallback={<div className="wrap desk-head"><Skeleton rows={2} label="Loading the warden desk" /></div>}>
                  <WardenRoutes />
                </Suspense>
              </RequireRole>
            }
          />
          <Route path="/profile" element={<RequireRole><ProfilePage /></RequireRole>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
