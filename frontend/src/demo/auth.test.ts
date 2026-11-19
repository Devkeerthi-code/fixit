import { beforeEach, describe, expect, it } from "vitest";
import { authApi } from "../api/auth";
import { isApiError } from "../api/errors";
import { server } from "../test/server";
import { getDb, resetDb } from "./db";
import { demoHandlers } from "./start";

beforeEach(() => {
  localStorage.clear();
  resetDb();
  server.use(...demoHandlers);
});

const fail = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => (isApiError(e) ? e : null));

describe("demo accounts", () => {
  it("signs up a new person with no hostel yet, so onboarding starts", async () => {
    const me = await authApi.register({ name: "Priya S", email: "priya@example.test", password: "long-enough-1" });
    expect(me).toMatchObject({ name: "Priya S", role: "RESIDENT", hostel: null });
    expect(await authApi.me()).toMatchObject({ email: "priya@example.test" });
  });

  it("refuses an email that's already used, in any case", async () => {
    const e = await fail(authApi.register({ name: "Copy", email: "ASHA@example.test", password: "long-enough-1" }));
    expect(e?.code).toBe("EMAIL_TAKEN");
  });

  it("checks the password for accounts made in the demo", async () => {
    await authApi.register({ name: "Priya S", email: "priya@example.test", password: "long-enough-1" });
    await authApi.logout();
    expect((await fail(authApi.login({ email: "priya@example.test", password: "wrong" })))?.code).toBe("BAD_CREDENTIALS");
    await expect(authApi.login({ email: "priya@example.test", password: "long-enough-1" })).resolves.toMatchObject({ name: "Priya S" });
  });

  it("lets anyone sign in as a sample person, which have no stored password", async () => {
    expect(getDb().users.every((u) => u.password === null)).toBe(true);
    await expect(authApi.login({ email: "meera@example.test", password: "anything" })).resolves.toMatchObject({ role: "WARDEN" });
  });

  it("signs out", async () => {
    await authApi.login({ email: "asha@example.test", password: "x" });
    await authApi.logout();
    expect(await authApi.me()).toBeNull();
  });

  it("updates the profile name and room", async () => {
    await authApi.login({ email: "asha@example.test", password: "x" });
    const me = await authApi.updateMe({ name: "Asha V", roomId: 105 });
    expect(me).toMatchObject({ name: "Asha V", room: { label: "A-105" } });
  });
});
