import {
  isAuxiliaryNonCircuitSymbol,
  type SymbolItem,
  MANUAL_REFERENCE_DESIGNATION_KEY,
} from "../../types/symbolItem";
import {
  detectPoleCountWithFallback as getPoleCount,
  detectPhaseCount as detectPhaseText,
} from "../poleCount";
import type { SchematicNode } from "./schematicLayout";
import {
  MAX_MODULES_PER_CARD,
  MODULE_HEIGHT,
  MODULE_WIDTH,
} from "./schematicLayout";
import {
  isRcd,
  isNetworkSwitch,
  isKf,
  isDistributionBlock,
  isNeutralTerminalBlock,
  detectPhases,
  isPendingPhase,
  isManualPhase,
  isManualNodePhase,
  getFixedInductionWithOvenScenarioPhase,
  getNodeFixedInductionWithOvenScenarioPhase,
  getModuleType,
  isThreePhaseRcdHead,
  resolveSinglePhaseRcdPhase,
  hasExplicitSinglePhaseRcdHint,
  type ModulePoleCount,
} from "./schematicNodeIdentification";

export interface BuildResult {
  fr: SymbolItem | null;
  mainDevices: SchematicNode[];
  circuitDevices: SchematicNode[];
}

export function buildNodes(symbols: SymbolItem[]): BuildResult {
  const all = symbols.filter((symbol) => !isAuxiliaryNonCircuitSymbol(symbol));
  if (all.length === 0) {
    return { fr: null, mainDevices: [], circuitDevices: [] };
  }

  const poleCountMap = new Map<string, ModulePoleCount>(
    symbols.map((symbol) => [symbol.id, getPoleCount(symbol)])
  );

  const neutralBarByGroup = new Map<string, SymbolItem>();
  for (const s of symbols) {
    if (s.group.trim() && isNeutralTerminalBlock(s) && !neutralBarByGroup.has(s.group)) {
      neutralBarByGroup.set(s.group, s);
    }
  }

  const symbolIndices = new Map(symbols.map((s, idx) => [s.id, idx]));
  const grouped = groupSymbols(all.filter((symbol) => symbol.group.trim().length > 0), symbolIndices);
  const standalone = all
    .filter((symbol) => symbol.group.trim().length === 0 && !isDistributionBlock(symbol))
    .sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return (symbolIndices.get(a.id) ?? 0) - (symbolIndices.get(b.id) ?? 0);
    });

  const frIndex = standalone.findIndex((symbol) => getModuleType(symbol) === "MainBreaker" && !isNetworkSwitch(symbol));
  const fr = frIndex >= 0 ? standalone.splice(frIndex, 1)[0] : null;
  const standaloneRcd = standalone.filter(isRcd);
  const standaloneSpd = standalone.filter((s) => getModuleType(s) === "SPD");
  const standaloneKf = standalone.filter(isKf);
  const standaloneNetworkSwitches = standalone.filter(isNetworkSwitch);
  const standaloneMcb = standalone.filter((symbol) => !isRcd(symbol) && getModuleType(symbol) !== "SPD" && !isKf(symbol) && !isNetworkSwitch(symbol));

  let q = 1;
  let fa = 1;
  let h = 1;
  let w = 1;
  let ws = 1;
  let x = 1;
  let standaloneMcbIdx = 1;
  let phaseIdx = 0;
  let rcdPhaseIdx = 0;

  const mainDevices: SchematicNode[] = [];
  const circuitDevices: SchematicNode[] = [];

  const standaloneTopSwitch = standaloneNetworkSwitches.length > 0 ? standaloneNetworkSwitches.splice(0, 1)[0] : undefined;

  if (fr) {
    mainDevices.push(
      createNode(fr, "MainBreaker", {
        designation: resolveDesignation(fr, "QS"),
        protection: fr.protectionType || fr.frRatedCurrent || "FR",
        circuitName: fr.circuitName || "Zasilanie główne",
        phase: fr.phase || "L1+L2+L3",
        phaseCount: detectPhases(fr),
        topDevice: standaloneTopSwitch ? createNode(standaloneTopSwitch, "MainBreaker", {
          designation: resolveDesignation(standaloneTopSwitch, `WS${ws++}`),
          protection: standaloneTopSwitch.label || "Przełącznik sieci",
          phase: standaloneTopSwitch.phase || "L1+L2+L3",
          phaseCount: detectPhases(standaloneTopSwitch)
        }) : undefined,
      }),
    );
  } else if (standaloneTopSwitch) {
    standaloneNetworkSwitches.unshift(standaloneTopSwitch);
  }

  for (const kf of standaloneKf) {
    mainDevices.push(createNode(kf, "PhaseIndicator", makeKf(kf, h++)));
  }

  for (const spd of standaloneSpd) {
    mainDevices.push(createNode(spd, "SPD", makeSpd(spd, fa++)));
  }

  for (const rcd of standaloneRcd) {
    const isThreePhaseHead = isThreePhaseRcdHead(rcd);
    const assignedPhase = isThreePhaseHead
      ? "L1+L2+L3"
      : resolveSinglePhaseRcdPhase(rcd.phase, rcdPhaseIdx++);
    const autoDesignation = `Q${q++}`;
    const node = createNode(rcd, "RCD", {
      designation: resolveDesignation(rcd, autoDesignation),
      protection: createHeadProtection(rcd, true, isThreePhaseHead),
      phase: assignedPhase,
      phaseCount: isThreePhaseHead ? 3 : detectPhaseText(assignedPhase),
    });

    if (isThreePhaseHead) {
      mainDevices.push(node);
    } else {
      circuitDevices.push(node);
    }
  }

  for (const group of grouped) {
    const modules = group.symbols;
    const headDevice = findGroupHead(modules);
    const groupSpds = modules.filter((s) => getModuleType(s) === "SPD");
    const groupKfs = modules.filter(isKf);
    const groupNetworkSwitches = modules.filter((symbol) => (!headDevice || symbol.id !== headDevice.id) && isNetworkSwitch(symbol));
    const mcbs = modules
      .filter((symbol) => !headDevice || symbol.id !== headDevice.id)
      .filter(
        (symbol) =>
          !isRcd(symbol) &&
          getModuleType(symbol) !== "SPD" &&
          !isDistributionBlock(symbol) &&
          !isKf(symbol) &&
          !isAuxiliaryNonCircuitSymbol(symbol) &&
          !isNetworkSwitch(symbol) &&
          getModuleType(symbol) !== "MainBreaker",
      )
      .sort((a, b) => {
        const keyA = headDevice ? Math.abs(a.x - headDevice.x) : a.x;
        const keyB = headDevice ? Math.abs(b.x - headDevice.x) : b.x;
        if (keyA !== keyB) {
          return keyA - keyB;
        }
        return (symbolIndices.get(a.id) ?? 0) - (symbolIndices.get(b.id) ?? 0);
      });

    if (!headDevice) {
      for (const spd of groupSpds) {
        mainDevices.push(makeSpd(spd, fa++));
      }

      for (const sw of groupNetworkSwitches) {
        const autoDesignation = `WS${ws++}`;
        mainDevices.push(
          createNode(sw, "MainBreaker", {
            designation: resolveDesignation(sw, autoDesignation),
            protection: sw.label || "Przełącznik sieci",
            phase: sw.phase || "L1+L2+L3",
            phaseCount: detectPhases(sw),
          }),
        );
      }

      let noRcdIdx = 1;
      for (const mcb of mcbs) {
        circuitDevices.push(makeMcb(mcb, `F0.${noRcdIdx++}`, w++));
      }

      continue;
    }

    const isRcdHead = isRcd(headDevice);
    const headPoles = getPoleCount(headDevice);
    let isThreePhaseHead = isRcdHead ? isThreePhaseRcdHead(headDevice) : detectPhases(headDevice) >= 3;
    if (headPoles === 3 || headPoles === 4) isThreePhaseHead = true;
    if (headPoles === 1 || headPoles === 2) isThreePhaseHead = false;

    if (isRcdHead && !hasExplicitSinglePhaseRcdHint(headDevice)) {
      // Reguły inżynieryjne dedykowane dla RCD:
      const hasThreePhaseChild = mcbs.some(
        (mcb) =>
          detectPhases(mcb) >= 3 ||
          getPoleCount(mcb) === 3 ||
          getPoleCount(mcb) === 4
      );

      const hasInductionOvenScenario = mcbs.some(
        (mcb) => getFixedInductionWithOvenScenarioPhase(mcb) === "Rcd4PWithMcb2PAnd1P"
      );

      // Sprawdź unikalne fazy dzieci
      const childPhases = new Set<string>();
      for (const mcb of mcbs) {
        if (mcb.phase && !isPendingPhase(mcb.phase)) {
          const parts = mcb.phase.split("+");
          for (const p of parts) {
            if (p.trim()) childPhases.add(p.trim());
          }
        }
      }

      const hasMultiplePhases = childPhases.size > 1;

      if (hasThreePhaseChild || hasInductionOvenScenario || hasMultiplePhases) {
        isThreePhaseHead = true;
      }
    }

    const assignedPhase = isThreePhaseHead
      ? "L1+L2+L3"
      : resolveSinglePhaseRcdPhase(headDevice.phase, rcdPhaseIdx++);
    const autoHeadDesignation = isRcdHead ? `Q${q++}` : `QS${q++}`;
    const headDesignation = resolveDesignation(headDevice, autoHeadDesignation);
    const qNumber = resolveHeadCircuitNumber(headDesignation, autoHeadDesignation);
    const groupTopSwitch = groupNetworkSwitches.length > 0 ? groupNetworkSwitches.splice(0, 1)[0] : undefined;

    const children: SchematicNode[] = [
      ...(groupTopSwitch ? [] : groupSpds.map((spd) => makeSpd(spd, fa++))),
      ...(groupTopSwitch ? [] : groupKfs.map((kf) => makeKf(kf, h++))),
      ...mcbs.map((mcb, index) => makeMcb(mcb, `F${qNumber}.${index + 1}`, w++)),
    ];

    if (groupTopSwitch) {
      for (const spd of groupSpds) {
        mainDevices.push(createNode(spd, "SPD", makeSpd(spd, fa++)));
      }
      for (const kf of groupKfs) {
        mainDevices.push(createNode(kf, "PhaseIndicator", makeKf(kf, h++)));
      }
    }

    for (const sw of groupNetworkSwitches) {
      const autoDesignation = `WS${ws++}`;
      mainDevices.push(
        createNode(sw, "MainBreaker", {
          designation: resolveDesignation(sw, autoDesignation),
          protection: sw.label || "Przełącznik sieci",
          phase: sw.phase || "L1+L2+L3",
          phaseCount: detectPhases(sw),
        }),
      );
    }

    assignChildrenPhase(children, assignedPhase, isThreePhaseHead, poleCountMap);

    const neutralTerminal = neutralBarByGroup.get(headDevice.group);
    const groupHasNeutralBar = isRcdHead && !!neutralTerminal;
    let neutralAutoDesignation = "";
    if (neutralTerminal) {
      const ref = (neutralTerminal.referenceDesignation || "").trim();
      const disp = (neutralTerminal.displayModuleNumber || "").trim();
      if (/^N\d+/i.test(ref)) {
        neutralAutoDesignation = ref;
      } else if (/^N\d+/i.test(disp)) {
        neutralAutoDesignation = disp;
      } else {
        neutralAutoDesignation = `N${x++}`;
      }
    }
    const neutralDesignation = neutralTerminal ? resolveDesignation(neutralTerminal, neutralAutoDesignation) : "";
    const groupNeutralBarLabel = groupHasNeutralBar
      ? neutralDesignation
      : "";

    const headNode = createNode(headDevice, isRcdHead ? "RCD" : "MainBreaker", {
      designation: headDesignation,
      protection: createHeadProtection(headDevice, isRcdHead, isThreePhaseHead),
      phase: assignedPhase,
      phaseCount: isThreePhaseHead ? 3 : detectPhaseText(assignedPhase),
      hasNeutralBar: groupHasNeutralBar || undefined,
      neutralBarLabel: groupNeutralBarLabel || undefined,
      topDevice: groupTopSwitch ? createNode(groupTopSwitch, "MainBreaker", {
        designation: resolveDesignation(groupTopSwitch, `WS${ws++}`),
        protection: groupTopSwitch.label || "Przełącznik sieci",
        phase: groupTopSwitch.phase || "L1+L2+L3",
        phaseCount: detectPhases(groupTopSwitch)
      }) : undefined,
    });

    const maxChildrenPerHeadChunk = isRcdHead
      ? MAX_MODULES_PER_CARD
      : Math.max(1, MAX_MODULES_PER_CARD - 1);
    if (children.length <= maxChildrenPerHeadChunk) {
      headNode.children = children;
      if (isThreePhaseHead) {
        mainDevices.push(headNode);
      } else {
        circuitDevices.push(headNode);
      }
      continue;
    }

    for (let index = 0; index < children.length; index += maxChildrenPerHeadChunk) {
      const chunk = children.slice(index, index + maxChildrenPerHeadChunk);
      const chunkNode = createNode(headDevice, isRcdHead ? "RCD" : "MainBreaker", {
        designation: headDesignation,
        protection: index === 0 ? headNode.protection : `${headNode.protection} (cd.)`,
        distributionBlockLabel: headNode.distributionBlockLabel,
        hasNeutralBar: headNode.hasNeutralBar,
        neutralBarLabel: headNode.neutralBarLabel,
        phase: assignedPhase,
        phaseCount: isRcdHead
          ? (isThreePhaseHead ? 3 : detectPhaseText(assignedPhase))
          : detectPhases(headDevice),
      });
      chunkNode.children = chunk;

      if (isThreePhaseHead) {
        mainDevices.push(chunkNode);
      } else {
        circuitDevices.push(chunkNode);
      }
    }
  }

  for (const sw of standaloneNetworkSwitches) {
    const autoDesignation = `WS${ws++}`;
    mainDevices.push(
      createNode(sw, "MainBreaker", {
        designation: resolveDesignation(sw, autoDesignation),
        protection: sw.label || "Przełącznik sieci",
        phase: sw.phase || "L1+L2+L3",
        phaseCount: detectPhases(sw),
      }),
    );
  }

  for (const mcb of standaloneMcb) {
    const phase = isManualPhase(mcb)
      ? mcb.phase
      : isPendingPhase(mcb.phase)
        ? (["L1", "L2", "L3"] as const)[phaseIdx++ % 3]
        : mcb.phase;
    circuitDevices.push(makeMcb({ ...mcb, phase }, `F0.${standaloneMcbIdx++}`, w++));
  }

  return { fr, mainDevices, circuitDevices };
}

export function flattenNodes(groups: SchematicNode[]): SchematicNode[] {
  return groups.flatMap((group) => flattenNode(group));
}

function flattenNode(node: SchematicNode): SchematicNode[] {
  return [node, ...node.children.flatMap((child) => flattenNode(child))];
}

function groupSymbols(symbols: SymbolItem[], symbolIndices: Map<string, number>): Array<{ key: string; symbols: SymbolItem[] }> {
  const map = new Map<string, SymbolItem[]>();
  const rcdHeadByGroup = new Set<string>();
  
  // Wymaga to `isFixedThreePhaseRcdSymbol` - ale można użyć isRcd + detectPhases
  for (const symbol of symbols) {
    let key = symbol.group;
    if (isRcd(symbol) && isThreePhaseRcdHead(symbol)) { // Było isFixedThreePhaseRcdSymbol ale isThreePhaseRcdHead służy w tym samym celu
      if (rcdHeadByGroup.has(symbol.group)) {
        key = `${symbol.group}:${symbol.id}`;
      } else {
        rcdHeadByGroup.add(symbol.group);
      }
    } else if (isRcd(symbol)) {
      rcdHeadByGroup.add(symbol.group);
    }
    map.set(key, [...(map.get(key) ?? []), symbol]);
  }

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, symbols: value }))
    .sort((a, b) => {
      const minXA = Math.min(...a.symbols.map((s) => s.x));
      const minXB = Math.min(...b.symbols.map((s) => s.x));
      if (minXA !== minXB) {
        return minXA - minXB;
      }
      const firstIdA = a.symbols[0]?.id;
      const firstIdB = b.symbols[0]?.id;
      return (symbolIndices.get(firstIdA) ?? 0) - (symbolIndices.get(firstIdB) ?? 0);
    });
}

function createNode(
  symbol: SymbolItem,
  nodeType: SchematicNode["nodeType"],
  overrides: Partial<SchematicNode> = {},
): SchematicNode {
  const phase = overrides.phase ?? symbol.phase;
  return {
    id: symbol.id,
    nodeType,
    designation: overrides.designation ?? "",
    label: symbol.label || symbol.type,
    protection: overrides.protection ?? (symbol.displayProtection || symbol.protectionType || symbol.label),
    distributionBlockLabel: overrides.distributionBlockLabel ?? "",
    circuitName: overrides.circuitName ?? (symbol.circuitName || symbol.circuitDescription || ""),
    phase,
    phaseCount: overrides.phaseCount ?? detectPhases(symbol),
    location: overrides.location ?? symbol.location,
    cableDesig: overrides.cableDesig ?? getParam(symbol, "CableDesig"),
    cableType: overrides.cableType ?? getParam(symbol, "CableType"),
    cableSpec: overrides.cableSpec ?? getParam(symbol, "CableSpec"),
    cableLength: overrides.cableLength ?? getParam(symbol, "CableLength"),
    powerInfo: overrides.powerInfo ?? getParam(symbol, "PowerInfo"),
    isPhaseManual: isManualPhase(symbol),
    fixedScenarioPhase: getFixedInductionWithOvenScenarioPhase(symbol),
    x: 0,
    y: 0,
    width: MODULE_WIDTH,
    height: MODULE_HEIGHT,
    pageIndex: 0,
    cellWidth: 114,
    parentRcdId: symbol.rcdSymbolId,
    children: [],
    ...overrides,
  };
}

function makeMcb(symbol: SymbolItem, designation: string, _wireIndex: number): SchematicNode {
  return createNode(symbol, "MCB", {
    designation: resolveDesignation(symbol, designation),
    protection: symbol.protectionType || symbol.label || "MCB",
    circuitName: symbol.circuitName || symbol.circuitDescription || "",
  });
}

function makeSpd(symbol: SymbolItem, index: number): SchematicNode {
  return createNode(symbol, "SPD", {
    designation: resolveDesignation(symbol, `FA${index}`),
    protection: symbol.spdInfo || `SPD ${symbol.spdType}`.trim(),
  });
}

function makeKf(symbol: SymbolItem, index: number): SchematicNode {
  return createNode(symbol, "PhaseIndicator", {
    designation: resolveDesignation(symbol, `H${index}`),
    protection: symbol.label || "KF",
    phase: "L1+L2+L3",
    phaseCount: 3,
  });
}

function createHeadProtection(symbol: SymbolItem, isRcdHead: boolean, isThreePhaseHead: boolean): string {
  if (!isRcdHead) {
    return symbol.protectionType || symbol.label || "FR";
  }

  const poleLabel = isThreePhaseHead ? "4P" : "2P";
  const rcdInfo = (symbol.rcdInfo || `RCD ${symbol.rcdRatedCurrent}A/${symbol.rcdResidualCurrent}mA Typ ${symbol.rcdType}`)
    .replace(/^RCD\s*/i, "")
    .replace(/\s+Typ\s+/i, "\ntyp ");

  return rcdInfo.trim().length > 0 ? `RCD ${poleLabel}\n${rcdInfo}` : `RCD ${poleLabel}`;
}

function assignChildrenPhase(
  children: SchematicNode[],
  assignedPhase: string,
  isThreePhaseHead: boolean,
  poleCountMap: Map<string, ModulePoleCount>
): void {
  const phaseNames = ["L1", "L2", "L3"] as const;
  const phasePairs = [
    ["L1", "L2"],
    ["L2", "L3"],
    ["L3", "L1"],
  ] as const;

  if (!isThreePhaseHead) {
    for (const child of children) {
      child.phase = isManualNodePhase(child) ? child.phase : assignedPhase;
      child.phaseCount = detectPhaseText(child.phase);
    }
    return;
  }

  let childPhaseIdx = 0;
  for (const child of children) {
    const childPoles = poleCountMap.get(child.id) ?? 1;
    let childPhase: string;

    const fixedScenarioPhase = getNodeFixedInductionWithOvenScenarioPhase(child, childPoles);
    if (fixedScenarioPhase) {
      childPhase = fixedScenarioPhase;
      if (childPoles === 1 || childPoles === 2) {
        childPhaseIdx += childPoles;
      }
    } else if (childPoles === 3 || childPoles === 4) {
      childPhase = "L1+L2+L3";
    } else if (childPoles === 2) {
      const pair = phasePairs[childPhaseIdx % 3];
      childPhase = `${pair[0]}+${pair[1]}`;
      childPhaseIdx += 2;
    } else {
      childPhase = phaseNames[childPhaseIdx % 3];
      childPhaseIdx++;
    }

    if (isManualNodePhase(child)) {
      childPhase = child.phase || childPhase;
    } else if (child.phase && child.phase !== "PENDING" && child.phase !== "pending") {
      childPhase = child.phase;
    }

    child.phase = childPhase;
    child.phaseCount = detectPhaseText(childPhase);
  }
}

function findGroupHead(symbols: SymbolItem[]): SymbolItem | undefined {
  return symbols.find(isRcd) ?? symbols.find((symbol) => getModuleType(symbol) === "MainBreaker");
}

function resolveDesignation(symbol: SymbolItem, automaticDesignation: string): string {
  if (
    symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY] === "true" &&
    symbol.referenceDesignation.trim().length > 0
  ) {
    return symbol.referenceDesignation.trim();
  }

  return automaticDesignation;
}

function resolveHeadCircuitNumber(resolvedDesignation: string, fallbackDesignation: string): string {
  const resolvedMatch = resolvedDesignation.trim().match(/^[A-Z]+(\d+)$/i);
  if (resolvedMatch) {
    return resolvedMatch[1];
  }

  const fallbackMatch = fallbackDesignation.trim().match(/^[A-Z]+(\d+)$/i);
  if (fallbackMatch) {
    return fallbackMatch[1];
  }

  return "1";
}

function getParam(symbol: SymbolItem, key: string, defaultValue = ""): string {
  const value = symbol.parameters[key];
  if (value?.trim()) {
    return value;
  }

  switch (key) {
    case "CableSpec":
      return symbol.cableCrossSection > 0 ? `${formatNumber(symbol.cableCrossSection)} mm2` : defaultValue;
    case "CableLength":
      return symbol.cableLength > 0 ? `${formatNumber(symbol.cableLength)} m` : defaultValue;
    case "PowerInfo":
      return symbol.powerW > 0 ? `${formatNumber(symbol.powerW)} W` : defaultValue;
    default:
      return defaultValue;
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
