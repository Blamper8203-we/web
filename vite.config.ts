import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill for @react-pdf/renderer in browser environment
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@react-pdf/renderer'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("pixi.js") || id.includes("@pixi")) {
            return "pixi";
          }

          if (id.includes("dompurify")) {
            return "svg-import";
          }

          if (
            id.includes("react")
            || id.includes("scheduler")
            || id.includes("react-reconciler")
            || id.includes("its-fine")
          ) {
            return "react-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
