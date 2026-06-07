import {
  isAuxiliaryNonCircuitSymbol,
  isDistributionBlockSymbol,
  isTerminalOrConnectorSymbol,
  type SymbolItem,
} from "../../types/symbolItem";
import {
  detectPoleCountWithFallback as getPoleCount,
  detectPhaseCount as detectPhaseText,
} from "../poleCount";
import type { PageInfo, SchematicLayout, SchematicNode } from "./schematicLayout";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  COLUMN_MARGIN_LEFT,
  COLUMN_MARGIN_RIGHT,
  DRAW_LEFT,
  DRAW_RIGHT,
  DRAW_TOP,
  DRAW_WIDTH,
  MAX_MODULES_PER_CARD,
  MODULE_HEIGHT,
  MODULE_WIDTH,
  PAGE_GAP,
  Y_FR,
  Y_MAIN_BUS,
  Y_MAIN_DEVICE,
  Y_TOP_SWITCH,
  Y_MCB,
  Y_FR_WITH_TOP,
  Y_MAIN_BUS_WITH_TOP,
  Y_MAIN_DEVICE_WITH_TOP,
  Y_TOP_SWITCH_WITH_TOP,
  Y_MCB_WITH_TOP,
} from "./schematicLayout";

type ModulePoleCount = 0 | 1 | 2 | 3 | 4;

interface BuildResult {
  fr: SymbolItem | null;
  mainDevices: SchematicNode[];
  circuitDevices: SchematicNode[];
}

const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";
const MANUAL_PHASE_KEY = "ManualPhase";
const INDUCTION_OVEN_ENABLED_KEY = "GroupScenario.InductionWithOven.Enabled";
const INDUCTION_OVEN_PATTERN_KEY = "GroupScenario.InductionWithOven.Pattern";
const MIN_SCHEMATIC_CELL_WIDTH = 56;
const MAX_SCHEMATIC_CELL_WIDTH = 68;

export function buildSchematicLayout(symbols: SymbolItem[]): SchematicLayout {
  const buildResult = buildNodes(symbols);
  const devices = [...buildResult.mainDevices, ...buildResult.circuitDevices];
  const pages = assignPagesAndPosition(buildResult.mainDevices, buildResult.circuitDevices);
  const nodes = flattenNodes(devices);
  const totalPages = Math.max(1, pages.length);

  return {
    pages,
    nodes,
    totalWidth: A4_WIDTH_PX,
    totalHeight: totalPages * A4_HEIGHT_PX + Math.max(0, totalPages - 1) * PAGE_GAP,
    frReference: buildResult.fr?.referenceDesignation ?? "",
  };
}

function buildNodes(symbols: SymbolItem[]): BuildResult {
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
  const standaloneSpd = standalone.filter(isSpd);
  const standaloneKf = standalone.filter(isKf);
  const standaloneNetworkSwitches = standalone.filter(isNetworkSwitch);
  const standaloneMcb = standalone.filter((symbol) => !isRcd(symbol) && !isSpd(symbol) && !isKf(symbol) && !isNetworkSwitch(symbol));

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
    const groupSpds = modules.filter(isSpd);
    const groupKfs = modules.filter(isKf);
    const groupNetworkSwitches = modules.filter((symbol) => (!headDevice || symbol.id !== headDevice.id) && isNetworkSwitch(symbol));
    const mcbs = modules
      .filter((symbol) => !headDevice || symbol.id !== headDevice.id)
      .filter(
        (symbol) =>
          !isRcd(symbol) &&
          !isSpd(symbol) &&
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

function assignPagesAndPosition(mainDevices: SchematicNode[], circuitDevices: SchematicNode[]): PageInfo[] {
  const devices = [...mainDevices, ...circuitDevices];
  const drawWidthAvailable = DRAW_WIDTH - COLUMN_MARGIN_LEFT - COLUMN_MARGIN_RIGHT;
  let mainPage = 0;
  let currentMainWidth = 0;
  let currentMainCount = 0;

  for (const device of mainDevices) {
    applyCellWidth(device);
    const itemCount = getVisualSlotCount(device);

    if (
      currentMainWidth > 0 &&
      (currentMainWidth + device.cellWidth > drawWidthAvailable ||
        currentMainCount + itemCount > MAX_MODULES_PER_CARD)
    ) {
      mainPage++;
      currentMainWidth = 0;
      currentMainCount = 0;
    }

    device.pageIndex = mainPage;
    for (const child of device.children) {
      child.pageIndex = mainPage;
    }
    currentMainWidth += device.cellWidth;
    currentMainCount += itemCount;
  }

  let circuitPage = mainPage + (currentMainWidth > 0 ? 1 : 0);
  if (mainDevices.length === 0) {
    circuitPage = 0;
  }

  let currentCircuitWidth = 0;
  let currentCircuitCount = 0;
  for (const device of circuitDevices) {
    applyCellWidth(device);
    const itemCount = getVisualSlotCount(device);

    if (
      currentCircuitWidth > 0 &&
      (currentCircuitWidth + device.cellWidth > drawWidthAvailable ||
        currentCircuitCount + itemCount > MAX_MODULES_PER_CARD)
    ) {
      circuitPage++;
      currentCircuitWidth = 0;
      currentCircuitCount = 0;
    }

    device.pageIndex = circuitPage;
    for (const child of device.children) {
      child.pageIndex = circuitPage;
    }
    currentCircuitWidth += device.cellWidth;
    currentCircuitCount += itemCount;
  }

  const maxPage = devices.length > 0 ? Math.max(...devices.map((device) => device.pageIndex)) : 0;
  const pages: PageInfo[] = [];

  for (let page = 0; page <= maxPage; page++) {
    const pageDevices = devices.filter((device) => device.pageIndex === page);
    const yOffset = page * (A4_HEIGHT_PX + PAGE_GAP);

    if (pageDevices.length === 0) {
      pages.push(createPageInfo(page, DRAW_LEFT + COLUMN_MARGIN_LEFT, yOffset, DRAW_LEFT, DRAW_RIGHT));
      continue;
    }

    const schematicWidth = pageDevices.reduce((sum, device) => sum + device.cellWidth, 0);
    const available = DRAW_WIDTH - COLUMN_MARGIN_LEFT - COLUMN_MARGIN_RIGHT;
    let offsetX = DRAW_LEFT + COLUMN_MARGIN_LEFT + Math.max(0, (available - schematicWidth) / 2);
    if (offsetX + schematicWidth > DRAW_RIGHT) {
      offsetX = DRAW_RIGHT - schematicWidth;
    }
    if (offsetX < DRAW_LEFT + COLUMN_MARGIN_LEFT) {
      offsetX = DRAW_LEFT + COLUMN_MARGIN_LEFT;
    }

    const hasTopSwitch = pageDevices.some((device) => device.topDevice || device.topBusConnected);
    const pageInfo = createPageInfo(
      page,
      offsetX,
      yOffset,
      Math.max(DRAW_LEFT, offsetX - 16),
      Math.min(DRAW_RIGHT, offsetX + schematicWidth + 16),
      hasTopSwitch,
    );
    pages.push(pageInfo);

    let currentX = offsetX;
    for (const device of pageDevices) {
      positionDeviceOnPage(device, currentX, yOffset, hasTopSwitch);
      currentX += device.cellWidth;
    }
  }

  return pages.length > 0 ? pages : [createPageInfo(0, DRAW_LEFT + COLUMN_MARGIN_LEFT, 0, DRAW_LEFT, DRAW_RIGHT)];
}

function createPageInfo(
  pageIndex: number,
  offsetX: number,
  yOffset: number,
  busX1: number,
  busX2: number,
  hasTopSwitch = false,
): PageInfo {
  const mainBusY = hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS;
  const mainDeviceY = hasTopSwitch ? Y_MAIN_DEVICE_WITH_TOP : Y_MAIN_DEVICE;
  const mcbY = hasTopSwitch ? Y_MCB_WITH_TOP : Y_MCB;

  return {
    pageIndex,
    pageLabel: `Strona ${pageIndex + 1}`,
    offsetX,
    offsetY: yOffset,
    yOffset,
    minCol: 0,
    busX1,
    busX2,
    busbarX: busX1,
    busbarY: yOffset + DRAW_TOP + mainBusY,
    dinRails: [
      {
        railIndex: 0,
        y: DRAW_TOP + mainDeviceY,
        startX: busX1,
        endX: busX2,
        modulePositions: [],
      },
      {
        railIndex: 1,
        y: DRAW_TOP + mcbY,
        startX: busX1,
        endX: busX2,
        modulePositions: [],
      },
    ],
  };
}

function applyCellWidth(device: SchematicNode): void {
  if (device.children.length > 0) {
    for (const child of device.children) {
      child.cellWidth = estimateWidth(child);
    }
    const childWidth = device.children.reduce((sum, child) => sum + child.cellWidth, 0);
    device.cellWidth = shouldReserveHeadSlot(device) ? estimateWidth(device) + childWidth : childWidth;
    return;
  }

  device.cellWidth = estimateWidth(device);
}

function positionDeviceOnPage(node: SchematicNode, startX: number, yOffset: number, hasTopSwitch = false): void {
  const yBase = yOffset + DRAW_TOP;
  const offsetQf = node.designation.startsWith("F") && !node.designation.startsWith("FA") ? 50 : 0;
  const isGroupedMainBreaker = shouldReserveHeadSlot(node);

  const mainDeviceY = hasTopSwitch ? Y_MAIN_DEVICE_WITH_TOP : Y_MAIN_DEVICE;
  const mcbY = hasTopSwitch ? Y_MCB_WITH_TOP : Y_MCB;
  const frY = hasTopSwitch ? Y_FR_WITH_TOP : Y_FR;
  const topSwitchY = hasTopSwitch ? Y_TOP_SWITCH_WITH_TOP : Y_TOP_SWITCH;

  if (node.children.length > 0) {
    const headWidth = isGroupedMainBreaker ? getHeadCellWidth(node) : 0;
    node.x = isGroupedMainBreaker
      ? startX + headWidth / 2 - MODULE_WIDTH / 2
      : startX + node.cellWidth / 2 - MODULE_WIDTH / 2;

    let childX = isGroupedMainBreaker ? startX + headWidth : startX;
    for (const child of node.children) {
      const childOffsetQf = child.designation.startsWith("F") && !child.designation.startsWith("FA") ? 20 : 0;
      child.x = childX + child.cellWidth / 2 - MODULE_WIDTH / 2;
      child.y = yBase + mcbY - childOffsetQf;
      childX += child.cellWidth;
    }

    node.y = yBase + (isGroupedMainBreaker ? frY : mainDeviceY) - offsetQf;
    if (node.topDevice) {
      node.topDevice.x = node.x;
      node.topDevice.y = yBase + topSwitchY;
    }
    return;
  }

  node.x = startX + node.cellWidth / 2 - MODULE_WIDTH / 2;

  let targetY = mainDeviceY;
  if (node.nodeType === "MainBreaker") {
    targetY = frY;
  }
  node.y = yBase + targetY - offsetQf;

  if (node.topDevice) {
    node.topDevice.x = node.x;
    node.topDevice.y = yBase + topSwitchY;
  }
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

function groupSymbols(symbols: SymbolItem[], symbolIndices: Map<string, number>): Array<{ key: string; symbols: SymbolItem[] }> {
  const map = new Map<string, SymbolItem[]>();
  const rcdHeadByGroup = new Set<string>();
  for (const symbol of symbols) {
    let key = symbol.group;
    if (isRcd(symbol) && isFixedThreePhaseRcdSymbol(symbol)) {
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

function flattenNodes(groups: SchematicNode[]): SchematicNode[] {
  return groups.flatMap((group) => flattenNode(group));
}

function flattenNode(node: SchematicNode): SchematicNode[] {
  return [node, ...node.children.flatMap((child) => flattenNode(child))];
}

function estimateWidth(node: SchematicNode): number {
  const values = [
    node.designation.length * 6.5,
    node.protection.length * 6,
    node.circuitName.length * 5.5,
    node.location.length * 5.5,
    node.cableDesig.length * 6.5,
    node.cableType.length * 5.5,
    node.cableSpec.length * 6,
    node.powerInfo.length * 5.5,
  ];

  return Math.min(MAX_SCHEMATIC_CELL_WIDTH, Math.max(MIN_SCHEMATIC_CELL_WIDTH, Math.max(...values, 0) + 16));
}

function getVisualSlotCount(node: SchematicNode): number {
  if (shouldReserveHeadSlot(node)) {
    return node.children.length + 1;
  }

  return node.children.length > 0 ? Math.max(1, node.children.length) : 1;
}

function shouldReserveHeadSlot(node: SchematicNode): boolean {
  return node.nodeType === "MainBreaker" && node.children.length > 0;
}

function getHeadCellWidth(node: SchematicNode): number {
  const childWidth = node.children.reduce((sum, child) => sum + child.cellWidth, 0);
  const headWidth = node.cellWidth - childWidth;
  return headWidth > 0 ? headWidth : estimateWidth(node);
}

function findGroupHead(symbols: SymbolItem[]): SymbolItem | undefined {
  return symbols.find(isRcd) ?? symbols.find((symbol) => getModuleType(symbol) === "MainBreaker");
}

function getModuleType(symbol: SymbolItem): SchematicNode["nodeType"] {
  if (symbol.deviceKind === "rcd") return "RCD";
  if (symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo") return "MCB";
  if (symbol.deviceKind === "spd") return "SPD";
  if (symbol.deviceKind === "fr") return "MainBreaker";
  if (symbol.deviceKind === "phaseIndicator") return "PhaseIndicator";

  const value = getSchematicIdentity(symbol);
  if (value.includes("rcbo")) return "MCB";
  if (isRcdIdentity(value)) return "RCD";
  if (value.includes("spd")) return "SPD";
  if (
    /\bfr\b/.test(value) ||
    value.includes("switch") ||
    value.includes("rozlacznik") ||
    value.includes("rozłącznik") ||
    value.includes("isolator") ||
    value.includes("przelacznik")
  ) {
    return "MainBreaker";
  }
  if (
    value.includes("kontrolk") ||
    value.includes("indicator") ||
    value.includes("lampka") ||
    value.includes("sygnalizat") ||
    value.includes("kontrolkifaz")
  ) {
    return "PhaseIndicator";
  }
  return "MCB";
}

function isRcd(symbol: SymbolItem): boolean {
  return getModuleType(symbol) === "RCD";
}

function isFixedThreePhaseRcdSymbol(symbol: SymbolItem): boolean {
  if (!isRcd(symbol)) {
    return false;
  }

  const value = getRcdIdentity(symbol);
  if (hasExplicitSinglePhaseRcdHint(symbol)) {
    return false;
  }

  return symbol.phase === "L1+L2+L3" || value.includes("4P") || value.includes("3P");
}

function isThreePhaseRcdHead(symbol: SymbolItem): boolean {
  if (hasExplicitSinglePhaseRcdHint(symbol)) {
    return false;
  }

  if (hasExplicitThreePhaseRcdHint(symbol)) {
    return true;
  }

  const poleCount = getPoleCount(symbol);
  if (poleCount === 3 || poleCount === 4) {
    return true;
  }

  return detectPhases(symbol) >= 3;
}

function resolveSinglePhaseRcdPhase(phase: string, autoIndex: number): "L1" | "L2" | "L3" {
  if (phase === "L1" || phase === "L2" || phase === "L3") {
    return phase;
  }

  const phases = ["L1", "L2", "L3"] as const;
  return phases[autoIndex % phases.length];
}

function getSchematicIdentity(symbol: SymbolItem): string {
  return `${symbol.type} ${symbol.label} ${symbol.visualPath} ${symbol.moduleRef}`
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isRcdIdentity(value: string): boolean {
  return value.includes("rcd") || value.includes("rccb") || value.includes("roznic");
}

function getRcdIdentity(symbol: SymbolItem): string {
  return getSchematicIdentity(symbol).toLocaleUpperCase("pl-PL");
}

function getExplicitRcdPoleHint(symbol: SymbolItem): ModulePoleCount {
  const match = getRcdIdentity(symbol).match(
    /(^|[^0-9])([1-4])\s*-?\s*(?:P|POL[A-Z]*|BIEG[A-Z]*|TOR[A-Z]*)([^A-Z0-9]|$)/,
  );
  if (!match) {
    return 0;
  }

  return Number.parseInt(match[2]!, 10) as ModulePoleCount;
}

function hasExplicitSinglePhaseRcdHint(symbol: SymbolItem): boolean {
  const value = getRcdIdentity(symbol);
  const poles = getExplicitRcdPoleHint(symbol);
  return poles === 1 || poles === 2 || value.includes("2P") || value.includes("1P");
}

function hasExplicitThreePhaseRcdHint(symbol: SymbolItem): boolean {
  const value = getRcdIdentity(symbol);
  const poles = getExplicitRcdPoleHint(symbol);
  return poles === 3 || poles === 4 || value.includes("4P") || value.includes("3P");
}

function isNetworkSwitch(symbol: SymbolItem): boolean {
  const value = getSchematicIdentity(symbol);
  return value.includes("przelacznik") && value.includes("siec");
}

function isSpd(symbol: SymbolItem): boolean {
  return getModuleType(symbol) === "SPD";
}

function isKf(symbol: SymbolItem): boolean {
  return getModuleType(symbol) === "PhaseIndicator";
}

function isDistributionBlock(symbol: SymbolItem): boolean {
  return isDistributionBlockSymbol(symbol);
}

function isNeutralTerminalBlock(symbol: SymbolItem): boolean {
  if (!isTerminalOrConnectorSymbol(symbol) && !isDistributionBlockSymbol(symbol)) {
    return false;
  }

  const desig = (symbol.displayModuleNumber || symbol.referenceDesignation || "").toUpperCase();
  if (/^N\d+$/.test(desig)) {
    return true;
  }
  if (/^PE\d+$/.test(desig)) {
    return false;
  }

  const text = `${symbol.type || ""} ${symbol.label || ""} ${symbol.circuitName || ""} ${symbol.circuitDescription || ""} ${symbol.visualPath || ""} ${symbol.moduleRef || ""} ${symbol.phase || ""}`.toUpperCase();

  if (/(^|[\s/-])PE([\s/-]|$)/.test(text) || text.includes("ZIELON") || text.includes("OCHRON")) {
    return false;
  }

  return (
    /(^|[\s/-])N[\d_]*([\s/-]|$)/.test(text) ||
    text.includes("NIEBIESK") ||
    text.includes("NEUTRAL") ||
    (symbol.phase as string) === "N"
  );
}

// getPoleCount imported from ../poleCount as detectPoleCountWithFallback


function detectPhases(symbol: SymbolItem): number {
  const fromPhase = detectPhaseText(symbol.phase);
  if (fromPhase > 0 && !isPendingPhase(symbol.phase)) {
    return fromPhase;
  }

  const poleCount = getPoleCount(symbol);
  if (poleCount === 3 || poleCount === 4) return 3;
  return 1;
}

// detectPhaseText imported from ../poleCount

function isPendingPhase(phase: string | null | undefined): boolean {
  return !phase || phase.toLocaleLowerCase("pl-PL") === "pending";
}

function isManualPhase(symbol: SymbolItem): boolean {
  return symbol.parameters[MANUAL_PHASE_KEY] === "true";
}

function isManualNodePhase(node: SchematicNode): boolean {
  return node.isPhaseManual;
}

function getNodeFixedInductionWithOvenScenarioPhase(node: SchematicNode, poleCount: ModulePoleCount): string {
  if (!node.fixedScenarioPhase) {
    return "";
  }

  if (poleCount === 2) return "L1+L2";
  if (poleCount === 1) return "L3";
  return "";
}

function getFixedInductionWithOvenScenarioPhase(symbol: SymbolItem): string {
  if (
    symbol.parameters[INDUCTION_OVEN_ENABLED_KEY] !== "true" ||
    symbol.parameters[INDUCTION_OVEN_PATTERN_KEY] !== "Rcd4PWithMcb2PAnd1P"
  ) {
    return "";
  }

  return "Rcd4PWithMcb2PAnd1P";
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
