import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const MODULES_PUBLIC_DIR = path.resolve(process.cwd(), "public", "assets", "modules");
const MODULES_MANIFEST_URL = "/assets/modules/module-manifest.json";

interface ModuleAssetManifestEntry {
  category: string;
  fileName: string;
  moduleRef: string;
  size: number;
  updatedAt: number;
}

function toPublicPath(value: string): string {
  return value.split(path.sep).join("/");
}

function readModuleAssetManifest(): { modules: ModuleAssetManifestEntry[] } {
  const modules: ModuleAssetManifestEntry[] = [];

  function walk(directory: string) {
    if (!fs.existsSync(directory)) {
      return;
    }

    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.toLocaleLowerCase("pl-PL").endsWith(".svg")) {
        continue;
      }

      const stats = fs.statSync(fullPath);
      const relativePath = toPublicPath(path.relative(MODULES_PUBLIC_DIR, fullPath));
      const segments = relativePath.split("/");
      const fileName = segments[segments.length - 1] ?? entry.name;
      const category = segments.length > 1 ? segments[segments.length - 2] ?? "" : "";

      modules.push({
        category,
        fileName,
        moduleRef: relativePath,
        size: stats.size,
        updatedAt: stats.mtimeMs,
      });
    }
  }

  walk(MODULES_PUBLIC_DIR);

  modules.sort((a, b) => a.moduleRef.localeCompare(b.moduleRef, "pl"));
  return { modules };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "dinboard-module-asset-manifest",
      configureServer(server) {
        server.middlewares.use(MODULES_MANIFEST_URL, (_req, res) => {
          const payload = JSON.stringify(readModuleAssetManifest());
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(payload);
        });
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "assets/modules/module-manifest.json",
          source: JSON.stringify(readModuleAssetManifest(), null, 2),
        });
      },
    },
  ],
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
