import { describe, expect, it, vi } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { createEmptyProjectMetadata } from "../../projectMetadata";
import {
  countPdfPages,
  formatDisplayDate,
  formatProtocolNumberLabel,
  formatProtocolTitle,
  getSuffix,
} from "./pdfHelpers";

describe("formatProtocolNumberLabel", () => {
  it("strips 'Protokół Nr' prefix", () => {
    expect(formatProtocolNumberLabel("Protokół Nr 03/12")).toBe("03/12");
  });

  it("strips 'Protokół pomiarów Nr' prefix (extended form)", () => {
    expect(formatProtocolNumberLabel("Protokół pomiarów Nr 03/12")).toBe("03/12");
  });

  it("is case-insensitive (matches i flag)", () => {
    expect(formatProtocolNumberLabel("PROTOKÓŁ NR 03/12")).toBe("03/12");
  });

  it("returns unchanged when no prefix", () => {
    expect(formatProtocolNumberLabel("03/12")).toBe("03/12");
  });

  it("returns empty string for undefined", () => {
    expect(formatProtocolNumberLabel(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(formatProtocolNumberLabel("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(formatProtocolNumberLabel("   ")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(formatProtocolNumberLabel("  Protokół Nr 03/12  ")).toBe("03/12");
  });

  // To jest defensywna unifikacja — wcześniej PdfUnifiedTablePage.tsx
  // przekazywał `string` (compile error gdy undefined), MeasurementProtocolsWorkspacePage
  // przekazywał `string | undefined`. Po unifikacji oba przypadki działają.
  it("handles undefined without throwing (defensive: unifies two call sites)", () => {
    expect(() => formatProtocolNumberLabel(undefined)).not.toThrow();
  });
});

describe("getSuffix", () => {
  // Implementacja zwraca litery alfabetu: 0='A', 1='B', 2='C'... (ASCII 65+index).
  // Używane do oznaczania "część X/Y" w nagłówkach protokołu.

  it("returns empty for single chunk (1 of 1)", () => {
    expect(getSuffix(1, 0)).toBe("");
  });

  it("returns 'A' for first chunk of multi (0 of 3)", () => {
    expect(getSuffix(3, 0)).toBe("A");
  });

  it("returns 'B' for middle chunk (1 of 3)", () => {
    expect(getSuffix(3, 1)).toBe("B");
  });

  it("returns 'C' for last chunk (2 of 3)", () => {
    expect(getSuffix(3, 2)).toBe("C");
  });
});

describe("formatProtocolTitle", () => {
  it("appends suffix right after 'Protokół Nr X' (no space)", () => {
    // Format: "Protokół Nr" + (number) + suffix — suffix jest wstawiane
    // bezpośrednio po liczbie (np. "Protokół Nr 03A/12").
    expect(formatProtocolTitle("Protokół Nr 03/12", "A")).toBe("Protokół Nr 03A/12");
  });

  it("returns unchanged when suffix is empty", () => {
    expect(formatProtocolTitle("Protokół Nr 03/12", "")).toBe("Protokół Nr 03/12");
  });

  it("appends suffix to first number when no 'Protokół Nr' match", () => {
    expect(formatProtocolTitle("Custom Title 5", "A")).toBe("Custom Title 5A");
  });

  it("appends suffix at end when no number found", () => {
    expect(formatProtocolTitle("Title Without Number", "A")).toBe("Title Without Number A");
  });
});

// ---------------------------------------------------------------------------
// UI ↔ PDF consistency regressions (Bug A + Bug B).
//
// These pin the contract that `formatDisplayDate` and `countPdfPages` exist
// for: both the workspace preview and the PDF renderer must call them, and
// they must agree on what gets rendered. The historical bug was that the
// preview and PDF computed the date and page count independently, and the
// two implementations drifted apart.
// ---------------------------------------------------------------------------

describe("formatDisplayDate", () => {
  it("renders the empty-drawingDate fallback in DD.MM.YYYY (Polish pl-PL)", () => {
    // WHY: pin the regression — empty drawingDate must look the same in the
    // preview header and the PDF header. The previous bug had the preview
    // fall back to `toLocaleDateString("pl-PL")` and the PDF fall back to
    // `formatDateForField(...)` (ISO), producing different strings.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T12:00:00Z"));
    try {
      const result = formatDisplayDate(createEmptyProjectMetadata());
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      // 21.06.2026 is the Polish-locale rendering of 2026-06-21 in the
      // Europe/Warsaw timezone (UTC+2 in June). Both the test's fake clock
      // and a real electrician's wall clock land on the same date — that's
      // the contract.
      expect(result).toBe("21.06.2026");
    } finally {
      vi.useRealTimers();
    }
  });

  it("accepts an explicit ISO drawingDate and reformats it to DD.MM.YYYY", () => {
    // WHY: even when the user typed an ISO date into the metadata form, the
    // PDF/preview header must show DD.MM.YYYY — the canonical display format
    // for Polish engineering deliverables.
    const result = formatDisplayDate({
      ...createEmptyProjectMetadata(),
      drawingDate: "2026-05-23",
    });
    expect(result).toBe("23.05.2026");
  });

  it("falls back to today's date for an unparseable drawingDate (never returns empty)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T10:00:00Z"));
    try {
      const result = formatDisplayDate({
        ...createEmptyProjectMetadata(),
        drawingDate: "not-a-date",
      });
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      expect(result.length).toBe(10);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("countPdfPages", () => {
  // WHY: `createEmptyProjectMetadata()` seeds `measurementProtocols.unifiedRows`
  // with 15 placeholder rows (LOOP_ROW_COUNT) and `rcdRows` with 6 — the PDF
  // renders both sections even for an "empty" project. Pin the baseline:
  //   2 (title) + 1 (toc) + 1 (summary) + 0 (no symbols → no circuit list)
  //   + 3 (15 unified rows / UNIFIED_ROWS_PER_PAGE=7) + 1 (RCD, single page)
  //   + 0 (no schematic, no DIN rail in this call) = 7
  it("returns 8 for an empty project (title + toc + summary + 3 unified + 1 RCD)", () => {
    const total = countPdfPages(createEmptyProjectMetadata(), []);
    expect(total).toBe(8);
  });

  it("counts both DIN rail pages (wires-off + wires-on) — Bug B regression", () => {
    // WHY: pdfExportService always renders BOTH the wires-off and wires-on
    // DIN rail snapshots as separate A4 pages. The UI footer must match.
    // 7 (empty project baseline) + 2 DIN rail pages = 9.
    const total = countPdfPages(createEmptyProjectMetadata(), [], {
      dinRailImages: ["<svg wires-on/>"],
      dinRailWithoutWiresImages: ["<svg wires-off/>"],
    });
    expect(total).toBe(10);
  });

  it("excludes empty circuit-list and unified sections from the total", () => {
    // Empty sections (no rows) do not render at all — `&& rows.length > 0`
    // guards in PdfProtocolDocument skip them. We construct a metadata object
    // with explicit empty unified + rcd rows to verify the skip behaviour.
    const metadata = {
      ...createEmptyProjectMetadata(),
      measurementProtocols: {
        ...createEmptyProjectMetadata().measurementProtocols,
        unifiedRows: [],
        rcdRows: [],
      },
    };
    const total = countPdfPages(metadata, []);
    // title (2 pages) + toc + summary only = 4 (no DIN rail, no schematic, no protocol rows).
    expect(total).toBe(4);
  });

  it("chunks circuit-list rows by CIRCUIT_LIST_ROWS_PER_PAGE (10)", () => {
    // 25 MCB symbols → buildCircuitListTableRows produces >= 25 rows
    // → at least 3 chunks of pages. We assert the relationship grows with
    // symbol count rather than an exact total — `buildCircuitListTableRows`
    // may add header / summary rows that shift the count slightly.
    const symbols = Array.from({ length: 25 }, (_, i) =>
      createDefaultSymbolItem({
        id: `mcb-${i}`,
        type: "MCB 1P",
        deviceKind: "mcb",
        referenceDesignation: `F${i + 1}`,
        circuitName: `Obwód ${i + 1}`,
        phase: "L1",
      }),
    );
    const withoutSymbols = countPdfPages(createEmptyProjectMetadata(), []);
    const withSymbols = countPdfPages(createEmptyProjectMetadata(), symbols);
    // With 25 symbols we must produce at least 3 chunks of 10 rows each,
    // so adding symbols grows the total by >= 3.
    expect(withSymbols - withoutSymbols).toBeGreaterThanOrEqual(3);
  });

  it("counts RCD table page only when rcdRows are non-empty", () => {
    const baseMetadata = {
      ...createEmptyProjectMetadata(),
      measurementProtocols: {
        ...createEmptyProjectMetadata().measurementProtocols,
        rcdRows: [],
        unifiedRows: [],
      },
    };
    // 2 (title) + 1 (toc) + 1 (summary) + 0 (no RCD) = 4
    const withoutRcd = countPdfPages(baseMetadata, []);
    expect(withoutRcd).toBe(4);

    const withRcd = countPdfPages(
      {
        ...baseMetadata,
        measurementProtocols: {
          ...baseMetadata.measurementProtocols,
          rcdRows: [
            {
              index: 1,
              sourceCircuitId: "rcd-1",
              referenceDesignation: "Q1",
              deviceType: "RCD 40A 4P",
              residualCurrent: "30",
              tripCurrent: "18",
              tripTimeMs: "22",
              testButtonResult: "Pozytywny",
              assessment: "Pozytywna",
            },
          ],
        },
      },
      [],
    );
    // + 1 RCD page = 5
    expect(withRcd).toBe(5);
  });

  it("counts one schematic page per image in the array", () => {
    // 3 (title + summary) + 3 schematic + 0 unified/rcd when explicitly cleared = 6
    const metadata = {
      ...createEmptyProjectMetadata(),
      measurementProtocols: {
        ...createEmptyProjectMetadata().measurementProtocols,
        unifiedRows: [],
        rcdRows: [],
      },
    };
    const total = countPdfPages(metadata, [], {
      schematicImages: ["a", "b", "c"],
    });
    expect(total).toBe(7);
  });

  it("respects previewOnly: din-rail (single-section rendering)", () => {
    // WHY: the workspace may render an isolated DIN rail preview. The total
    // for that branch must equal the number of DIN rail pages only — no
    // title, no summary, no other sections.
    const total = countPdfPages(createEmptyProjectMetadata(), [], {
      previewOnly: "din-rail",
      dinRailImages: ["x"],
      dinRailWithoutWiresImages: ["x"],
    });
    expect(total).toBe(2);
  });
});
