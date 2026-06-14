# Hook: high-risk-area-gate

A tool gate that flags any tool call which writes, edits, or deletes a file in DINBoard's high-risk areas. The gate does NOT block — it injects a reminder into the next user-visible message so the model re-checks the change against AGENTS.md and `.harness/docs/test-policy.md` before proceeding.

## Why

DINBoard is an engineering application. Silent changes to phase balance, validation, RCD/MCB grouping, project persistence, PDF export, or canvas perf are the worst kind of regression. The gate exists to make the model pause at the right moment, not to block legitimate work.

## How to install

This is a documentation file. The actual hook must be registered with the daemon so it can validate the matcher at create-time. From the repo root:

```powershell
mavis hook create dinboard:high-risk-area-gate `
  --matcher "tool:bash" `
  --matcher "tool:edit" `
  --matcher "tool:write" `
  --description "Reminder when a tool call targets a DINBoard high-risk area" `
  --body-file .harness/hooks/high-risk-area-gate.md
```

(If the `--body-file` flag is not supported, paste the body of this file into the interactive `mavis hook create` prompt.)

## What it does

- Inspects the tool call arguments for file paths.
- If any path matches the high-risk-area patterns below, the model is told to confirm:
  - Is the change the smallest safe one?
  - For logic changes in electrical / persistence / PDF: is there a test that captures the new behaviour?
  - For format changes: is there a round-trip test?
  - Did the model describe current behaviour, the risk, and the impact?
- The model proceeds by default — the gate is a reminder, not a wall. Use `code-reviewer` for actual review.

## Match patterns

The following path globs are high-risk and trigger the reminder:

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

## Body (for `mavis hook create`)

```
You are about to modify a file in a DINBoard high-risk area.

Before continuing, confirm:
1. Is the change the smallest safe one? No "while I was here" refactors.
2. For logic changes in electrical / persistence / PDF: is there a test that captures the new behaviour (characterisation-before-change)?
3. For project file format changes: is there a round-trip test (save -> load -> deep-equal)?
4. Did you describe (a) current behaviour, (b) why it is risky or wrong, (c) impact of the fix on downstream consumers (PDF, schematic, validation), (d) the test that protects it?

If any answer is "no" or "I don't know", pause and ask the user or route the change to the appropriate expert:
- electrical-expert: phase balance, validation, circuit rows, RCD/MCB, project metadata, electrical types
- canvas-expert: DIN rail, schematic, SVG module assets, snap/selection, wires
- pdf-expert: PDF generator, preview, measurement protocols
- project-io-expert: project file, save/load, migrations, undo/redo, Tauri

The gate is a reminder, not a block. If the user has explicitly asked for the change, proceed.
```
