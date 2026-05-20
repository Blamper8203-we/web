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
          const normalizedId = id.replaceAll("\\", "/");
          const nodeModulesMarker = "/node_modules/";
          const markerIndex = normalizedId.indexOf(nodeModulesMarker);
          if (markerIndex === -1) {
            return;
          }

          const packagePath = normalizedId.slice(markerIndex + nodeModulesMarker.length);
          const packageSegments = packagePath.split("/");
          const packageName = packageSegments[0]?.startsWith("@")
            ? `${packageSegments[0]}/${packageSegments[1]}`
            : packageSegments[0];
          if (!packageName) {
            return;
          }

          const toChunkName = (prefix: string, name: string) =>
            `${prefix}-${name.replace("@", "").replace("/", "-")}`;

          if (packageName === "react" || packageName === "react-dom" || packageName === "scheduler") {
            return "react-core";
          }

          if (packageName === "pixi.js" || packageName.startsWith("@pixi/")) {
            return toChunkName("pixi", packageName);
          }

          const pdfEnginePackages = [
            "@react-pdf/pdfkit",
            "fontkit",
            "linebreak",
            "png-js",
            "jpeg-exif",
            "brotli",
            "unicode-properties",
            "bidi-js",
            "hyphen",
          ];
          if (packageName.startsWith("@react-pdf/") || pdfEnginePackages.includes(packageName)) {
            return toChunkName("pdf", packageName);
          }

          return;
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
