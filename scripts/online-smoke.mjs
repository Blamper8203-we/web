import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

const HOST = "127.0.0.1";
const PORT = Number(process.env.DINBOARD_SMOKE_PORT || 4173);
const DIST_DIR = join(process.cwd(), "dist");
const REQUEST_TIMEOUT_MS = 5_000;
const REMOTE_BASE_URL = process.env.DINBOARD_SMOKE_BASE_URL?.replace(/\/$/, "");
const IS_REMOTE = Boolean(REMOTE_BASE_URL);
const BASE_URL = IS_REMOTE ? REMOTE_BASE_URL : `http://${HOST}:${PORT}`;
const REPORT_PATH = join(
  process.cwd(),
  "test-artifacts",
  IS_REMOTE ? "post-deploy-smoke" : "pre-deploy-smoke",
  "route-smoke.json",
);

const SPA_ROUTES = [
  "/",
  "/app",
  "/app/",
  "/non-existing-route",
];

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
  return normalizedPath === normalizedDist || normalizedPath.startsWith(`${normalizedDist}${sep}`);
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

async function probeHtmlRoute(path) {
  const response = await fetchWithTimeout(path);
  const text = await response.text();
  const containsRoot = text.includes('id="root"');

  return {
    route: `${BASE_URL}${path}`,
    path,
    status: response.status,
    containsRoot,
    ok: response.ok && containsRoot,
  };
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

async function runSpaRouteSmoke() {
  const results = [];

  for (const path of SPA_ROUTES) {
    const result = await probeHtmlRoute(path);
    results.push(result);

    if (!result.ok) {
      throw new Error(
        `${result.route} failed (status=${result.status}, containsRoot=${result.containsRoot})`,
      );
    }
  }

  await expectManifest();
  results.push({
    route: `${BASE_URL}/manifest.webmanifest`,
    path: "/manifest.webmanifest",
    status: 200,
    containsRoot: false,
    ok: true,
  });

  await mkdir(join(process.cwd(), "test-artifacts", IS_REMOTE ? "post-deploy-smoke" : "pre-deploy-smoke"), {
    recursive: true,
  });
  await writeFile(
    REPORT_PATH,
    `${JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        mode: IS_REMOTE ? "production" : "local-dist",
        results,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return results;
}

if (!IS_REMOTE && !existsSync(join(DIST_DIR, "index.html"))) {
  throw new Error("Missing dist/index.html. Run npm run build before smoke:online.");
}

let server;

try {
  if (!IS_REMOTE) {
    server = createStaticSpaServer();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(PORT, HOST, resolve);
    });
  }

  const results = await runSpaRouteSmoke();
  console.log(`Online smoke passed (${IS_REMOTE ? "production" : "local-dist"})`);
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Routes checked: ${results.filter((entry) => entry.path !== "/manifest.webmanifest").length}`);
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}
