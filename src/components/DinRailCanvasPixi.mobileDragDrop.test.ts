/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from "vitest";
// WHY: A previous regression added `if (window.innerWidth <= 768) return;` guards
// inside `onSurfacePointerDown`, `onSurfaceDrop`, and `onBeginDragForSymbol` in
// `DinRailCanvasPixi.tsx`. Those guards silently no-op'd the core "place a module
// on the rail" action on every phone (PWA mobile web and Capacitor iOS/Android).
// The fix was to remove them — `touch-action: none` in DinRailCanvas.css already
// resolves scroll conflicts. This test pins the absence of the guard so a future
// "while I'm here" refactor cannot silently re-introduce the mobile regression.

// WHY: Vite's `?raw` import reads the source file as a string at test time.
// Avoids node:fs / __dirname which aren't available in the jsdom test env.
import sourceCode from "./DinRailCanvasPixi.tsx?raw";

describe("DinRailCanvasPixi mobile drag-drop regression", () => {
  it("does not guard surface handlers behind a viewport-width early return", () => {
    // The historical regression: three `if (window.innerWidth <= 768) return;` lines
    // inside the inline handler closures passed to DinRailCanvasViewport. The regex
    // looks for the guard followed by a `return` within ~40 chars (the historical
    // pattern), and tolerates the explanatory // WHY: comment, which mentions the
    // literal string for documentation purposes.
    const guardPattern = /innerWidth\s*<=\s*768[\s\S]{0,40}return/g;
    const matches = sourceCode.match(guardPattern) ?? [];
    expect(matches).toEqual([]);
  });

  it("wires the drag-and-drop handlers directly to the hook callbacks (no inline viewport guard wrapper)", () => {
    expect(sourceCode).toMatch(/onSurfacePointerDown=\{handleSurfacePointerDown\}/);
    expect(sourceCode).toMatch(/onSurfaceDrop=\{handleDrop\}/);
    expect(sourceCode).toMatch(/onBeginDragForSymbol=\{\(symbolId\) =>/);
  });

  it("ships a // WHY: comment explaining why the mobile guard was removed", () => {
    expect(sourceCode).toMatch(/WHY:\s*Mobile drag-drop was previously blocked/);
  });
});
