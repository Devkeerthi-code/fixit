import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BootScreen, WAKING_TITLE, WakingNotice } from "../components/layout/Waking";
import { SLOW_AFTER_MS, TIMEOUT_MS, request } from "./client";
import { TIMEOUT_MESSAGE } from "./errors";
import { waking } from "./waking";

/** A fetch that answers only when the test says so, or never; it honours AbortSignal like the real one. */
function controllableFetch() {
  let answer: (r: Response) => void = () => undefined;
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      answer = resolve;
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }),
  );
  return { fetchMock, answer: (r: Response) => answer(r) };
}

describe("Render cold start", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the calm waking notice once a request passes 4 seconds, and hides it when it answers", async () => {
    const { fetchMock, answer } = controllableFetch();
    vi.stubGlobal("fetch", fetchMock);
    render(<WakingNotice />);

    const pending = request<{ id: number }>("/api/me");
    await act(() => vi.advanceTimersByTimeAsync(SLOW_AFTER_MS - 100));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(waking.isWaking()).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent(WAKING_TITLE);
    expect(screen.getByRole("status")).toHaveTextContent("This takes up to a minute after a quiet spell.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await act(async () => {
      answer(new Response(JSON.stringify({ id: 7 }), { status: 200 }));
      await pending;
    });
    expect(waking.isWaking()).toBe(false);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps waiting through a 60 second wake-up instead of failing", async () => {
    const { fetchMock, answer } = controllableFetch();
    vi.stubGlobal("fetch", fetchMock);
    const pending = request<{ ok: boolean }>("/api/auth/csrf");
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(waking.isWaking()).toBe(true);
    answer(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(pending).resolves.toEqual({ ok: true });
  });

  it("gives up after 70 seconds with a retryable timeout error", async () => {
    const { fetchMock } = controllableFetch();
    vi.stubGlobal("fetch", fetchMock);
    const pending = request("/api/me").catch((e: unknown) => e);
    await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_MS + 10));
    await expect(pending).resolves.toMatchObject({ code: "TIMEOUT", message: TIMEOUT_MESSAGE });
    expect(waking.isWaking()).toBe(false);
  });

  it("explains the wait on the boot screen", async () => {
    const { fetchMock } = controllableFetch();
    vi.stubGlobal("fetch", fetchMock);
    render(<BootScreen />);
    void request("/api/me").catch(() => undefined);
    expect(screen.queryByText(WAKING_TITLE)).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(SLOW_AFTER_MS + 1));
    expect(screen.getByText(WAKING_TITLE)).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_MS));
  });
});
