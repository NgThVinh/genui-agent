import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Local demo / dev harness. Imports the SDK from source (../src) and proxies the
// AG-UI endpoints to the FastAPI backend on :8000. Not published.
export default defineConfig({
  root: "playground",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/agent": "http://localhost:8000",
      "/config": "http://localhost:8000",
    },
  },
  build: {
    outDir: "../dist-playground",
    emptyOutDir: true,
  },
});
