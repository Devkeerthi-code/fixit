import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  // The backend reads PORT from the repo-root .env, so the dev proxy follows the same value.
  const rootEnv = loadEnv(mode, "..", "");
  const apiPort = rootEnv.PORT ?? "8080";

  return {
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        "/api": { target: `http://localhost:${apiPort}`, changeOrigin: false },
      },
    },
    build: {
      target: "es2020",
      cssCodeSplit: true,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      restoreMocks: true,
      testTimeout: 15_000,
      environmentOptions: { jsdom: { url: "http://localhost:5173/" } },
    },
  };
});
