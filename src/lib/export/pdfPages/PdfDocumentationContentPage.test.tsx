import { describe, expect, it } from "vitest";
import { createDefaultProjectMetadata } from "../../../lib/projectMetadata";
import { PdfDocumentationContentPage, hasDocumentationContent } from "./PdfDocumentationContentPage";

/**
 * PdfDocumentationContentPage — renders the seven optional `documentation*`
 * free-text fields (equipment list, cable selection, calculations, etc.)
 * only when the user has filled them in.
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

function renderDocContent(text: string): string {
  const metadata = createDefaultProjectMetadata();
  metadata.documentationEquipmentList = text;
  const tree = PdfDocumentationContentPage({ metadata, displayDate: "2026-06-21" });
  return collectTextContent(tree).join("\n");
}

describe("PdfDocumentationContentPage", () => {
  it("hasDocumentationContent is false on a fresh project (no documentation fields filled)", () => {
    expect(hasDocumentationContent(createDefaultProjectMetadata())).toBe(false);
  });

  it("hasDocumentationContent is true as soon as one section has text", () => {
    const metadata = createDefaultProjectMetadata();
    metadata.documentationCableSelection = "YDY 3x2.5 mm²";
    expect(hasDocumentationContent(metadata)).toBe(true);
  });

  it("renders the section title and the user-provided text", () => {
    const text = renderDocContent("Rozdzielnica główna RG-1");

    expect(text).toContain("Spis urządzeń i osprzętu");
    expect(text).toContain("Rozdzielnica główna RG-1");
  });

  it("renders multiple sections when more than one field is filled", () => {
    const metadata = createDefaultProjectMetadata();
    metadata.documentationEquipmentList = "Rozdzielnica główna RG-1";
    metadata.documentationCableSelection = "YDY 3x2.5 mm²";

    const tree = PdfDocumentationContentPage({ metadata, displayDate: "2026-06-21" });
    const text = collectTextContent(tree).join("\n");

    expect(text).toContain("Spis urządzeń i osprzętu");
    expect(text).toContain("Dobór kabli i zabezpieczeń");
    expect(text).toContain("Rozdzielnica główna RG-1");
    expect(text).toContain("YDY 3x2.5 mm²");
  });

  it("falls back to a placeholder when no documentation fields are filled", () => {
    const metadata = createDefaultProjectMetadata();
    const tree = PdfDocumentationContentPage({ metadata, displayDate: "2026-06-21" });
    const text = collectTextContent(tree).join("\n");

    expect(text).toContain("Brak wypełnionych sekcji opisu");
  });

  it("respects multi-line text (preserves newlines in user input)", () => {
    const metadata = createDefaultProjectMetadata();
    metadata.documentationTechnicalCalculations = "Linia 1\nLinia 2\nLinia 3";
    const tree = PdfDocumentationContentPage({ metadata, displayDate: "2026-06-21" });
    const text = collectTextContent(tree).join("\n");

    expect(text).toContain("Obliczenia techniczne");
    expect(text).toContain("Linia 1");
    expect(text).toContain("Linia 2");
    expect(text).toContain("Linia 3");
  });
});