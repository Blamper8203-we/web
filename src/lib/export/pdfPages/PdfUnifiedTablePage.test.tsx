import { describe, expect, it } from "vitest";
import { createEmptyProjectMetadata } from "../../projectMetadata";
import { PdfUnifiedTablePage } from "./PdfUnifiedTablePage";

// WHY: react-pdf components render to a PDF document, not DOM, so we cannot
// use @testing-library. Instead, walk the JSX-like element tree returned by
// the page function and collect all text children — same pattern as
// PdfProjectSummaryPage.test.ts.

// WHY: audit-pdf.md #P1 flagged that loopMeterSerialNumber, insulationMeterSerialNumber,
// loopNetworkVoltage, loopNetworkSystem and recommendationsText were silently
// dropped from the PDF. These tests pin the contract that the user's typed
// values flow through to the rendered PDF — otherwise an engineer cannot
// set the loop network voltage to "400V" or attach a recommendations
// paragraph to the protocol.

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

function renderUnified(metadata = createEmptyProjectMetadata(), chunkIdx = 0, totalChunks = 1) {
  const document = PdfUnifiedTablePage({
    metadata,
    chunk: [],
    chunkIdx,
    totalChunks,
    displayDate: "2026-06-21",
    fallbackObjectName: "Budynek mieszkalny",
  });
  return collectTextContent(document).join("\n");
}

describe("PdfUnifiedTablePage - Dane techniczne i narzędzia pomiarowe", () => {
  it("renders meter serial numbers in the Dane techniczne block on the first page", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.measurementProtocols.loopMeterSerialNumber = "S/N 12345";
    metadata.measurementProtocols.insulationMeterSerialNumber = "S/N 67890";

    const text = renderUnified(metadata);

    expect(text).toContain("S/N 12345");
    expect(text).toContain("S/N 67890");
    expect(text).toContain("Nr ser. (Pętla):");
    expect(text).toContain("Nr ser. (Izolacja):");
  });

  it("renders loop network voltage and system in the Dane techniczne block (replacing the old hardcoded badge)", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.measurementProtocols.loopNetworkVoltage = "400V";
    metadata.measurementProtocols.loopNetworkSystem = "TN-S";

    const text = renderUnified(metadata);

    expect(text).toContain("400V");
    expect(text).toContain("TN-S");
    expect(text).toContain("Napięcie sieci:");
    expect(text).toContain("Układ sieci:");
  });

  it("falls back to the engineering defaults (230/400V and TN-S / TN-C-S) when the user has not set the fields", () => {
    const metadata = createEmptyProjectMetadata();

    const text = renderUnified(metadata);

    // The hardcoded defaults used to be the ONLY possible values. After this
    // fix they are still the fallback (preserving existing PDFs / previews)
    // but they are no longer the only render — the user can override them.
    expect(text).toContain("230/400V");
    expect(text).toContain("TN-S / TN-C-S");
  });

  it("renders the Zalecenia section with recommendationsText on the last page when the user has set it", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.measurementProtocols.recommendationsText = "Wymienić zabezpieczenie F3 w obwodzie oświetlenia.";

    const text = renderUnified(metadata, 0, 1);

    expect(text).toContain("3. Zalecenia");
    expect(text).toContain("Wymienić zabezpieczenie F3 w obwodzie oświetlenia.");
  });

  it("does NOT render the Zalecenia section when recommendationsText is empty", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.measurementProtocols.recommendationsText = "";

    const text = renderUnified(metadata, 0, 1);

    expect(text).not.toContain("3. Zalecenia");
  });
});