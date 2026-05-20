import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { createEmptyProjectMetadata } from "../projectMetadata";
import {
  buildPdfCircuitGroups,
  PdfProtocolDocument,
} from "./PdfProtocolDocument";

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

  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return collectTextContent(props?.children);
  }

  return [];
}

describe("buildPdfCircuitGroups", () => {
  it("groups connected MCB modules under their RCD even when legacy group names are missing", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      label: "RCD 1",
      referenceDesignation: "F1",
      groupName: "Grupa 1",
    });
    const firstMcb = createDefaultSymbolItem({
      id: "mcb-1",
      deviceKind: "mcb",
      label: "Oswietlenie",
      referenceDesignation: "B1",
      rcdSymbolId: "rcd-1",
    });
    const secondMcb = createDefaultSymbolItem({
      id: "mcb-2",
      deviceKind: "mcb",
      label: "Gniazda",
      referenceDesignation: "B2",
      rcdSymbolId: "rcd-1",
    });

    const groups = buildPdfCircuitGroups([firstMcb, rcd, secondMcb]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      groupKey: "rcd:rcd-1",
      groupName: "Grupa 1",
      rcd,
    });
    expect(groups[0].mcbs.map((symbol) => symbol.id)).toEqual(["mcb-1", "mcb-2"]);
  });

  it("keeps legacy group fallback for older projects without rcdSymbolId", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      group: "g1",
      groupName: "Grupa 1",
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb-1",
      deviceKind: "mcb",
      group: "g1",
    });

    const groups = buildPdfCircuitGroups([mcb, rcd]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      groupKey: "group:g1",
      groupName: "Grupa 1",
      rcd,
    });
  });
});

describe("PdfProtocolDocument", () => {
  it("contains the key engineering documentation sections in full export mode", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      label: "RCD 1",
      referenceDesignation: "Q1",
      groupName: "Grupa 1",
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb-1",
      deviceKind: "mcb",
      circuitName: "Oświetlenie salon",
      referenceDesignation: "F1",
      protectionType: "B10",
      phase: "L1",
      powerW: 450,
      cableCrossSection: 1.5,
      location: "Salon",
      rcdSymbolId: rcd.id,
    });

    const document = PdfProtocolDocument({
      metadata: {
        ...createEmptyProjectMetadata(),
        projectNumber: "PDF-1",
        titlePageObjectType: "Dom jednorodzinny",
      },
      symbols: [rcd, mcb],
      phaseDistribution: {
        l1PowerW: 450,
        l2PowerW: 0,
        l3PowerW: 0,
        l1CurrentA: 2.2,
        l2CurrentA: 0,
        l3CurrentA: 0,
        imbalancePercent: 200,
      },
      validationResult: {
        isValid: true,
        errors: [],
        warnings: [],
        info: [],
      },
      schematicImages: ["data:image/png;base64,iVBORw0KGgo="],
      dinRailImages: ["data:image/png;base64,iVBORw0KGgo="],
    });

    const text = collectTextContent(document).join("\n");

    expect(text).toContain("DOKUMENTACJA POWYKONAWCZA");
    expect(text).toContain("WIDOK ELEWACJI ROZDZIELNICY");
    expect(text).toContain("ZESTAWIENIE OBWODÓW");
    expect(text).toContain("BILANS MOCY I WALIDACJA");
    expect(text).toContain("Oświetlenie salon");
    expect(text).toContain("Brak błędów i ostrzeżeń. Projekt jest prawidłowy.");
  });
});
