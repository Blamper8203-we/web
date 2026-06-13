import { describe, expect, it } from "vitest";
import { parseProjectFileContent, serializeProjectFileContent } from "./projectFile";
import { createEmptyProjectMetadata } from "./projectMetadata";
import { createDefaultSymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";

describe("projectFile serialization/parsing with connections", () => {
  it("serializes and parses connections correctly", () => {
    const metadata = createEmptyProjectMetadata();
    const symbols = [
      createDefaultSymbolItem({ id: "sym-1", type: "MCB 1P" }),
      createDefaultSymbolItem({ id: "sym-2", type: "MCB 1P" }),
    ];
    const connections: ConnectionItem[] = [
      {
        id: "conn-1",
        fromSymbolId: "sym-1",
        fromTerminal: "2",
        toSymbolId: "sym-2",
        toTerminal: "1",
        wireColor: "blue",
        wireCrossSection: 2.5,
        wireType: "LgY",
        routingMode: "manhattan",
        isFromTop: true,
        isToTop: false,
      },
    ];

    const json = serializeProjectFileContent(metadata, symbols, null, connections);
    const parsed = parseProjectFileContent(json);

    expect(parsed.connections).toBeDefined();
    expect(parsed.connections!.length).toBe(1);
    expect(parsed.connections![0]).toMatchObject({
      id: "conn-1",
      fromSymbolId: "sym-1",
      fromTerminal: "2",
      toSymbolId: "sym-2",
      toTerminal: "1",
      wireColor: "blue",
      wireCrossSection: 2.5,
      wireType: "LgY",
      routingMode: "manhattan",
      isFromTop: true,
      isToTop: false,
    });
  });

  it("handles backwards-compatibility by defaulting connections to empty array when missing in file", () => {
    const legacyProject = {
      schemaVersion: 2,
      version: "2.0",
      metadata: createEmptyProjectMetadata(),
      symbols: [
        {
          id: "sym-1",
          type: "MCB 1P",
          label: "MCB 1P",
          phase: "L1",
          parameters: {},
        },
      ],
      rail: null,
    };

    const json = JSON.stringify(legacyProject);
    const parsed = parseProjectFileContent(json);

    expect(parsed.connections).toBeDefined();
    expect(parsed.connections).toEqual([]);
  });

  it("parses legacy Avalonia files correctly", () => {
    const avaloniaProject = {
      schemaVersion: 1,
      name: "Firma Testowa",
      description: "Opis projektu",
      powerConfig: {
        voltage: 400,
        mainProtection: 32,
        powerKw: 15,
        phases: 3,
      },
      circuitRows: [
        {
          id: "sym-1",
          type: "MCB 1P",
          label: "MCB 1P",
          phase: "L1",
          x: 0,
          y: 0,
          parameters: {},
        },
      ],
      dinRailWidth: 1000,
      dinRailHeight: 500,
      dinRailAxes: [250],
      isDinRailVisible: true,
      dinRailSvgContent: "<svg></svg>",
    };

    const json = JSON.stringify(avaloniaProject);
    const parsed = parseProjectFileContent(json);

    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata?.company).toBe("Firma Testowa");
    expect(parsed.metadata?.notes).toBe("Opis projektu");
    expect(parsed.metadata?.supplyVoltageV).toBe(400);
    expect(parsed.metadata?.supplyPhases).toBe(3);
    expect(parsed.metadata?.mainBreakerA).toBe(32);
    expect(parsed.metadata?.contractedPowerKw).toBe(15);

    expect(parsed.symbols).toHaveLength(1);
    // X, Y coordinates should be offset by half of the width/height
    expect(parsed.symbols[0].x).toBe(500); // 0 + 500
    expect(parsed.symbols[0].y).toBe(250); // 0 + 250

    expect(parsed.rail).toBeDefined();
    expect(parsed.rail?.width).toBe(1000);
    expect(parsed.rail?.height).toBe(500);
    expect(parsed.rail?.rows).toBe(1);
  });

  it("throws validation errors for invalid project files", () => {
    const invalidFormat = {
      version: "2.0",
      // missing metadata and symbols
    };
    expect(() => parseProjectFileContent(JSON.stringify(invalidFormat))).toThrow();

    const invalidSymbols = {
      schemaVersion: 2,
      version: "2.0",
      metadata: createEmptyProjectMetadata(),
      symbols: "not-an-array",
    };
    expect(() => parseProjectFileContent(JSON.stringify(invalidSymbols))).toThrow();

    const futureSchema = {
      schemaVersion: 999, // too new
      version: "99.0",
      metadata: createEmptyProjectMetadata(),
      symbols: [],
    };
    expect(() => parseProjectFileContent(JSON.stringify(futureSchema))).toThrow();
  });
});

