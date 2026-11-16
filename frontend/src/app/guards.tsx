import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useMe } from "../api/queries";
import type { Role } from "../api/types";
import { homePathFor } from "../lib/roleHome";

/** Lets a screen render only for the right people; everyone else goes to their own home. */
export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { data: me } = useMe();
  if (!me) return <Navigate to="/signin" replace />;
  if (!me.hostel) return <Navigate to="/welcome" replace />;
  if (roles && !roles.includes(me.role)) return <Navigate to={homePathFor(me)} replace />;
  return <>{children}</>;
}

export function HomeRedirect() {
  const { data: me } = useMe();
  return <Navigate to={homePathFor(me)} replace />;
}
