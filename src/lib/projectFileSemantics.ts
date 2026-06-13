import type { ProjectFileData } from "./projectFile";
import type { SymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";

export type SemanticSeverity = "Error" | "Warning" | "Info";

export interface SemanticValidationMessage {
  code: string;
  message: string;
  details?: string;
  severity: SemanticSeverity;
  symbolId?: string;
  connectionId?: string;
}

export type ProjectSemanticValidation = SemanticValidationMessage;

const VALID_PHASES: ReadonlySet<string> = new Set([
  "L1",
  "L2",
  "L3",
  "L1+L2",
  "L2+L3",
  "L1+L3",
  "L3+L1",
  "L1+L2+L3",
  "3F",
  "PE",
  "N",
]);

const VALID_WIRE_COLORS: ReadonlySet<string> = new Set([
  "black",
  "blue",
  "brown",
  "grey",
  "green-yellow",
  "red",
  "other",
]);

const VALID_WIRE_TYPES: ReadonlySet<string> = new Set(["DY", "LgY", "szyna"]);

const VALID_ROUTING_MODES: ReadonlySet<string> = new Set([
  "manhattan",
  "orthogonal",
  "direct",
  "smart",
]);

const VALID_DEVICE_KINDS: ReadonlySet<string> = new Set([
  "mcb",
  "rcd",
  "rcbo",
  "spd",
  "fr",
  "phaseIndicator",
  "terminalBlock",
  "other",
]);

export function validateProjectSemantics(data: ProjectFileData): ProjectSemanticValidation[] {
  const messages: ProjectSemanticValidation[] = [];

  validateUniqueSymbolIds(data.symbols, messages);
  validateUniqueConnectionIds(data.connections ?? [], messages);
  validateConnectionReferences(data.symbols, data.connections ?? [], messages);
  validateRcdReferences(data.symbols, messages);
  validateRcdHierarchyCycles(data.symbols, messages);
  validateSymbolNumericRanges(data.symbols, messages);
  validateConnectionIntegrity(data.connections ?? [], messages);
  validateWireTypes(data.connections ?? [], messages);

  return messages;
}

function validateUniqueSymbolIds(
  symbols: SymbolItem[],
  messages: ProjectSemanticValidation[],
): void {
  const seen = new Map<string, number>();
  for (const symbol of symbols) {
    if (!symbol.id) {
      messages.push({
        code: "SEM-001",
        message: "Symbol bez identyfikatora",
        details: "Kazdy symbol musi miec niepuste id.",
        severity: "Error",
      });
      continue;
    }
    const count = (seen.get(symbol.id) ?? 0) + 1;
    seen.set(symbol.id, count);
    if (count === 2) {
      messages.push({
        code: "SEM-002",
        message: `Zduplikowane id symbolu: ${symbol.id}`,
        severity: "Error",
        symbolId: symbol.id,
      });
    } else if (count > 2) {
      // Already reported on second occurrence; only first dup is enough
    }
  }
}

function validateUniqueConnectionIds(
  connections: ConnectionItem[],
  messages: ProjectSemanticValidation[],
): void {
  const seen = new Map<string, number>();
  for (const conn of connections) {
    if (!conn.id) {
      messages.push({
        code: "SEM-003",
        message: "Polaczenie bez identyfikatora",
        details: "Kazde polaczenie musi miec niepuste id.",
        severity: "Error",
      });
      continue;
    }
    const count = (seen.get(conn.id) ?? 0) + 1;
    seen.set(conn.id, count);
    if (count === 2) {
      messages.push({
        code: "SEM-004",
        message: `Zduplikowane id polaczenia: ${conn.id}`,
        severity: "Error",
        connectionId: conn.id,
      });
    }
  }
}

function validateConnectionReferences(
  symbols: SymbolItem[],
  connections: ConnectionItem[],
  messages: ProjectSemanticValidation[],
): void {
  const symbolIds = new Set(symbols.map((s) => s.id));

  for (const conn of connections) {
    if (!conn.id) continue;
    if (conn.fromSymbolId && !symbolIds.has(conn.fromSymbolId)) {
      messages.push({
        code: "SEM-005",
        message: `Polaczenie ${conn.id} wskazuje na nieistniejacy symbol ${conn.fromSymbolId}`,
        severity: "Error",
        connectionId: conn.id,
      });
    }
    if (conn.toSymbolId && !symbolIds.has(conn.toSymbolId)) {
      messages.push({
        code: "SEM-006",
        message: `Polaczenie ${conn.id} wskazuje na nieistniejacy symbol ${conn.toSymbolId}`,
        severity: "Error",
        connectionId: conn.id,
      });
    }
  }
}

function validateRcdReferences(
  symbols: SymbolItem[],
  messages: ProjectSemanticValidation[],
): void {
  const symbolIds = new Set(symbols.map((s) => s.id));

  for (const symbol of symbols) {
    if (!symbol.rcdSymbolId) continue;
    if (!symbolIds.has(symbol.rcdSymbolId)) {
      messages.push({
        code: "SEM-007",
        message: `Symbol ${symbol.id} odwoluje sie do nieistniejacego RCD ${symbol.rcdSymbolId}`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }
  }
}

function validateRcdHierarchyCycles(
  symbols: SymbolItem[],
  messages: ProjectSemanticValidation[],
): void {
  const rcdById = new Map<string, SymbolItem>();
  for (const symbol of symbols) {
    if (symbol.deviceKind === "rcd" || symbol.deviceKind === "rcbo") {
      rcdById.set(symbol.id, symbol);
    }
  }

  for (const start of rcdById.values()) {
    const visited = new Set<string>();
    let current: SymbolItem | undefined = start;
    while (current && current.rcdSymbolId) {
      if (visited.has(current.id)) {
        messages.push({
          code: "SEM-008",
          message: `Cykl w hierarchii RCD wykryty od ${start.id}`,
          details: `Petla: ${Array.from(visited).join(" -> ")} -> ${current.id}`,
          severity: "Error",
          symbolId: start.id,
        });
        break;
      }
      visited.add(current.id);
      const nextId = current.rcdSymbolId;
      current = rcdById.get(nextId);
    }
  }
}

function validateSymbolNumericRanges(
  symbols: SymbolItem[],
  messages: ProjectSemanticValidation[],
): void {
  for (const symbol of symbols) {
    if (symbol.id && !VALID_DEVICE_KINDS.has(symbol.deviceKind)) {
      messages.push({
        code: "SEM-009",
        message: `Symbol ${symbol.id} ma nieznany deviceKind: ${symbol.deviceKind}`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (symbol.phase && !VALID_PHASES.has(symbol.phase)) {
      messages.push({
        code: "SEM-010",
        message: `Symbol ${symbol.id} ma nieznana faze: ${symbol.phase}`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (symbol.powerW < 0) {
      messages.push({
        code: "SEM-011",
        message: `Symbol ${symbol.id} ma ujemna moc (${symbol.powerW}W)`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }

    if (symbol.rcdResidualCurrent < 0) {
      messages.push({
        code: "SEM-012",
        message: `Symbol ${symbol.id} ma ujemny prad roznicowy RCD (${symbol.rcdResidualCurrent}mA)`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }

    if (symbol.cableCrossSection < 0) {
      messages.push({
        code: "SEM-013",
        message: `Symbol ${symbol.id} ma ujemny przekroj kabla (${symbol.cableCrossSection}mm2)`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }

    if (symbol.cableLength < 0) {
      messages.push({
        code: "SEM-014",
        message: `Symbol ${symbol.id} ma ujemna dlugosc kabla (${symbol.cableLength}m)`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }
  }
}

function validateConnectionIntegrity(
  connections: ConnectionItem[],
  messages: ProjectSemanticValidation[],
): void {
  for (const conn of connections) {
    if (!conn.id) continue;
    if (
      conn.fromSymbolId &&
      conn.toSymbolId &&
      conn.fromSymbolId === conn.toSymbolId &&
      conn.fromTerminal === conn.toTerminal
    ) {
      messages.push({
        code: "SEM-015",
        message: `Polaczenie ${conn.id} laczy ten sam zacisk tego samego symbolu`,
        severity: "Warning",
        connectionId: conn.id,
      });
    }

    if (conn.wireCrossSection < 0) {
      messages.push({
        code: "SEM-016",
        message: `Polaczenie ${conn.id} ma ujemny przekroj przewodu (${conn.wireCrossSection}mm2)`,
        severity: "Error",
        connectionId: conn.id,
      });
    }
  }
}

function validateWireTypes(
  connections: ConnectionItem[],
  messages: ProjectSemanticValidation[],
): void {
  for (const conn of connections) {
    if (!conn.id) continue;
    if (conn.wireColor && !VALID_WIRE_COLORS.has(conn.wireColor)) {
      messages.push({
        code: "SEM-017",
        message: `Polaczenie ${conn.id} ma nieznany kolor przewodu: ${conn.wireColor}`,
        severity: "Warning",
        connectionId: conn.id,
      });
    }
    if (conn.wireType && !VALID_WIRE_TYPES.has(conn.wireType)) {
      messages.push({
        code: "SEM-018",
        message: `Polaczenie ${conn.id} ma nieznany typ przewodu: ${conn.wireType}`,
        severity: "Warning",
        connectionId: conn.id,
      });
    }
    if (conn.routingMode && !VALID_ROUTING_MODES.has(conn.routingMode)) {
      messages.push({
        code: "SEM-019",
        message: `Polaczenie ${conn.id} ma nieznany tryb trasowania: ${conn.routingMode}`,
        severity: "Warning",
        connectionId: conn.id,
      });
    }
  }
}
