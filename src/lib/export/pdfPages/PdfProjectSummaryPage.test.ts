import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { createEmptyProjectMetadata } from "../../projectMetadata";
import { PdfProjectSummaryPage } from "./PdfProjectSummaryPage";
import type { PdfCircuitGroup } from "./pdfHelpers";

function collectTextContent(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectTextContent);
  }

  if (typeof node === "object" && node !== null) {
    const element = node as { type?: unknown; props?: { children?: unknown } };
    if (typeof element.type === "function") {
      try {
        return collectTextContent((element.type as (props: unknown) => unknown)(element.props));
      } catch (_err) {
        // Fallback for components that throw outside renderer
      }
    }
    return collectTextContent(element.props?.children);
  }

  return [];
}

function buildRcdGroup(): PdfCircuitGroup {
  const rcd = createDefaultSymbolItem({
    id: "rcd-1",
    deviceKind: "rcd",
    label: "RCD 1",
    referenceDesignation: "F1",
    groupName: "Grupa kuchnia",
    moduleRef: "RCD/RCD-40A-4P",
  });
  return {
    groupKey: "rcd:rcd-1",
    groupName: "Grupa kuchnia",
    rcd,
    mcbs: [
      createDefaultSymbolItem({
        id: "mcb-1",
        deviceKind: "mcb",
        label: "Oswietlenie kuchnia",
        circuitName: "Oswietlenie kuchnia",
        phase: "L1",
        rcdSymbolId: "rcd-1",
      }),
      createDefaultSymbolItem({
        id: "mcb-2",
        deviceKind: "mcb",
        label: "Gniazda blat",
        circuitName: "Gniazda blat",
        phase: "L2",
        rcdSymbolId: "rcd-1",
      }),
    ],
  };
}

function buildStandaloneGroup(): PdfCircuitGroup {
  return {
    groupKey: "standalone",
    groupName: "standalone",
    rcd: null,
    mcbs: [
      createDefaultSymbolItem({
        id: "mcb-3",
        deviceKind: "mcb",
        label: "Oswietlenie korytarz",
        circuitName: "Oswietlenie korytarz",
        phase: "L3",
      }),
    ],
  };
}

describe("PdfProjectSummaryPage", () => {
  it("renders an empty-state message when no circuits are present", () => {
    const metadata = createEmptyProjectMetadata();

    const document = PdfProjectSummaryPage({
      metadata,
      groupedCircuits: [],
      displayDate: "2026-06-20",
    });

    const text = collectTextContent(document).join("\n");
    expect(text).toContain("Podsumowanie projektu");
    expect(text).toContain("0");
    expect(text).toContain("Projekt nie zawiera zabezpieczeń");
  });

  it("renders statistics and RCD-MCB grouping with names and circuit labels", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.contractor = "Usługi Elektryczne PRO-EL";
    metadata.titlePageObjectType = "Lokal mieszkalny";

    const document = PdfProjectSummaryPage({
      metadata,
      groupedCircuits: [buildRcdGroup(), buildStandaloneGroup()],
      displayDate: "2026-06-20",
    });

    const text = collectTextContent(document).join("\n");
    expect(text).toContain("Podsumowanie projektu");
    expect(text).toContain("Zabezpieczenia (MCB/RCBO)");
    expect(text).toContain("Wyłączniki różnicoprądowe (RCD)");
    expect(text).toContain("Obwody bez RCD");
    expect(text).toContain("Grupa kuchnia");
    expect(text).toContain("Grupa RCD");
    expect(text).toContain("Obwód bez RCD");
    expect(text).toContain("RCD-40A-4P");
    expect(text).toContain("Oswietlenie kuchnia");
    expect(text).toContain("Gniazda blat");
    expect(text).toContain("Oswietlenie korytarz");
    expect(text).toContain("Obwody");
    expect(text).toContain("Usługi Elektryczne PRO-EL");
  });

  it("counts MCBs, RCDs and standalone circuits correctly", () => {
    const metadata = createEmptyProjectMetadata();

    const document = PdfProjectSummaryPage({
      metadata,
      groupedCircuits: [buildRcdGroup(), buildStandaloneGroup()],
      displayDate: "2026-06-20",
    });

    const text = collectTextContent(document).join("\n");
    const matches = text.match(/\b\d+\b/g) ?? [];
    const numericTokens = matches.filter((token) => /^\d+$/.test(token));
    expect(numericTokens).toContain("3");
    expect(numericTokens).toContain("1");
  });
});