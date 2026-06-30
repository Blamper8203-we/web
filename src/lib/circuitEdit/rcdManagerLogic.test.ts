import { describe, expect, it } from "vitest";
import { applyRcdManagerUpdates, type RcdManagerUpdateEntry } from "./rcdManagerLogic";
import { createDefaultSymbolItem } from "../../types/symbolItem";

describe("applyRcdManagerUpdates - H-3 audit fix", () => {
  it("zwraca ten sam obiekt (referencja) dla RCD bez zmian", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      type: "RCD 4P",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r1", rcdRatedCurrent: 40, rcdResidualCurrent: 30, rcdType: "A" },
    ];

    const result = applyRcdManagerUpdates([rcd], updates);

    expect(result[0]).toBe(rcd); // referencja === referencja
  });

  it("zwraca ten sam obiekt dla MCB z rcdSymbolId bez zmian", () => {
    const mcb = createDefaultSymbolItem({
      id: "m1",
      type: "MCB 1P",
      deviceKind: "mcb",
      rcdSymbolId: "r1",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r1", rcdRatedCurrent: 40, rcdResidualCurrent: 30, rcdType: "A" },
    ];

    const result = applyRcdManagerUpdates([mcb], updates);

    expect(result[0]).toBe(mcb);
  });

  it("rebuilduje obiekt dla RCD ze zmiana rcdRatedCurrent", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      type: "RCD 4P",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r1", rcdRatedCurrent: 63, rcdResidualCurrent: 30, rcdType: "A" },
    ];

    const result = applyRcdManagerUpdates([rcd], updates);

    expect(result[0]).not.toBe(rcd);
    expect(result[0].rcdRatedCurrent).toBe(63);
  });

  it("rebuilduje obiekt dla RCD ze zmiana rcdResidualCurrent", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      type: "RCD 4P",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r1", rcdRatedCurrent: 40, rcdResidualCurrent: 300, rcdType: "A" },
    ];

    const result = applyRcdManagerUpdates([rcd], updates);

    expect(result[0]).not.toBe(rcd);
    expect(result[0].rcdResidualCurrent).toBe(300);
  });

  it("rebuilduje obiekt dla RCD ze zmiana rcdType (case-insensitive)", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      type: "RCD 4P",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r1", rcdRatedCurrent: 40, rcdResidualCurrent: 30, rcdType: "AC" },
    ];

    const result = applyRcdManagerUpdates([rcd], updates);

    expect(result[0]).not.toBe(rcd);
    expect(result[0].rcdType).toBe("AC");
  });

  it("pomija RCD ktore nie ma w updates (bez zmian)", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      type: "RCD 4P",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r2", rcdRatedCurrent: 63, rcdResidualCurrent: 30, rcdType: "A" },
    ];

    const result = applyRcdManagerUpdates([rcd], updates);

    expect(result[0]).toBe(rcd);
  });

  it("pomija symbol z rcdSymbolId jesli parent nie ma w updates (bez zmian)", () => {
    const mcb = createDefaultSymbolItem({
      id: "m1",
      type: "MCB 1P",
      deviceKind: "mcb",
      rcdSymbolId: "ghost-rcd",
      rcdRatedCurrent: 0,
      rcdResidualCurrent: 0,
      rcdType: "",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r2", rcdRatedCurrent: 40, rcdResidualCurrent: 30, rcdType: "A" },
    ];

    const result = applyRcdManagerUpdates([mcb], updates);

    expect(result[0]).toBe(mcb);
  });

  it("rcdType: pusty string w updates traktowany jako 'A' (default)", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      type: "RCD 4P",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "B",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r1", rcdRatedCurrent: 40, rcdResidualCurrent: 30, rcdType: "" },
    ];

    const result = applyRcdManagerUpdates([rcd], updates);

    expect(result[0].rcdType).toBe("A");
  });

  it("rcdRatedCurrent: wartosci < 1 sa clampowane do 1", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      type: "RCD 4P",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const updates: RcdManagerUpdateEntry[] = [
      { id: "r1", rcdRatedCurrent: -10, rcdResidualCurrent: 30, rcdType: "A" },
    ];

    const result = applyRcdManagerUpdates([rcd], updates);

    expect(result[0].rcdRatedCurrent).toBe(1);
  });
});
