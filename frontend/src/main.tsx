import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { queryClient } from "./lib/queryClient";
import "./styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

// "/" normally; "/fixit" for the GitHub Pages demo, which is served from a sub-path.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

/** The public demo answers every API call inside the browser; normal builds never load this code. */
async function demoBar(): Promise<ReactNode> {
  if (import.meta.env.VITE_DEMO !== "true") return null;
  const { startDemo } = await import("./demo/start");
  const { DemoBar } = await import("./demo/DemoBar");
  await startDemo();
  return <DemoBar />;
}

void demoBar().then((bar) => {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {bar}
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
});
