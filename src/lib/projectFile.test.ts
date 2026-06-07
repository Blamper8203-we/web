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
    // Minimal valid web project file shape without connections
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
});
