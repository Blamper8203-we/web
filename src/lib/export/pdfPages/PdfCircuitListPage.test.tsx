import { describe, expect, it } from "vitest";
import { PdfCircuitListPage } from "./PdfCircuitListPage";
import type { CircuitListTableRow } from "../../circuitRows";
import type { CircuitRow } from "../../../types/circuitRow";

/**
 * PdfCircuitListPage — minimal render test for the main inventory page.
 *
 * WHY: PdfCircuitListPage is the largest data-driven page in the PDF — it
 * renders the per-circuit table that drives the as-built document. Until
 * now it had no direct test, so a regression in row format would only be
 * caught indirectly via PdfProtocolDocument.
 */

function collectTextContent(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(collectTextContent);
  if (typeof node === "object" && node !== null) {
    const element = node as { type?: unknown; props?: { children?: unknown } };
    if (typeof element.type === "function") {
      try {
        return collectTextContent((element.type as (props: unknown) => unknown)(element.props));
      } catch {
        // Fallback for components that throw outside renderer.
      }
    }
    return collectTextContent(element.props?.children);
  }
  return [];
}

function makeRow(partial: Partial<CircuitRow>): CircuitRow {
  return {
    id: "",
    type: "",
    deviceKind: "mcb",
    x: 0,
    y: 0,
    label: "",
    referenceDesignation: "",
    phase: "L1",
    protectionType: "",
    displayProtection: "",
    circuitName: "",
    powerW: 0,
    cableLength: 0,
    cableCrossSection: 0,
    location: "",
    displayLocation: "",
    circuitType: "Gniazdo",
    isTerminalBlock: false,
    visualPath: "",
    ...partial,
  };
}

const sampleChunk: CircuitListTableRow[] = [
  {
    index: 1,
    location: "Salon",
    rcdLabel: "RCD 1",
    rcdProtection: "40A / 30mA",
    row: makeRow({
      id: "mcb-1",
      referenceDesignation: "F1",
      circuitName: "Oświetlenie salon",
      protectionType: "B10",
      cableCrossSection: 1.5,
      cableLength: 12,
      powerW: 800,
    }),
  },
  {
    index: 2,
    location: "Kuchnia",
    rcdLabel: "RCD 1",
    rcdProtection: "40A / 30mA",
    row: makeRow({
      id: "mcb-2",
      referenceDesignation: "F2",
      circuitName: "Gniazda kuchnia",
      protectionType: "B16",
      cableCrossSection: 2.5,
      cableLength: 18,
      powerW: 2300,
    }),
  },
];

function renderChunk(chunk: CircuitListTableRow[], chunkIdx: number, totalChunks: number): string {
  const tree = PdfCircuitListPage({
    chunk,
    chunkIdx,
    totalChunks,
    displayDate: "2026-06-21",
    fallbackObjectName: "Mieszkanie testowe",
  });
  return collectTextContent(tree).join("\n");
}

describe("PdfCircuitListPage", () => {
  it("renders the header and table rows for a non-empty chunk", () => {
    const text = renderChunk(sampleChunk, 0, 1);

    expect(text).toContain("Lista obwodów");
    expect(text).toContain("Zestawienie obwodów instalacji elektrycznej");
    // Each row's reference designation should appear.
    expect(text).toContain("F1");
    expect(text).toContain("F2");
    // Protection type values are formatted into the cells.
    expect(text).toContain("B10");
    expect(text).toContain("B16");
  });

  it("renders the chunk index / total in the header when paginated", () => {
    const text = renderChunk(sampleChunk, 1, 3);

    // The header text reads "Arkusz" + index + "z" + total. The intermediate
    // text nodes get split in collectTextContent, so we check the three
    // meaningful fragments individually.
    expect(text).toContain("Arkusz");
    expect(text).toMatch(/2\s*z\s*3/);
    // Page-2 indicator in the body label ("(ciąg dalszy 2)").
    expect(text).toContain("ciąg dalszy 2");
  });

  it("renders an empty chunk without throwing (defensive against zero-row state)", () => {
    const text = renderChunk([], 0, 1);

    // Header is still rendered; only the body is empty.
    expect(text).toContain("Lista obwodów");
  });
});