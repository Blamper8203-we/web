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


import "./lib/i18n/config";
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
  {
    routes,
    basename: "/",
    // WHY: opt-in do flag v7 wyłącza deprecation warnings w v6.30 i wczesniej
    // włącza zachowanie, które i tak stanie się domyślne w v7. v7_startTransition
    // owija aktualizacje stanu w React.startTransition; v7_relativeSplatPath
    // zmienia rozwiązywanie relatywnych ścieżek w splat-routes. Oba są no-op
    // dla obecnego zestawu tras (brak splat routes, brak zależności od starej
    // semantyki), ale wyciszają warning storm w testach i przygotowują grunt
    // pod upgrade. vite-react-ssg przekazuje ten obiekt do createBrowserRouter
    // oraz (dla v7_startTransition) do <RouterProvider>.
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  },
);
