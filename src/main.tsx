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


import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./App";
import { registerGlobalRuntimeDiagnostics, reportRuntimeError } from "./lib/runtimeDiagnostics";
import mobileDragDropPkg from "mobile-drag-drop";
const { polyfill } = mobileDragDropPkg;
import mobileDragDropScrollPkg from "mobile-drag-drop/scroll-behaviour";
const scrollBehaviourDragImageTranslateOverride = mobileDragDropScrollPkg.scrollBehaviourDragImageTranslateOverride || (mobileDragDropScrollPkg as any).default?.scrollBehaviourDragImageTranslateOverride || mobileDragDropScrollPkg;

if (typeof window !== "undefined") {
  if (typeof polyfill === "function") {
    polyfill({
      dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride as any
    });
  }
}

function registerVitePreloadErrorRecovery() {
  if (typeof window !== "undefined") {
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
}

if (typeof window !== "undefined") {
  registerGlobalRuntimeDiagnostics();
  registerVitePreloadErrorRecovery();
}

export const createRoot = ViteReactSSG(
  { routes, basename: "/" }
);
