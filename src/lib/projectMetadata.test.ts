import { describe, expect, it } from "vitest";
import {
  createDefaultProjectMetadata,
  createEmptyProjectMetadata,
  DEFAULT_ATTACHMENT_ITEMS,
  mergeDefaultAttachmentItems,
  normalizeProjectMetadata,
  normalizeSimultaneityFactor,
  normalizeAttachmentItems,
} from "./projectMetadata";

describe("attachment metadata normalization", () => {
  it("removes pasted checklist markers, headings, work-scope rows, and legacy standard rows from attachments", () => {
    const normalized = normalizeAttachmentItems([
      "Układanie przewodów i osprzętu",
      "✓",
      "[x]",
      "ZAŁĄCZNIKI DO PROTOKOŁU",
      "✓ Protokół z pomiarów ochronnych",
      "Schemat jednokreskowy rozdzielnicy",
      "Kopia uprawnień budowlanych / SEP",
    ]);

    expect(normalized).toEqual(["Schemat instalacji elektrycznej"]);
  });

  it("keeps standard attachment defaults after cleanup", () => {
    const merged = mergeDefaultAttachmentItems(["✓", "Tabela zbiorcza pomiarów"]);

    expect(merged).toEqual(DEFAULT_ATTACHMENT_ITEMS);
  });

  it("keeps fixed standard attachments first and appends custom optional rows", () => {
    const merged = mergeDefaultAttachmentItems([
      "Protokół RCD i uziemienia",
      "Schemat",
      "Rozdzielnica",
      "Opis obwodów",
      "Dokument dodatkowy",
    ]);

    expect(merged).toEqual([...DEFAULT_ATTACHMENT_ITEMS, "Dokument dodatkowy"]);
  });
});

describe("power metadata normalization", () => {
  it("defaults missing simultaneity factor to 0.6", () => {
    expect(normalizeProjectMetadata({}).simultaneityFactor).toBe(0.6);
  });

  it("keeps simultaneity factor within professional input bounds", () => {
    expect(normalizeSimultaneityFactor(0)).toBe(0.1);
    expect(normalizeSimultaneityFactor(0.755)).toBe(0.76);
    expect(normalizeSimultaneityFactor(2)).toBe(1);
  });
});

describe("contractor and statement identity fields", () => {
  it("exposes the new contractor identity fields on default metadata", () => {
    // WHY: the title-page PDF now renders NIP, REGON, phone and email under
    // the contractor box. The default metadata must declare them so newly
    // created projects never crash the renderer with undefined values.
    const metadata = createDefaultProjectMetadata();
    expect(metadata).toHaveProperty("contractorNip");
    expect(metadata).toHaveProperty("contractorRegon");
    expect(metadata).toHaveProperty("contractorPhone");
    expect(metadata).toHaveProperty("contractorEmail");
    expect(metadata).toHaveProperty("investorAddress");
    expect(metadata).toHaveProperty("statementDate");
  });

  it("normalises legacy project files without the new fields using empty defaults", () => {
    // WHY: files saved before this change have no contractorNip/contractorRegon/
    // etc. Loading them must yield empty strings (not undefined) so downstream
    // PDF rendering stays type-safe.
    const normalized = normalizeProjectMetadata({
      projectNumber: "PW-99/2025",
      author: "Legacy Author",
      contractor: "Legacy Firma",
    });

    expect(normalized.contractorNip).toBe("");
    expect(normalized.contractorRegon).toBe("");
    expect(normalized.contractorPhone).toBe("");
    expect(normalized.contractorEmail).toBe("");
    expect(normalized.investorAddress).toBe("");
    expect(normalized.statementDate).toBe(normalized.drawingDate);
  });

  it("keeps explicit contractor identity values supplied by the user", () => {
    const normalized = normalizeProjectMetadata({
      contractorNip: "1234567890",
      contractorRegon: "012345678",
      contractorPhone: "+48 600 100 200",
      contractorEmail: "biuro@firma.pl",
      investorAddress: "ul. Inwestorska 5, 00-001 Warszawa",
      statementDate: "2026-06-15",
    });

    expect(normalized.contractorNip).toBe("1234567890");
    expect(normalized.contractorRegon).toBe("012345678");
    expect(normalized.contractorPhone).toBe("+48 600 100 200");
    expect(normalized.contractorEmail).toBe("biuro@firma.pl");
    expect(normalized.investorAddress).toBe("ul. Inwestorska 5, 00-001 Warszawa");
    expect(normalized.statementDate).toBe("2026-06-15");
  });

  it("falls back statement date to drawing date when explicitly empty", () => {
    // WHY: an empty statementDate after the user clears the field should not
    // fall back to today's date — that would silently rewrite the document
    // to a different day. Use the drawing date as the most consistent signal.
    const normalized = normalizeProjectMetadata({
      drawingDate: "2026-05-20",
      statementDate: "",
    });

    expect(normalized.statementDate).toBe("2026-05-20");
  });

  it("empty metadata keeps empty identity fields so the renderer can hide them", () => {
    const empty = createEmptyProjectMetadata();
    expect(empty.contractorNip).toBe("");
    expect(empty.contractorRegon).toBe("");
    expect(empty.contractorPhone).toBe("");
    expect(empty.contractorEmail).toBe("");
    expect(empty.investorAddress).toBe("");
    expect(empty.statementDate).toBe("");
  });
});
