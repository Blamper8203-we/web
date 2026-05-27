import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../types/symbolItem";
import { createEmptyProjectMetadata } from "./projectMetadata";
import {
  parseProjectFileContent,
  serializeProjectFileContent,
  type ProjectFileData,
} from "./projectFile";

describe("project file round-trip", () => {
  it("preserves metadata, symbols and DIN rail data", () => {
    const metadata = {
      ...createEmptyProjectMetadata(),
      company: "Dom jednorodzinny",
      projectNumber: "DB-42",
      address: "Krakow, ul. Testowa 1",
      simultaneityFactor: 0.75,
    };
    const symbols = [
      createDefaultSymbolItem({
        id: "rcd-1",
        type: "RCD 4P",
        deviceKind: "rcd",
        label: "RCD glowny",
        referenceDesignation: "Q1",
        x: 120,
        y: 80,
        group: "group-1",
        groupName: "Grupa-1",
        rcdRatedCurrent: 40,
        rcdResidualCurrent: 30,
        rcdType: "A",
      }),
      createDefaultSymbolItem({
        id: "mcb-1",
        type: "MCB 1P",
        deviceKind: "mcb",
        circuitName: "Oswietlenie salon",
        protectionType: "B10",
        powerW: 450,
        phase: "L1",
        x: 220,
        y: 80,
        group: "group-1",
        groupName: "Grupa-1",
        rcdSymbolId: "rcd-1",
      }),
    ];
    const rail: ProjectFileData["rail"] = {
      svg: "<svg viewBox=\"0 0 100 20\"></svg>",
      width: 100,
      height: 20,
      rows: 1,
      modulesPerRow: 12,
      isVisible: true,
    };

    const content = serializeProjectFileContent(metadata, symbols, rail);
    const parsed = parseProjectFileContent(content, "roundtrip.dinboard");

    expect(parsed.path).toBe("roundtrip.dinboard");
    expect(parsed.version).toBe("2.0");
    expect(parsed.metadata).toMatchObject({
      company: "Dom jednorodzinny",
      projectNumber: "DB-42",
      address: "Krakow, ul. Testowa 1",
      simultaneityFactor: 0.75,
    });
    expect(parsed.rail).toEqual(rail);
    expect(parsed.symbols).toHaveLength(2);
    expect(parsed.symbols[0]).toMatchObject({
      id: "rcd-1",
      deviceKind: "rcd",
      label: "RCD glowny",
      referenceDesignation: "Q1",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    expect(parsed.symbols[1]).toMatchObject({
      id: "mcb-1",
      deviceKind: "mcb",
      circuitName: "Oswietlenie salon",
      protectionType: "B10",
      rcdSymbolId: "rcd-1",
      groupName: "Grupa-1",
    });
  });

  it("marks legacy manual reference designation when it differs from automatic value", () => {
    const parsed = parseProjectFileContent(
      JSON.stringify({
        schemaVersion: 2,
        symbols: [
          {
            id: "mcb-1",
            type: "MCB 1P",
            x: 100,
            y: 100,
            referenceDesignation: "F-KUCHNIA",
            parameters: {},
          },
        ],
      }),
      "legacy-manual.json",
    );

    expect(parsed.symbols).toHaveLength(1);
    expect(parsed.symbols[0].referenceDesignation).toBe("F-KUCHNIA");
    expect(parsed.symbols[0].parameters.ManualReferenceDesignation).toBe("true");
  });

  it("does not mark legacy automatic reference designation as manual", () => {
    const parsed = parseProjectFileContent(
      JSON.stringify({
        schemaVersion: 2,
        symbols: [
          {
            id: "mcb-1",
            type: "MCB 1P",
            x: 100,
            y: 100,
            referenceDesignation: "F0.1",
            parameters: {},
          },
        ],
      }),
      "legacy-auto.json",
    );

    expect(parsed.symbols).toHaveLength(1);
    expect(parsed.symbols[0].referenceDesignation).toBe("F0.1");
    expect(parsed.symbols[0].parameters.ManualReferenceDesignation).toBeUndefined();
  });

  it("correctly normalizes coordinates for legacy Avalonia files containing metadata and symbols but no version", () => {
    const parsed = parseProjectFileContent(
      JSON.stringify({
        schemaVersion: 1,
        dinRailWidth: 1000,
        dinRailHeight: 500,
        metadata: {
          company: "Legacy Company",
        },
        symbols: [
          {
            id: "mcb-1",
            type: "MCB 1P",
            x: 100,
            y: 50,
            referenceDesignation: "F1",
            parameters: {},
          },
        ],
      }),
      "legacy-coords.json",
    );

    expect(parsed.version).toBe("1");
    expect(parsed.symbols).toHaveLength(1);
    // offsetX = 1000 / 2 = 500, offsetY = 500 / 2 = 250
    // x should be 100 + 500 = 600
    // y should be 50 + 250 = 300
    expect(parsed.symbols[0].x).toBe(600);
    expect(parsed.symbols[0].y).toBe(300);
  });
});
