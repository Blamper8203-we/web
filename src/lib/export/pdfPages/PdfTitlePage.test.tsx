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
  it("renders contractor + SEP block, signatures and PODPISY section in formal mode (true)", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = true;
    metadata.author = "Jan Kowalski";
    metadata.contractor = "FHU Elektro Jan Kowalski";
    metadata.designerId = "E+D / 123/2026";
    metadata.designerSignature = "Jan Kowalski";

    const text = renderTitle(metadata);

    expect(text).toContain("Wykonawca");
    expect(text).toContain("FHU Elektro Jan Kowalski");
    expect(text).toContain("E+D / 123/2026");
    expect(text).toContain("Podpisy");
    // Stamp slot label — i18n may render either the default or the PL translation
    const hasStampLabel =
      text.includes("Wykonawca — uprawnienia SEP") ||
      text.includes("Pieczęć wykonawcy");
    expect(hasStampLabel).toBe(true);
  });

  it("hides SEP block, signatures and PODPISY section when formal mode is false", () => {
    // WHY: signature-row sub-labels ("Osoba uprawniona (SEP)",
    // "Właściciel / zarządca obiektu", "Osoba sporządzająca / wykonawca")
    // appear ONLY on signature slots — not in any data row — so they're
    // reliable signals that the signature row is gone.
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = false;
    metadata.author = "Jan Kowalski";
    metadata.designerId = "E+D / 123/2026";

    const text = renderTitle(metadata);

    expect(text).not.toContain("Podpisy");
    expect(text).not.toContain("Nr uprawnień SEP");
    expect(text).not.toContain("Osoba uprawniona (SEP)");
    expect(text).not.toContain("Właściciel / zarządca obiektu");
    // Designer signature label is i18n-tolerant
    const noDesignerLabel =
      !text.includes("Projektant / pomiarowiec") &&
      !text.includes("Osoba sporządzająca / wykonawca");
    expect(noDesignerLabel).toBe(true);
    // Stamp slot label is also i18n-tolerant
    const noStampLabel =
      !text.includes("Wykonawca — uprawnienia SEP") &&
      !text.includes("Pieczęć wykonawcy");
    expect(noStampLabel).toBe(true);
  });

  it("treats undefined isFormalDocumentationMode as formal (preserves old projects)", () => {
    // WHY: projectFile migration safety — old .dinboard files (pre-checkbox)
    // may load with isFormalDocumentationMode === undefined. Default to formal
    // so existing customers do not silently lose signatures after upgrade.
    const metadata = createEmptyProjectMetadata();
    (metadata as { isFormalDocumentationMode?: boolean }).isFormalDocumentationMode = undefined;

    const text = renderTitle(metadata);

    expect(text).toContain("Podpisy");
    expect(text).toContain("Nr uprawnień SEP");
  });

  it("still renders the contractor identification row when formal mode is false", () => {
    // WHY: contractor identification (name) belongs to section 01 even in
    // simplified mode. Only PODPISY/SEP/signature section is gated.
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = false;
    metadata.contractor = "FHU Elektro Jan Kowalski";

    const text = renderTitle(metadata);

    expect(text).toContain("Wykonawca");
    expect(text).toContain("FHU Elektro Jan Kowalski");
  });
});

// =============================================================================
// Polish-pass regression tests (2026-07-04 v2 — restructure for reference parity)
// WHY: the previous structure had 3 sections + statement block + signatures,
// which overflowed A4. Reference structure is 3 clean sections (Informacje +
// Zakres + Podpisy) without a statement block on the title page. These tests
// pin that structure so a future refactor can't regress to the overflow-prone
// layout.
// =============================================================================

describe("PdfTitlePage - restructured for reference parity (3 sections, no statement block)", () => {
  it("renders compact one-line header right block (protocol+date, not stacked pill)", () => {
    // WHY: previous version had "Numer protokołu" label + amber pill + date
    // label + date value stacked. Reference layout puts everything on one line.
    const text = renderTitle();
    expect(text).toContain("PROTOKÓŁ");
    // The pill style is gone — protocol number renders inline with the date
    expect(text).not.toContain("Numer protokołu");
  });

  it("renders wordmark brand line + norm reference (no duplicate uppercase subtitle)", () => {
    // WHY: previous version stacked "Dokumentacja powykonawcza" eyebrow +
    // "ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)" subtitle — too dense.
    // New version: brand on one line, norm reference inline below as caption.
    const text = renderTitle();
    expect(text).toContain("DINBOARD · Dokumentacja odbiorcza");
    expect(text).toContain("PN-HD 60364-6 · Arkusz 6");
    expect(text).not.toContain("ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)");
  });

  it("hero has eyebrow + title + object-data subtitle (subtitle is project info, not redundant norm)", () => {
    const text = renderTitle();
    expect(text).toContain("DOKUMENT");
    expect(text).toContain("Oświadczenie Wykonawcy");
    // The old "instalacji elektrycznej wykonanej zgodnie z przepisami i normami"
    // subtitle was removed in 2026-07-04 polish pass — it duplicated norm info.
    expect(text).not.toContain("instalacji elektrycznej wykonanej zgodnie z przepisami i normami");
  });

  it("subtitle is built from object type + address when both are provided", () => {
    // WHY: subtitle is now the actual project identification (Rodzaj · Adres),
    // so a reader can identify the project from the title page alone.
    const metadata = createEmptyProjectMetadata();
    metadata.titlePageObjectType = "Budynek mieszkalny";
    metadata.address = "ul. Polna 15, Warszawa";
    const text = renderTitle(metadata);
    expect(text).toContain("Budynek mieszkalny · ul. Polna 15, Warszawa");
  });

  it("uses em-dash for empty values, not dotted lines", () => {
    // WHY: dotted-line placeholders (".................") are 1990s paper-form
    // aesthetic. Em-dash is the modern EU/PL convention for intentionally
    // not-provided values. Polishing pass 2026-07-04 replaced all dots.
    const text = renderTitle();
    // Empty protocol number → em-dash (NOT 7 dots)
    expect(text).toContain("— / ");
    expect(text).not.toMatch(/\.{5,}\s*\/\s*\d{4}/);
    // Empty address, investor, contractor etc. → em-dash (NOT 8+ dots)
    expect(text).not.toMatch(/\.{6,}/);
  });

  it("section 01 broadened to include contractor, SEP number, doc date (6 rows)", () => {
    // WHY: previous design split these across two sections (01 Informacje +
    // 03 Strony i uprawnienia) — that overflowed A4. Merging into 01 keeps
    // the title page to 3 sections and fits on one A4 page.
    const text = renderTitle();
    const sectionOne = text.split("01")[1] ?? "";
    // All 6 row labels appear in section 01 (address label is i18n-tolerant
    // — Polish translation may use just "Adres" without "obiektu")
    expect(sectionOne).toContain("Rodzaj obiektu");
    const hasAddressLabel =
      sectionOne.includes("Adres obiektu") ||
      sectionOne.includes("Adres");
    expect(hasAddressLabel).toBe(true);
    expect(sectionOne).toContain("Inwestor");
    expect(sectionOne).toContain("Wykonawca");
    expect(sectionOne).toContain("Nr uprawnień SEP");
    expect(sectionOne).toContain("Data dokumentacji");
  });

  it("section 03 is PODPISY (signatures only) — no standalone statement block", () => {
    // WHY: previous version had "Pełna treść oświadczenia wykonawcy" amber
    // callout as a 3rd element under the signatures, pushing content off A4.
    // Reference structure: section 03 = PODPISY with signature lines only.
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = true;
    const text = renderTitle(metadata);

    expect(text).toContain("Podpisy");
    // Statement block ("Pełna treść oświadczenia wykonawcy") is removed from
    // the title page — it belongs on a dedicated statement page if needed.
    expect(text).not.toContain("Pełna treść oświadczenia wykonawcy");
  });

  it("renders all 3 signature slots (stamp + 2 sign lines) regardless of empty signatures", () => {
    const metadata = createEmptyProjectMetadata();
    metadata.isFormalDocumentationMode = true;
    const text = renderTitle(metadata);
    // Stamp slot label — i18n-tolerant
    const hasStampLabel =
      text.includes("Wykonawca — uprawnienia SEP") ||
      text.includes("Pieczęć wykonawcy");
    expect(hasStampLabel).toBe(true);
    // Designer signature label — i18n may render either the default
    // "Projektant / pomiarowiec" or PL translation "Osoba sporządzająca / wykonawca"
    const hasDesignerLabel =
      text.includes("Projektant / pomiarowiec") ||
      text.includes("Osoba sporządzająca / wykonawca");
    expect(hasDesignerLabel).toBe(true);
    expect(text).toContain("Inwestor");
    // At least 2 empty-signature placeholder slots rendered
    const placeholderMatches = text.match(/miejsce na (podpis|pieczęć|pieczęć \/ podpis)/g) ?? [];
    expect(placeholderMatches.length).toBeGreaterThanOrEqual(2);
  });
});
