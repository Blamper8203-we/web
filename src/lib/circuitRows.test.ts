import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../types/symbolItem";
import {
  buildCircuitListTableRows,
  buildCircuitRowsFromSymbols,
  buildVisibleCircuitGroups,
  countHiddenCircuitRows,
} from "./circuitRows";

describe("circuitRows", () => {
  it("keeps connectors, terminal strips, and distribution blocks out of the visible circuit list", () => {
    const mcb = createDefaultSymbolItem({
      id: "mcb",
      type: "MCB 1P",
      deviceKind: "mcb",
      referenceDesignation: "F1",
      circuitName: "Gniazda",
      displayLocation: "Salon",
      x: 100,
    });
    const connector = createDefaultSymbolItem({
      id: "connector",
      type: "Złącza",
      label: "Złącze 3XPEN",
      deviceKind: "terminalBlock",
      referenceDesignation: "X1",
      visualPath: "assets/modules/zlacza/zlacze-3xpen.svg",
      x: 200,
    });
    const terminalStrip = createDefaultSymbolItem({
      id: "terminal-strip",
      type: "Listwy zaciskowe",
      label: "Listwa N/PE",
      referenceDesignation: "X2",
      visualPath: "assets/modules/Listwy zaciskowe/LISTWA 12 PIN.svg",
      x: 300,
    });
    const distributionBlock = createDefaultSymbolItem({
      id: "distribution-block",
      type: "Blok rozdzielczy",
      label: "Blok rozdzielczy 4 15",
      referenceDesignation: "X3",
      x: 400,
    });

    const rows = buildCircuitRowsFromSymbols([mcb, connector, terminalStrip, distributionBlock]);
    const visibleRows = buildVisibleCircuitGroups(rows).flatMap((group) =>
      group.rcdGroups.flatMap((rcdGroup) => rcdGroup.rows),
    );

    expect(visibleRows.map((row) => row.id)).toEqual(["mcb"]);
    expect(countHiddenCircuitRows(rows)).toBe(3);
  });

  it("builds synchronized flat rows for PDF circuit-list preview", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd",
      type: "RCD 4P",
      deviceKind: "rcd",
      referenceDesignation: "Q1",
      group: "G1",
      groupName: "Kuchnia",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
      x: 100,
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb",
      type: "MCB 1P",
      deviceKind: "mcb",
      referenceDesignation: "F1.1",
      circuitName: "Gniazda blat",
      location: "Kuchnia",
      rcdSymbolId: "rcd",
      x: 200,
    });

    const rows = buildCircuitRowsFromSymbols([rcd, mcb]);
    const tableRows = buildCircuitListTableRows(rows);

    expect(tableRows).toHaveLength(1);
    expect(tableRows[0]).toMatchObject({
      index: 1,
      location: "Kuchnia",
      rcdLabel: "Q1",
      rcdProtection: "RCD 40A/30mA Typ A",
    });
    expect(tableRows[0]?.row.id).toBe("mcb");
  });
});
