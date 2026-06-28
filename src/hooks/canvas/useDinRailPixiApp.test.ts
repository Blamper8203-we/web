/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from "vitest";

// WHY: Pins the 2026-06-28 Pixi.js removal. The Pixi label renderer was
// permanently disabled via `shouldRenderPixiLabels = false` (the flag was
// never `true` in git history), yet `pixi.js` and `@pixi/react` were
// top-level imported by `useDinRailPixiApp`, contributing ~200-400 KB gzipped
// to every web build (PWA, mobile, Tauri) for code that could never run.
//
// If a future agent re-introduces Pixi for the DIN rail canvas, this test
// will fail loudly so the trade-off (bundle size vs. GPU labels) is
// intentional rather than silent.

import useDinRailPixiAppSource from "./useDinRailPixiApp.ts?raw";
import dinRailCanvasPixiSource from "../../components/DinRailCanvasPixi.tsx?raw";
import dinRailCanvasViewportSource from "../../components/DinRailCanvasViewport.tsx?raw";
import constantsSource from "../../lib/dinRailCanvas/constants.ts?raw";

describe("Pixi.js removal regression guard", () => {
  it("useDinRailPixiApp hook is a no-op stub (no top-level pixi.js import)", () => {
    // The hook file may not contain `import` statements for pixi.
    expect(useDinRailPixiAppSource).not.toMatch(/from\s+["']pixi\.js["']/);
    expect(useDinRailPixiAppSource).not.toMatch(/from\s+["']@pixi\//);
    // It must not export a working `useDinRailPixiApp` function anymore.
    expect(useDinRailPixiAppSource).not.toMatch(/export\s+function\s+useDinRailPixiApp\b/);
  });

  it("DinRailCanvasPixi does not invoke the Pixi hook or import pixi.js", () => {
    expect(dinRailCanvasPixiSource).not.toMatch(/useDinRailPixiApp\s*\(/);
    expect(dinRailCanvasPixiSource).not.toMatch(/from\s+["']pixi\.js["']/);
    expect(dinRailCanvasPixiSource).not.toMatch(/from\s+["']@pixi\//);
    // The feature flag must not exist (it was permanently false; we removed it).
    expect(dinRailCanvasPixiSource).not.toMatch(/shouldRenderPixiLabels\s*=/);
  });

  it("DinRailCanvasViewport no longer accepts pixiHostRef or shouldRenderPixiLabels", () => {
    // Match prop-declaration/usage patterns, not doc-comment strings.
    expect(dinRailCanvasViewportSource).not.toMatch(/^\s*pixiHostRef\s*[:?=]/m);
    expect(dinRailCanvasViewportSource).not.toMatch(/^\s*shouldRenderPixiLabels\s*[:?=]/m);
  });

  it("constants.ts does not export PIXI_MAX_RESOLUTION or PIXI_LABEL_SYMBOL_LIMIT", () => {
    expect(constantsSource).not.toMatch(/export\s+const\s+PIXI_MAX_RESOLUTION\b/);
    expect(constantsSource).not.toMatch(/export\s+const\s+PIXI_LABEL_SYMBOL_LIMIT\b/);
  });
});