import { Buffer } from "buffer";

type ProcessShim = {
  env: Record<string, string | undefined>;
};

type RuntimeGlobals = typeof globalThis & {
  Buffer?: typeof Buffer;
  process?: ProcessShim;
};

const runtimeGlobals = globalThis as RuntimeGlobals;
runtimeGlobals.Buffer = Buffer;
runtimeGlobals.process ??= { env: {} };

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { registerGlobalRuntimeDiagnostics, reportRuntimeError } from "./lib/runtimeDiagnostics";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";

polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});

function registerVitePreloadErrorRecovery() {
  window.addEventListener("vite:preloadError", (event: Event) => {
    const preloadEvent = event as Event & { payload?: unknown; preventDefault: () => void };
    reportRuntimeError(preloadEvent.payload ?? "vite:preloadError", {
      source: "unhandled-error",
    });
    preloadEvent.preventDefault();

    // Recover from stale chunk references after deploy by forcing a full reload.
    window.location.reload();
  });
}

registerGlobalRuntimeDiagnostics();
registerVitePreloadErrorRecovery();

import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
      {!isNative && <Analytics />}
      {!isNative && <SpeedInsights />}
    </AppErrorBoundary>
  </React.StrictMode>,
);
