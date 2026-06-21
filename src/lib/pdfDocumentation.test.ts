import { describe, expect, it } from "vitest";
import { getPdfDocumentationTabs, getProtocolLabel } from "./pdfDocumentation";

describe("pdf documentation tabs", () => {
  it("places the distribution board tabs directly under the circuit list", () => {
    expect(getPdfDocumentationTabs().map((tab) => tab.id)).toEqual([
      "title-page",
      "unified",
      "rcd-ground",
      "circuit-list",
      "din-rail",
      "din-rail-connections",
      "schematic",
    ]);
  });

  it("uses the expected user-facing label for the distribution board tabs", () => {
    expect(getProtocolLabel("din-rail")).toBe("Rozdzielnica elektryczna");
    expect(getProtocolLabel("din-rail-connections")).toBe("Rozdzielnica połączenia");
  });
});
