import { request } from "./client";
import { isApiError } from "./errors";
import type { LoginRequest, Me, RegisterRequest, UpdateMeRequest } from "./types";

export const authApi = {
  login: (body: LoginRequest) => request<Me>("/api/auth/login", { method: "POST", json: body }),
  register: (body: RegisterRequest) => request<Me>("/api/auth/register", { method: "POST", json: body }),
  logout: () => request<undefined>("/api/auth/logout", { method: "POST" }),
  /** null means "signed out", which is a normal state, not an error. */
  me: async (): Promise<Me | null> => {
    try {
      return await request<Me>("/api/me");
    } catch (e) {
      if (isApiError(e) && e.status === 401) return null;
      throw e;
    }
  },
  updateMe: (body: UpdateMeRequest) => request<Me>("/api/me", { method: "PATCH", json: body }),
};
