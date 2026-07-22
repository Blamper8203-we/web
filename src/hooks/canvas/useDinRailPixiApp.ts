// WHY: Removed 2026-06-28 — canvas bundle-bloat cleanup (see AGENTS.md
// distribution rules). The Pixi.js mounting path was permanently disabled via
// `shouldRenderPixiLabels = false` in DinRailCanvas.tsx since creation
// (git history confirms the flag was never `true`). Pixi.js was top-level
// imported here and the hook was called every render, contributing
// ~200-400 KB gzipped to every web build (PWA, mobile, Tauri) for code that
// could never run. Designation labels are now rendered via the DOM-based
// DinRailDesignationLabelsOverlay.
//
// To re-enable Pixi in the future (e.g. hardware-accelerated panning of a very
// large rail), restore this file from git history, re-add `pixi.js` and
// `@pixi/react` to package.json, and flip the feature flag in
// DinRailCanvas.tsx.

export {};