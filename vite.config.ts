import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
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
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-192.png", "dinboard.svg"],
      manifest: {
        name: "DINBoard Web",
        short_name: "DINBoard",
        description:
          "Profesjonalna aplikacja dla elektryków do projektowania rozdzielnic, obwodów i dokumentacji PDF.",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-override", "standalone"],
        background_color: "#0e0f11",
        theme_color: "#111214",
        lang: "pl",
        icons: [
          {
            src: "/favicon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
        runtimeCaching: [
          {
            urlPattern: /^\/assets\/modules\/.*\.svg$/,
            handler: "CacheFirst",
            options: {
              cacheName: "din-module-svgs",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^\/assets\/modules\/module-manifest\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "din-module-manifest",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
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
