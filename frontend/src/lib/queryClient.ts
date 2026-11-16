import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "../api/errors";

/** Retry only what a retry can fix: a flaky network or a 5xx. A timeout already waited 70s. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isApiError(error)) return failureCount < 1;
  if (error.code === "TIMEOUT") return false;
  return (error.code === "NETWORK" || error.status >= 500) && failureCount < 2;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
}

export const queryClient = makeQueryClient();
