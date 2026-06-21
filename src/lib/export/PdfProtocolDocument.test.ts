import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { createEmptyProjectMetadata } from "../projectMetadata";
import { buildPdfCircuitGroups } from "./pdfPages/pdfHelpers";
import {
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

  if (typeof node === "object" && node !== null) {
    const element = node as { type?: any; props?: { children?: unknown } };
    if (typeof element.type === "function") {
      try {
        return collectTextContent(element.type(element.props));
      } catch (_err) {
        // Fallback
      }
    }
    return collectTextContent(element.props?.children);
  }

  return [];
}

function collectImageSources(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectImageSources);
  }

  if (typeof node === "object" && node !== null) {
    const element = node as { type?: any; props?: { children?: unknown; src?: unknown } };
    if (typeof element.type === "function") {
      try {
        return collectImageSources(element.type(element.props));
      } catch (_err) {
        // Fallback
      }
    }
    const current = typeof element.props?.src === "string" ? [element.props.src] : [];
    return [...current, ...collectImageSources(element.props?.children)];
  }

  return [];
}

function collectPageOrientations(node: unknown): Array<unknown> {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectPageOrientations);
  }

  if (typeof node === "object" && node !== null) {
    const element = node as { type?: any; props?: { children?: unknown; size?: unknown; orientation?: unknown } };
    if (typeof element.type === "function") {
      try {
        return collectPageOrientations(element.type(element.props));
      } catch (_err) {
        // Fallback
      }
    }
    const current = element.props?.size === "A4" ? [element.props.orientation] : [];
    return [...current, ...collectPageOrientations(element.props?.children)];
  }

  return [];
}

function collectA4PageTextContent(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectA4PageTextContent);
  }

  if (typeof node === "object" && node !== null) {
    const element = node as { type?: any; props?: { children?: unknown; size?: unknown } };
    if (typeof element.type === "function") {
      try {
        return collectA4PageTextContent(element.type(element.props));
      } catch (_err) {
        // Fallback
      }
    }
    const childPages = collectA4PageTextContent(element.props?.children);
    if (element.props?.size === "A4") {
      return [collectTextContent(element.props.children).join("\n"), ...childPages];
    }

    return childPages;
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
      schematicImages: ["data:image/png;base64,iVBORw0KGgo="],
      dinRailImages: ["<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><rect width='10' height='10'/></svg>"],
    });

    const text = collectTextContent(document).join("\n");

    expect(text).toContain("Dokumentacja Powykonawcza");
    expect(text).toContain("Oświadczenie Wykonawcy");
    expect(text).toContain("Pełna treść oświadczenia wykonawcy");
    // WHY: when no company logo is uploaded the logoBox is hidden entirely
    // (instead of showing a "LOGO" placeholder) so the title page no longer
    // carries a UI-style placeholder text into the final PDF.
    expect(text).not.toContain("LOGO");
    expect(text).toContain("Tabela zbiorcza pomiarów");
    expect(text).toContain("RCD i uziemienie");
    expect(text).toContain("Schemat instalacji elektrycznej");
    // WHY: "Widok rozdzielnicy elektrycznej" was a label box on the din-rail
    // PDF page; it was removed to free vertical space on A4 portrait. The page
    // itself is verified by checking imageSources instead of text.
    expect(text).toContain("Lista obwodów");
    expect(text).not.toContain("Opis obwodów");
    expect(text).toContain("Tabela zbiorcza");
    expect(text).toContain("RCD i uziemienie");
  });

  it("renders an uploaded company logo on the title page instead of the logo placeholder", () => {
    const logoDataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const document = PdfProtocolDocument({
      metadata: {
        ...createEmptyProjectMetadata(),
        titlePageCompanyLogoFileName: "logo.png",
        titlePageCompanyLogoDataUrl: logoDataUrl,
      },
      symbols: [],
      schematicImages: [],
      dinRailImages: [],
      previewOnly: "title-page",
    });

    const text = collectTextContent(document).join("\n");
    const imageSources = collectImageSources(document);

    expect(text).not.toContain("LOGO");
    expect(imageSources).toContain(logoDataUrl);
  });

  it("limits the title page work scope list to twelve visible items", () => {
    const document = PdfProtocolDocument({
      metadata: {
        ...createEmptyProjectMetadata(),
        titlePageWorkScopeItems: Array.from({ length: 13 }, (_, index) => ({
          text: `Pozycja zakresu ${index + 1}`,
          isChecked: true,
        })),
      },
      symbols: [],
      schematicImages: [],
      dinRailImages: [],
      previewOnly: "title-page",
    });

    const text = collectTextContent(document).join("\n");

    expect(text).toContain("Pozycja zakresu 12");
    expect(text).not.toContain("Pozycja zakresu 13");
  });

  it("renders a compact RCD table header that matches the exported row columns", () => {
    const defaultProtocols = createEmptyProjectMetadata().measurementProtocols;
    const document = PdfProtocolDocument({
      metadata: {
        ...createEmptyProjectMetadata(),
        measurementProtocols: {
          ...defaultProtocols,
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
      symbols: [],
      schematicImages: [],
      dinRailImages: [],
      previewOnly: "rcd-ground",
    });

    const text = collectTextContent(document).join("\n");

    expect(text.match(/IΔn \[mA\]/g) ?? []).toHaveLength(1);
    expect(text.match(/Prąd wyzw\. \[mA\]/g) ?? []).toHaveLength(1);
    expect(text).toContain("RCD 40A 4P");
    expect(text).toContain("Protokół Pomiarów Nr");
    expect(text).toContain("04 / 2026");
    expect(text).not.toContain("Protokół Pomiarów Nr\nProtokół Nr");
    expect(collectPageOrientations(document)).toEqual([undefined]);
  });

  it("renders the synchronized circuit list preview page from current symbols", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      type: "RCD 4P",
      deviceKind: "rcd",
      referenceDesignation: "Q1",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb-1",
      type: "MCB 1P",
      deviceKind: "mcb",
      referenceDesignation: "F1.1",
      circuitName: "Gniazda kuchnia",
      location: "Kuchnia",
      protectionType: "B16",
      phase: "L1",
      rcdSymbolId: rcd.id,
    });

    const document = PdfProtocolDocument({
      metadata: createEmptyProjectMetadata(),
      symbols: [rcd, mcb],
      schematicImages: [],
      dinRailImages: [],
      previewOnly: "circuit-list",
    });

    const text = collectTextContent(document).join("\n");

    expect(text).toContain("Lista obwodów");
    expect(text).toContain("Gniazda kuchnia");
    expect(text).toContain("F1.1");
    expect(text).toContain("Q1");
    expect(collectPageOrientations(document)).toEqual(["landscape"]);
  });

  it("continues the circuit list after row ten without clipping later rows", () => {
    const symbols = Array.from({ length: 19 }, (_, index) =>
      createDefaultSymbolItem({
        id: `mcb-${index + 1}`,
        type: "MCB 1P",
        deviceKind: "mcb",
        referenceDesignation: `F${index + 1}`,
        circuitName: `Obwod testowy ${index + 1}`,
        phase: "L1",
      }),
    );

    const document = PdfProtocolDocument({
      metadata: createEmptyProjectMetadata(),
      symbols,
      schematicImages: [],
      dinRailImages: [],
      previewOnly: "circuit-list",
    });

    const pages = collectA4PageTextContent(document);
    const circuitPages = pages.filter((pageText) => pageText.includes("Zestawienie obwod"));

    expect(circuitPages).toHaveLength(2);
    expect(circuitPages[0]).toContain("Obwod testowy 10");
    expect(circuitPages[0]).not.toContain("Obwod testowy 11");
    expect(circuitPages[1]).toContain("Obwod testowy 11");
    expect(circuitPages[1]).toContain("Obwod testowy 13");
    expect(circuitPages[1]).toContain("Obwod testowy 19");
  });

  it("renders the synchronized distribution board preview page from the current DIN rail snapshot", () => {
    const dinRailImage = "data:image/png;base64,iVBORw0KGgo=";
    const document = PdfProtocolDocument({
      metadata: createEmptyProjectMetadata(),
      symbols: [],
      schematicImages: [],
      dinRailImages: [dinRailImage],
      previewOnly: "din-rail",
    });

    // WHY: PdfDinRailSnapshotPage renders the rail image inline without a
    // section-label header (the label was eating ~40pt of vertical space on
    // A4 portrait). The page's only static identifier is the embedded rail
    // image itself — the footer text is render-based and not visible to the
    // test collector.
    const imageSources = collectImageSources(document);
    expect(imageSources).toContain(dinRailImage);
    expect(collectPageOrientations(document)).toEqual(["portrait"]);
  });

  it("chunks unified measurement rows and appends letter suffixes (A, B...) to the titles", () => {
    const unifiedRows = Array.from({ length: 16 }, (_, i) => ({
      index: i + 1,
      sourceCircuitId: `c-${i}`,
      referenceDesignation: `F${i}`,
      circuitName: `Obwód testowy ${i}`,
      location: "Salon",
      protectionType: "B16",
      ratedCurrent: "16A",
      lnResistance: "200",
      lpeResistance: "200",
      npeResistance: "200",
      measuredImpedance: "0.45",
      allowedImpedance: "2.87",
      assessment: "Pozytywna",
    }));

    const defaultProtocols = createEmptyProjectMetadata().measurementProtocols;
    const document = PdfProtocolDocument({
      metadata: {
        ...createEmptyProjectMetadata(),
        projectNumber: "PDF-1",
        measurementProtocols: {
          ...defaultProtocols,
          unifiedRows,
          unifiedHeader: {
            headerTitle: "Protokół Nr 01 / 2026",
            headerSubtitle: "Tabela zbiorcza wyników pomiarów",
            measurementDate: "2026-05-23",
            objectName: "Testowy obiekt",
          },
        },
      },
      symbols: [],
      schematicImages: [],
      dinRailImages: [],
      previewOnly: "unified",
    });

    const text = collectTextContent(document).join("\n");

    expect(text).toContain("01A / 2026");
    expect(text).toContain("01B / 2026");
    expect(text).not.toContain("Protokół Nr 01 / 2026");
    expect(text).toContain("Obwód testowy 0");
    expect(text).toContain("Obwód testowy 15");
  });

  it("renders standard unified title without suffix when rows fit on a single page", () => {
    const unifiedRows = Array.from({ length: 5 }, (_, i) => ({
      index: i + 1,
      sourceCircuitId: `c-${i}`,
      referenceDesignation: `F${i}`,
      circuitName: `Obwód testowy ${i}`,
      location: "Salon",
      protectionType: "B16",
      ratedCurrent: "16A",
      lnResistance: "200",
      lpeResistance: "200",
      npeResistance: "200",
      measuredImpedance: "0.45",
      allowedImpedance: "2.87",
      assessment: "Pozytywna",
    }));

    const defaultProtocols = createEmptyProjectMetadata().measurementProtocols;
    const document = PdfProtocolDocument({
      metadata: {
        ...createEmptyProjectMetadata(),
        projectNumber: "PDF-1",
        measurementProtocols: {
          ...defaultProtocols,
          unifiedRows,
          unifiedHeader: {
            headerTitle: "Protokół Nr 01 / 2026",
            headerSubtitle: "Tabela zbiorcza wyników pomiarów",
            measurementDate: "2026-05-23",
            objectName: "Testowy obiekt",
          },
        },
      },
      symbols: [],
      schematicImages: [],
      dinRailImages: [],
      previewOnly: "unified",
    });

    const text = collectTextContent(document).join("\n");

    expect(text).toContain("01 / 2026");
    expect(text).not.toContain("Protokół Pomiarów Nr\nProtokół Nr");
    expect(text).not.toContain("Protokół Nr 01A");
    expect(text).toContain("Obwód testowy 0");
  });

  it("reserves bottom padding on the schematic PDF page so the page footer does not overlap the embedded legend table", () => {
    // WHY: the schematic PNG is rendered at full A4 landscape by
    // renderSchematic, with the device-legend table sitting near the bottom of
    // the sheet. The PDF page renders this PNG with width/height: 100% and
    // objectFit: contain, then layers an absolute page footer
    // (bottom: 10, "Strona X z Y • Dokument wygenerowany cyfrowo • ...")
    // on top. If the Page style is padding: 0 the image fills the whole sheet
    // and the footer overlaps the last row of the legend table — the bug the
    // user reported in the PDF export of the "Schemat obwodów" tab. Pin the
    // paddingBottom here so any future change that reverts it gets caught.

    const document = PdfProtocolDocument({
      metadata: createEmptyProjectMetadata(),
      symbols: [],
      schematicImages: [
        "data:image/png;base64,SCHEMATIC_LEGEND_TEST",
      ],
      dinRailImages: [],
    });

    const pageFooters = collectSchematicPageBottomPadding(document);

    expect(pageFooters.length).toBe(1);
    for (const paddingBottom of pageFooters) {
      expect(paddingBottom).toBeGreaterThan(0);
    }
  });
});

/**
 * Walk the PDF document tree and return the resolved `paddingBottom` of every
 * `<Page>` element that contains a `<Image src="data:image/png;...">` (the
 * schematic snapshots). react-pdf accepts `style` as either an object or an
 * array; we normalise both and read paddingBottom from any entry.
 */
function collectSchematicPageBottomPadding(node: unknown): number[] {
  const paddingBottoms: number[] = [];
  walk(node, (element) => {
    if (element.type !== Page) {
      return;
    }
    const style = normaliseStyle(element.props?.style);
    const schematicImage = findDescendantImage(element.props?.children);
    if (!schematicImage) {
      return;
    }
    paddingBottoms.push(Number(style.paddingBottom ?? 0));
  });
  return paddingBottoms;
}

function walk(node: unknown, visit: (element: { type: unknown; props: Record<string, unknown> }) => void): void {
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "string" || typeof node === "number") {
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      walk(child, visit);
    }
    return;
  }
  if (typeof node === "object") {
    const element = node as { type?: unknown; props?: { children?: unknown } };
    if (typeof element.type === "function" || typeof element.type === "string") {
      visit({ type: element.type, props: (element.props ?? {}) as Record<string, unknown> });
    }
    if (element.props?.children !== undefined) {
      walk(element.props.children, visit);
    }
  }
}

function normaliseStyle(style: unknown): Record<string, unknown> {
  if (!style) {
    return {};
  }
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, entry) => {
      if (entry && typeof entry === "object") {
        Object.assign(acc, entry as Record<string, unknown>);
      }
      return acc;
    }, {});
  }
  if (typeof style === "object") {
    return style as Record<string, unknown>;
  }
  return {};
}

function findDescendantImage(node: unknown): unknown {
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "string" || typeof node === "number") {
    return null;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findDescendantImage(child);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (typeof node === "object") {
    const element = node as { type?: unknown; props?: { src?: unknown; children?: unknown } };
    if (element.type === Image) {
      return element;
    }
    if (element.props?.children !== undefined) {
      return findDescendantImage(element.props.children);
    }
  }
  return null;
}

import { Image, Page } from "@react-pdf/renderer";

