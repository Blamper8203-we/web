# DINBoard Architecture Map

A pointer map for reins. This is the *layout* of the project, not the rules. The rules live in `AGENTS.md` and `.harness/docs/code-standards.md`.

## Stack

- TypeScript + React 19 + Vite 8 + Tauri 2 + Capacitor (Android/iOS).
- Pixi.js 8 for the DIN rail canvas; DOM/SVG for the schematic and module previews.
- `@react-pdf/renderer` for the PDF documentation.
- Vitest + jsdom + @testing-library/react for tests.
- Mobile drag: `mobile-drag-drop` polyfill.

## Top-level layout

```
src/
  App.tsx              # shell, sheet state, top-level wiring
  App.css              # global styles
  assets/              # static-ish resources used by UI
  components/          # React UI (35+ files: App*, DinRail*, Schematic*, Pdf*, dialogs)
  fixtures/            # test data and dev fixtures
  hooks/               # 25+ hooks (useProjectActions, useSymbolHistory, useDinRail*, useSchematic*, etc.)
  lib/                 # 12 subdirs + top-level files: domain logic
    circuitEdit/
    connections/
    dinRailCanvas/
    domain/
    editing/
    export/
    modules/
    phaseDistribution/
    routing/
    schematic/
    validation/
    circuitRows.ts
    dinRailSelection.ts
    dinRailSnap.ts
    measurementProtocols.ts
    projectFile.ts
    projectMetadata.ts
    undoRedoService.ts (if present)
  types/               # projectMetadata.ts, symbolItem.ts, circuitRow.ts, connectionItem.ts
src-tauri/             # Rust backend, capabilities, schemas
public/assets/modules/ # SVG module assets
docs/                  # one kept doc: MOBILE_RESPONSIVENESS_ANALYSIS.md
scripts/               # online-smoke.mjs
```

## Sheets

The app has 4 sheets, all driven from the same `symbols` + `metadata` state:

1. `sheet1` — DIN rail (Pixi canvas).
2. `sheet2` — Schematic (DOM/SVG).
3. `sheet3` — Circuit list + power balance.
4. `sheet4` — PDF documentation.

The state shape lives in `src/types/projectMetadata.ts` and `src/types/symbolItem.ts`. A change in the shape ripples through every sheet — coordinate with the appropriate expert.

## Reins × subsystems

| Rein | Subsystem |
|---|---|
| `electrical-expert` | `lib/phaseDistribution`, `lib/validation`, `lib/circuitRows.ts`, `lib/circuitEdit`, `lib/projectMetadata.ts`, `types/symbolItem.ts`, `types/circuitRow.ts` |
| `canvas-expert` | `components/DinRailCanvasPixi.tsx`, `components/Schematic*`, `lib/dinRailCanvas`, `lib/dinRailSelection`, `lib/dinRailSnap`, `lib/schematic`, `lib/modules`, `lib/connections`, `lib/export/dinRailSnapshotService.ts`, `public/assets/modules` |
| `pdf-expert` | `lib/export`, `components/Pdf*`, `components/MeasurementProtocols*`, `lib/measurementProtocols.ts` |
| `project-io-expert` | `lib/projectFile.ts`, `hooks/useProjectActions.ts`, `hooks/useSymbolHistory.ts`, `src-tauri/**`, `hooks/useDebouncedPersist.ts` |
| `developer` | cross-cutting, glue, build/CI, layer hygiene |
| `tester` | test discipline, coverage analysis, regression test design |
| `code-reviewer` | PR review, high-risk-area gate, layer-violation gate |

## Known tool quirk

- `package-lock.json` has a historical `@emnapi/wasi-threads@1.2.2` orphan (see AGENTS.md "Znane ograniczenia narzedziowe"). Not a bug; lives in lockfile only. Use `npm ci` for clean re-installs.

## Test counts (baseline 2026-06-07)

- 249 unit tests across 33 test files.
- `useSymbolActions.test.ts`: 25 tests.
- `useProjectActions.test.ts`: 28 tests.
- `useSymbolHistory.test.ts`: 11 tests.
- `undoRedoService`: 11 tests.

Don't let this number drop. New behaviour should add at least one focused test.
