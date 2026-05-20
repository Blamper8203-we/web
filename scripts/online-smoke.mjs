import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const HOST = "127.0.0.1";
const PORT = Number(process.env.DINBOARD_SMOKE_PORT || 4173);
const BASE_URL = `http://${HOST}:${PORT}`;
const DIST_DIR = join(process.cwd(), "dist");
const REQUEST_TIMEOUT_MS = 5_000;

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

function isInsideDist(path) {
  const normalizedDist = normalize(DIST_DIR);
  const normalizedPath = normalize(path);
  return normalizedPath === normalizedDist || normalizedPath.startsWith(`${normalizedDist}\\`);
}

async function serveFile(response, filePath) {
  const content = await readFile(filePath);
  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES.get(extname(filePath)) ?? "application/octet-stream",
  });
  response.end(content);
}

function createStaticSpaServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", BASE_URL);
      const pathname = decodeURIComponent(url.pathname);
      const requestedPath = pathname === "/" ? "/index.html" : pathname;
      const filePath = join(DIST_DIR, requestedPath);

      if (isInsideDist(filePath) && existsSync(filePath)) {
        await serveFile(response, filePath);
        return;
      }

      await serveFile(response, join(DIST_DIR, "index.html"));
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "Unknown smoke server error");
    }
  });
}

async function fetchWithTimeout(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      redirect: "manual",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function expectHtmlRoute(path) {
  const response = await fetchWithTimeout(path);
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text.includes('<div id="root"></div>')) {
    throw new Error(`${path} did not return the SPA shell`);
  }
}

async function expectManifest() {
  const response = await fetchWithTimeout("/manifest.webmanifest");
  if (!response.ok) {
    throw new Error(`/manifest.webmanifest returned HTTP ${response.status}`);
  }

  const manifest = await response.json();
  if (manifest.start_url !== "/app" || manifest.display !== "standalone") {
    throw new Error("Manifest does not expose the expected online app metadata");
  }
}

if (!existsSync(join(DIST_DIR, "index.html"))) {
  throw new Error("Missing dist/index.html. Run npm run build before smoke:online.");
}

const server = createStaticSpaServer();

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, resolve);
  });

  await expectHtmlRoute("/");
  await expectHtmlRoute("/app");
  await expectHtmlRoute("/app/deep-link-smoke");
  await expectManifest();
  console.log("Online smoke passed");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
