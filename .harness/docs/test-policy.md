# DINBoard Test Policy

This doc defines the test discipline for DINBoard Web. Vitest + jsdom + @testing-library/react is the fixed stack. The application is engineering software: silent regressions have real-world consequences, so tests are part of the contract, not a chore.

## Stack

- Test runner: `vitest` (see `package.json`).
- DOM: `jsdom`.
- React: `@testing-library/react` + `@testing-library/jest-dom`.
- Targeted file runs: `npm.cmd run test -- <path>`.
- Full suite: `npm.cmd run test`.
- Pre-merge gate: `npm.cmd run build` + `npm.cmd run test`.

## Test placement

- Place `*.test.ts(x)` next to the file under test. Co-location beats a distant `__tests__/` tree in a project this size.
- One test file per source file unless the source is too small (then group).
- Test names describe the property being tested, not the implementation. `rejects: null current` is good. `calls the function twice` is bad.

## What to test

Required for these subsystems (see AGENTS.md "high-risk areas"):

- Phase distribution: any change → characterization test for current behaviour, then a new test for the new behaviour.
- Validation: every validation rule needs a test that pins its threshold and outcome.
- Circuit rows / RCD-MCB / RCBO: tests for grouping logic, RCD → child MCB relationship, edge cases.
- Project metadata: tests for default values and required-field checks.
- Save/load (`projectFile.ts`): round-trip test (save → load → deep-equal). One per format version if you ever ship a version.
- Backward compatibility: a test that an old-version file still loads correctly.
- Symbol history: undo/redo restores exact prior state including selection and sheet.
- Canvas geometry (`dinRailSnap`, `dinRailSelection`, `schematic`): deterministic unit tests over snapshot tests. Snapshots drift.
- Modules/SVG import: validation of imported SVG (no scripts, no external refs); normalization is idempotent; asset caching is stable across calls.
- PDF / measurement protocols: tests that pin the input data, the section order, and the output structure (not the visual).

## What NOT to test

- Visual rendering of the canvas (do it manually, on a populated rail).
- `dangerouslySetInnerHTML` paths (test the sanitizer, not the HTML).
- Pixi internals.
- The full PDF binary (test the structure, snapshot the input → output mapping).

## When to run what

- Single file change → `npm.cmd run test -- <path-to-test>` first.
- Multi-file change → `npm.cmd run test` after green targeted run.
- Pre-merge → `npm.cmd run build` + `npm.cmd run test`.
- A change to `src-tauri/**` → manual smoke (Tauri build path is not unit-tested here).
- A change to `@react-pdf/renderer` output → generate a real PDF and inspect it.

## Coverage expectations

There is no hard percentage. The rule is: **the rule the function enforces must have a test**. If you can't describe the rule in one sentence, the test is too coarse.

## Test isolation

- No network in tests.
- No real filesystem outside a per-test temp dir.
- No reliance on `Date.now()` / `Math.random()` — inject or stub.
- For hooks: test through `@testing-library/react` `renderHook` with a real `act()`-driven flow, not by reaching into React internals.

## Adding tests with risky changes

For any change to a high-risk subsystem, the test must be added **before** (or alongside) the code change, and must describe the property. If the user later reverts the change, the test stays as a characterization pin.
