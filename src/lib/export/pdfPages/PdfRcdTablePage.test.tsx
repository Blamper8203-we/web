import { describe, expect, it } from "vitest";
import { createEmptyProjectMetadata } from "../../projectMetadata";
import { PdfRcdTablePage } from "./PdfRcdTablePage";

// WHY: react-pdf components render to a PDF document, not DOM, so we walk the
// JSX-like element tree returned by the page function and collect all text
// children — same pattern as PdfProjectSummaryPage.test.ts and
// PdfUnifiedTablePage.test.tsx.

// WHY: this file pins the UI↔PDF consistency rule for isFormalDocumentationMode
// on the RCD / ground protocol page. The mode also gates the SEP signature
// footer here — same contract as PdfTitlePage and PdfUnifiedTablePage.

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

function renderRcd(metadata = createEmptyProjectMetadata()): string {
  const document = PdfRcdTablePage({
    metadata,
    displayDate: "2026-06-21",
    fallbackObjectName: "Budynek mieszkalny",
  });
  return collectTextContent(document).join("\n");
}

describe("PdfRcdTablePage - UI/PDF consistency for isFormalDocumentationMode", () => {
  it("renders the SEP signature footer in formal mode (isFormalDocumentationMode=true)", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = true;

    const text = renderRcd(metadata);

    expect(text).toContain("Sprawdził (Wykonawca/Elektryk)");
    expect(text).toContain("Podpis osoby z uprawnieniami SEP");
    expect(text).toContain("miejsce na pieczęć / podpis");
  });

  it("hides the SEP signature footer when isFormalDocumentationMode=false", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = false;

    const text = renderRcd(metadata);

    expect(text).not.toContain("Sprawdził (Wykonawca/Elektryk)");
    expect(text).not.toContain("Podpis osoby z uprawnieniami SEP");
    expect(text).not.toContain("miejsce na pieczęć / podpis");
  });

  it("still renders the protocol header and measurement data when formal mode is false", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = false;
    metadata.measurementProtocols.rcdGroundMeterName = "Sonel MPI-530";

    const text = renderRcd(metadata);

    expect(text).toContain("RCD i uziemienie");
    expect(text).toContain("Protokół Pomiarów Nr");
    expect(text).toContain("Sonel MPI-530");
  });
});
