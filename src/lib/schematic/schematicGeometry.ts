import type { PageInfo, SchematicNode } from "./schematicLayout";
import {
  A4_HEIGHT_PX,
  COLUMN_MARGIN_LEFT,
  COLUMN_MARGIN_RIGHT,
  DRAW_LEFT,
  DRAW_RIGHT,
  DRAW_TOP,
  DRAW_WIDTH,
  MAX_MODULES_PER_CARD,
  MODULE_WIDTH,
  PAGE_GAP,
  Y_FR,
  Y_FR_WITH_TOP,
  Y_MAIN_BUS,
  Y_MAIN_BUS_WITH_TOP,
  Y_MAIN_DEVICE,
  Y_MAIN_DEVICE_WITH_TOP,
  Y_MCB,
  Y_MCB_WITH_TOP,
  Y_TOP_SWITCH,
  Y_TOP_SWITCH_WITH_TOP,
} from "./schematicLayout";

const MIN_SCHEMATIC_CELL_WIDTH = 56;
const MAX_SCHEMATIC_CELL_WIDTH = 68;

export function assignPagesAndPosition(mainDevices: SchematicNode[], circuitDevices: SchematicNode[]): PageInfo[] {
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
