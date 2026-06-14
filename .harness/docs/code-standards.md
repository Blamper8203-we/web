# DINBoard Code Standards

This doc is the project-wide standard that every rein must follow. It encodes the layer split, the smallest-safe-change rule, and the high-risk-area discipline from `AGENTS.md`. If a rein's `agent.md` says "read this first", read it first.

## Layer split (MVVM-ish, web stack)

| Layer | Folder | Responsibility | Forbidden |
|---|---|---|---|
| UI | `src/components/**` | Layout, controls, visual behaviour, event wiring | Computing domain results, persisting state, parsing data |
| Orchestration | `src/hooks/**` | UI state flow, debounced persistence, glue between domain and components | Domain calculations, validation, parsing, exporting |
| Domain | `src/lib/**` | All calculations, validation, parsing, exporting, transformation, geometry primitives | Direct rendering, direct DOM/Canvas calls, React state |
| Contracts | `src/types/**` | TypeScript types and normalizers | Logic, helpers that compute things |
| Desktop | `src-tauri/**` | OS-level integration (open/save, capabilities, dialogs) | App logic |

A change in a component that needs domain logic must call into `lib/` (via a hook or a pure import), not duplicate the logic. A change in `lib/` must not import from `components/`.

## Smallest safe change

- Don't refactor adjacent code "while you're in there". A bug fix in `validation/` is a bug fix in `validation/`, not a cleanup of the whole file.
- Don't introduce new dependencies unless the existing stack can't do the job. The stack is fixed: React, Vite, Tauri, Pixi, Vitest.
- Don't "improve" domain algorithms without an engineering reason.
- One change = one concern = one diff.

## High-risk areas (from AGENTS.md)

Touching any of these requires a behaviour note in the PR (current behaviour, why it's risky, impact of the change, test that protects the new behaviour):

- `src/lib/phaseDistribution/**`
- `src/lib/validation/**`
- `src/lib/circuitRows.ts`
- `src/lib/circuitEdit/**`
- `src/lib/projectMetadata.ts`
- `src/types/symbolItem.ts`
- `src/types/circuitRow.ts`
- `src/components/DinRailCanvasPixi.tsx`
- `src/lib/dinRailSelection.ts`
- `src/lib/dinRailSnap.ts`
- `src/lib/schematic/**`
- `src/lib/export/dinRailSnapshotService.ts`
- `src/lib/modules/importedModuleCatalog.ts`
- `src/lib/modules/svgAsset.ts`
- `src/lib/modules/svgNormalization.ts`
- `src/lib/modules/rasterPreview.ts`
- `src/components/SvgImportDialog.tsx`
- `src/components/ModuleAssetPreview.tsx`
- `public/assets/modules/**`
- `src/lib/projectFile.ts`
- `src/hooks/useProjectActions.ts`
- `src/hooks/useSymbolHistory.ts`
- `src-tauri/**`
- `src/lib/export/**`
- `src/components/PdfDocumentationPage.tsx`
- `src/components/PdfPreviewWorkspace.tsx`
- `src/lib/measurementProtocols.ts`

## Performance rules

- No heavy SVG parsing inside React render. Precompute in `lib/` or a memoized hook.
- No expensive computation on every `pointermove` / `wheel` / drag tick. Debounce or move to event boundary.
- Cache results that depend on stable keys (asset paths, normalised SVG).
- For pan/zoom: keep smoothness, don't trade it for rasterization that breaks SVG quality.
- For the DIN rail: test on a fully populated rail (many modules), not on 2–3.

## Refactor rules

Allowed without asking:
- Extract small helpers.
- Rename for clarity.
- Split responsibilities.
- Add characterization tests before a risky change.
- Remove dead code (only when you're certain nothing uses it).

Forbidden without explicit need:
- Rewriting large working sections.
- Mixing a refactor with a new feature.
- Changing several subsystems at once.
- Adding new frameworks or libraries.
- "Improving" domain algorithms without an engineering reason.

## File conventions

- `*.test.ts(x)` next to the file they test.
- `index.ts` per `lib/` subdirectory for public re-exports when it helps.
- One concern per file. If a file mixes persistence + validation + rendering, split it.
- `// WHY:` comments for non-obvious decisions (e.g. why a function ignores FR/SPD in phase balance).

## Reporting

For non-trivial work, end with the 5-field report:
1. Problem
2. Cause
3. Safe fix
4. What changed
5. What was tested
