import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../app/App";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { DemoBar } from "./DemoBar";
import { resetDb } from "./db";
import { demoHandlers } from "./start";

function renderDemo() {
  return renderWithProviders(
    <>
      <DemoBar />
      <App />
    </>,
    { route: "/signin" },
  );
}

beforeEach(() => {
  localStorage.clear();
  resetDb();
  server.use(...demoHandlers);
});

describe("demo bar", () => {
  it("says the data is sample data", async () => {
    renderDemo();
    expect(await screen.findByText(/with sample data, saved only in this browser/)).toBeInTheDocument();
  });

  it("switches the whole app to the chosen role in one tap", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.click(await screen.findByRole("button", { name: "Warden" }));
    expect(await screen.findByRole("heading", { level: 1, name: "How things are going." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Warden" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Resident" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Your hostel, looked after." })).toBeInTheDocument();
  });

  it("reset signs out and restores the sample data", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.click(await screen.findByRole("button", { name: "Staff" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Ravi\./ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(await screen.findByRole("button", { name: "Staff" })).toHaveAttribute("aria-pressed", "false");
  });
});
