import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { defineConfig } from "vite";

// Library build: emits dist/index.js (ESM), dist/index.d.ts, dist/genui.css.
// React is a peer dependency, externalized from the bundle.
export default defineConfig({
  plugins: [
    react(),
    dts({ include: ["src"], rollupTypes: true, tsconfigPath: "./tsconfig.json" }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "genui",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
    sourcemap: true,
  },
});
