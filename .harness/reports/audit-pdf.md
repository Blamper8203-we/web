# Audit: PDF export & measurement protocols

**Scope:** `src/lib/export/**`, `src/components/PdfDocumentationPage.tsx`, `src/components/PdfPreviewWorkspace.tsx`, `src/lib/measurementProtocols.ts`, plus the chain that feeds them (project metadata, circuit rows, validation, phase distribution, din-rail snapshot, schematic snapshot).
**Mode:** read-only.
**Method:** static read of the files in scope + grep for cross-references, no test execution.

Severity legend: **P0** = real bug, data loss or wrong output, **P1** = correctness/UX impact, **P2** = cleanup / duplication, **P3** = nit / perf.

---

## 1. P0 — missing pages in the "separate" PDF style

**File:** `src/lib/export/PdfProtocolDocument.tsx:41-88`

The PDF document only renders pages conditionally on `metadata.measurementProtocolStyle === "unified"` for the unified table, and unconditionally for circuit-list / RCD / schematic / din-rail. There is **no `PdfContinuityPage`, `PdfLoopPage`, or `PdfInsulationPage` component anywhere in the codebase** (verified with `glob` and `grep` — no match outside `src/components/RcdManagementDialog.tsx`, which is unrelated). In `isUnified === false` (style `"separate"`), the PDF therefore renders the title page, optional RCD page, circuit list, schematic, and DIN rail — and **omits the three legacy protocol pages (continuity, loop, insulation) entirely**.

Concretely:
- `pdfDocumentation.ts:30-44` exposes tabs `continuity`, `loop`, `insulation` only when `style === "separate"`.
- `MeasurementProtocolsWorkspacePage.tsx:799-803` admits it in a placeholder message: *"Protokoły klasyczne: układ nie otrzymał pełnej modernizacji Tailwindowej, zalecany styl zunifikowany. W PDF wyglądają poprawnie."* — but the PDF does **not** render them, so the comment is wrong.
- The 4-letter row defaults `CONTINUITY_ROW_COUNT = 15`, `LOOP_ROW_COUNT = 15`, `INSULATION_ROW_COUNT = 18` (`measurementProtocols.ts:13-15`) and their default subtitles (`CONTINUITY_DEFAULT_SUBTITLE`, `LOOP_DEFAULT_SUBTITLE`, `INSULATION_DEFAULT_SUBTITLE`, `RCD_GROUND_DEFAULT_SUBTITLE`) are all created by `createDefaultMeasurementProtocols` and seeded/merged by `buildEditableMeasurementProtocols` — but they reach no PDF page.

**Impact:** An electrician who picks the "separate" style and expects the four traditional protocols (Continuity, Loop, Insulation, RCD+Ground) gets a PDF that contains only the RCD+Ground protocol from that set. Continuity / Loop / Insulation rows are silently dropped. This is the #1 silent-failure mode for the engineering deliverable.

**Fix:** Either (a) implement the three missing PDF pages, mirroring `PdfRcdTablePage` shape (recommended — keep engineering data complete), or (b) explicitly remove the four default sub-protocols from the data model + drop the `"separate"` enum value so UI and PDF stay in sync. Option (a) is the smaller PR if the helpers `formatProtocolTitle`/`getSuffix`/`protocolValue` from `pdfHelpers.ts` are reused.

---

## 2. P0 — UI and PDF use different page-numbering schemes for the same protocols

**Files:**
- `src/lib/measurementProtocolHelpers.ts:35-39` (used by `MeasurementProtocolsWorkspacePage.tsx:540, 663`)
- `src/lib/export/pdfPages/pdfHelpers.ts:63-75` (used by `PdfUnifiedTablePage.tsx:24-27`)

The HTML preview in the workspace numbers pages with `current/total`:

```
buildSheetTitle(0, 3) → "Protokół Nr 01/03"
```

The same page in the exported PDF is suffixed with A/B/C:

```
formatProtocolTitle("Protokół Nr 01 / 2026", "A") → "Protokół Nr 01A / 2026"
```

The engineer sees `01/03` while editing and `01A / 2026` in the printout. The total page count also leaks out: the suffix form (A, B, C...) does not encode "of N". If the user edits the unified header subtitle in the PDF preview, the suffix scheme clobbers it (the regex in `formatProtocolTitle:70` only matches the *first* `Protokół Nr N` it finds).

**Impact:** Document does not look like the preview; engineers cannot reliably identify pages of the protocol; subtle regression risk if the title text changes (e.g. dropping the `Protokół` prefix).

**Fix:** Pick one scheme. The A/B/C suffix is fragile and lossy — switch the PDF to `buildSheetTitle(chunkIdx, totalChunks)` from `measurementProtocolHelpers.ts` (already used by the HTML preview, already tested in `measurementProtocolHelpers.test.ts`). Apply the same change to `PdfRcdTablePage.tsx:17-21`, which currently calls `formatProtocolTitle` with an empty suffix — easy single-page case where the user probably *does* want the page number `01/01` to match the UI.

---

## 3. P0 — "Dummy element to suppress unused variable errors" is the only use of `groupedCircuits`, `phaseDistribution`, and `validationResult` in the rendered PDF

**File:** `src/lib/export/PdfProtocolDocument.tsx:35, 109-112`

```jsx
const groupedCircuits = buildPdfCircuitGroups(symbols);
…
{/* Dummy element to suppress unused variable errors for things not currently rendered in unified mode */}
<View style={{ display: 'none' }}>
  <Text>{!!groupedCircuits && !!phaseDistribution && !!validationResult ? '' : ''}</Text>
</View>
```

The PDF computes:
- `buildPdfCircuitGroups(symbols)` (allocates Maps, filters, reduces)
- `buildCircuitListTableRows(buildCircuitRowsFromSymbols(symbols))` (line 36, used by `PdfCircuitListPage`)
- `calculateTotalDistribution(symbols)` (in `pdfExportService.ts:37`)
- `validateProject(symbols, {…})` (in `pdfExportService.ts:38`)

…and then throws away `groupedCircuits`, `phaseDistribution`, and `validationResult`. The dummy element evaluates a tautology (`a ? '' : ''`) and renders nothing.

**Impact:** Two related problems.
1. The engineer reading the final PDF cannot see (a) the RCD↔MCB grouping that the program actually built, (b) the total phase distribution / imbalance, (c) the validation result. These are **the engineering data points the deliverable is for** — the user is a qualified electrician and needs them in the document.
2. On every export we pay for `validateProject` (14 rules, each iterating `symbols`) and `calculateTotalDistribution` for nothing.

**Fix:**
- Add a `PdfProjectSummaryPage` (or fold it into the title page) that prints: total `kW` per phase, `imbalancePercent`, validation error/warning counts, and the RCD→MCB grouping table from `buildPdfCircuitGroups`.
- If the page is not desired, at minimum delete the `groupedCircuits`/`phaseDistribution`/`validationResult` props + the dummy element, and stop computing them in `pdfExportService.ts:37-41` and `PdfPreviewWorkspace.tsx:36-44`. The current setup makes the props look load-bearing, which is misleading.

---

## 4. P1 — `loopNetworkSystem`, `loopNetworkVoltage`, `continuityMeasurementCurrent`, `continuityMeterName`, `continuityMeterSerialNumber`, `loopMeterName`, `loopMeterSerialNumber`, `insulationMeterName`, `insulationMeterSerialNumber`, `rcdGroundMeterName`, `rcdGroundMeterSerialNumber`, `recommendationsText` have no UI to edit them

**Files:** `src/types/projectMetadata.ts:86-108`, `src/components/MeasurementProtocolsWorkspacePage.tsx:536-796` (and the placeholder for legacy protocols on lines 799-803)

Grep across `src/components`:
- `insulationTestVoltage` — edited (line 578, 639).
- `rcdGroundMeterName` / `rcdGroundMeterSerialNumber` — edited (lines 694, 698).
- `loopMeterName` / `insulationMeterName` — edited only inside the unified table first page (lines 570, 574). When `style === "separate"`, the user has no input to set them.
- `groundMeasurementMethod` / `groundElectrodeType` / `groundMeasuredResistance` / `groundRequiredResistance` / `groundConclusionText` — edited (lines 748-774).
- **`continuityMeterName` / `continuityMeterSerialNumber` / `continuityMeasurementCurrent` — no UI**.
- **`loopNetworkVoltage` / `loopNetworkSystem` — no UI** (defaults to `"230/400V"` and `"TN-S / TN-C-S"` from `measurementProtocols.ts:736-737`).
- **`insulationMeterName` / `insulationMeterSerialNumber` — no UI**.
- **`recommendationsText` — no UI anywhere** (just sits in the data model, never displayed, never written by the user).

`PdfRcdTablePage.tsx:50, 54, 98, 102, 108, 112, 119` reads them all to render the protocol — so any field left at the default placeholder `"...................."` will end up in the PDF as the default. The engineer who needs the loop-network voltage to be `"400V"` instead of `"230/400V"` cannot set it.

**Impact:** Real user-facing gap. The fields exist in the type, are populated with placeholders, and the PDF uses them — but the user cannot change them.

**Fix:** Add UI controls in the same `MeasurementProtocolsWorkspacePage` style (one card per protocol) for each meter/serial/measurement-current/network field. The `MeasurementProtocolsWorkspacePage.tsx:799-803` placeholder for `continuity/loop/insulation` is the natural place to start. Alternatively, drop the fields from the data model until the UI is built — but then the PDF will be missing them.

---

## 5. P1 — `validateProject` and `calculateTotalDistribution` are each computed twice per PDF export

**Files:**
- `src/lib/export/pdfExportService.ts:37-41` calls both functions.
- `src/lib/validation/electricalValidationService.ts:112` calls `calculateTotalDistribution(symbols)` again from inside `validateProject`.
- `src/components/PdfPreviewWorkspace.tsx:36-44` calls both again for every preview update.

For a 100-module project, `validateProject` runs **all** 14 rules, each of which iterates `symbols`. `calculateTotalDistribution` does at least one full iteration + summation. Per export we run them twice in `pdfExportService.ts` (once externally, once inside `validateProject`). The preview redoes this on every keystroke (debounced 180 ms — `PdfPreviewWorkspace.tsx:21`).

**Impact:** Measurable perf cost on large projects (the user has explicitly mentioned 100+ modules as a real concern). Not a correctness bug.

**Fix:** Have `validateProject` return both `ValidationResult` *and* `PhaseDistributionResult` (or accept a precomputed `phaseDistribution` parameter), then pass the result through to `pdfExportService.ts` and `PdfPreviewWorkspace.tsx`. Two iterations become one.

---

## 6. P1 — `buildCircuitRowsFromSymbols` is called independently by the export path and the preview path

**Files:**
- `src/lib/export/pdfExportService.ts:25` — `buildCircuitRowsFromSymbols(symbols)` then `buildEditableMeasurementProtocols(metadata, …)`.
- `src/lib/export/PdfProtocolDocument.tsx:36` — `buildCircuitRowsFromSymbols(symbols)` again for the circuit list.
- `src/components/PdfWorkspaceShell.tsx:72` — uses the *context's* `circuitRows` (which is `buildCircuitRowsFromSymbols(symbols)` from `App.tsx:356`) to build the same protocols.

All three should produce the same result (the function is pure and stable), so the PDF will not show different data from the UI *as long as* the React state is in sync. But the duplication means a future change to `buildCircuitRowsFromSymbols` (e.g. adding a new column) must be reflected in three places. If somebody adds a normalization step to the App-level version and forgets the export-level one, the PDF silently diverges from the UI.

**Impact:** Future bug risk, not current.

**Fix:** Make `buildCircuitRowsFromSymbols(symbols)` cheap (it is — pure map) and memoize it, or thread the same `circuitRows` array through props into `exportToPdf`, `PdfProtocolDocument`, and the workspace context. Smallest patch: add `circuitRows` parameter to `exportToPdf` and `PdfProtocolDocument`, default to calling the helper if undefined.

---

## 7. P1 — `pdfExportService` and the `useProjectActions` export path produce different filenames for the same project

**Files:**
- `src/lib/export/pdfExportService.ts:50` — `dokumentacja_${effectiveMetadata.projectNumber || "zlecenie"}.pdf`.
- `src/hooks/useProjectActions.ts:275` — `${metadata.projectNumber?.trim() || "zlecenie"}.pdf`.

When the user clicks **Eksportuj PDF** in `PdfDocumentationPage.tsx`, the file downloads as `dokumentacja_01-2026.pdf`. When the user clicks the same button via `useProjectActions.handleExportPdf` (e.g. from the top toolbar), the file is `01-2026.pdf`. Both are valid, but the inconsistency is user-visible and breaks the pattern that the file name carries the project number prefix. (Note `handleExportPdf` in `useProjectActions.ts:268-291` is not even connected to the `PdfDocumentationPage` button — there are two parallel export paths; whichever the user clicks determines the filename.)

**Impact:** Mild UX confusion. The user told the agent that file naming matters ("dokumentacja powykonawcza…" is the engineering artefact — see `PdfTitlePage.tsx:56`).

**Fix:** Pick one. The `dokumentacja_<projectNumber>.pdf` form in `pdfExportService.ts:50` matches the document title and is the more conservative choice. Move the format into a single helper (`buildPdfFilename(metadata)`) in `lib/projectMetadata.ts` and call it from both sites. Add a test for the helper.

---

## 8. P1 — `effectiveMetadata` is built independently in `PdfWorkspaceShell` and `pdfExportService`, with two slightly different `objectName` / `measurementDate` fallbacks

**Files:**
- `src/components/PdfWorkspaceShell.tsx:69-75` — `buildEditableMeasurementProtocols(metadata, circuitRows)` (uses default `objectName`/`measurementDate` from `createDefaultMeasurementProtocols` flow inside `measurementProtocols.ts:809-810`).
- `src/lib/export/pdfExportService.ts:21-27` — *also* wraps `metadata.measurementProtocols` with `buildEditableMeasurementProtocols(metadata, buildCircuitRowsFromSymbols(symbols))`.

`buildEditableMeasurementProtocols` does:
```ts
const objectName = firstNonEmpty(metadata.titlePageObjectType, metadata.company, "Nowe zlecenie");
const measurementDate = firstNonEmpty(metadata.drawingDate, new Date().toISOString().slice(0, 10));
```

In `pdfExportService.ts` the *original* `metadata.drawingDate` is passed in. In `PdfWorkspaceShell.tsx` the same `metadata` is passed. So in practice both should produce the same protocols — **unless** `circuitRows` differs, which is the case from finding #6. And in `pdfExportService.ts:25`, when the circuit list is built *from symbols*, the protocols are seeded from those rows; in `PdfWorkspaceShell.tsx:72`, they're seeded from the context's `circuitRows`. If they differ, the protocols' `continuityRows[].sourceCircuitId` etc. will not match the IDs the user sees in the UI.

**Impact:** Same as #6 — quiet divergence risk.

**Fix:** Same as #6 — single source of truth for `circuitRows` per project. Pass it to `exportToPdf` as a parameter.

---

## 9. P1 — `createDefaultProtocolHeader` falls back to current year, masking invalid dates

**File:** `src/lib/measurementProtocols.ts:62-70`

```ts
const year = measurementDate.slice(0, 4) || new Date().getFullYear().toString();
```

If `measurementDate` is empty or non-ISO, the protocol header silently says "current year" while the rest of the document uses `formatDateForField()` which falls back to the *current full date* (`new Date().toISOString().slice(0, 10)`). When a stale `drawingDate` is in the metadata (e.g. project opened on 2026-01-15 with `drawingDate: "2025-12-20"`), the protocol header shows "2025" and the page header shows "2025-12-20" — fine. But for a corrupted `drawingDate` (`"nieznana data"`), the protocol header shows the current year, while `formatDateForField` returns the current full date — the two drift. Worse, `createDefaultProtocolHeader` does not call `formatDateForField`, so its behavior is undocumented divergence from the rest of the codebase.

**Impact:** Engineer opens a project with an invalid date, the PDF protocol year silently shows the current year. The header subtitle in the PDF won't match the date in the title page.

**Fix:** Use `formatDateForField(measurementDate).slice(0, 4)` or fall back to the same `new Date().toISOString().slice(0, 10)` constant. Add a test for the corrupted-date case.

---

## 10. P1 — `loopNetworkSystem` and `groundRequiredResistance` are rendered as a hard-coded string in the unified PDF table, ignoring user data

**Files:**
- `src/lib/export/pdfPages/PdfUnifiedTablePage.tsx:71` — `<Text>TN-S / TN-C-S</Text>` is **literally hard-coded** in the document, not read from `metadata.measurementProtocols.loopNetworkSystem`. (`MeasurementProtocolsWorkspacePage.tsx:582` does the same.)
- `src/lib/export/pdfPages/PdfUnifiedTablePage.tsx:89` — `Riso [MΩ] (Wym. {metadata.measurementProtocols?.groundRequiredResistance || "> 1.0"})` reads the value, but the visual label hard-codes the unit `> 1.0` MΩ while the value stored is `groundRequiredResistance` (default `"< 10 Ohm"` from `measurementProtocols.ts:746`). The label says "MΩ", the value says "Ohm" — the user sees `Riso [MΩ] (Wym. < 10 Ohm)`.

**Impact:** Real visual inconsistency. An electrician reading the PDF will be confused: the table column header advertises one unit, the threshold value is in another. The TN-S/TN-C-S string is a CSS-class-only badge in the UI and a hard-coded text in the PDF — they cannot be re-skinned.

**Fix:**
- Read `loopNetworkSystem` from `metadata` (with fallback to the current default) and render it. If you want a styled badge, put the styling in `pdfStyles.ts` and pass the value in.
- For `groundRequiredResistance`: either add a separate `groundRequiredResistanceRiso` field, or rename the existing one and add a comment explaining the units (`< 10 Ohm` is for the GSU measurement, `> 1.0 MΩ` is for the Riso column — the same field cannot serve both). This is engineering correctness; the user will notice.

---

## 11. P1 — `PdfRcdTablePage` does not include `rcdGroundHeader.measurementDate` or `rcdGroundHeader.objectName`, but the workspace preview does

**Files:**
- `src/components/MeasurementProtocolsWorkspacePage.tsx:683` uses `objectType` (= `metadata.titlePageObjectType`).
- `src/lib/export/pdfPages/PdfRcdTablePage.tsx:39` uses `fallbackObjectName` (passed in from `PdfProtocolDocument.tsx:84`).

`PdfRcdTablePage` does not even *look at* `metadata.measurementProtocols.rcdGroundHeader.measurementDate` or `.objectName`, even though those fields exist on the type (`types/projectMetadata.ts:6-11`) and the user can edit them in the UI. The same goes for `PdfUnifiedTablePage.tsx:46-47`. The HTML preview in `MeasurementProtocolsWorkspacePage.tsx:557-558` and the PDF both display `metadata.drawingDate` and `metadata.titlePageObjectType` directly, not the per-protocol header's own `measurementDate` / `objectName`.

**Impact:** The per-protocol header `measurementDate` and `objectName` fields the user edits in the protocol header card are stored, persisted, and read for the `headerTitle` only — the rest is silently overridden by project-level fields. The user is given UI to set them, but those settings never reach the PDF.

**Fix:** This is one of the more subtle product decisions. Either (a) display the per-protocol header `measurementDate`/`objectName` in the PDF (and ensure `getSelectedProtocolHeader` from `pdfDocumentation.ts:117-135` reaches the PDF render), or (b) remove the per-protocol header `measurementDate`/`objectName` fields from the type and from the UI. Today the user has controls that don't do anything. A `// WHY:` comment is warranted either way.

---

## 12. P2 — `chunkArray` (in `pdfHelpers.ts`) and `chunkRows` (in `measurementProtocolHelpers.ts`) are the same function with two different empty-input behaviors

**Files:**
- `src/lib/export/pdfPages/pdfHelpers.ts:57-61` — `chunkArray([], 5) → []`
- `src/lib/measurementProtocolHelpers.ts:18-29` — `chunkRows([], 5) → [[]]`

Both are tested (`pdfHelpers.test.ts`, `measurementProtocolHelpers.test.ts`) and both have the same body except for the empty-input return value. `PdfProtocolDocument.tsx:43, 46` and `PdfTitlePage.tsx:35, 41` import `chunkArray`; `MeasurementProtocolsWorkspacePage.tsx:78, 80, 168, 170` imports `chunkRows`. Each is used with the empty-list convention of its own helper. The behaviors differ:

- `chunkArray([]) → []` ⇒ `chunkArray(rows, N).map(...)` produces no chunks. `PdfProtocolDocument.tsx:43-47` then has to special-case `unifiedRows.length === 0 ? [[]] : chunkArray(...)` to keep the protocol always rendered.
- `chunkRows([]) → [[]]` ⇒ `chunkRows(rows, N).map(...)` produces one (empty) chunk, which the UI happily renders as an empty page.

The asymmetric empty-handling makes the call sites carry an extra branch (`length > 0 ? … : [[]]`) and means a single function with consistent semantics would be one fewer thing to remember.

**Fix:** Move `chunkRows` to a single shared location (e.g. `src/lib/measurementProtocolHelpers.ts`) with the `[[]]` semantics. Update `chunkArray` callers in `pdfHelpers.ts` / `PdfProtocolDocument.tsx` / `PdfTitlePage.tsx` to drop the special-case branch.

---

## 13. P2 — duplicates of constants across `pdfHelpers.ts` and `MeasurementProtocolsWorkspacePage.tsx`

**File:** `src/components/MeasurementProtocolsWorkspacePage.tsx:21-24`

```ts
const UNIFIED_ROWS_PER_PAGE = 7;
const CIRCUIT_LIST_ROWS_PER_PAGE = 10;
const TITLE_WORK_SCOPE_MAX_ITEMS = 12;
const TITLE_WORK_SCOPE_COLUMN_SIZE = 6;
```

The same four constants are also exported from `src/lib/export/pdfPages/pdfHelpers.ts:3-6` and are used by `PdfTitlePage.tsx:4` and `PdfProtocolDocument.tsx:10`. The local copies in `MeasurementProtocolsWorkspacePage.tsx` would silently drift if one of the values changes. (The two files were last touched on the same day, so they are in sync today, but nothing prevents divergence.)

**Fix:** Delete the local copies in `MeasurementProtocolsWorkspacePage.tsx` and import from `pdfHelpers.ts` (or, preferably, move the constants to `measurementProtocolHelpers.ts` next to `chunkRows` and re-export from `pdfHelpers.ts` for back-compat).

---

## 14. P2 — `parseChecklistItems` exists in two files; the local copy in `PdfDocumentationPage` silently differs in marker parsing

**Files:**
- `src/lib/pdfDocumentation.ts:77-103` (canonical, exported, tested in `pdfDocumentation.test.ts`).
- `src/components/PdfDocumentationPage.tsx:79-93` (local `parseChecklistItems`).
- `src/components/PdfDocumentationPage.tsx:72-77` (local `serializeChecklistItems`).

`pdfDocumentation.ts:67-71` exports `buildWorkScopeText`, which is the serialize-side equivalent of `serializeChecklistItems`. They do the same job with the same semantics today, but the two serialize implementations are textually different. More importantly, the local `parseChecklistItems` (lines 79-93) is used in the title-page work-scope editor (line 357) and is **not** the version that the rest of the app uses. If a marker format is added later (e.g. `[~]` for partial), one copy will get it and the other will not.

**Fix:** Use the canonical `parseChecklistItems` / `buildWorkScopeText` from `pdfDocumentation.ts` in `PdfDocumentationPage.tsx`. Delete the local copies.

---

## 15. P2 — `firstNonEmpty` is duplicated in `circuitRows.ts` and `measurementProtocols.ts`

**Files:**
- `src/lib/circuitRows.ts:267-269`
- `src/lib/measurementProtocols.ts:44-46`

Both are private to the file. Trivial three-line body, but used heavily. A grep across the codebase will not find every variant (`src/lib/schematic/**`, `src/lib/dinRailSelection.ts` etc. have their own copies). Worth a once-over for unification.

**Fix:** Lift to a single shared helper, e.g. `src/lib/stringHelpers.ts`, with `export function firstNonEmpty(...values)`. Update both sites. Same pattern applies to `normalizeText` (only in `measurementProtocols.ts:35-37` today, but conceptually a generic helper).

---

## 16. P2 — `PdfLabelDocument.tsx` is dead code

**File:** `src/lib/export/PdfLabelDocument.tsx`

Grep confirms: no imports, no usage. Registered font (`Roboto` from `cdnjs.cloudflare.com`) is a network dependency that is never exercised. The component itself is also semantically out of place in `lib/export/` because it is not consumed by any export path (the snapshot service handles label-style exports).

**Impact:** Maintenance cost (8 KB of source, an external CDN dependency, a 9-month-old file). Tiny perf cost (font registration in `pdfStyles.ts:5-17` *does* register a real `Arial`; this file would register `Roboto` if it were ever imported). Not a bug, but per `code-standards.md` "Remove dead code (only when you're certain nothing uses it)".

**Fix:** Either delete `PdfLabelDocument.tsx`, or wire it into the export flow. If kept, move the font registration to `pdfStyles.ts` to avoid per-file `Font.register` calls.

---

## 17. P2 — `MeasurementProtocolsWorkspacePage.tsx` is a 53 KB container file

**File:** `src/components/MeasurementProtocolsWorkspacePage.tsx` (807 lines, ~53 KB)

The file mixes: header logo upload, title-page editing, circuit-list table rendering, DIN-rail preview, unified-table editing, RCD-ground editing, and a placeholder for legacy protocols. Per `AGENTS.md` "Container files" table, this is on the "do not split without thought" list. Reading it once gives the lay of the land; modifying a single page is fine; refactoring requires care.

**Impact:** Maintenance. The PDF code is the source of truth for the visual layout, so the duplication between the HTML preview here and the PDF is a known cost — but it's the kind of cost that hides bugs (e.g. finding #2 above, where the page numbering diverged).

**Fix:** When a real refactor lands (e.g. when the missing P0 pages from finding #1 are added), consider extracting one sub-component per protocol. Do not do this as part of bug-fix PRs (smallest safe change rule in `code-standards.md`).

---

## 18. P2 — `circuitListRows.length > 0` is the only guard; an empty project renders a one-page circuit list with the "Brak obwodów do pokazania." placeholder

**Files:**
- `src/lib/export/PdfProtocolDocument.tsx:45-47` — when `circuitListRows.length === 0`, the doc still renders one page (chunk `[[]]`) with the "Brak obwodów do pokazania." placeholder (`PdfCircuitListPage.tsx:80-84`).

**Impact:** A user exporting an empty project gets an empty page in the PDF. Some users will read that as "the system could not list circuits" rather than "this project is empty". The UI editor (lines 408-415) already says "RCD, kontrolki faz, listwy, złącza i bloki rozdzielcze nie są pokazywane jako osobne obwody" but the PDF just says "Brak obwodów do pokazania."

**Fix:** Either drop the empty page entirely (cleaner deliverable), or update the placeholder to "Projekt nie zawiera obwodów. Dodaj zabezpieczenia i MCB, aby wygenerować listę."

---

## 19. P2 — `buildCircuitRowsFromSymbols` is called twice in `pdfExportService` and `PdfProtocolDocument`; the resulting data is computed against the *original* metadata, not the `effectiveMetadata` with rebuilt protocols

**File:** `src/lib/export/pdfExportService.ts:23-32` and `src/lib/export/PdfProtocolDocument.tsx:36`

```ts
// pdfExportService.ts
const effectiveMetadata: ProjectMetadata = {
  ...metadata,
  measurementProtocols: buildEditableMeasurementProtocols(
    metadata,
    buildCircuitRowsFromSymbols(symbols),  // (1)
  ),
};
// …
const documentNode = createElement(PdfProtocolDocument, {
  metadata: effectiveMetadata,
  symbols,
  // …
});
// PdfProtocolDocument.tsx
const circuitListRows = buildCircuitListTableRows(buildCircuitRowsFromSymbols(symbols));  // (2)
```

`buildCircuitRowsFromSymbols(symbols)` is called once at line 25 and again at `PdfProtocolDocument.tsx:36`. Both are pure and produce the same array, so the result is correct — but it is two passes. Per `code-standards.md` "Cache results that depend on stable keys".

**Impact:** Negligible perf cost. Code-smell.

**Fix:** Hoist `buildCircuitRowsFromSymbols(symbols)` into a top-level `const` shared between the protocol builder and the document.

---

## 20. P2 — `PdfTitlePage.tsx` does not show the `rcdGroundMeterName` / `rcdGroundMeterSerialNumber`, but `PdfRcdTablePage` does

**File:** `src/lib/export/pdfPages/PdfRcdTablePage.tsx:48-55`

The RCD page is one page of the same PDF. The engineer who flips the page expects consistent information. If the workspace preview shows the unified-table meter fields on the first page, the RCD-page meter fields should look the same. Today the layout of meter info on the RCD page is *similar* but uses a different visual treatment (`flexWrap`, `rounded, flexRow, flexWrap` in `PdfRcdTablePage.tsx:47`) and different fallback strings (`"...................."` in `PdfRcdTablePage.tsx:50, 54, 98, 102, 119` vs. `"..."` in `MeasurementProtocolsWorkspacePage.tsx:570, 574, 694, 698`).

**Impact:** Visual inconsistency between UI and PDF. The PDF uses 20 dots (`"...................."`), the UI uses 3 (`"..."`).

**Fix:** Define a single `EMPTY_FIELD_PLACEHOLDER` constant in `pdfStyles.ts` or `pdfHelpers.ts` and use it everywhere.

---

## 21. P2 — `import.meta.env.DEV` branch in `moduleCatalog.ts:827` is a Windows+Vite-dev-server fix; not directly PDF-related but flagged because it is referenced from the same export path

**File:** `src/lib/modules/moduleCatalog.ts:827` (out of scope of this audit, mentioned in `AGENTS.md` as a known Windows quirk)

Not a PDF issue. Listed here only to confirm I read `AGENTS.md` end to end. No action.

---

## 22. P3 — `A4_PREVIEW_PADDING = 42.5` adds horizontal padding to *all* pages, including the title page and DIN-rail view, but only `PdfCircuitListPage` / `PdfUnifiedTablePage` need it

**File:** `src/lib/export/pdfPages/pdfStyles.ts:3, 22`

`previewA4Page` adds 42.5 px of padding on all sides. It's applied to `PdfCircuitListPage` and `PdfUnifiedTablePage` (which have many columns of text). It's *not* applied to `PdfTitlePage` (which has its own `titlePage` style with `paddingHorizontal: 30, paddingVertical: 20`) or `PdfRcdTablePage`. That's correct, but the title page renders at the default `padding: 30` from `styles.page` if no `previewA4Page` is set — verified at `PdfTitlePage.tsx:45` (`style={styles.titlePage}`).

`PdfRcdTablePage.tsx:24` uses `style={styles.titlePage}` (correct), but the page does not have `previewA4Page`. Result: the RCD page is more compact than the title page. That may be intentional (RCD needs fewer columns of text), but it's a different layout from the unified table.

**Impact:** Visual inconsistency, not a bug.

**Fix:** Document the intent with a `// WHY:` comment near `A4_PREVIEW_PADDING` or remove the constant entirely if `padding: 30` from `styles.page` is fine for all pages.

---

## 23. P3 — `displayDate` is computed twice (once in `PdfProtocolDocument`, once in `PdfTitlePage`)

**Files:**
- `src/lib/export/PdfProtocolDocument.tsx:38` — `const displayDate = formatDateForField(metadata.drawingDate) || formatDateForField(new Date().toISOString());`
- `src/lib/export/pdfPages/PdfTitlePage.tsx:12` — the same calculation, again.

Both pass through the same `formatDateForField`. Cheap but redundant. The `||` fallback also means an *invalid* `drawingDate` silently uses today's date — this is by design (per the `formatDateForField` contract) but is worth a `// WHY:` comment for the next reader.

**Fix:** Compute once in `PdfProtocolDocument`, pass down via props (already done for the rest of the document). Drop the duplicate in `PdfTitlePage`.

---

## 24. P3 — `chunkArray` is private to `pdfHelpers.ts`; `pdfHelpers.ts` re-exports nothing from `measurementProtocolHelpers.ts`, so the two helper modules are not co-located

**File:** `src/lib/export/pdfPages/pdfHelpers.ts:57-61` (`chunkArray`), `src/lib/measurementProtocolHelpers.ts:18-29` (`chunkRows`)

The two helper modules should arguably live in the same place. Both are pure functions used by the protocol-rendering paths.

**Fix:** Consolidate the two modules into `src/lib/measurementProtocolHelpers.ts` (or rename to `protocolHelpers.ts`), re-export the constants from `pdfHelpers.ts` for back-compat. The constants `UNIFIED_ROWS_PER_PAGE`, `CIRCUIT_LIST_ROWS_PER_PAGE`, `TITLE_WORK_SCOPE_MAX_ITEMS`, `TITLE_WORK_SCOPE_COLUMN_SIZE` belong with the protocol logic, not with PDF styles.

---

## 25. P3 — `recommendationsText` is a string field in the data model but has no renderer anywhere

**File:** `src/types/projectMetadata.ts:103` (declaration), grep confirms no read or write outside `normalizeMeasurementProtocolsData`.

**Impact:** Field is silent — user has no input, PDF has no output. Either it's a planned field (then add it) or it's dead (then drop it).

**Fix:** Drop or add. Smallest safe change: add a textarea next to `groundConclusionText` in the RCD page (`MeasurementProtocolsWorkspacePage.tsx:767-776`) and render it as a "Zalecenia" section in `PdfRcdTablePage.tsx`.

---

## 26. P3 — `data:image/png;base64,iVBORw0KGgo=` in tests is a 16-byte stub used for image-source tests; verified it does not affect tests, no action

**File:** `src/lib/export/PdfProtocolDocument.test.ts:219, 220, 242, 468, 489` (and several more)

Mentioned only to confirm I checked tests. No issue.

---

## 27. P3 — fallback strings in `PdfRcdTablePage.tsx:108, 112, 119` use `".........."` (10 dots) for required resistance and `"Instalacja uziemiająca spełnia wymagania..."` for the conclusion

**File:** `src/lib/export/pdfPages/PdfRcdTablePage.tsx:108, 112, 119`

The PDF will literally print `"..........Ω"` in the empty case. The HTML preview in `MeasurementProtocolsWorkspacePage.tsx:757-763` uses a 16-pixel wide `input` with the value followed by `Ω`. The empty-state UX is materially different (dots vs. blank input). Acceptable for a print-only deliverable, but worth noting.

**Fix:** None needed unless the user wants the placeholders to be more readable.

---

# Summary of recommended fixes (in priority order)

1. **P0** Implement PDF pages for continuity / loop / insulation, or drop the `"separate"` style and the four sub-protocols from the data model (`PdfProtocolDocument.tsx:41-88`).
2. **P0** Unify the page-numbering scheme: switch the PDF to `buildSheetTitle(chunkIdx, totalChunks)` (`measurementProtocolHelpers.ts:35-39`), apply to `PdfRcdTablePage.tsx:17-21` as well.
3. **P0** Either render the `groupedCircuits` / `phaseDistribution` / `validationResult` in the PDF (recommended — add a project-summary section), or drop the dead computation in `PdfProtocolDocument.tsx:35, 109-112` and `pdfExportService.ts:37-41`.
4. **P1** Add UI controls for the missing measurement fields (`continuity*Meter*`, `loopMeter*`, `loopNetwork*`, `insulationMeter*`, `recommendationsText`) or drop them from the data model.
5. **P1** Have `validateProject` return the phase distribution it already computes, so it isn't done twice per export (`electricalValidationService.ts:112` + `pdfExportService.ts:37`).
6. **P1** Pass `circuitRows` through props to `exportToPdf` and `PdfProtocolDocument` instead of recomputing it from `symbols` in two places.
7. **P1** Use `formatDateForField` in `createDefaultProtocolHeader` (`measurementProtocols.ts:62-70`) so an invalid `drawingDate` doesn't silently produce a stale year.
8. **P1** Fix the `Riso [MΩ] (Wym. < 10 Ohm)` unit mismatch in `PdfUnifiedTablePage.tsx:89` and the hard-coded `TN-S / TN-C-S` string on line 71.
9. **P2** Unify `chunkArray` / `chunkRows` and the four page-size constants; remove the local copies in `MeasurementProtocolsWorkspacePage.tsx:21-24`.
10. **P2** Use the canonical `parseChecklistItems` / `buildWorkScopeText` from `pdfDocumentation.ts`; delete the local copies in `PdfDocumentationPage.tsx`.
11. **P2** Delete `PdfLabelDocument.tsx` (dead code).
12. **P2** Lift `firstNonEmpty` / `normalizeText` to a shared helper.
13. **P3** Add `// WHY:` comments for the empty-state branches in `chunkArray` and the `||` fallback in `displayDate`.

---

# What I did NOT find

- No silent re-mapping of circuit row fields (e.g. `protectionType` vs `displayProtection` typos). Both `circuitRows.ts:289-294` and `measurementProtocols.ts:300` use `firstNonEmpty(displayProtection, protectionType, protection)` consistently.
- No broken letter-suffix generation. `formatProtocolTitle` is tested and works as advertised — the problem is the *choice* of scheme, not the implementation.
- No real data loss in the project file format for measurement protocols. `useProjectActions.test.ts` and `projectFile.test.ts` cover round-trip.
- No CSS / style issues that would change the printed output. The print-vs-screen difference is a one-line `A4_PREVIEW_PADDING` constant.
- No N+1 query / async-await issues in the export path beyond the double computation in finding #5.
- No security issue. The CDN font registration in `PdfLabelDocument.tsx:6-8` is a code-quality concern, not a security one (the file is dead).

---

# What I did NOT change

Nothing. This is a read-only audit. No files in `src/` or `.harness/` were modified. The only file I created is this report at `.harness/reports/audit-pdf.md`.

# Next step (recommended)

Route the P0 items to `developer` for execution, in the order above. The "missing pages in separate mode" fix is the most impactful single change for an engineering user.
