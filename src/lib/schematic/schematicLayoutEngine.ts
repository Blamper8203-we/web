import type { SymbolItem } from "../../types/symbolItem";
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
  Y_MCB,
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

function compareDinOrder(left: SymbolItem, right: SymbolItem): number {
  if (left.y !== right.y) {
    return left.y - right.y;
  }

  return left.x - right.x;
}

function buildNodes(symbols: SymbolItem[]): BuildResult {
  const all = symbols.filter((symbol) => !isBusbarOrTerminal(symbol));
  if (all.length === 0) {
    return { fr: null, mainDevices: [], circuitDevices: [] };
  }

  const grouped = groupSymbols(all.filter((symbol) => symbol.group.trim().length > 0));
  const standalone = all
    .filter((symbol) => symbol.group.trim().length === 0 && !isDistributionBlock(symbol))
    .sort(compareDinOrder);

  const frIndex = standalone.findIndex((symbol) => getModuleType(symbol) === "MainBreaker");
  const fr = frIndex >= 0 ? standalone.splice(frIndex, 1)[0] : null;
  const standaloneSpd = standalone.filter(isSpd);
  const standaloneKf = standalone.filter(isKf);
  const standaloneMcb = standalone.filter((symbol) => !isSpd(symbol) && !isKf(symbol));

  let q = 1;
  let fa = 1;
  let h = 1;
  let w = 1;
  let standaloneMcbIdx = 1;
  let phaseIdx = 0;

  const mainDevices: SchematicNode[] = [];
  const circuitDevices: SchematicNode[] = [];

  if (fr) {
    mainDevices.push(
      createNode(fr, "MainBreaker", {
        designation: resolveDesignation(fr, "QS"),
        protection: fr.protectionType || fr.frRatedCurrent || "FR",
        circuitName: fr.circuitName || "Zasilanie główne",
        phase: fr.phase || "L1+L2+L3",
        phaseCount: detectPhases(fr),
      }),
    );
  }

  for (const kf of standaloneKf) {
    mainDevices.push(makeKf(kf, h++));
  }

  for (const spd of standaloneSpd) {
    mainDevices.push(makeSpd(spd, fa++));
  }

  for (const group of grouped) {
    const modules = group.symbols;
    const headDevice = findGroupHead(modules);
    const distributionBlock = modules.find(isDistributionBlock);
    const groupSpds = modules.filter(isSpd);
    const groupKfs = modules.filter(isKf);
    const mcbs = modules
      .filter((symbol) => !headDevice || symbol.id !== headDevice.id)
      .filter(
        (symbol) =>
          !isRcd(symbol) &&
          !isSpd(symbol) &&
          !isDistributionBlock(symbol) &&
          !isKf(symbol) &&
          !isBusbarOrTerminal(symbol) &&
          getModuleType(symbol) !== "MainBreaker",
      )
      .sort((a, b) =>
        headDevice
          ? Math.abs(a.x - headDevice.x) - Math.abs(b.x - headDevice.x) || compareDinOrder(a, b)
          : compareDinOrder(a, b),
      );

    if (!headDevice) {
      for (const spd of groupSpds) {
        mainDevices.push(makeSpd(spd, fa++));
      }

      let noRcdIdx = 1;
      for (const mcb of mcbs) {
        circuitDevices.push(makeMcb(mcb, `F0.${noRcdIdx++}`, w++));
      }

      continue;
    }

    const headPoles = getPoleCount(headDevice);
    let isThreePhaseHead = detectPhases(headDevice) >= 3;
    if (headPoles === 3 || headPoles === 4) isThreePhaseHead = true;
    if (headPoles === 1 || headPoles === 2) isThreePhaseHead = false;

    const assignedPhase = isPendingPhase(headDevice.phase)
      ? isThreePhaseHead
        ? "L1+L2+L3"
        : "L1"
      : headDevice.phase;
    const isRcdHead = isRcd(headDevice);
    const autoHeadDesignation = isRcdHead ? `Q${q++}` : `QS${q++}`;
    const headDesignation = resolveDesignation(headDevice, autoHeadDesignation);
    const qNumber = autoHeadDesignation.replace(/[QS]/g, "");
    const limitedMcbs =
      isRcdHead && mcbs.length > MAX_MODULES_PER_CARD ? mcbs.slice(0, MAX_MODULES_PER_CARD) : mcbs;

    const children: SchematicNode[] = [
      ...groupSpds.map((spd) => makeSpd(spd, fa++)),
      ...groupKfs.map((kf) => makeKf(kf, h++)),
      ...limitedMcbs.map((mcb, index) => makeMcb(mcb, `F${qNumber}.${index + 1}`, w++)),
    ];

    assignChildrenPhase(children, assignedPhase, isThreePhaseHead);

    const headNode = createNode(headDevice, isRcdHead ? "RCD" : "MainBreaker", {
      designation: headDesignation,
      protection: createHeadProtection(headDevice, isRcdHead, isThreePhaseHead),
      distributionBlockLabel: resolveDistributionBlockLabel(distributionBlock),
      phase: assignedPhase,
      phaseCount: detectPhases(headDevice),
    });

    if (isRcdHead) {
      headNode.children = children;
      if (isThreePhaseHead) {
        mainDevices.push(headNode);
      } else {
        circuitDevices.push(headNode);
      }
      continue;
    }

    const maxChildrenPerHeadChunk = Math.max(1, MAX_MODULES_PER_CARD - 1);
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
      const chunkNode = createNode(headDevice, "MainBreaker", {
        designation: headDesignation,
        protection: index === 0 ? headNode.protection : `${headNode.protection} (cd.)`,
        distributionBlockLabel: headNode.distributionBlockLabel,
        phase: assignedPhase,
        phaseCount: detectPhases(headDevice),
      });
      chunkNode.children = chunk;

      if (isThreePhaseHead) {
        mainDevices.push(chunkNode);
      } else {
        circuitDevices.push(chunkNode);
      }
    }
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

    const pageInfo = createPageInfo(
      page,
      offsetX,
      yOffset,
      Math.max(DRAW_LEFT, offsetX - 16),
      Math.min(DRAW_RIGHT, offsetX + schematicWidth + 16),
    );
    pages.push(pageInfo);

    let currentX = offsetX;
    for (const device of pageDevices) {
      positionDeviceOnPage(device, currentX, yOffset);
      currentX += device.cellWidth;
    }
  }

  return pages.length > 0 ? pages : [createPageInfo(0, DRAW_LEFT + COLUMN_MARGIN_LEFT, 0, DRAW_LEFT, DRAW_RIGHT)];
}

function createPageInfo(pageIndex: number, offsetX: number, yOffset: number, busX1: number, busX2: number): PageInfo {
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
    busbarY: yOffset + DRAW_TOP + Y_MAIN_BUS,
    dinRails: [
      {
        railIndex: 0,
        y: DRAW_TOP + Y_MAIN_DEVICE,
        startX: busX1,
        endX: busX2,
        modulePositions: [],
      },
      {
        railIndex: 1,
        y: DRAW_TOP + Y_MCB,
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

function positionDeviceOnPage(node: SchematicNode, startX: number, yOffset: number): void {
  const yBase = yOffset + DRAW_TOP;
  const offsetQf = node.designation.startsWith("F") && !node.designation.startsWith("FA") ? 50 : 0;
  const isGroupedMainBreaker = shouldReserveHeadSlot(node);

  if (node.children.length > 0) {
    const headWidth = isGroupedMainBreaker ? getHeadCellWidth(node) : 0;
    node.x = isGroupedMainBreaker
      ? startX + headWidth / 2 - MODULE_WIDTH / 2
      : startX + node.cellWidth / 2 - MODULE_WIDTH / 2;

    let childX = isGroupedMainBreaker ? startX + headWidth : startX;
    for (const child of node.children) {
      const childOffsetQf = child.designation.startsWith("F") && !child.designation.startsWith("FA") ? 20 : 0;
      child.x = childX + child.cellWidth / 2 - MODULE_WIDTH / 2;
      child.y = yBase + Y_MCB - childOffsetQf;
      childX += child.cellWidth;
    }

    node.y = yBase + (isGroupedMainBreaker ? Y_FR : Y_MAIN_DEVICE) - offsetQf;
    return;
  }

  node.x = startX + node.cellWidth / 2 - MODULE_WIDTH / 2;
  node.y = yBase + (node.nodeType === "MainBreaker" ? Y_FR : Y_MAIN_DEVICE) - offsetQf;
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

function assignChildrenPhase(children: SchematicNode[], assignedPhase: string, isThreePhaseHead: boolean): void {
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
    const childPoles = getPoleCountFromNode(child);
    let childPhase: string;

    const fixedScenarioPhase = getNodeFixedInductionWithOvenScenarioPhase(child, childPoles);
    if (fixedScenarioPhase) {
      childPhase = fixedScenarioPhase;
      if (childPoles === 1 || childPoles === 2) {
        childPhaseIdx++;
      }
    } else if (childPoles === 3 || childPoles === 4) {
      childPhase = "L1+L2+L3";
    } else if (childPoles === 2) {
      const pair = phasePairs[childPhaseIdx % 3];
      childPhase = `${pair[0]}+${pair[1]}`;
      childPhaseIdx++;
    } else {
      childPhase = phaseNames[childPhaseIdx % 3];
      childPhaseIdx++;
    }

    if (isManualNodePhase(child)) {
      childPhase = child.phase || childPhase;
    }

    child.phase = childPhase;
    child.phaseCount = detectPhaseText(childPhase);
  }
}

function groupSymbols(symbols: SymbolItem[]): Array<{ key: string; symbols: SymbolItem[] }> {
  const map = new Map<string, SymbolItem[]>();
  for (const symbol of symbols) {
    const key = symbol.group;
    map.set(key, [...(map.get(key) ?? []), symbol]);
  }

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, symbols: value.sort(compareDinOrder) }))
    .sort((a, b) => compareDinOrder(a.symbols[0], b.symbols[0]));
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

  return Math.min(180, Math.max(80, Math.max(...values, 0) + 16));
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

  const value = `${symbol.type} ${symbol.label} ${symbol.visualPath}`.toLocaleLowerCase("pl-PL");
  if (value.includes("rcbo")) return "MCB";
  if (value.includes("rcd")) return "RCD";
  if (value.includes("spd")) return "SPD";
  if (/\bfr\b/.test(value) || value.includes("switch") || value.includes("rozlacznik")) return "MainBreaker";
  if (value.includes("kontrolk") || value.includes("indicator") || value.includes("lampka") || value.includes("sygnalizat")) {
    return "PhaseIndicator";
  }
  return "MCB";
}

function isRcd(symbol: SymbolItem): boolean {
  return getModuleType(symbol) === "RCD";
}

function isSpd(symbol: SymbolItem): boolean {
  return getModuleType(symbol) === "SPD";
}

function isKf(symbol: SymbolItem): boolean {
  return getModuleType(symbol) === "PhaseIndicator";
}

function isDistributionBlock(symbol: SymbolItem): boolean {
  const value = `${symbol.type} ${symbol.label} ${symbol.visualPath}`.toLocaleLowerCase("pl-PL");
  return value.includes("blok") || value.includes("block") || value.includes("rozdz");
}

function resolveDistributionBlockLabel(symbol: SymbolItem | undefined): string {
  if (!symbol) {
    return "";
  }

  const label = `${symbol.label || symbol.type}`.trim();
  if (label.length === 0 || label.toLocaleLowerCase("pl-PL").includes("blok")) {
    return "BIAS";
  }

  return label;
}

function isBusbarOrTerminal(symbol: SymbolItem): boolean {
  const type = symbol.type.toLocaleLowerCase("pl-PL");
  const visualPath = symbol.visualPath.toLocaleLowerCase("pl-PL");
  return symbol.isTerminalBlock || type.includes("busbar") || visualPath.includes("busbar");
}

function getPoleCount(symbol: SymbolItem): ModulePoleCount {
  const value = `${symbol.visualPath} ${symbol.type}`;
  const poleMatch = value.match(/(\d)\s*-?\s*[Pp]/);
  if (poleMatch) {
    const poles = Number.parseInt(poleMatch[1], 10);
    if (poles >= 1 && poles <= 4) return poles as ModulePoleCount;
  }

  const sSeriesMatch = value.match(/[Ss]\s*-?\s*30(\d)/);
  if (sSeriesMatch) {
    const poles = Number.parseInt(sSeriesMatch[1], 10);
    if (poles >= 1 && poles <= 4) return poles as ModulePoleCount;
  }

  if (symbol.deviceKind === "fr" || symbol.deviceKind === "spd" || symbol.deviceKind === "phaseIndicator") return 4;
  if (symbol.deviceKind === "rcd" && detectPhaseText(symbol.phase) >= 3) return 4;
  return detectPhaseText(symbol.phase) >= 3 ? 4 : 1;
}

function getPoleCountFromNode(node: SchematicNode): ModulePoleCount {
  if (node.phaseCount >= 3) return 4;
  if (node.phase.includes("+")) return 2;
  return 1;
}

function detectPhases(symbol: SymbolItem): number {
  const fromPhase = detectPhaseText(symbol.phase);
  if (fromPhase > 0 && !isPendingPhase(symbol.phase)) {
    return fromPhase;
  }

  const poleCount = getPoleCount(symbol);
  if (poleCount === 3 || poleCount === 4) return 3;
  return 1;
}

function detectPhaseText(phase: string): number {
  if (!phase || isPendingPhase(phase)) return 1;
  if (phase === "L1+L2+L3" || phase === "3F" || phase === "3P") return 3;
  const count = (phase.match(/L/g) ?? []).length;
  return Math.max(1, count);
}

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
