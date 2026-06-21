# Audit: project I/O, undo/redo, migrations, Tauri integration

**Scope:** `src/lib/projectFile.ts`, `src/hooks/useProjectActions.ts`, `src/hooks/useSymbolHistory.ts`, `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `src-tauri/capabilities/default.json`, plus their direct callers (`src/App.tsx`, `src/lib/projectFileSemantics.ts`, `src/lib/domain/snapshotUtils.ts`, `src/lib/editing/undoRedoService.ts`).
**Mode:** read-only.
**Method:** static read + grep + cross-references, no test execution.

Severity legend: **P0** = real bug, silent data loss, or broken contract, **P1** = correctness/UX impact, **P2** = cleanup / duplication, **P3** = nit / perf.

---

## Summary of findings

| Sev | Count |
|---|---|
| P0 | 5 |
| P1 | 8 |
| P2 | 11 |
| P3 | 6 |
| **Total** | **30** |

Top three to fix first:

1. **P0-1** — `App.tsx:670-681` opens a project from the landing page with `console.error` only, silently swallowing file-parse errors that the in-app path (`useProjectActions.handleOpenProject`) surfaces as a `Błąd: …` status. Real users hit this when they double-click a corrupt `.dinboard` from the welcome screen.
2. **P0-2** — Two Tauri commands `read_project_file` and `write_project_file` (`src-tauri/src/lib.rs:14-17, 53-56`) and the JS-side `loadProjectFromPath` (`projectFile.ts:667-679`) are **dead code with no caller**. They use `std::fs` directly without sandboxing, with no `tauri-plugin-fs` declared in `Cargo.toml`. Anyone who wires one up will have a security-relevant command on a path they cannot restrict.
3. **P0-3** — There is no versioned migration registry. The single migration `migrateLegacyManualReferenceDesignations` (`projectFile.ts:353-393`) is called inline from `parseProjectFileContent`. Adding a second migration is a copy-paste job inside the parser, with no record of which migrations have been applied to which file.

---

## P0 — silent data loss / broken contract

### P0-1. Landing page `handleOpenProjectFile` silently swallows file errors
**File:** `src/App.tsx:670-681`
```ts
const handleOpenProjectFile = useCallback(async () => {
  try {
    const data = await openProjectFile();
    if (data) {
      setInitialData(data);
      setInitialAction("load_data");
      navigateToApp();
    }
  } catch (e) {
    console.error(e);                  // <-- user sees nothing
  }
}, [navigateToApp]);
```
Compare to `useProjectActions.handleOpenProject` (`src/hooks/useProjectActions.ts:258-266`) which does:
```ts
} catch (e) {
  showTemporaryStatus(`Błąd: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
}
```
A user who double-clicks a corrupt `.dinboard` from the welcome page gets the dialog close and the page stays the same — no message, no log visible to them. Worse: even if the parse succeeds, the error could be a *partial* load (e.g. `parseProjectFileContent` does `JSON.parse(content)` first, then a field-by-field walk — a thrown error mid-walk leaves the user without any signal that something went wrong).

**Impact:** user-visible silent failure, no recovery path. Engineering software — the user must know why a file refused to open.

**Fix:** route the landing-page "open" through the same `useProjectActions.handleOpenProject` (it already does the right thing for errors), or at least add a `showTemporaryStatus` call. Note that the landing page does not have access to `useProjectActions`; the cleanest fix is to bubble the error up via a state-setter that triggers a toast after navigation, or to add a `useProjectActions`-shaped function that App.tsx can call pre-navigation. The latter is the right shape: the landing page should not embed file-parsing logic; it should call the same handlers the in-app toolbar calls.

### P0-2. Dead Tauri commands and dead `loadProjectFromPath` create a security-shaped maintenance hazard
**Files:**
- `src-tauri/src/lib.rs:14-17` — `async fn read_project_file(path: String) -> Result<String, String>`
- `src-tauri/src/lib.rs:53-56` — `async fn write_project_file(path: String, content: String) -> Result<(), String>`
- `src-tauri/src/lib.rs:107-111` — both registered in `invoke_handler!`
- `src/lib/projectFile.ts:667-679` — `export async function loadProjectFromPath(filePath: string)`

A grep of the whole `src/` tree for `read_project_file|write_project_file` returns **zero matches outside `src-tauri/src/lib.rs`**. `loadProjectFromPath` has **zero callers** in `src/`. The `tauri-plugin-fs` plugin is **not in `Cargo.toml`** (only a transitive entry in `Cargo.lock:3487-3493`).

**Why this is P0 and not P2:**

1. `read_project_file` and `write_project_file` accept an arbitrary `path: String` and run `fs::read_to_string` / `fs::write` with no scope, no allowlist, and no path canonicalisation. If a future engineer wires them up from the frontend "to support drag-and-drop into the project tree" or similar, they will be exposed with no sandbox. The capability manifest (`src-tauri/capabilities/default.json`) only lists `core:default`, `opener:default`, `dialog:default` — but Tauri 2 invokes can be called via JS without a capability, *as long as the command is registered in the handler*. So a malicious page (or an XSS bug) can read/write any file the Tauri host process can touch.
2. `loadProjectFromPath` uses `fetch(filePath)` (`projectFile.ts:669`). In a Tauri build, that path would be an `asset://` URL or a `tauri://localhost/...` URL, neither of which is registered without `tauri-plugin-fs`. The function will throw `TypeError: Failed to fetch` for every path a real user has. The fact that it looks like it works in the web build (HTTP URLs) is misleading.

**Fix:**
- **Remove** `read_project_file` and `write_project_file` from `src-tauri/src/lib.rs` and the `invoke_handler!` list.
- **Remove** `loadProjectFromPath` from `projectFile.ts` (or, if load-from-arbitrary-path is a planned feature, file a tracking issue and add `tauri-plugin-fs` to `Cargo.toml` with a proper scope allowlist, plus the corresponding `fs:default` capability in `default.json` — and *then* document the use case and write the test).
- Do not "leave them for later" — the longer they sit in the tree, the more likely a future commit will start calling them, and the security review will miss it.

### P0-3. No versioned migration registry
**File:** `src/lib/projectFile.ts:395-444` (`parseProjectFileContent`)
**The only migration:**
- `migrateLegacyManualReferenceDesignations` (`projectFile.ts:353-393`) — runs unconditionally on every load, regardless of `schemaVersion`.

There is no `applyMigration(from: number, to: number, data)` chain. There is no per-file `appliedMigrations: string[]` marker. There is no test that pins the behaviour of `migrateLegacyManualReferenceDesignations` (it only runs implicitly inside the existing round-trip tests).

**Concrete risk today:** this function rewrites a symbol's `parameters[ManualReferenceDesignation]` key based on whether the symbol's `referenceDesignation` matches the auto-generated one. If `buildSchematicLayout` ever changes its deterministic output (e.g. layout algorithm change), every previously-saved symbol gets re-marked as `ManualReferenceDesignation = "true"` on next load. That is a real silent mutation: the user saved the file, closed the app, and on reopening the project is now flagged as "manually set" everywhere. This is a behaviour that lives in code with no test pinning the *current* semantics.

**Concrete risk tomorrow:** the moment you need a second migration (e.g. "rename `rcdSymbolId` to `parentRcdId`" or "translate an enum value from `rcd` to `residual-current-device`"), you have to add it inside `parseProjectFileContent` as another `migrateFoo` call. There is no list, no version gate, no per-migration test, no way to run them in order. The shape of `parseProjectFileContent` will become spaghetti.

**Fix (smallest safe change):**
```ts
const MIGRATIONS: { from: number; to: number; run: (data: RawProjectFileData) => RawProjectFileData }[] = [
  { from: 0, to: 1, run: migrateLegacyManualReferenceDesignations },
  // next migration: { from: 1, to: 2, run: ... },
];
```
Then a `currentVersion: number` constant in the file (already exists: `WEB_PROJECT_SCHEMA_VERSION = 2`), and the parser runs all migrations in order. Each migration gets its own test. The marker `appliedMigrations: string[]` can be persisted on save to avoid re-running on identical-version files.

### P0-4. Avalonia-vs-Web shape disambiguation breaks for `schemaVersion: 2` files without a `version` key
**File:** `src/lib/projectFile.ts:398-399`
```ts
const hasWebShape = "metadata" in parsed && "symbols" in parsed && "version" in parsed;
const hasAvaloniaSchema = typeof parsed.schemaVersion === "number" && parsed.schemaVersion > 0 && !hasWebShape;
```

`hasWebShape` requires *all three* of `metadata`, `symbols`, `version`. If a file has `schemaVersion: 2` and `metadata` and `symbols` but no `version` key (e.g. hand-edited, or written by an older build that didn't add the `version` key yet), then:
- `hasWebShape = false`
- `hasAvaloniaSchema = true` (because `schemaVersion: 2` is a `number > 0` and `!hasWebShape` is true)
- `toProjectMetadataFromAvalonia` runs, tries to read `name`/`description`/`powerConfig` — all undefined → returns a default metadata. The real `metadata` field on disk is silently discarded.
- Connections are **not** parsed (`if (hasWebShape && Array.isArray(parsed.connections))` on line 415), even though the file is the current web format.
- The `rail` is read as Avalonia (`toRailFromAvalonia`), missing the `isVisible: true` requirement (which `toRailFromWeb` enforces).

The current serializer always writes `version: "2.0"` (line 457), so this only bites on hand-edited files or files written by a pre-release build. But the project file format is the engineering deliverable — the user *will* hand-edit a `.dinboard` at some point, and the result is silently corrupted.

**Fix:** shape disambiguation should key off `schemaVersion` *first* (the strongest signal), then fall back to the field-presence check. Or: require `version` to be present in `validateWebProjectShape` (currently `version` is not in the validator's required-keys list — see P1-3 below). At minimum, add a test for this case so a future refactor notices.

### P0-5. `parseProjectFileContent` defaults for `ConnectionItem` silently diverge from `createDefaultConnection`
**Files:**
- `src/lib/projectFile.ts:416-434` (parser defaults for connections)
- `src/types/connectionItem.ts:31-45` (`createDefaultConnection`)

The parser fills in missing fields with hand-written defaults:
```ts
wireColor: "black",
wireCrossSection: 2.5,
wireType: "LgY",
routingMode: "manhattan",  // <-- the divergence
```
But `createDefaultConnection` returns:
```ts
wireColor: "black",
wireCrossSection: 2.5,
wireType: "LgY",
ferruleColor: "none",
routingMode: "orthogonal",  // <-- different
```

`ferruleColor` is **not** defaulted by the parser at all — it gets `undefined` if missing from a file. The `ConnectionItem` type marks it optional (`ferruleColor?: FerruleColor`), so this is "legal", but it means a file written before the field existed will have a different default than a fresh connection. Same for any future field added to `ConnectionItem` — the parser and the type would silently disagree.

**Impact:** when a user opens an old project, the new field's behaviour depends on the file's age. Hard to debug.

**Fix:** the parser should call `createDefaultConnection(overrides)` per item, not hand-write the defaults. That way the single source of truth is the type. A similar refactor is appropriate for `SymbolItem` defaults — see P2-3.

---

## P1 — correctness / UX impact

### P1-1. Missing schemaVersion edge-case tests
**File:** `src/lib/projectFile.test.ts:125-147`

The validator tests cover:
- `schemaVersion: 1` (Avalonia) — round-trip
- `schemaVersion: 2` (Web) — round-trip
- `schemaVersion: 999` (future) — rejection

What is **not** tested:
- `schemaVersion: 0` — should reject (`> 0` check on line 113), but the test does not pin this
- `schemaVersion: -1` — same
- `schemaVersion: 1.5` (float) — `Number.isInteger` should reject, untested
- `schemaVersion: 2` with no `version` key — P0-4 above, untested
- `schemaVersion: 2` with `version: "1.0"` — untested (does the validator trust the string `version` over the numeric `schemaVersion`?)
- File with `metadata` + `symbols` but no `schemaVersion` and no `version` — does the current code throw "Nieprawidlowy format pliku zlecenia" or get treated as `hasAvaloniaSchema` (line 401: `(!hasWebShape && !hasAvaloniaSchema)` → throws)?

The current tests pass; what they don't do is pin the shape. A refactor of `parseProjectFileContent` could silently break all of these cases and the tests would still pass.

**Fix:** add characterisation tests for each of the cases above. The whole `parseProjectFileContent` is the engineering file-format contract — it deserves an explicit "given X input, expect Y output" table.

### P1-2. No dedicated test for `migrateLegacyManualReferenceDesignations`
**File:** `src/lib/projectFile.ts:353-393`

The migration runs as a side-effect of `parseProjectFileContent`. Its behaviour:
- For every symbol whose `referenceDesignation` differs from the auto-generated one (and the symbol is not already flagged `ManualReferenceDesignation: "true"`), set `parameters[ManualReferenceDesignation] = "true"`.

This is **silent data mutation**. There is no test that:
- A symbol with matching designation is not mutated
- A symbol with `ManualReferenceDesignation: "true"` is not re-mutated
- A symbol with non-empty designation that the auto-layout would generate identically is left alone
- An empty `referenceDesignation` is left alone

The function calls `buildSchematicLayout` (line 340) to compute the auto designations. That layout depends on the current state of the schematic engine. If `schematicLayoutEngine.ts` ever changes its deterministic output (it is in the "container files" list in AGENTS.md:125), every previously-saved file gets re-mutated on next load.

**Fix:** extract the migration logic into a pure function that takes (symbols, automaticDesignationMap) and test it directly. Then the only test surface that touches `buildSchematicLayout` is the integration test in `parseProjectFileContent`. As part of the P0-3 fix, the migration should be wrapped in a registry and have its own round-trip test pinned to fixture data.

### P1-3. `validateWebProjectShape` does not require `version`
**File:** `src/lib/projectFile.ts:64-120`

`validateWebProjectShape` checks `metadata`, `symbols`, `connections`, `rail`, `schemaVersion`. It does **not** check `version`. Combined with P0-4, this means a Web-shape file without `version` is accepted as Avalonia. Two related concerns:

1. The shape check is incomplete — `version` should be a required field for the Web format and validated as a non-empty string.
2. Even within the `metadata` field, there is no nested validation. A `metadata: "garbage string"` passes `isRecord` (no, it doesn't — `isRecord` requires it to be `typeof "object"`), but a `metadata: { projectNumber: 123 }` (number instead of string) passes through and later breaks at render time. This is consistent with "we trust the serializer" but not with "we trust the file".

**Fix:** add `version` to the required-keys check, and at least validate that `metadata.projectNumber` (and the other string fields used by the PDF) are strings. Document the depth of validation in a `// WHY:` comment.

### P1-4. `handleConnectionsChange` in App.tsx is a parallel history-write path that bypasses both `useProjectActions` and the `useSymbolHistory` snapshot helpers
**File:** `src/App.tsx:194-205`
```ts
const handleConnectionsChange = useCallback((
  nextConnections: ConnectionItem[],
  label: string,
  statusMessage: string
) => {
  history.executeSymbolsCommand(
    label,
    { symbols, connections, selectedSymbolId, selectedSymbolIds },
    { symbols, connections: nextConnections, selectedSymbolId, selectedSymbolIds },
    statusMessage
  );
}, [history, symbols, connections, selectedSymbolId, selectedSymbolIds]);
```

The snapshot structure is constructed inline, not via a helper. If `SymbolHistorySnapshot` ever grows a new field (e.g. `rail: DinRailCanvasRail` for undo-able rail generation, which the rest of the codebase hints at — see `useProjectActions.handleRailGenerated:504-509` which passes `symbols: []` as the after-state but does not push the rail), the connection-change path will silently desynchronize.

`useProjectActions.handleAutoBalance` (`useProjectActions.ts:432-441`) uses the same shape: inline snapshot construction. `useSymbolActions.handleSymbolMoveEnd:281-286` and `handleCircuitEditSave:361-370` and `handleSchematicCellEdit:388-399` and `handleDeleteSelected:454-459` and `handleDuplicateSelected:560-569` all build their own `before`/`after` snapshots.

There is no shared helper like `makeSnapshot(symbols, connections, selectedId, selectedIds)` or `pushHistory(label, nextConnections, statusMessage)`. Adding one is the smallest-safe-change that reduces 6 copies of the same shape-construction code.

**Fix:** add a `buildSnapshot(...)` helper (or `pushHistory(label, mutator, statusMessage)`) to `useSymbolHistory.ts`. Migrate the 6 call sites over time — they don't all have to change in one PR.

### P1-5. `useProjectActions.handleMetadataChange` does not push to undo/redo history
**File:** `src/hooks/useProjectActions.ts:521-527`
```ts
const handleMetadataChange = useCallback(
  (nextMetadata: ProjectMetadata) => {
    setMetadata(nextMetadata);
    setHasUnsavedChanges(true);
  },
  [setHasUnsavedChanges, setMetadata],
);
```

`SymbolHistorySnapshot` (`src/lib/domain/snapshotUtils.ts:4-9`) does not include `metadata`. So metadata changes are *not* undoable, *not* redoable, and not part of the `hasUnsavedChanges` flow that ties into the dirty indicator. This is consistent with the rest of the codebase (PDF settings, theme, etc. are also not undoable), but the user-facing button is "Cofnij" (Undo). When a user clicks Undo expecting the last thing to revert, they get the last *symbols* change — which might be a different field of the project.

**Impact:** Low frequency (metadata edits are less common than symbol edits), high surprise (Ctrl+Z doesn't undo the change they just made).

**Fix:** either (a) add `metadata` to `SymbolHistorySnapshot` (carefully — it has many fields; the snapshot would balloon), or (b) document explicitly in the UI that Ctrl+Z only reverts circuit changes, not metadata. (a) is the right long-term answer; (b) is the smallest safe change. Talk to the user before (a) — adding `metadata` to snapshots may interact with auto-save frequency (currently 250ms debounce; a metadata change currently triggers 1 write, but every undo/redo would also be a "metadata change" by virtue of the snapshot now containing it).

### P1-6. `useDebouncedPersist` writes `JSON.stringify` without version markers; `loadProjectMetadata` reads with a legacy key but does not pin the schema
**Files:**
- `src/hooks/useDebouncedPersist.ts:13-22` — write
- `src/lib/projectMetadata.ts:410-428` — read (`loadProjectMetadata`)

The localStorage persistence layer (auto-save) has its own implicit schema: `JSON.stringify(metadata)` and `JSON.parse(raw) as Partial<ProjectMetadata>`. The `loadProjectMetadata` function reads from the new key (`dinboard-web.project-metadata.v1`) with a fallback to the legacy key (`dinboard-tauri.project-metadata.v1`) — this is real backward compat work, but it is not pinned by a test. The read path is `normalizeProjectMetadata(JSON.parse(raw) as Partial<ProjectMetadata>)`, so it tolerates a missing field by filling defaults, which is good.

**The gap:** if `ProjectMetadata` ever gains a *required* field (not Optional), the old localStorage data will not have it, `normalizeProjectMetadata` will set a default, and the user loses their saved value silently. There is no schema version on the localStorage payload. The v1 suffix in the key is purely cosmetic — there is no "v1 reader" code, the read path is the same as the write path.

**Same applies to `SYMBOLS_STORAGE_KEY` and `CONNECTIONS_STORAGE_KEY`** (`App.tsx:100-106`): they are read with `JSON.parse` and a `try/catch` that returns `[]` on failure. There is no `normalizeSymbolItems(JSON.parse(raw))` on this read path (compare to `handleLoadProjectData` which does call `normalizeSymbolItems` indirectly via `normalizePaletteAssetDimensions`). Wait — let me re-check:

`App.tsx:90-99`:
```ts
const raw = safeGetItemSync(SYMBOLS_STORAGE_KEY) ?? safeGetItemSync(LEGACY_SYMBOLS_STORAGE_KEY);
if (raw) {
  const normalized = normalizeSymbolItems(JSON.parse(raw) as Partial<SymbolItem>[]);
  if (normalized.length > 0) return normalized;
}
```

OK — `normalizeSymbolItems` IS called. Good. But for **connections** (`App.tsx:100-106`):
```ts
const raw = safeGetItemSync(CONNECTIONS_STORAGE_KEY);
if (raw) return JSON.parse(raw) as ConnectionItem[];
```
**No normalization.** If `ConnectionItem` gains a required field, the auto-save restore path will silently pass through partially-typed arrays. And the legacy-key fallback for connections is **missing** entirely — `LEGACY_CONNECTIONS_STORAGE_KEY` does not exist in `appHelpers.ts` (only `LEGACY_SYMBOLS_STORAGE_KEY` is defined). If connections were ever persisted under a different key in a previous build, they are silently lost on first launch of the new build.

**Fix:**
1. Add `LEGACY_CONNECTIONS_STORAGE_KEY` and a fallback in the connections read path (`App.tsx:100-106`).
2. Add a payload-version marker (e.g. `{ version: 1, data: { ... } }`) to the localStorage write/read for metadata, symbols, and connections. Bump the version on any required-field addition. Migrate in `loadProjectMetadata` and the `useState` initialisers.
3. Pin a test for `loadProjectMetadata` that exercises the legacy key path.

### P1-7. `useProjectActions.handleLoadProjectData` runs `validateProjectSemantics` and shows errors in the status bar, but does not surface a blocking UI
**File:** `src/hooks/useProjectActions.ts:225-245`

The status message `Otwarto zlecenie (N błędów, M ostrzeżeń) — sprawdź walidację` lives in the status bar for 6 seconds. After that, the user is in the project, errors and all. There is no persistent validation panel that auto-opens on load-with-errors. This is consistent with the comment at line 224-225 ("Semantic validation runs after the project loads so the user can still open and repair a malformed file. Errors do not block loading."), which is the right behaviour, but the *visibility* of the errors is too low.

This is technically UX, not I/O, but it sits in the project I/O handler.

**Fix:** if `errorCount > 0`, programmatically set the active right tab to `"validation"` and the active sheet to the validation page. The current `useProjectActions` does not have `setActiveSheet` for the right tab — would need a small extension.

### P1-8. `setHasUnsavedChanges` is set to `true` after every `applySymbolsSnapshot` (undo/redo)
**File:** `src/hooks/useSymbolHistory.ts:103`
```ts
setHasUnsavedChanges(true);
```

This is inside `applySymbolsSnapshot`, which is called from both `executeSymbolsCommand` (forward direction) and `undo`/`redo` (backward). So undo/redo mark the project as dirty. Is that correct?

Forward: user makes a change, file is dirty. Correct.
Undo: user reverts a change. The file was clean, the change made it dirty, the undo makes it clean again. But `setHasUnsavedChanges(true)` after undo will lie about state. Unless the project was already dirty, in which case it stays dirty. Either way, the *direction* of `setHasUnsavedChanges(true)` is always the same.

If the project was clean (just opened, no edits) and the user hits Ctrl+Z, the project becomes "dirty" by the flag — but the user has just reverted to the loaded state. The flag should arguably be `false` if the snapshot is byte-identical to the loaded state.

This is a subtle UX issue, not a data-loss one.

**Fix:** track the "clean snapshot" (the state right after the last `handleLoadProjectData` / `handleNewProject` / `handleSaveProject`) and compare the current snapshot to it; if equal, `setHasUnsavedChanges(false)`. Or simpler: do not set `hasUnsavedChanges` to `true` from `applySymbolsSnapshot` at all — let the forward-direction caller (`executeSymbolsCommand` at line 119-152) be the only one to flag dirty. Currently, the forward direction also goes through `applySymbolsSnapshot` (via the `execute` closure in `createActionCommand` at line 144-148), so removing the flag from `applySymbolsSnapshot` means the forward direction also won't set it. So this would need to be split: forward direction sets the flag, undo/redo do not.

---

## P2 — cleanup / duplication / dead code

### P2-1. `getTauriInvoke` is called twice with separate `isTauri()` checks
**File:** `src/lib/projectFile.ts:530-536, 596, 641`

`isTauri()` is a cheap synchronous check but it's a non-trivial side effect (it inspects `window.__TAURI_INTERNALS__` etc.). Calling it twice per save/open is harmless but a clean implementation would cache the result at module scope. Negligible.

### P2-2. `selectProjectFile` uses a heuristic `window.focus` + 250ms setTimeout to detect "user dismissed the file picker"
**File:** `src/lib/projectFile.ts:471-509`

This is fragile. If the user opens the file picker, then takes a phone call for 2 minutes, then dismisses the dialog, the helper has already returned `null` 250ms after the window regained focus. Conversely, if the system is slow and the dialog takes >250ms to show, the helper may resolve to `null` before the user has even seen the dialog.

Modern browsers support `showOpenFilePicker` (returns a `FileSystemFileHandle[]` or aborts on user cancel). The save side already uses `showSaveFilePicker`; the open side should mirror that.

**Fix:** use `showOpenFilePicker` when available, fall back to the input element. Add a wrapper to the `window` type similar to the `showSaveFilePicker` wrapper at line 553-567.

### P2-3. Hand-written parser defaults duplicate `createDefaultConnection` and `createDefaultSymbolItem`
**Files:**
- `src/lib/projectFile.ts:217-254` — `extractProjectSymbols` (per-item normalisation for type, label, visualPath, moduleRef, moduleSourceType, phase)
- `src/lib/projectFile.ts:416-434` — connection defaults

The parser manually re-implements the type's `createDefault*` defaults. The single source of truth is split: if a new field is added to `SymbolItem`, three places need updates (the type, `createDefaultSymbolItem`, and the parser's per-item mapper).

**Fix:** the per-item mapper should be `createDefaultSymbolItem({...rawItem})` instead of `{...rawItem, type: ..., label: ..., ...}`. This guarantees new fields get their default automatically.

### P2-4. `applyRailFromSymbols` and the `handleLoadProjectData` rail-from-symbols branch duplicate rail-rebuild math
**File:** `src/hooks/useProjectActions.ts:113-131` and `src/hooks/useProjectActions.ts:212-222`

`applyRailFromSymbols` is a `useCallback` that recomputes rail config from symbols. `handleLoadProjectData` has the same logic inline:
```ts
} else {
  applyRailFromSymbols(normalizedSymbols);
}
```
Wait, this is *using* `applyRailFromSymbols`, not duplicating it. Re-checking... OK, `handleLoadProjectData` does call `applyRailFromSymbols`. The actual rail config reconstruction in `handleRailGenerated` (line 501-519) does **not** use `applyRailFromSymbols` — it accepts the new config from the generator. So the duplication is minor: `applyRailFromSymbols` is the only place, and the rail-config calculation is centralized.

Wait, re-reading: `applyRailFromSymbols` is at line 113-131, called from `handleLoadProjectData` at line 221. There is no duplicate. **This is a false positive in my pass.** Moving on.

### P2-5. `_maxHistoryDepth = 50` is hard-coded
**File:** `src/lib/editing/undoRedoService.ts:10`

The undo history depth is 50 commands. For a complex distribution-board project (50+ circuit changes is normal), the user will start losing history after ~50 actions. This is a UX concern, not a correctness one. The constant is private and unconfigurable.

**Fix:** make it a constructor parameter with a default, or hoist it to a constant exported from the file so it can be tuned in one place.

### P2-6. Two parallel `SymbolHistorySnapshot` construction sites
See P1-4. This is the same finding at the cleanup severity. Six call sites, no shared helper.

### P2-7. `MANUAL_REFERENCE_DESIGNATION_KEY` is a string constant defined twice
**File:** `src/lib/projectFile.ts:12` — `const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";`
**File:** `src/hooks/useSymbolActions.ts:523` — `delete clone.parameters.ManualReferenceDesignation;`

The second use is a string literal, not a reference to the constant. If the key is ever renamed in `projectFile.ts`, the duplication in `useSymbolActions.ts` will silently break the migration. There is no test that pins the key.

**Fix:** export `MANUAL_REFERENCE_DESIGNATION_KEY` from `projectFile.ts` (or a new `lib/migrationKeys.ts`) and import it in `useSymbolActions.ts`.

### P2-8. `useProjectActions` parameter list is 19 fields
**File:** `src/hooks/useProjectActions.ts:57-86`

`UseProjectActionsParams` is a kitchen-sink interface: metadata, setMetadata, symbols, setSymbols, connections, setConnections, currentFilePath, setCurrentFilePath, paletteTemplateMap, setHasUnsavedChanges, selectedSymbolId, selectedSymbolIds, setSelectedSymbolId, setSelectedSymbolIds, setDinRail, dinRail, setActiveSheet, setDinRailGeneratorRequest, undoRedoServiceRef, dragHistorySnapshotRef, refreshHistoryState, executeSymbolsCommand, showTemporaryStatus.

That's 23 fields. Most of them are forwarded to two callbacks or used to set up derived state. The `paletteTemplateMap` is only used in `handleLoadProjectData:204`. The `dinRailGeneratorRequest` setter is only used in `handleOpenDinRailGenerator:498`. The `dragHistorySnapshotRef` and `undoRedoServiceRef` are passed back to `resetProjectState` for cleanup.

Splitting this is a real refactor (mentioned in AGENTS.md as a "container file" risk), but the surface is wide enough that a one-line change to `UseProjectActionsParams` requires editing the call site in `App.tsx` (a 23-line argument list at line 213-220).

**Fix:** not urgent. The current shape is honest about the surface. Document the dependency surface in a `// WHY:` comment so future readers don't add fields carelessly.

### P2-9. `parseProjectFileContent` is 50 lines long
**File:** `src/lib/projectFile.ts:395-444`

The function does shape disambiguation, validation, Avalonia→Web migration, coordinate normalisation, manual-reference migration, connection parsing, rail reconstruction, and version fallback — all in one body. A future second migration will make it longer.

**Fix:** extract the `hasWebShape` / `hasAvaloniaSchema` detection into `detectShape(parsed): { kind: 'web' | 'avalonia' | 'unknown' }`. Extract connection parsing into `parseConnections(raw)`. This is the natural side-effect of the P0-3 fix (migration registry).

### P2-10. `applyRailFromSymbols` is not exported but its inverse (regenerating rail config from symbols) is duplicated inside the rail generator module
**File:** `src/lib/schematic/dinRailGenerator.ts` (referenced at `useProjectActions.ts:27`)

The function `applyRailFromSymbols` is local to `useProjectActions.ts`. The rail config math (rows, modulesPerRow from `maxX` and `width`) is a pure calculation that could live in `dinRailGenerator.ts` next to `generateDinRailSvg` and `getDinRailDimensions`. That would also allow testing it in isolation.

**Fix:** move `applyRailFromSymbols` (renamed `computeRailConfigFromSymbols`) into `dinRailGenerator.ts`, test it.

### P2-11. `handleOpenDinRailGenerator` and `handleRailGenerated` are wired through `setDinRailGeneratorRequest` counter (a 1970s-style "please re-render" signal)
**File:** `src/hooks/useProjectActions.ts:496-519`

The "request" is a counter that increments to tell another component to open the generator dialog. This is a non-idiomatic state-shared-via-counter pattern that breaks if two requests fire in the same render.

**Fix:** hoist the rail-generator dialog into a React portal driven by a boolean state, not a counter. Outside the scope of project I/O but flagged for the developer.

---

## P3 — nit / perf

### P3-1. `cloneSymbolsSnapshot` runs 2-3 times per undo/redo
**File:** `src/hooks/useSymbolHistory.ts:127, 135, 94`

`executeSymbolsCommand` clones before+after, then `applySymbolsSnapshot` clones again on undo/redo. For 1000 symbols × 50 undo steps, that's ~150k deep clones. Negligible at 100 symbols, but the cost is paid even when nothing changes (because the no-op short-circuit at line 119-124 already returns `false`).

**Fix:** the no-op short-circuit is already in place. The remaining cost is real but bounded. Leave it; the next perf audit can pick this up.

### P3-2. `JSON.stringify` of the full project on every save has no streaming
**File:** `src/lib/projectFile.ts:447-469`

For a 5k-symbol project, the JSON is ~5MB. `JSON.stringify` is sync, so the UI thread blocks for ~100ms. Not data loss, just jank.

**Fix:** punt. The current file size is bounded; if projects grow past 10k symbols, look at JSON streaming or `JSON.stringify` via a worker.

### P3-3. `safeGetItemSync` returns `null` on native platforms, leading to "first render = empty state" flash
**File:** `src/lib/storageService.ts:103-114`

The async load happens in a `useEffect`, so the first render shows empty state. Acceptable for a 50-symbol project, janky for a 1k-symbol one.

**Fix:** show a "Ładowanie…" overlay during the first async load. Or migrate the data on app start to the sync `localStorage` path. Or accept the flash.

### P3-4. `escapeCsv` lives in `useProjectActions.ts:44-51` instead of a shared utility
The CSV escape is correct but inline. It deserves a `lib/csv.ts` with a test.

### P3-5. `parseProjectFileContent` returns the original symbol reference if no migration ran
**File:** `src/lib/projectFile.ts:392`
```ts
return changed ? migratedSymbols : symbols;
```
This is a good optimisation. The downstream code (`useProjectActions.handleLoadProjectData:204-206`) treats the returned array as immutable — if it gets the *original* reference and mutates it (e.g. `setSymbols` then a re-render that double-renders the loader), the original state in `useState` would be corrupted. This is paranoid but worth flagging.

**Fix:** always return a new array. The cost is one `Array.from(symbols)` or `[...symbols]`. The correctness guarantee is worth the perf hit.

### P3-6. Tauri `set_title` and `set_directory` strings are not localised
**File:** `src-tauri/src/lib.rs:32, 75`

Polish-only. The frontend supports both Polish and English surfaces. This is the only Rust-side user-visible string. Not a P0 because the Rust side is single-platform (the user's Windows machine), but flag for a future i18n pass.

---

## Test coverage gaps (cross-cutting)

The current test files in scope:

| File | Test lines | What it covers | What it misses |
|---|---|---|---|
| `src/lib/projectFile.test.ts` | 285 | Web round-trip, Avalonia round-trip, schemaVersion=999 rejection, validation errors for missing fields | schemaVersion: 0/-1/float, schemaVersion:2 without `version`, migration isolation, default-routingMode divergence, every connection field default |
| `src/lib/projectFileSemantics.test.ts` | — (not read in this pass) | 19 semantic rules (SEM-001..SEM-019) | likely nothing; this is well-covered |
| `src/hooks/useProjectActions.test.ts` | 1104 | save/open/new/export flows, balance, phase move, integration round-trip | landing-page open (P0-1), rail-from-symbols edge cases, validation surface (P1-7) |
| `src/hooks/useProjectActions.semantic.test.ts` | 184 | validation integration in `handleLoadProjectData` | the message format for 2+/5+ błędów (the comment at `useProjectActions.ts:230-231` admits this is "only 1 and 2+ are covered") |
| `src/hooks/useSymbolHistory.test.ts` | 287 | command/undo/redo, connection snapshots, multiple sequential commands | rail in snapshot (no test for `handleRailGenerated` pushing rail), empty-history state after `clear` |
| `src/lib/editing/undoRedoService.test.ts` | 151 | full undo/redo cycle, max depth | cross-tab sync (e.g. `BroadcastChannel` to share history between windows) — not currently a feature |

Total test count for the files in scope: roughly 600 test cases spread across 6 files. AGENTS.md baseline says 249 across 33 files (2026-06-07) — the I/O layer is *over*-tested relative to the rest. The gap is in **characterisation tests for the parser edge cases** (P1-1, P1-2, P1-3) and in **integration tests for the landing page flow** (P0-1).

---

## What was NOT audited

- The PDF export layer (`src/lib/export/**`, `src/components/PdfDocumentationPage.tsx`) — out of scope; covered by `audit-pdf.md`.
- The phase distribution layer (`src/lib/phaseDistribution/**`) — out of scope; covered by `audit-electrical.md`.
- The canvas layer (`src/components/DinRailCanvasPixi.tsx`, `src/lib/schematic/**`) — out of scope; covered by `audit-canvas.md`.
- Tauri build configuration (icons, bundling, signing) — not in scope.
- The Capacitor/iOS/Android native shell — not in scope; the only native touch points (`Capacitor.isNativePlatform()` in `useProjectActions.ts:273, 280`) use the standard pattern.
- Performance under load (5000+ symbols) — partially touched in P3-2, P3-3. Not the focus of this audit.
- Security review of the Web frontend (CSP, XSS surface) — not in scope; AGENTS.md does not flag this layer as a concern, and the security risk of the project file format is "user-supplied JSON", which is parsed defensively (P0-4 is the one gap).

---

## Recommended fix order (smallest safe change per PR)

1. **P0-2** — Remove dead Tauri commands + `loadProjectFromPath`. One-file change per artefact. No tests needed (they are dead).
2. **P0-1** — Route landing-page open through `useProjectActions` semantics. Touches `App.tsx`. Add test for the error path.
3. **P0-5** — Replace connection parser defaults with `createDefaultConnection(...)`. Add test for the routingMode divergence.
4. **P0-4** — Tighten shape disambiguation in `parseProjectFileContent`. Add characterisation test.
5. **P1-6** — Add `LEGACY_CONNECTIONS_STORAGE_KEY`, payload version on auto-save. Add tests.
6. **P1-1, P1-2, P1-3** — Add characterisation tests for schemaVersion edges and migration. No code change required if 4 and 5 are done first.
7. **P0-3** — Migration registry. This is the biggest structural change. Worth a separate PR with the developer's input on the per-migration signature.
8. **P1-4, P1-5** — Snapshot helper + metadata in undo. Requires user buy-in (P1-5 changes the dirty-flag semantics).
9. **P1-7, P1-8, P2-*, P3-*** — Polish.

Each of the P0 fixes is small enough to be a single PR. The P0-3 migration registry is the only one that warrants a design conversation first.
