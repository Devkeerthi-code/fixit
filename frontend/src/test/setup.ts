import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { afterAll, afterEach, beforeAll } from "vitest";
import { waking } from "../api/waking";
import { toasts } from "../lib/toast";
import { server } from "./server";

// jsdom gaps the app relies on in real browsers
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}
Element.prototype.scrollIntoView = function scrollIntoView() {};
if (!URL.createObjectURL) URL.createObjectURL = () => "blob:test";
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => undefined;

/*
  jsdom's FormData and Blob can't be serialised by Node's fetch, so multipart bodies would arrive empty.
  Use Node's own classes (FormData is taken from a parsed urlencoded body, the only public way to reach it).
*/
const NodeFormData = (await new Request("http://localhost/", { method: "POST", body: "a=1", headers: { "Content-Type": "application/x-www-form-urlencoded" } }).formData()).constructor;
Object.assign(globalThis, { Blob: NodeBlob, File: NodeFile, FormData: NodeFormData });

/*
  jsdom's AbortSignal is not the one Node's fetch accepts. Bridge it: forward the abort ourselves and
  pass the request on without the foreign signal. Test-only; browsers have one AbortSignal.
*/
function bridgeAbortSignal() {
  const inner = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (!init?.signal) return inner(input, init);
    const { signal, ...rest } = init;
    return new Promise<Response>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      inner(input, rest).then(resolve, reject);
    });
  }) as typeof fetch;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  bridgeAbortSignal();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  toasts.clear();
  waking.reset();
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
});
afterAll(() => server.close());
