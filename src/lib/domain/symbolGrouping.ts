import {
  isAuxiliaryNonCircuitSymbol,
  isDistributionBlockSymbol,
  isTerminalOrConnectorSymbol,
  type PhaseAssignment,
  type SymbolItem,
} from "../../types/symbolItem";

const MANUAL_PHASE_KEY = "ManualPhase";
const SINGLE_PHASES: PhaseAssignment[] = ["L1", "L2", "L3"];

export function isGroupHeadSymbol(symbol: SymbolItem): boolean {
  return symbol.deviceKind === "rcd";
}

export function isDistributionSymbol(symbol: SymbolItem): boolean {
  return symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo";
}

function isNeutralTerminal(symbol: SymbolItem): boolean {
  if (!isTerminalOrConnectorSymbol(symbol) && !isDistributionBlockSymbol(symbol)) {
    return false;
  }

  const value = `${symbol.type} ${symbol.label} ${symbol.visualPath} ${symbol.moduleRef}`
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (value.includes("pe") || value.includes("ochronn") || value.includes("protect")) {
    return false;
  }

  return /(^|[\s\-/])n[\d_]*([\s\-/]|$)/.test(value) || value.includes("neutral");
}

export function shouldExcludeFromAutoGrouping(symbol: SymbolItem): boolean {
  if (isNeutralTerminal(symbol)) {
    return false;
  }

  return (
    symbol.deviceKind === "fr" ||
    symbol.deviceKind === "spd" ||
    symbol.deviceKind === "phaseIndicator" ||
    symbol.deviceKind === "rcd" ||
    isAuxiliaryNonCircuitSymbol(symbol)
  );
}

export function canAutoJoinExistingGroup(symbol: SymbolItem, snapTarget: SymbolItem): boolean {
  if (isGroupHeadSymbol(symbol) && isDistributionSymbol(snapTarget)) {
    return true;
  }
  return !shouldExcludeFromAutoGrouping(symbol);
}

export function getNextGroupName(symbols: SymbolItem[]): string {
  const usedOrders = symbols
    .map((symbol) => {
      const match = symbol.groupName.match(/^Grupa-(\d+)$/i);
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  const nextOrder = usedOrders.length > 0 ? Math.max(...usedOrders) + 1 : 1;
  return `Grupa-${nextOrder}`;
}

export function resolveRcdSource(symbols: SymbolItem[], snapTarget: SymbolItem): SymbolItem | null {
  if (snapTarget.deviceKind === "rcd") {
    return snapTarget;
  }

  if (snapTarget.rcdSymbolId) {
    const explicitRcd = symbols.find((symbol) => symbol.id === snapTarget.rcdSymbolId);
    if (explicitRcd) {
      return explicitRcd;
    }
  }

  if (snapTarget.group) {
    return symbols.find((symbol) => symbol.group === snapTarget.group && symbol.deviceKind === "rcd") ?? null;
  }

  return null;
}

export function applyInheritedRcdInfo(symbols: SymbolItem[], symbol: SymbolItem, snapTarget: SymbolItem): void {
  if (isGroupHeadSymbol(symbol)) {
    return;
  }

  const rcdSource = resolveRcdSource(symbols, snapTarget);
  if (!rcdSource || rcdSource.id === symbol.id) {
    symbol.rcdSymbolId = "";
    symbol.rcdRatedCurrent = 0;
    symbol.rcdResidualCurrent = 0;
    symbol.rcdType = "";
    return;
  }

  symbol.rcdSymbolId = rcdSource.id;
  symbol.rcdRatedCurrent = rcdSource.rcdRatedCurrent;
  symbol.rcdResidualCurrent = rcdSource.rcdResidualCurrent;
  symbol.rcdType = rcdSource.rcdType;
}

function isFixedThreePhaseRcdSymbol(symbol: SymbolItem): boolean {
  if (symbol.deviceKind !== "rcd") {
    return false;
  }

  const identity = `${symbol.type} ${symbol.label} ${symbol.visualPath} ${symbol.moduleRef}`
    .toLocaleUpperCase("pl-PL");
  if (identity.includes("2P") || identity.includes("1P")) {
    return false;
  }

  return identity.includes("4P") || identity.includes("3P") || symbol.phase === "L1+L2+L3";
}

function isSinglePhaseAssignment(phase: string | null | undefined): phase is PhaseAssignment {
  return SINGLE_PHASES.includes((phase || "").toUpperCase() as PhaseAssignment);
}

function normalizeSinglePhaseAssignment(
  phase: string | null | undefined,
  fallback: string | null | undefined = "L1",
): PhaseAssignment {
  const normalizedPhase = (phase || "").toUpperCase();
  if (isSinglePhaseAssignment(normalizedPhase)) {
    return normalizedPhase;
  }

  const normalizedFallback = (fallback || "").toUpperCase();
  return isSinglePhaseAssignment(normalizedFallback) ? normalizedFallback : "L1";
}

function getNextPhase(current: string): PhaseAssignment {
  const sequence: PhaseAssignment[] = ["L1", "L2", "L3"];
  const parts = (current || "").split('+').map(p => p.trim()).filter(p => sequence.includes(p as PhaseAssignment));
  if (parts.length === 0) return "L1";
  const lastPhase = parts[parts.length - 1] as PhaseAssignment;
  const lastIndex = sequence.indexOf(lastPhase);
  return sequence[(lastIndex + 1) % 3];
}

function generatePhaseString(startPhase: PhaseAssignment, poles: number): PhaseAssignment {
  const sequence: PhaseAssignment[] = ["L1", "L2", "L3"];
  const startIndex = Math.max(0, sequence.indexOf(startPhase));
  if (poles >= 3) return "L1+L2+L3" as PhaseAssignment;
  if (poles === 2) return `${sequence[startIndex]}+${sequence[(startIndex + 1) % 3]}` as PhaseAssignment;
  return sequence[startIndex];
}

export function normalizeGroupConsistency(symbols: SymbolItem[]): SymbolItem[] {
  const nextSymbols = symbols.map((symbol) => ({
    ...symbol,
    parameters: { ...symbol.parameters },
  }));
  const byId = new Map(nextSymbols.map((symbol) => [symbol.id, symbol] as const));

  for (const symbol of nextSymbols) {
    if (symbol.rcdSymbolId && !byId.has(symbol.rcdSymbolId)) {
      symbol.rcdSymbolId = "";
      if (symbol.deviceKind !== "rcd") {
        symbol.rcdRatedCurrent = 0;
        symbol.rcdResidualCurrent = 0;
        symbol.rcdType = "";
      }
    }
  }

  for (const symbol of nextSymbols) {
    if (!isAuxiliaryNonCircuitSymbol(symbol)) {
      continue;
    }

    if (isNeutralTerminal(symbol) && symbol.group) {
      continue;
    }

    symbol.group = "";
    symbol.groupName = "";
    symbol.rcdSymbolId = "";
    if (symbol.deviceKind !== "rcd") {
      symbol.rcdRatedCurrent = 0;
      symbol.rcdResidualCurrent = 0;
      symbol.rcdType = "";
    }
  }

  const grouped = new Map<string, SymbolItem[]>();
  for (const symbol of nextSymbols) {
    if (!symbol.group) {
      continue;
    }

    const bucket = grouped.get(symbol.group) ?? [];
    bucket.push(symbol);
    grouped.set(symbol.group, bucket);
  }

  let autoSinglePhaseRcdIndex = 0;

  for (const [groupId, groupSymbols] of grouped.entries()) {
    const rcds = groupSymbols.filter((symbol) => symbol.deviceKind === "rcd");
    const fixedThreePhaseRcds = rcds.slice(1).filter(isFixedThreePhaseRcdSymbol);
    for (const [index, rcd] of fixedThreePhaseRcds.entries()) {
      rcd.group = `${groupId}:${rcd.id}`;
      rcd.groupName = rcd.groupName
        ? `${rcd.groupName} RCD ${index + 2}`
        : `RCD ${index + 2}`;
      rcd.rcdSymbolId = "";
    }

    const activeGroupSymbols = groupSymbols.filter((symbol) => symbol.group === groupId);
    const groupLabel =
      activeGroupSymbols.find((symbol) => symbol.groupName.trim().length > 0)?.groupName ?? "";
    const headRcd = activeGroupSymbols.find((symbol) => symbol.deviceKind === "rcd") ?? null;

    if (!headRcd) {
      for (const symbol of activeGroupSymbols) {
        symbol.group = "";
        symbol.groupName = "";
        if (symbol.deviceKind !== "rcd") {
          symbol.rcdSymbolId = "";
          symbol.rcdRatedCurrent = 0;
          symbol.rcdResidualCurrent = 0;
          symbol.rcdType = "";
        }
      }
      continue;
    }

    const isSinglePhaseRcd = !isFixedThreePhaseRcdSymbol(headRcd);
    const autoPhase = SINGLE_PHASES[autoSinglePhaseRcdIndex % SINGLE_PHASES.length] ?? "L1";
    const shouldAutoAssignHeadPhase =
      isSinglePhaseRcd && headRcd.parameters[MANUAL_PHASE_KEY] !== "true" && !headRcd.isPhaseLocked;
    const headRcdPhase = isSinglePhaseRcd
      ? (shouldAutoAssignHeadPhase
          ? autoPhase
          : normalizeSinglePhaseAssignment(headRcd.phase, autoPhase))
      : headRcd.phase;

    if (isSinglePhaseRcd) {
      autoSinglePhaseRcdIndex++;
      if (headRcd.phase !== headRcdPhase) {
        headRcd.phase = headRcdPhase;
      }
    }

    for (const symbol of activeGroupSymbols) {
      if (!symbol.groupName && groupLabel) {
        symbol.groupName = groupLabel;
      }

      if (symbol.id === headRcd.id) {
        if (symbol.rcdSymbolId === symbol.id) {
          symbol.rcdSymbolId = "";
        }
        continue;
      }

      if (symbol.deviceKind === "rcd") {
        if (!symbol.rcdSymbolId) {
          symbol.rcdSymbolId = headRcd.id;
          symbol.rcdRatedCurrent = headRcd.rcdRatedCurrent;
          symbol.rcdResidualCurrent = headRcd.rcdResidualCurrent;
          symbol.rcdType = headRcd.rcdType;
          if (isSinglePhaseRcd) {
            symbol.phase = headRcdPhase;
          }
        }
        continue;
      }

      symbol.rcdSymbolId = headRcd.id;
      symbol.rcdRatedCurrent = headRcd.rcdRatedCurrent;
      symbol.rcdResidualCurrent = headRcd.rcdResidualCurrent;
      symbol.rcdType = headRcd.rcdType;
      
      if (isSinglePhaseRcd) {
        symbol.phase = headRcdPhase;
      }
    }

    if (!isSinglePhaseRcd) {
      let currentPhase: PhaseAssignment = "L1";
      let isFirstChild = true;

      const children = activeGroupSymbols
        .filter((symbol) => symbol.id !== headRcd.id && symbol.deviceKind !== "rcd")
        .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

      for (const symbol of children) {
        const identity = `${symbol.type} ${symbol.label} ${symbol.moduleRef} ${symbol.visualPath}`.toUpperCase();
        let poles = 1;
        if (identity.includes("4P")) poles = 4;
        else if (identity.includes("3P")) poles = 3;
        else if (identity.includes("2P")) poles = 2;

        if (isFirstChild) {
          isFirstChild = false;
          if (symbol.phase) {
            currentPhase = getNextPhase(symbol.phase);
          } else {
            currentPhase = getNextPhase("L1");
          }
        } else {
          if (!symbol.isPhaseLocked) {
             symbol.phase = generatePhaseString(currentPhase, poles);
          }
          currentPhase = getNextPhase(symbol.phase);
        }
      }
    }
  }

  return nextSymbols;
}
