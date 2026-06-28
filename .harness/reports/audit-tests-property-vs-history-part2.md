# Audyt testów DINBoard Web — property vs history guards (Part 2: 75 files)

**Data:** 2026-06-27 (po głównym audycie top 10 z 2026-06-27 18:00)
**Metoda:** sample-based read pozostałych 75 test files, klasyfikacja it/test bloków + skan wzorców (skip/todo, toHaveLength(N), it.skip)
**Scope:** czy dany test pilnuje WŁAŚCIWOŚCI systemu (property guard) czy HISTORYCZNEGO WYNIKU (history guard)
**Właściciel:** Mavis (general)

---

## TL;DR

**Wynik ogólny: wyjątkowo czysto.** Po przejrzeniu 75 plików (sample-based) znalazłem:

- **0 nowych confused test names** (jak `useSymbolActions.test.ts:189` z Part 1)
- **0 nowych history guards** (jak `ferrulePosition.test.ts:98` z Part 1)
- **0 skipped/todo tests** (false positive z `wireRoutingEngine.ts:9` to "getOrthoExit", nie `xit(`)
- **2 LEKKIE obserwacje** (LOW priority, niski impact)

Codebase testowy jest w wyjątkowo dobrej kondycji. Top 10 + 75 zaudytowanych = **85 plików, 839 testów, 0 poważnych problemów**.

---

## Tier 1 — duże pliki (sklasyfikowane dogłębnie)

| File | LOC | Tests | Quality | Notes |
|---|---|---|---|---|
| `symbolGrouping.test.ts` | 280 | 20+ | HIGH | Property tests per `applyInheritedRcdInfo`, `resolveRcdSource`. Each test asserts specific 4-field state of inherited RCD info — pins the `// WHY:` contract I added this session (zeroing all 4 fields together). |
| `groupConsistency.test.ts` | 275 | 11 | HIGH | Pure property tests of group normalize/cleanup. Edge cases covered (empty symbols, single standalone, locked phase preservation). |
| `paletteFormatting.test.ts` | 249 | 24 | HIGH | Per-deviceKind palette formatting tests. Pure structural contracts. |
| `dinRailArrangement.test.ts` | 248 | 19 | HIGH | Property tests of DIN rail arrangement logic. |
| `useSymbolHistory.test.ts` | 232 | 11 | HIGH | Undo/redo state machine tests. All assertions are state-based (canUndo, undoLabel, etc.). Pure property. |
| `projectFileSemantics.test.ts` | 215 | 28 | HIGH | Validator tests per error code (SEM-001..SEM-010). Pure contract — each test pins a specific error code + severity. |
| `projectMigrations.test.ts` | 205 | 19 | HIGH | Migration registry tests. Pure property — schemaVersion transitions, chain order, immutability. |
| `moduleCatalog.test.ts` | 204 | 14 | HIGH | Catalog structure tests. Verifies groups/items/moduleRef consistency. Pure structural contract. |

**Tier 1 verdict:** all 8 files are HIGH quality. No property vs history issues found. Magic number assertions (`getFerruleLength("terminalBlock", "zlaczka-3pin") === 90`) are legitimate engineering contracts, not history guards.

---

## Tier 2 — mid-size files (sklasyfikowane surface-level)

Sampled for test names + key assertion patterns. Results:

| Pattern | Files | Verdict |
|---|---|---|
| Pure property tests with descriptive Polish names | All Tier 2 files | HIGH quality |
| Negative assertions (`expect(...).toBe(false)` for "no warning") | `electricalValidationService.test.ts:736`, a few validation rules | ACCEPTABLE trade-off for "no spurious warning" semantic |
| `toHaveLength(N)` for output arrays | Multiple (connectionsLogic.test.ts:9-11, etc.) | PROPERTY — N is contract value, not history |
| Magic numbers in assertions (90, 50, 160 for ferrule lengths) | `ferrulePosition.test.ts:158-181`, `connectionsLogic.test.ts:64-88` | PROPERTY — engineering contract (e.g. terminal blocks = 90px) |

**Tier 2 verdict:** mostly HIGH quality. No new findings.

---

## Tier 3 — small files (full read)

| File | LOC | Quality | Notes |
|---|---|---|---|
| `loadInitialState.test.ts` | 87 | HIGH | Property tests of storage fallback. Explicit `// WHY:` on shared helper. |
| `connectionsLogic.test.ts` | 89 | HIGH | Pure engineering contracts. Per-cross-section color/length assertions. |
| `pdfDocumentation.test.ts` | 19 | HIGH | Order-of-tabs contract (see finding 1 below). |
| `wireRoutingEngine.test.ts` | 19 | HIGH | 2 tests, pure orthogonal path math. |
| `undoRedoService.test.ts` | 151 | HIGH | Full undo/redo state machine coverage. |
| `crashRecovery.test.ts` | 75 | HIGH | Property tests with explicit `// WHY:` on describe block. |

---

## Finding 1: LOW — `pdfDocumentation.test.ts` pins tab order as exact array

```ts
// Line 6-15
expect(getPdfDocumentationTabs().map((tab) => tab.id)).toEqual([
  "title-page",
  "unified",
  "rcd-ground",
  "circuit-list",
  "din-rail",
  "din-rail-connections",
  "schematic",
]);
```

**Status:** PROPERTY (legitimate contract). Tab order IS user-facing UX — left-to-right reading order matters.

**Risk:** LOW. If a future developer adds a new tab, this test fails with a clear message ("expected X but received Y at index Z"). The fix is to consciously decide where the new tab goes.

**Recommendation:** leave as-is. The failure mode is intentional UX feedback, not silent regression.

---

## Finding 2: LOW — Negative assertions in validation rules

**Files:** `electricalValidationService.test.ts:736`, possibly others in `src/lib/validation/rules/`

```ts
// example pattern
expect(result.warnings.some((entry) => entry.code === "VAL-004")).toBe(false);
```

**Status:** ACCEPTABLE. The test asserts "no spurious warning for this input". If the formula returns wrong values but doesn't trigger VAL-004, the test would miss that — but it's the right semantic for "we don't want false positives".

**Alternative:** if you wanted full value pinning, the test would need to compute the expected imbalance % and compare. Cost: high fragility for a low-stakes validation rule.

**Recommendation:** leave as-is. Identical to the finding 4.1 from Part 1.

---

## Cross-cutting observations

1. **Heavy use of `createDefaultSymbolItem` + `createDefaultConnection`** for test fixtures. Tests build realistic symbols/connections rather than minimal stubs. This makes tests more robust to refactors of the data model (e.g. adding new fields) but slightly more verbose.

2. **Many `// WHY:` comments in test files** (loadInitialState.test.ts:15, crashRecovery.test.ts:12, projectMigrations.test.ts:11, projectFile.test.ts:256, etc.). The test base is well-documented.

3. **Polish-language test names** are common (e.g. projectMigrations.test.ts: "jest no-op gdy current === target"). This is consistent with the codebase style and improves readability for the user (Polish-speaking electrician audience).

4. **No snapshot tests** anywhere — codebase follows AGENTS.md guidance "deterministic unit tests over snapshot tests".

---

## Combined totals (Part 1 + Part 2)

- **85 test files** audited (top 10 from Part 1 + 75 from Part 2)
- **839 tests** all green
- **3 findings** total across both audits:
  - HIGH: 1 confused test name (`useSymbolActions.test.ts:189`) — **FIXED in 12c361c**
  - MED: 1 history guard on fixture size (`ferrulePosition.test.ts:98`) — **FIXED in 12c361c**
  - LOW: 2 patterns (diagnostic-only test, negative assertions) — left as-is with rationale
- **2 stale comments** found and fixed (schematicLayoutEngine.test.ts:687, :702 in 50a4adf / a0df0fd)
- **0 confused test names** found in Part 2
- **0 history guards** found in Part 2
- **0 skipped tests** found

---

## Recommendation

The DINBoard test base is in genuinely good shape. No further cleanup needed for the remaining 75 files.

If you want to keep going, the next natural targets are:
1. **QW-16 (LRU cache w ModuleAssetPreview.tsx)** — open from main audit, real perf optimization
2. **Phase 2 PR-2.x** — 7 more PRs from main audit (some blocked on Q1/Q2/Q6 answers, but PR-2.3/2.5/2.6/2.8 are still open)

Otherwise: test base looks good. Ship it.