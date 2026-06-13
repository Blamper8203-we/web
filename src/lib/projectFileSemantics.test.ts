import { describe, expect, it } from "vitest";
import { validateProjectSemantics } from "./projectFileSemantics";
import { createDefaultSymbolItem } from "../types/symbolItem";
import { createDefaultConnection } from "../types/connectionItem";
import type { ProjectFileData } from "./projectFile";
import { createEmptyProjectMetadata } from "./projectMetadata";

function makeProject(
  symbols: ReturnType<typeof createDefaultSymbolItem>[],
  connections: ReturnType<typeof createDefaultConnection>[] = [],
): ProjectFileData {
  return {
    metadata: createEmptyProjectMetadata(),
    symbols,
    connections,
    version: "2.0",
    path: "test.dinboard",
    rail: null,
  };
}

describe("validateProjectSemantics - unique IDs", () => {
  it("accepts a project with unique symbol and connection IDs", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const s2 = createDefaultSymbolItem({ id: "s2" });
    const c1 = createDefaultConnection({ id: "c1", fromSymbolId: "s1", toSymbolId: "s2" });

    const messages = validateProjectSemantics(makeProject([s1, s2], [c1]));

    expect(messages.filter((m) => m.severity === "Error")).toEqual([]);
  });

  it("flags duplicate symbol IDs (Error SEM-002)", () => {
    const s1 = createDefaultSymbolItem({ id: "dup" });
    const s2 = createDefaultSymbolItem({ id: "dup" });

    const messages = validateProjectSemantics(makeProject([s1, s2]));

    const err = messages.find((m) => m.code === "SEM-002");
    expect(err).toBeDefined();
    expect(err?.severity).toBe("Error");
    expect(err?.symbolId).toBe("dup");
  });

  it("flags duplicate connection IDs (Error SEM-004)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const c1 = createDefaultConnection({ id: "dup", fromSymbolId: "s1", toSymbolId: "s1" });
    const c2 = createDefaultConnection({ id: "dup", fromSymbolId: "s1", toSymbolId: "s1" });

    const messages = validateProjectSemantics(makeProject([s1], [c1, c2]));

    expect(messages.some((m) => m.code === "SEM-004" && m.connectionId === "dup")).toBe(true);
  });

  it("flags symbols with empty id (Error SEM-001)", () => {
    const s = createDefaultSymbolItem({ id: "" });
    const messages = validateProjectSemantics(makeProject([s]));
    expect(messages.some((m) => m.code === "SEM-001")).toBe(true);
  });
});

describe("validateProjectSemantics - reference integrity", () => {
  it("flags a connection that points to a non-existent symbol (Error SEM-005)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const c1 = createDefaultConnection({ id: "c1", fromSymbolId: "ghost", toSymbolId: "s1" });

    const messages = validateProjectSemantics(makeProject([s1], [c1]));

    expect(messages.some((m) => m.code === "SEM-005" && m.connectionId === "c1")).toBe(true);
  });

  it("flags a connection whose toSymbolId is missing (Error SEM-006)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const c1 = createDefaultConnection({ id: "c1", fromSymbolId: "s1", toSymbolId: "ghost" });

    const messages = validateProjectSemantics(makeProject([s1], [c1]));

    expect(messages.some((m) => m.code === "SEM-006" && m.connectionId === "c1")).toBe(true);
  });

  it("flags a symbol that references a non-existent RCD (Error SEM-007)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1", rcdSymbolId: "ghost-rcd" });

    const messages = validateProjectSemantics(makeProject([s1]));

    expect(messages.some((m) => m.code === "SEM-007" && m.symbolId === "s1")).toBe(true);
  });
});

describe("validateProjectSemantics - RCD hierarchy cycles", () => {
  it("detects a direct RCD->RCD self-loop (Error SEM-008)", () => {
    const rcd = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd", rcdSymbolId: "r1" });
    const messages = validateProjectSemantics(makeProject([rcd]));
    expect(messages.some((m) => m.code === "SEM-008" && m.symbolId === "r1")).toBe(true);
  });

  it("detects an indirect RCD->RCD->RCD cycle (Error SEM-008)", () => {
    const r1 = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd", rcdSymbolId: "r2" });
    const r2 = createDefaultSymbolItem({ id: "r2", deviceKind: "rcd", rcdSymbolId: "r3" });
    const r3 = createDefaultSymbolItem({ id: "r3", deviceKind: "rcd", rcdSymbolId: "r1" });

    const messages = validateProjectSemantics(makeProject([r1, r2, r3]));

    expect(messages.filter((m) => m.code === "SEM-008").length).toBeGreaterThanOrEqual(1);
  });

  it("accepts a normal RCD chain without cycle", () => {
    const r1 = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd" });
    const r2 = createDefaultSymbolItem({ id: "r2", deviceKind: "rcd", rcdSymbolId: "r1" });
    const r3 = createDefaultSymbolItem({ id: "r3", deviceKind: "rcd", rcdSymbolId: "r2" });

    const messages = validateProjectSemantics(makeProject([r1, r2, r3]));

    expect(messages.filter((m) => m.code === "SEM-008")).toEqual([]);
  });
});

describe("validateProjectSemantics - numeric ranges", () => {
  it("flags negative powerW (Error SEM-011)", () => {
    const s = createDefaultSymbolItem({ id: "s1", powerW: -10 });
    const messages = validateProjectSemantics(makeProject([s]));
    expect(messages.some((m) => m.code === "SEM-011" && m.symbolId === "s1")).toBe(true);
  });

  it("flags negative rcdResidualCurrent (Error SEM-012)", () => {
    const s = createDefaultSymbolItem({ id: "s1", rcdResidualCurrent: -1 });
    const messages = validateProjectSemantics(makeProject([s]));
    expect(messages.some((m) => m.code === "SEM-012")).toBe(true);
  });

  it("flags negative cableCrossSection (Error SEM-013)", () => {
    const s = createDefaultSymbolItem({ id: "s1", cableCrossSection: -2.5 });
    const messages = validateProjectSemantics(makeProject([s]));
    expect(messages.some((m) => m.code === "SEM-013")).toBe(true);
  });

  it("flags negative cableLength (Error SEM-014)", () => {
    const s = createDefaultSymbolItem({ id: "s1", cableLength: -10 });
    const messages = validateProjectSemantics(makeProject([s]));
    expect(messages.some((m) => m.code === "SEM-014")).toBe(true);
  });

  it("warns on unknown deviceKind (Warning SEM-009)", () => {
    const s = createDefaultSymbolItem({ id: "s1" });
    // Cast around the type system to inject a bad value
    const corrupt = { ...s, deviceKind: "haunted-switch" as unknown as typeof s.deviceKind } as unknown as ReturnType<typeof createDefaultSymbolItem>;
    const messages = validateProjectSemantics(makeProject([corrupt]));
    expect(messages.some((m) => m.code === "SEM-009" && m.severity === "Warning")).toBe(true);
  });

  it("warns on unknown phase (Warning SEM-010)", () => {
    const s = createDefaultSymbolItem({ id: "s1" });
    const corrupt = { ...s, phase: "L9" as unknown as typeof s.phase } as unknown as ReturnType<typeof createDefaultSymbolItem>;
    const messages = validateProjectSemantics(makeProject([corrupt]));
    expect(messages.some((m) => m.code === "SEM-010")).toBe(true);
  });
});

describe("validateProjectSemantics - connection integrity", () => {
  it("warns when a connection has the same from/to symbol and terminal (Warning SEM-015)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const c1 = createDefaultConnection({
      id: "c1",
      fromSymbolId: "s1",
      fromTerminal: "1",
      toSymbolId: "s1",
      toTerminal: "1",
    });

    const messages = validateProjectSemantics(makeProject([s1], [c1]));

    expect(messages.some((m) => m.code === "SEM-015" && m.connectionId === "c1")).toBe(true);
  });

  it("accepts a connection between the same symbol but different terminals", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const c1 = createDefaultConnection({
      id: "c1",
      fromSymbolId: "s1",
      fromTerminal: "1",
      toSymbolId: "s1",
      toTerminal: "2",
    });

    const messages = validateProjectSemantics(makeProject([s1], [c1]));

    expect(messages.filter((m) => m.code === "SEM-015")).toEqual([]);
  });

  it("flags negative wireCrossSection (Error SEM-016)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const s2 = createDefaultSymbolItem({ id: "s2" });
    const c1 = createDefaultConnection({
      id: "c1",
      fromSymbolId: "s1",
      toSymbolId: "s2",
      wireCrossSection: -1,
    });

    const messages = validateProjectSemantics(makeProject([s1, s2], [c1]));

    expect(messages.some((m) => m.code === "SEM-016")).toBe(true);
  });

  it("warns on unknown wireColor (Warning SEM-017)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const s2 = createDefaultSymbolItem({ id: "s2" });
    const c1 = createDefaultConnection({
      id: "c1",
      fromSymbolId: "s1",
      toSymbolId: "s2",
      wireColor: "neon-pink" as unknown as "black",
    });

    const messages = validateProjectSemantics(makeProject([s1, s2], [c1]));

    expect(messages.some((m) => m.code === "SEM-017")).toBe(true);
  });

  it("warns on unknown wireType (Warning SEM-018)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const s2 = createDefaultSymbolItem({ id: "s2" });
    const c1 = createDefaultConnection({
      id: "c1",
      fromSymbolId: "s1",
      toSymbolId: "s2",
      wireType: "Unobtainium" as unknown as "DY",
    });

    const messages = validateProjectSemantics(makeProject([s1, s2], [c1]));

    expect(messages.some((m) => m.code === "SEM-018")).toBe(true);
  });

  it("warns on unknown routingMode (Warning SEM-019)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1" });
    const s2 = createDefaultSymbolItem({ id: "s2" });
    const c1 = createDefaultConnection({
      id: "c1",
      fromSymbolId: "s1",
      toSymbolId: "s2",
      routingMode: "quantum-tunneling" as unknown as "manhattan",
    });

    const messages = validateProjectSemantics(makeProject([s1, s2], [c1]));

    expect(messages.some((m) => m.code === "SEM-019")).toBe(true);
  });
});

describe("validateProjectSemantics - empty inputs", () => {
  it("returns no messages for an empty project", () => {
    const messages = validateProjectSemantics(makeProject([], []));
    expect(messages).toEqual([]);
  });

  it("handles a project without connections array gracefully", () => {
    const data: ProjectFileData = {
      metadata: createEmptyProjectMetadata(),
      symbols: [createDefaultSymbolItem({ id: "s1" })],
      version: "2.0",
      path: "test.dinboard",
      rail: null,
    };
    const messages = validateProjectSemantics(data);
    expect(messages.filter((m) => m.severity === "Error")).toEqual([]);
  });
});
