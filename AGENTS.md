# AGENTS.md

This file is the **first thing any AI agent (or human) should read** before touching this codebase. It exists because DINBoard is engineering software, not a demo, and silent changes have real-world consequences in distribution-board projects.

The detailed rules per role live in `.harness/reins/<role>/agent.md`. The project-wide standards live in `.harness/docs/code-standards.md` and `.harness/docs/test-policy.md`. The layout map lives in `.harness/docs/architecture-map.md`. The team-orchestrator description lives in `.harness/agent.md`. **This file points at all of those and adds the things only an outside agent would otherwise miss.**

---

## What this project is

DINBoard Web — a desktop/mobile/PWA tool for electricians to design distribution boards (rozdzielnice), wire circuits, balance phases, validate the project, and generate the as-built PDF documentation required by PN-HD 60364. Built in TypeScript + React 19 + Vite 8, packaged with Tauri 2 (desktop) and Capacitor (iOS/Android). One main app state (`symbols` + `metadata`) is rendered in 4 sheets: DIN rail, schematic, circuit list, PDF documentation.

**Solo developer**, electrical-engineer by trade, not a TypeScript native. Decisions lean toward concrete engineering correctness over architectural elegance. When in doubt, ask the developer before changing a high-risk subsystem — they will tell you what the right answer is for the user, not for the code.

---

## Distribution target and audience

DINBoard is being prepared for **public distribution** to other electricians (not only the developer's own practice). This changes priorities — what was nice-to-have for a personal tool becomes mandatory before v1.0 release.

**Full plan:** [`docs/distribution-roadmap.md`](docs/distribution-roadmap.md) (read it before touching any user-facing feature).

**Hard rules for any rein touching DINBoard:**

1. **Audience test** — Would an electrician who has never seen this code understand the feature without explanation? If no, simplify or add contextual help. **The developer knows the code; customers do not.**

2. **Empty state test** — Does every feature have a sensible message when the project is empty / data is missing? An empty canvas must not look like a crash.

3. **Cross-platform test** — Does the change pass the compatibility matrix in `docs/distribution-roadmap.md`? Web (PWA), Desktop (Tauri), and Mobile (Capacitor) must all open the same `.dinboard` file with identical results.

4. **Schema migration safety** — Any change to `src/lib/projectFile.ts`, `src/types/symbolItem.ts`, or related persistence must include a backward-compatible migration path. Round-trip test required for every format change.

5. **Test count stability** — Test count must never decrease. New features must add tests. Baseline: 249 unit tests across 33 files (2026-06-07).

6. **Friendly errors only** — No stack traces in the user UI. Every error must have a message in domain language (Polish, electrical terms) and at least one recovery action ("Unlock project", "Undo last change", "Restart session").

7. **No silent regressions** — If the change affects a high-risk area listed in AGENTS.md below, the diff must include: current behaviour, why it's risky, the impact on real engineering decisions, and a test that pins the new behaviour.

When in doubt about a distribution decision: read `docs/distribution-roadmap.md` first, then ask the developer before implementing.

---

## Stack and commands

- Test: `npm.cmd run test` (Vitest, jsdom). Targeted: `npm.cmd run test -- <path>`.
- Lint: `npm.cmd run lint`. Auto-fix: `npm.cmd run lint:fix`.
- Build: `npm.cmd run build` (tsc + Vite).
- Pre-merge gate: `npm.cmd run check` (= build + test).
- Online smoke: `npm.cmd run smoke:production` (after `check`).
- Dev: `npm.cmd run dev` (Vite). Host: `npm.cmd run dev:host`.
- Preview built bundle: `npm.cmd run preview`.
- Node ≥ 22.12.0. Use PowerShell syntax on Windows (no `&&`, no Unix `ls` flags).

---

## Layer discipline (MVVM-ish, hard rule)

| Layer | Folder | May compute | May render | May persist |
|---|---|---|---|---|
| UI | `src/components/**` | — | yes | — |
| Orchestration | `src/hooks/**` | UI state flow, debounced persist | — | via lib, not direct |
| Domain | `src/lib/**` | everything (calc, validation, parse, export, geometry) | — | — |
| Contracts | `src/types/**` | types + normalizers | — | — |
| Desktop | `src-tauri/**` | OS integration | — | OS-level only |

**No domain logic in components.** A component that needs a domain result calls into `lib/`. `lib/` never imports from `components/`. `types/` never contains logic that computes things.

Files: one concern per file. `*.test.ts(x)` co-located with the file under test.

---

## High-risk areas (touch = PR must explain behaviour before/after + test)

If you change any of these, the diff must include: current behaviour, why it's risky, the impact on real engineering decisions, and a test that pins the new behaviour. Do not change silently.

**Electrical domain (delegate to `electrical-expert` rein if outside your scope):**
- `src/lib/phaseDistribution/**` — phase balance, L1/L2/L3 assignment
- `src/lib/validation/**` — validation thresholds and severity
- `src/lib/circuitRows.ts` — circuit-list rows feeding UI and PDF
- `src/lib/circuitEdit/**` — circuit-edit form logic
- `src/lib/projectMetadata.ts` — project metadata defaults
- `src/types/symbolItem.ts` — symbol data shape
- `src/types/circuitRow.ts` — circuit-row data shape

**Canvas / interactions (delegate to `canvas-expert`):**
- `src/components/DinRailCanvasPixi.tsx`
- `src/components/SmartHomeCanvas.tsx` — interactive CAD canvas, currently the largest component (37 KB), see §9 below
- `src/lib/dinRailSelection.ts`, `src/lib/dinRailSnap.ts`
- `src/lib/schematic/**` (includes `smartHomeCatalog.ts` and `cadSymbolParser.ts`)
- `src/lib/connections/**` (geometric aspects)
- `src/lib/dinRailCanvas/**`
- `src/lib/export/dinRailSnapshotService.ts`

**SVG module assets (delegate to `canvas-expert`):**
- `src/lib/modules/importedModuleCatalog.ts`
- `src/lib/modules/svgAsset.ts`
- `src/lib/modules/svgNormalization.ts`
- `src/lib/modules/rasterPreview.ts`
- `src/components/SvgImportDialog.tsx`
- `src/components/ModuleAssetPreview.tsx`
- `public/assets/modules/**` — never degrade original SVG quality; validate imports; keep `dangerouslySetInnerHTML` sanitised

**Project I/O (delegate to `project-io-expert`):**
- `src/lib/projectFile.ts`
- `src/hooks/useProjectActions.ts`
- `src/hooks/useSymbolHistory.ts`
- `src-tauri/**` — never silently change the file contract, never break backward compat, never drop data without migration, never change model field semantics. Round-trip test required for any format change.

**PDF export (delegate to `pdf-expert`):**
- `src/lib/export/**`
- `src/components/PdfDocumentationPage.tsx`
- `src/components/PdfPreviewWorkspace.tsx`
- `src/lib/measurementProtocols.ts` — PDF is the engineering deliverable; don't change report input data, order, sections, or UI↔PDF consistency without explicit request.

---

## Things that are NOT obvious and WILL trip you up

### 1. Three sources of truth for module assets

A module in DINBoard lives in **three places that must stay in sync**. Missing one is the #1 silent-failure mode of this codebase.

1. **The SVG file** at `public/assets/modules/<Category>/<filename>.svg`. This is the actual asset.
2. **The catalogue entry** in `src/lib/modules/moduleCatalog.ts` (the `currentModuleEntries` array — `moduleEntries` is **legacy, disabled by `INCLUDE_LEGACY_BUILT_IN_MODULES = false`**, do not add to it). Each entry is a `ModuleEntry` (templateId, code, label, type, category, deviceKind, phase, modules, moduleRef, etc.). `moduleRef` must equal the path under `public/assets/modules/`.
3. **The manifest** at `public/assets/modules/module-manifest.json` is **generated from disk by the Vite plugin** in `vite.config.ts` (`dinboard-module-asset-manifest`). It is rebuilt on every `npm run build` and on every dev-server request. You do NOT edit it by hand.

A fourth, hidden source: `src/lib/modules/moduleAssetDiscovery.ts` defines `FALLBACK_MODULE_ASSETS` — a hardcoded fallback used only if the manifest fetch fails. New modules don't need to be added there (it's just a safety net), but if you see a module that "exists in code but the manifest never gets it", check that the file is on disk under `public/assets/modules/`.

**Before adding a new module:** drop the SVG into `public/assets/modules/<Category>/`, then add the matching `ModuleEntry` to `currentModuleEntries` in `moduleCatalog.ts` with the correct `moduleRef` (= path under `public/assets/modules/`). Build runs once and the manifest regenerates. The PWA Service Worker cache (`vite.config.ts` `workbox.runtimeCaching` for `/assets/modules/*.svg`, `CacheFirst`, 30-day TTL) will hold the old SVG until the user clears site data or hard-reloads after a service-worker update — see "Known tool quirks" below.

### 2. The "Blok rozdzielczy" string-dispatch pattern (do not refactor without thinking)

`Blok rozdzielczy` is a category of terminal block (e.g. 4×7 pin, 4×15 pin). The codebase dispatches on it as a **string** in many places:

- `symbol.type === "Blok rozdzielczy"` (`moduleTerminals.ts:346`, `FerruleDistributionPolicy.test.ts`, `referenceDesignations.test.ts`, `geometry.test.ts`, `appHelpers.test.ts`, `schematicLayoutEngine.test.ts`, `circuitRows.test.ts`, `symbolItem.test.ts`, `useSvgTerminalsPreloader.ts:21`)
- `symbol.moduleRef.includes("blok rozdzielczy")` (`symbolItem.ts:406`, `moduleCatalog.ts:788,801`, `moduleTerminals.ts:74,119,346-388`, `paletteFormatting.ts:192`)
- `category === "Blok rozdzielczy"` in `moduleCatalog.ts:688` (group order)
- `// WHY:` comments in `moduleTerminals.ts:74,119,346-388` explain the "meet" scaling and wire-routing special cases (it never uses "none" scaling, it always routes wires for distribution)

This is intentional. Refactoring to a typed enum is a real PR, not a "while-I'm-here" change — talk to the user first. If you are adding a new special case for terminal blocks, mirror the existing pattern (string compare + comment), don't introduce a new dispatch mechanism.

The same string-dispatch pattern exists for `Listwy zaciskowe` and `Złącza` in `moduleCatalog.ts:764, 798-806` (height/scaling rules) and `moduleTerminals.ts`.

### 3. Files that are too big to read in one pass (container files)

These are working code, not junk drawers, but they mix concerns enough that an AI agent will lose context if it reads them sequentially. If you are touching one of them, read it in pieces (specific functions), not the whole file:

> **NOTE (2026-07):** Tabela odzwierciedla realne rozmiary po refaktorach z czerwca
> 2026. Wcześniejsza wersja AGENTS.md wymieniała m.in. `DinRailConnectionsCanvas.tsx`
> (94 KB), `MeasurementProtocolsWorkspacePage.tsx` (53 KB), `schematicLayoutEngine.ts`
> (34 KB), `moduleTerminals.ts` (33 KB), `App.tsx` (29 KB) — te pliki zostały rozbite
> (odpowiednio do ~18/12/1.2/3.4/10 KB). Jeśli rozmiar tu nie zgadza się z Twoim
> `wc -l`, uruchom `node -e "console.log(require('fs').readFileSync('PATH','utf8').split('\\n').length)"`.

| File | Size | Concerns mixed |
|---|---|---|
| `src/components/SmartHomeCanvas.tsx` | 37 KB | interactive CAD canvas + viewport/pan-zoom + snapping engine + catalog dispatch + connection geometry — see §9 below |
| `src/lib/export/dinRailSvgRenderer.ts` | 29 KB | DIN-rail → SVG snapshot rendering + layout + label wrapping |
| `src/lib/export/dinRailSnapshotService.ts` | 29 KB | snapshot composition for PDF/PNG export |
| `src/components/PdfDocumentationPage.tsx` | 25 KB | PDF workspace UI + export orchestration |
| `src/lib/export/pdfPages/pdfStyles.ts` | 23 KB | @react-pdf style objects + layout constants |
| `src/lib/circuitEdit/circuitEditFieldDefinitions.ts` | 21 KB | circuit-edit form field schema + validation |
| `src/components/AppWorkspace.tsx` | 20 KB | workspace shell + state wiring + sheet composition |
| `src/lib/schematic/schematicGraphBuilder.ts` | 20 KB | schematic topology graph + node/edge resolution |
| `src/lib/phaseDistribution/phaseDistributionCalculator.ts` | 19 KB | phase balance + L1/L2/L3 assignment (HIGH-RISK electrical domain) |
| `src/lib/schematic/cadSymbolParser.ts` | 19 KB | CAD SVG → blocks parser + terminal extraction + theme color rewrite (shared with SmartHome) |
| `src/hooks/connections/useConnectionsMutations.ts` | 19 KB | connection CRUD + undo/redo commands |
| `src/components/ValidationPanel.tsx` | 18 KB | validation results UI + quick-fix actions |
| `src/components/SvgImportDialog.tsx` | 18 KB | SVG import flow + preview + sanitization |

Splitting these is a real refactor project, not a side effect. Each one needs a `// WHY:` review of every section before moving it.

### 4. PWA Service Worker cache will eat your changes

`vite.config.ts` uses `VitePWA` with `registerType: "autoUpdate"` and `workbox.runtimeCaching`:

- `/assets/modules/*.svg` → **CacheFirst**, 30-day TTL, 200 entries (`din-module-svgs`).
- `/assets/modules/module-manifest.json` → **NetworkFirst**, 1 entry, 24h TTL.

If a user says "I rebuilt and the new module still doesn't appear in the palette", it is almost always the SW cache, not a code bug. The user has to: DevTools → Application → Service Workers → Unregister, then Application → Storage → Clear site data, then hard-reload (`Ctrl+Shift+R`). The auto-update only kicks in on a reload after the new SW installs, and only if no old client is still controlling the page.

Don't add new `runtimeCaching` rules casually. They will surprise the user.

### 5. Native-only code paths via `import.meta.env.DEV` / `isNativePlatform()`

- `moduleCatalog.ts:827` (`getModuleAssetUrl`) has a Windows+Vite-dev-server-specific workaround: in dev, `%2B` is decoded back to `+` because Vite's filesystem on Windows fails to find files with `+` if they are percent-encoded. This is a real fix, not dead code.
- `App.tsx`, `moduleCatalog.ts:824-829`, and `useProjectActions.ts` branch on `y.isNativePlatform()` (Capacitor) for haptics, storage, and the preferences plugin. Wrap Capacitor calls in try/catch — the web build runs the same code without Capacitor.

### 6. The label-normaliser in `symbolItem.ts:406-408`

A late-stage label rewrite for terminal-block symbols that were created with the wrong label. If you add a new terminal-block label format, add it to the list there too — otherwise the new label will be silently rewritten to "Blok rozdzielczy" downstream.

### 7. Build is built on Windows with PowerShell

Path separators, BOM, CP936 vs UTF-8, and the Windows-only `mavis-trash` deletion all matter here. Never use `Get-Content | Set-Content` pipelines to edit files — use the Read/Write/Edit tools, which are UTF-8 safe. If you must pipe, pass `-Encoding UTF8` and remember PowerShell 5.1's `-Encoding UTF8` adds a BOM.

### 8. Lockfile discipline: `.nvmrc` is the source of truth, lockfile regeneration is the last resort

`.nvmrc` pins the Node version that CI uses. npm 10 (bundled with Node 22) and npm 11 (bundled with Node 24) generate **incompatible lockfiles** for the same `package.json` — different hoisting and peer-dep resolution. A lockfile made by npm 11 fails `npm ci` validation under npm 10, and vice versa. Local Node **must match `.nvmrc`**.

- If `npm ci` fails on CI with hoisting / peer-dep errors, **check the Node version before regenerating the lockfile**. `EBADENGINE` warnings about `node<24` are the same root cause.
- **Never** `rm package-lock.json && npm install` to "fix" a lockfile problem — you lose OS-to-OS binding consistency (Windows dev ≠ Linux CI) and create new drift. Use `nvm-windows` to switch Node, not the lockfile.
- Regenerating the lockfile is a real change; it needs a real cause in the change history. "I deleted it to debug" is not a cause.

Lesson from 2026-06-21: bumping `.nvmrc` from `22.12.0` to `24.12.0` resolved 3 separate "broken" lockfile states that all had the same root cause.

### 9. SmartHome feature is hidden, partly-built, and undocumented until 2026-07

SmartHome (an interactive CAD-style canvas for designing smart-home installations, distinct from the DIN-rail editor) is **fully wired into the codebase but not reachable from the UI**. It is the single largest production file (`SmartHomeCanvas.tsx`, 37 KB) and has several traps that are not obvious from the code alone.

**The sheet tab is intentionally filtered out.** `AppSheetTabs.tsx:36-38` registers the `sheet5_smarthome` tab, then `visibleTabs` filters it out unconditionally ("na życzenie użytkownika"). The only way to reach the sheet is programmatically (`sheetPanel.setActiveSheet("sheet5_smarthome")`). **Do not assume SmartHome is reachable from the tab bar** — and do not "fix" the filter without asking the developer; it is deliberate.

**MVVM layer violation: domain logic lives in the component.** `SmartHomeCanvas.tsx` holds computation that AGENTS.md §"Layer discipline" places in `src/lib/**`:
- `getSnappedPos` (line 282) — the snapping engine (object-snap to nearest terminal within 30 px, ortho-mode axis lock, grid snap to `GRID_STEP`). This is the same kind of snapping the generic codebase keeps in `src/lib/schematic/schematicSnapService.ts` and `src/lib/dinRailSnap.ts`.
- `screenToWorld` / `worldToScreen` (line 195) and `zoomAtPoint` (line 214) — viewport coordinate transforms.
- `handleDrop` (line 542) — catalog lookup (`CAD_SYMBOL_CATALOG.find(...)`) + `fetchAndParseCadSymbol(...)` + bounding-box layout + grid snap + mapping blocks to `SmartHomeSymbol[]`, all inside an event handler.
- Group-drag geometry in `handlePointerMove` — snaps the primary symbol's first terminal to grid, then derives the group delta.

This is a known candidate for extraction to a new `src/lib/smartHome/` folder (snap engine → `smartHomeSnap.ts`, viewport math → `smartHomeViewport.ts`, drop/layout → `smartHomeLayout.ts`). **That is a real refactor PR, not a "while-I'm-here" change** — talk to the developer first. Until then, if you must touch snapping/geometry in SmartHomeCanvas, keep the computation local and add a `// WHY:` comment.

**Coupling constant split between lib and component.** `cadSymbolParser.ts:7` hardcodes `WORLD_GRID_STEP = 20` with a comment that it must match `SmartHomeCanvas.GRID_STEP` (`SmartHomeCanvas.tsx:60`). These are two definitions of the same magic number in two different layers. Changing one without the other silently breaks grid alignment. If you touch either, update both and grep the other.

**No persistence.** Unlike DIN-rail symbols (persisted via `useAppPersistence`), `smartHomeSymbols` / `smartHomeConnections` live in `AppWorkspace.tsx:118-119` as local `useState` — **in-memory only, reset on reload.** Do not assume SmartHome state survives a refresh, and do not wire it into `useAppPersistence` without a schema migration (see §4 / Project I/O contracts).

**No tests for the SmartHome-specific code.** There are zero `*SmartHome*.test.*` or `*smart-home*.test.*` files. `cadSymbolParser.ts` (the shared parser) has a co-located test, but the canvas, the catalog, the snap engine, and the connection geometry are untested. If you change behavior in `SmartHomeCanvas.tsx`, **add the first test** — do not rely on existing coverage.

**String-dispatch `"Smart Home"` — same pattern as "Blok rozdzielczy" (§2).** The category string `"Smart Home"` is dispatched on as a raw string across 4 files; the sheet id `"sheet5_smarthome"` across 5. Mirror the existing pattern (string compare + comment), do not introduce a typed enum "while you're here":
- `referenceDesignations.ts:13` — `template.category === "Smart Home"` → prefix `"HOME"`
- `paletteFormatting.ts:179` — palette formatting branch
- `builtinModules.ts:391-392, 396, 428` — `ModuleEntry` type/category + `moduleRef` + `groupOrder`
- `AppLeftPanel.tsx:60, 65, 71, 140, 142` — palette filtering + sparkles/"Nowe" badge
- Sheet id `"sheet5_smarthome"`: `AppWorkspaceCanvas.tsx:233`, `AppSheetTabs.tsx:25,36`, `AppLeftPanel.tsx:62, 85, 114, 135, 227`, `MainWorkspace.tsx:127`, `appHelpers.ts` (`SheetType` union)

**Two parallel catalog definitions for the AMPIO module.** There are **two separate, unreconciled** definitions of the AMPIO MSERV-4S:
- `builtinModules.ts:391-399` — a DIN-rail `ModuleEntry` with `moduleRef: "Smart Home/AMPIO MSERV-4S.svg"` (used by the DIN-rail palette).
- `smartHomeCatalog.ts:13-18` — a CAD `SmartHomeCatalogEntry` with `sourceSvgPath: "/assets/symbols/Smart Home/Symbol AMPIO MSERV-4S_v4.svg"` (used by the SmartHome canvas).

These point at **different SVG paths** and are not cross-referenced. If you "fix" one, the other silently diverges. Treat them as two distinct assets until the developer decides to unify.

---

## Code style (the short version)

- **Smallest safe change.** Bug fix in `validation/` is a bug fix in `validation/`, not a refactor of the file.
- **No new dependencies** unless the existing stack (React, Vite, Tauri, Pixi, Vitest) cannot do the job.
- **No domain logic in components.** Components consume, hooks orchestrate, `lib/` computes, `types/` declares.
- **No heavy SVG parsing inside React render.** Precompute in `lib/` or a memoized hook.
- **No expensive work on `pointermove` / `wheel` / drag tick.** Debounce or move to event boundary.
- **`// WHY:` comments** for non-obvious decisions (e.g. why phase balance ignores FR/SPD).
- **5-field report** at the end of non-trivial work: Problem / Cause / Safe fix / What changed / What was tested.

---

## Test discipline (the short version)

- Vitest + jsdom + @testing-library/react. Fixed stack.
- Tests next to the file they test (`*.test.ts(x)`).
- Test names describe the **property**, not the implementation.
- High-risk subsystems: characterisation test for current behaviour **before** the change, then a test for the new behaviour.
- Project file format: round-trip test (save → load → deep-equal). One per format version.
- For canvas: deterministic unit tests over snapshot tests (snapshots drift).
- No network in tests. No real filesystem outside per-test temp. No `Date.now()` / `Math.random()` — inject or stub.

Test counts at baseline (2026-06-07): 249 unit tests across 33 test files. Don't let this number drop.

---

## Known tool quirks

- `package-lock.json` has a historical orphan `@emnapi/wasi-threads@1.2.2`. Not a bug; lives in lockfile only. Use `npm ci` for clean re-installs.
- `moduleAssetDiscovery.ts` polls the manifest every 3 s in dev. That's intentional for live SVG-import workflows; don't "optimise" it away.
- 68 `console.*` calls remain in the codebase as diagnostic traces. They are not bugs, but they are noise — when you remove one, check it wasn't guarding a real diagnostic.
- 28 `any` type usages (one per ~1000 LOC). Low but non-zero. The rule is: don't add a new one without a comment explaining why the type is genuinely unknowable.

---

## Before you write any code

1. Read this file end to end. Yes, all of it.
2. Read `.harness/docs/architecture-map.md` for the layout.
3. Read `.harness/docs/code-standards.md` for the layer rules.
4. Read `.harness/docs/test-policy.md` for the test rules.
5. If your task touches a high-risk area, read the matching `.harness/reins/<role>/agent.md` for the subsystem's "immutable contracts" list.
6. If you are about to refactor a file in the "container files" table, read it in pieces, not in one shot.
7. If the user is asking for a non-obvious behaviour change, run the diagnosis first, describe what you found, propose the change, and **wait for confirmation** before editing. This is engineering software; the user is the domain expert.

If a step above sends you to a rein (e.g. "this is a `canvas-expert` task"), stop and route to that role instead of doing it yourself. The reins exist for a reason.

---

## Routing quick reference

| You want to... | Route to |
|---|---|
| Change code that crosses multiple subsystems equally, or build/CI/Vite glue | `developer` |
| Add or refactor tests, analyse coverage | `tester` |
| Review a diff, audit code, before-merge checklist | `code-reviewer` |
| Phase balance, validation, RCD/MCB, project metadata, electrical types | `electrical-expert` |
| DIN rail canvas, schematic, SVG modules, snap/selection, wires, geometry, SmartHome CAD canvas + catalog + CAD parser | `canvas-expert` |
| PDF generator, preview, measurement protocols, PDF templates | `pdf-expert` |
| Project file format, save/load, migrations, undo/redo, Tauri | `project-io-expert` |

The orchestrator (this harness) is `Mavis` (mavis). It does not edit code; it routes and verifies.
