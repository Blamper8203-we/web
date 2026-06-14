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

describe("projectFile round-trip (no data loss)", () => {
  // Krytyczne dla Krok 2 roadmapy: upewniamy się, że serialize → parse
  // zachowuje WSZYSTKIE dane (metadata + symbols + rail + connections).
  // Bez tego użytkownik mógłby stracić dane po "Zapisz" → "Otwórz" bez
  // zauważenia.

  function makeRoundTripData() {
    const metadata = createEmptyProjectMetadata();
    const connections: ConnectionItem[] = [
      {
        id: "conn-1",
        fromSymbolId: "rcd-1",
        fromTerminal: "2",
        toSymbolId: "mcb-1",
        toTerminal: "1",
        wireColor: "black",
        wireCrossSection: 2.5,
        wireType: "LgY",
        routingMode: "manhattan",
      },
    ];
    return {
      metadata,
      symbols: [
        createDefaultSymbolItem({
          id: "rcd-1",
          type: "RCD 2P",
          deviceKind: "rcd",
          rcdRatedCurrent: 40,
          rcdResidualCurrent: 30,
          rcdType: "A",
          group: "G1",
          groupName: "Grupa 1",
        }),
        createDefaultSymbolItem({
          id: "mcb-1",
          type: "MCB 1P",
          deviceKind: "mcb",
          circuitName: "Oświetlenie salon",
          rcdSymbolId: "rcd-1",
          group: "G1",
          powerW: 2300,
        }),
        createDefaultSymbolItem({
          id: "mcb-2",
          type: "MCB 1P",
          deviceKind: "mcb",
          circuitName: "Gniazdo kuchnia",
          rcdSymbolId: "rcd-1",
          group: "G1",
          powerW: 3680,
        }),
      ],
      connections,
      rail: {
        svg: "<svg><rect width='100' height='50' /></svg>",
        width: 1000,
        height: 500,
        rows: 1,
        modulesPerRow: 24,
        isVisible: true,
      },
    };
  }

  it("full round-trip preserves metadata, symbols, connections, and rail", () => {
    const data = makeRoundTripData();

    const serialized = serializeProjectFileContent(
      data.metadata,
      data.symbols,
      data.rail,
      data.connections,
    );
    const parsed = parseProjectFileContent(serialized, "/test/roundtrip.dinboard");

    // Metadata (tylko te pola, które są porównywalne po normalizacji)
    expect(parsed.metadata).not.toBeNull();
    expect(parsed.metadata!.projectNumber).toBe(data.metadata.projectNumber);
    expect(parsed.metadata!.investor).toBe(data.metadata.investor);

    // Symbols
    expect(parsed.symbols).toHaveLength(3);
    expect(parsed.symbols.map((s) => s.id)).toEqual(["rcd-1", "mcb-1", "mcb-2"]);
    expect(parsed.symbols.find((s) => s.id === "mcb-1")!.circuitName).toBe("Oświetlenie salon");
    expect(parsed.symbols.find((s) => s.id === "mcb-1")!.rcdSymbolId).toBe("rcd-1");
    expect(parsed.symbols.find((s) => s.id === "mcb-1")!.powerW).toBe(2300);

    // Connections
    expect(parsed.connections).toHaveLength(1);
    expect(parsed.connections![0]).toMatchObject({
      id: "conn-1",
      fromSymbolId: "rcd-1",
      toSymbolId: "mcb-1",
      wireColor: "black",
    });

    // Rail
    expect(parsed.rail).not.toBeNull();
    expect(parsed.rail!.width).toBe(1000);
    expect(parsed.rail!.height).toBe(500);
    expect(parsed.rail!.isVisible).toBe(true);
    expect(parsed.rail!.rows).toBe(1);
    expect(parsed.rail!.modulesPerRow).toBe(24);
  });

  it("round-trip with invisible rail: rail is null after parse", () => {
    const data = makeRoundTripData();
    const hiddenRail = { ...data.rail, isVisible: false };

    const serialized = serializeProjectFileContent(data.metadata, data.symbols, hiddenRail, data.connections);
    const parsed = parseProjectFileContent(serialized);

    // rail?.isVisible ? rail : null — niewidoczny rail NIE jest serializowany
    expect(parsed.rail).toBeNull();
  });

  it("round-trip with null rail: stays null after parse", () => {
    const data = makeRoundTripData();

    const serialized = serializeProjectFileContent(data.metadata, data.symbols, null, data.connections);
    const parsed = parseProjectFileContent(serialized);

    expect(parsed.rail).toBeNull();
  });

  it("round-trip with no connections: empty array preserved", () => {
    const data = makeRoundTripData();

    const serialized = serializeProjectFileContent(data.metadata, data.symbols, data.rail);
    const parsed = parseProjectFileContent(serialized);

    expect(parsed.connections).toEqual([]);
  });
});

