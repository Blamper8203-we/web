import { describe, expect, it } from "vitest";
import { createEmptyProjectMetadata } from "../../projectMetadata";
import { PdfTitlePage } from "./PdfTitlePage";

// WHY: react-pdf components render to a PDF document, not DOM, so we walk the
// JSX-like element tree returned by the page function and collect all text
// children — same pattern as PdfProjectSummaryPage.test.ts and
// PdfUnifiedTablePage.test.tsx.

// WHY: this file pins the UI↔PDF consistency rule for isFormalDocumentationMode.
// ProjectPropertiesPage.tsx hides SEP / signature / declaration UI when the
// mode is "Robocza / uproszczona" (lines 176, 243, 336, 369), and
// schematicTitleBlockRenderer.ts:189,199 replaces signatures with "nie dotyczy".
// PdfTitlePage, PdfRcdTablePage and PdfUnifiedTablePage must mirror that —
// otherwise toggling the checkbox silently still emits a full formal PDF.

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
        // Fallback for components that throw outside renderer.
      }
    }
    return collectTextContent(element.props?.children);
  }
  return [];
}

function renderTitle(metadata = createEmptyProjectMetadata()): string {
  const document = PdfTitlePage({ metadata, displayDate: "2026-06-21" });
  return collectTextContent(document).join("\n");
}

describe("PdfTitlePage - UI/PDF consistency for isFormalDocumentationMode", () => {
  it("renders SEP block, declaration text and signature row in formal mode (true)", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = true;
    metadata.author = "Jan Kowalski";
    metadata.designerId = "E+D / 123/2026";
    metadata.designerSignature = "Jan Kowalski";

    const text = renderTitle(metadata);

    expect(text).toContain("Uprawnienie SEP — Eksploatacja (E)");
    expect(text).toContain("Oświadczam, że instalacja elektryczna");
    expect(text).toContain("Osoba sporządzająca / wykonawca");
    expect(text).toContain("Inwestor");
    expect(text).toContain("Pieczęć wykonawcy");
  });

  it("hides SEP block, declaration text and signature row when formal mode is false", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = false;
    metadata.author = "Jan Kowalski";
    metadata.designerId = "E+D / 123/2026";
    metadata.designerSignature = "Jan Kowalski";

    const text = renderTitle(metadata);

    expect(text).not.toContain("Uprawnienia SEP (Kwalifikacyjne)");
    expect(text).not.toContain("Eksploatacja (E):");
    expect(text).not.toContain("Dozór (D):");
    expect(text).not.toContain("Pełna treść oświadczenia wykonawcy");
    expect(text).not.toContain("Podpis Elektryka");
    expect(text).not.toContain("Podpis Inwestora");
    expect(text).not.toContain("Pieczęć wykonawcy");
  });

  it("treats undefined isFormalDocumentationMode as formal (preserves old projects)", () => {
    // WHY: projectFile migration safety — old .dinboard files (pre-checkbox)
    // may load with isFormalDocumentationMode === undefined. Default to formal
    // so existing customers do not silently lose signatures after upgrade.
    const metadata = createEmptyProjectMetadata();
    (metadata as { isFormalDocumentationMode?: boolean }).isFormalDocumentationMode = undefined;

    const text = renderTitle(metadata);

    expect(text).toContain("Uprawnienie SEP — Eksploatacja (E)");
    expect(text).toContain("Oświadczam, że instalacja elektryczna");
  });

  it("still renders the contractor / installation panel and stamp placeholder when formal mode is false", () => {
    // WHY: the contractor identification card (name + NIP/REGON/phone/email)
    // is not a signature — it identifies who did the work and is required in
    // both formal and simplified documentation. Only signatures/SEP/declaration
    // are gated.
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = false;
    metadata.contractor = "FHU Elektro Jan Kowalski";

    const text = renderTitle(metadata);

    expect(text).toContain("Wykonawca");
    expect(text).toContain("FHU Elektro Jan Kowalski");
  });
});
