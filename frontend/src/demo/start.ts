import { setupWorker } from "msw/browser";
import { authHandlers } from "./handlers/auth";
import { hostelHandlers } from "./handlers/hostel";
import { inboxHandlers } from "./handlers/inbox";
import { ticketReadHandlers } from "./handlers/ticketsRead";
import { ticketWriteHandlers } from "./handlers/ticketsWrite";

export const demoHandlers = [...authHandlers, ...hostelHandlers, ...ticketReadHandlers, ...ticketWriteHandlers, ...inboxHandlers];

/** Starts the in-browser API. Every /api request is answered from localStorage instead of the network. */
export async function startDemo(): Promise<void> {
  // The client only fetches /api/auth/csrf when this cookie is missing; set it once to skip that round trip.
  document.cookie = "XSRF-TOKEN=demo; path=/; SameSite=Lax";
  await setupWorker(...demoHandlers).start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: "bypass",
    quiet: true,
  });
}
