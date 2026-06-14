# DINBoard Git Workflow

Solo developer workflow with discipline. There is no team code-review pipeline; the `code-reviewer` rein plays that role for non-trivial changes.

## Branching

- `main` is the always-shippable branch.
- Feature work goes on topic branches named by intent, e.g.:
  - `fix/rozzielnica-remove-wires-toggle`
  - `feat/tauri-runtime-detection`
  - `refactor/extract-connections-canvas`
  - `test/connections-and-domain-coverage`
  - `docs/agents-emnapi-orphan`
- One concern per branch. If a branch is doing more than one thing, split it.

## Commit messages

Use a conventional prefix:

- `feat:` — new user-facing feature.
- `fix:` — bug fix.
- `refactor:` — code reorganisation with no behaviour change.
- `test:` — adding or fixing tests.
- `docs:` — documentation only.
- `chore:` — toolchain, deps, cleanup.
- `perf:` — performance work.

Body should answer:

- What behaviour changed (before / after).
- Why.
- Anything reviewers need to know (linked issues, risk).

If the change touches a high-risk area, the body MUST describe:

- Current behaviour.
- Why it is risky or wrong.
- Impact of the fix on results and on downstream consumers.
- The test that protects it.

## High-risk changes

Touching any of these areas is a high-risk change and requires:

1. A test that captures the property (see `.harness/docs/test-policy.md`).
2. A round-trip test if persistence format is involved.
3. A `code-reviewer` review before merge.
4. A clear commit body (see above).

Areas:

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

## Tauri changes

Changes to `src-tauri/**` are user-facing (they change what the desktop app can do) and slow to build. Always confirm with the user before running the Tauri build pipeline.

## Known toolchain quirk: `@emnapi/wasi-threads` orphan

`package-lock.json` may contain a historical entry for `node_modules/@emnapi/wasi-threads@1.2.2`. It is not used by any current direct dependency. Running `npm install` may pull it back; `npm ci` and `npm install --package-lock-only` will not. Not critical (220 KB, 0 active usage). See AGENTS.md for the full note.

## What never goes in a commit

- Secrets, tokens, credentials.
- Build artefacts (`dist/`, `target/`, `node_modules/`).
- Editor state (`.vscode/`, `.idea/`).
- Local scratchpads (`.mavis/scratchpads/`, `.opencode/`).
