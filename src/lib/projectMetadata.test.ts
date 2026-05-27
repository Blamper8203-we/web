import { describe, expect, it } from "vitest";
import {
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
