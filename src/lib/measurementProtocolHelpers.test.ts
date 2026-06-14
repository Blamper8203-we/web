import { describe, expect, it } from "vitest";
import {
  buildSheetTitle,
  chunkRows,
  createHeaderForPage,
} from "./measurementProtocolHelpers";

describe("chunkRows", () => {
  it("returns single empty page for empty input", () => {
    expect(chunkRows([], 5)).toEqual([[]]);
  });

  it("returns one page when input fits", () => {
    expect(chunkRows([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });

  it("splits into multiple pages", () => {
    expect(chunkRows([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7],
    ]);
  });

  it("handles size of 1 (one element per page)", () => {
    expect(chunkRows(["a", "b", "c"], 1)).toEqual([["a"], ["b"], ["c"]]);
  });

  it("preserves order of elements", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const chunked = chunkRows(arr, 3);
    expect(chunked.flat()).toEqual(arr);
  });
});

describe("buildSheetTitle", () => {
  it("formats single-digit page numbers with leading zero", () => {
    expect(buildSheetTitle(0, 5)).toBe("Protokół Nr 01/05");
  });

  it("formats two-digit page numbers without extra padding", () => {
    expect(buildSheetTitle(8, 12)).toBe("Protokół Nr 09/12");
  });

  it("handles large page counts (3 digits stay 3 digits)", () => {
    // padStart(2, "0") means "minimum 2 digits" — 100+ digits stay as-is
    expect(buildSheetTitle(99, 100)).toBe("Protokół Nr 100/100");
  });

  it("formats edge case with single page", () => {
    expect(buildSheetTitle(0, 1)).toBe("Protokół Nr 01/01");
  });
});

describe("createHeaderForPage", () => {
  it("returns a new header with updated headerTitle", () => {
    const original = { headerTitle: "old", subtitle: "kept" };
    const updated = createHeaderForPage(original, 0, 3);

    expect(updated.headerTitle).toBe("Protokół Nr 01/03");
    expect(updated.subtitle).toBe("kept");
  });

  it("does not mutate the original header", () => {
    const original = { headerTitle: "original" };
    const updated = createHeaderForPage(original, 1, 2);

    expect(original.headerTitle).toBe("original");
    expect(updated).not.toBe(original);
  });

  it("preserves extra fields on the header", () => {
    const original = {
      headerTitle: "x",
      headerSubtitle: "y",
      measurementDate: "2026-06-14",
      objectName: "Rozdzielnica",
      // niestandardowe pole
      customField: 42,
    };
    const updated = createHeaderForPage(original, 0, 1);

    expect(updated).toEqual({
      headerTitle: "Protokół Nr 01/01",
      headerSubtitle: "y",
      measurementDate: "2026-06-14",
      objectName: "Rozdzielnica",
      customField: 42,
    });
  });
});
