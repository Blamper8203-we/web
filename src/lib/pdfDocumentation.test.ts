import { describe, expect, it } from "vitest";
import { getPdfDocumentationTabs, getProtocolLabel } from "./pdfDocumentation";

describe("pdf documentation tabs", () => {
  it("places the distribution board tab directly under the circuit list in unified mode", () => {
    expect(getPdfDocumentationTabs("unified").map((tab) => tab.id)).toEqual([
      "title-page",
      "unified",
      "rcd-ground",
      "circuit-list",
      "din-rail",
    ]);
  });

  it("keeps the distribution board tab directly under the circuit list in separate mode", () => {
    const tabIds = getPdfDocumentationTabs("separate").map((tab) => tab.id);

    expect(tabIds.slice(-2)).toEqual(["circuit-list", "din-rail"]);
  });

  it("uses the expected user-facing label for the distribution board tab", () => {
    expect(getProtocolLabel("din-rail")).toBe("Rozdzielnica elektryczna");
  });
});
