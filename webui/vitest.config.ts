import { defineConfig } from "vitest/config";

// Unit tests run headless (store/transport/bridge logic) — no React plugin needed,
// which also avoids dual-vite type clashes.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
