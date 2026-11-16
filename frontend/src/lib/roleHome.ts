import type { Me } from "../api/types";

/** Where each person lands after signing in. */
export function homePathFor(me: Me | null | undefined): string {
  if (!me) return "/signin";
  if (!me.hostel) return "/welcome";
  switch (me.role) {
    case "WARDEN":
      return "/warden";
    case "STAFF":
      return "/queue";
    default:
      return "/home";
  }
}
