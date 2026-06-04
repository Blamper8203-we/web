import type { PageInfo, SchematicLayout, SchematicNode } from "./schematicLayout";
import type { ProjectMetadata } from "../../types/projectMetadata";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  CELL_FONT_SIZE,
  DRAW_LEFT,
  DRAW_TOP,
  FRAME_MARGIN_BOTTOM,
  FRAME_MARGIN_LEFT,
  FRAME_MARGIN_RIGHT,
  FRAME_MARGIN_TOP,
  MODULE_HEIGHT,
  MODULE_WIDTH,
  ROW_HEIGHT,
  TITLEBLOCK_HEIGHT,
  TITLEBLOCK_VISUAL_WIDTH,
  Y_GROUP_BUS,
  Y_LABEL_TOP,
  Y_MAIN_BUS,
  Y_N,
  Y_PE,
  Y_ROW_DESIGNATION,
  Y_SUPPLY,
  Y_WIRE_END,
  Y_TOP_BUS_WITH_TOP,
  Y_MAIN_BUS_WITH_TOP,
  Y_GROUP_BUS_WITH_TOP,
  Y_WIRE_END_WITH_TOP,
  Y_LABEL_TOP_WITH_TOP,
  Y_N_WITH_TOP,
  Y_PE_WITH_TOP,
} from "./schematicLayout";

export interface SchematicRenderOptions {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panX: number;
  panY: number;
  activePageIndex: number;
  selectedNodeId?: string;
  selectedNodeIds?: string[];
  highlightNodeId?: string;
  metadata?: ProjectMetadata;
}

const COLORS = {
  page: "#ffffff",
  frame: "#6c727c",
  grid: "#d2d7df",
  gridText: "#90959f",
  text: "#161a22",
  textDim: "#484e58",
  textLabel: "#60656f",
  textDes: "#1c1e26",
  textNum: "#424852",
  boxBg: "#fafbfe",
  bus: "#181c24",
  wire: "#4a505c",
  fr: "#5b3fd6",
  spd: "#d28200",
  rcd: "#007c89",
  kf: "#aa8214",
  l1: "#8b4513",
  l2: "#1e1e1e",
  l3: "#787878",
  n: "#0066cc",
  pe: "#b0c424",
  tableHeader: "#f3f6fb",
  tableMuted: "#475569",
  tableDim: "#667085",
  selected: "#0D79F2",
};

const Y_ROW_CIRCUIT = Y_ROW_DESIGNATION + ROW_HEIGHT;
const Y_ROW_LOCATION = Y_ROW_DESIGNATION + ROW_HEIGHT * 2;
const Y_ROW_CABLE = Y_ROW_DESIGNATION + ROW_HEIGHT * 3;
const Y_ROW_CABLE_TYPE = Y_ROW_DESIGNATION + ROW_HEIGHT * 4;
const Y_ROW_CABLE_SPEC = Y_ROW_DESIGNATION + ROW_HEIGHT * 5;
const Y_ROW_CABLE_LENGTH = Y_ROW_DESIGNATION + ROW_HEIGHT * 6;
const Y_ROW_POWER = Y_ROW_DESIGNATION + ROW_HEIGHT * 7;
const Y_ROW_SEPARATOR = Y_ROW_CABLE;
const SYMBOL_TOP_LINE_START = 30;
const SYMBOL_BOTTOM_LINE_END = 300;
const FR_SYMBOL_Y_OFFSET = 0;
const PATH_NUMBER_LABEL_Y = 10;
const FR_SUPPLY_CONNECTION_Y_OFFSET = 12;
export const SCHEMATIC_BODY_Y_OFFSET = 12;
const EMPTY_SCHEMATIC_TABLE_VALUE = "Brak";
const RCD_NEUTRAL_BUS_OFFSET_Y = -22;
const RCD_BUS_MARGIN = 12;
const CABLE_TERMINAL_CELL_WIDTH = 12;
const CABLE_TERMINAL_CELL_HEIGHT = 11;
const CABLE_TERMINAL_GAP = 1;

export function renderSchematic(
  ctx: CanvasRenderingContext2D,
  layout: SchematicLayout,
  options: SchematicRenderOptions,
): void {
  const { canvasWidth, canvasHeight, zoom, panX, panY, selectedNodeId, selectedNodeIds } = options;

  ctx.fillStyle = "#171b22";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  const rootNodes = getRootNodes(layout.nodes);

  for (const page of layout.pages) {
    drawPageTemplate(ctx, page, layout.pages.length);
    drawPageVectors(ctx, layout, page, rootNodes);
    drawCircuitTable(ctx, page, rootNodes);
    drawTitleBlock(ctx, page, layout.pages.length, options.metadata);
  }

  const selection = new Set<string>(selectedNodeIds ?? []);
  if (selectedNodeId) {
    selection.add(selectedNodeId);
  }

  for (const selectedId of selection) {
    const selected = layout.nodes.find((node) => node.id === selectedId);
    if (selected) {
      drawSelection(ctx, selected);
    }
  }

  ctx.restore();
}

function drawPageTemplate(ctx: CanvasRenderingContext2D, page: PageInfo, totalPages: number): void {
  const y = page.yOffset;
  ctx.fillStyle = COLORS.page;
  ctx.fillRect(0, y, A4_WIDTH_PX, A4_HEIGHT_PX);

  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 1.1;
  ctx.strokeRect(
    FRAME_MARGIN_LEFT,
    y + FRAME_MARGIN_TOP,
    A4_WIDTH_PX - FRAME_MARGIN_LEFT - FRAME_MARGIN_RIGHT,
    A4_HEIGHT_PX - FRAME_MARGIN_TOP - FRAME_MARGIN_BOTTOM,
  );

  ctx.fillStyle = COLORS.gridText;
  ctx.font = "9px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Arkusz ${page.pageIndex + 1}/${totalPages}`, FRAME_MARGIN_LEFT + 8, y + FRAME_MARGIN_TOP + 14);
}

function drawPageVectors(
  ctx: CanvasRenderingContext2D,
  layout: SchematicLayout,
  page: PageInfo,
  rootNodes: SchematicNode[],
): void {
  const pageDevices = rootNodes.filter((node) => node.pageIndex === page.pageIndex);
  if (pageDevices.length === 0) {
    return;
  }

  const hasTopSwitch = pageDevices.some((node) => node.topDevice || node.topBusConnected);

  drawPathGuides(ctx, pageDevices, page, hasTopSwitch);

  ctx.save();
  ctx.translate(0, SCHEMATIC_BODY_Y_OFFSET);

  drawMainBus(ctx, page, hasTopSwitch);
  drawTopBus(ctx, page, pageDevices);

  for (const device of pageDevices) {
    drawDevice(ctx, device, page, hasTopSwitch);
  }

  drawNpe(ctx, page, hasTopSwitch);
  drawCableLabels(ctx, page, pageDevices, hasTopSwitch);

  if (page.pageIndex < layout.pages.length - 1) {
    drawContinuation(ctx, page, page.pageIndex + 2, true, hasTopSwitch);
  }
  if (page.pageIndex > 0) {
    drawContinuation(ctx, page, page.pageIndex, false, hasTopSwitch);
  }

  ctx.restore();

  drawPathNumberLabels(ctx, pageDevices, page);
  drawLegend(ctx, page, pageDevices);
}

function drawMainBus(ctx: CanvasRenderingContext2D, page: PageInfo, hasTopSwitch: boolean): void {
  const mainBusY = hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS;
  strokeLine(ctx, page.busX1, y(page, mainBusY), page.busX2, y(page, mainBusY), COLORS.bus, 3.5);
}

function drawTopBus(ctx: CanvasRenderingContext2D, page: PageInfo, pageDevices: SchematicNode[]): void {
  const hasTopBus = pageDevices.some(node => node.topBusConnected);
  if (!hasTopBus) return;

  const connectedNodes = pageDevices.filter(node => node.topBusConnected || node.topDevice);
  if (connectedNodes.length === 0) return;

  const headNode = connectedNodes.find(n => n.topDevice);
  if (!headNode) return;

  const cxArr = connectedNodes.map(n => n.x + MODULE_WIDTH / 2);
  cxArr.push(headNode.topDevice!.x + MODULE_WIDTH / 2);

  const minX = Math.min(...cxArr);
  const maxX = Math.max(...cxArr);
  const busY = y(page, Y_TOP_BUS_WITH_TOP);

  strokeLine(ctx, minX - 8, busY, maxX + 8, busY, COLORS.bus, 3.5);
}

function drawNpe(ctx: CanvasRenderingContext2D, page: PageInfo, hasTopSwitch: boolean): void {
  const nY = hasTopSwitch ? Y_N_WITH_TOP : Y_N;
  const peY = hasTopSwitch ? Y_PE_WITH_TOP : Y_PE;

  strokeLine(ctx, page.busX1, y(page, nY), page.busX2, y(page, nY), COLORS.n, 1.4);
  text(ctx, "N", page.busX1 - 16, y(page, nY) - 4, 9, COLORS.n, true);

  ctx.save();
  ctx.setLineDash([6, 3]);
  strokeLine(ctx, page.busX1, y(page, peY), page.busX2, y(page, peY), COLORS.pe, 1.4);
  ctx.restore();
  text(ctx, "PE", page.busX1 - 22, y(page, peY) - 4, 9, COLORS.pe, true);
}

function drawDevice(ctx: CanvasRenderingContext2D, node: SchematicNode, page: PageInfo, hasTopSwitch = false): void {
  const cx = node.x + MODULE_WIDTH / 2;
  const mainBusY = y(page, hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS);

  switch (node.nodeType) {
    case "MainBreaker":
      if (node.children.length > 0) {
        drawGroupedMainBreaker(ctx, node, page, hasTopSwitch);
        return;
      }

      if (node.topDevice) {
        drawFrSupplyConnection(ctx, page, cx, symbolTopY(node.topDevice.y), node.topDevice.phaseCount, node.topDevice.phase);
        drawMainSwitch(ctx, cx, node.topDevice.y + MODULE_HEIGHT / 2, COLORS.fr, node.topDevice);
        text(ctx, node.topDevice.designation, cx + 12, node.topDevice.y + 25, 9, COLORS.textDes, true);
        textRight(ctx, node.topDevice.protection, cx - 18, node.topDevice.y + MODULE_HEIGHT / 2 + 5, 7.5, COLORS.textDim);
        drawWireLine(ctx, cx, symbolBottomY(node.topDevice.y), symbolTopY(node.y), COLORS.wire, 1.8);
        phaseMarks(ctx, cx, symbolBottomY(node.topDevice.y) + (symbolTopY(node.y) - symbolBottomY(node.topDevice.y)) / 2, node.topDevice.phaseCount, node.topDevice.phase);
      } else {
        drawFrSupplyConnection(ctx, page, cx, symbolTopY(node.y), node.phaseCount, node.phase);
      }
      
      drawMainSwitch(ctx, cx, node.y + MODULE_HEIGHT / 2, COLORS.fr, node);
      text(ctx, node.designation, cx + 12, node.y + 25, 9, COLORS.textDes, true);
      textRight(ctx, node.protection, cx - 18, node.y + MODULE_HEIGHT / 2 + 5, 7.5, COLORS.textDim);
      drawWireLine(ctx, cx, symbolBottomY(node.y), mainBusY, COLORS.wire, 1.2);
      phaseMarks(ctx, cx, symbolBottomY(node.y) + (mainBusY - symbolBottomY(node.y)) / 2, node.phaseCount, node.phase, true);
      drawDot(ctx, cx, mainBusY, COLORS.wire, 2.5);
      return;

    case "PhaseIndicator": {
      const busY = node.topBusConnected ? y(page, Y_TOP_BUS_WITH_TOP) : mainBusY;
      wireDot(ctx, cx, busY, symbolTopY(node.y));
      
      const phaseText = node.phase.replace("+N", "").replace("N", "");
      phaseMarks(ctx, cx, busY + (symbolTopY(node.y) - busY) / 2, Math.min(3, node.phaseCount), phaseText);
      
      symKf(ctx, cx, node.y + MODULE_HEIGHT / 2);
      text(ctx, node.designation, cx + 12, node.y + 25, 8.5, COLORS.textDes, true);
      textRight(ctx, node.protection, cx - 12, node.y + MODULE_HEIGHT / 2 + 5, 7.5, COLORS.textDim);
      
      const nY = y(page, node.topBusConnected ? Y_N_WITH_TOP : Y_N);
      ctx.save();
      ctx.setLineDash([4, 3]);
      strokeLine(ctx, cx, symbolBottomY(node.y), cx, nY, COLORS.n, 1.2);
      drawDot(ctx, cx, nY, COLORS.n, 2.2);
      ctx.restore();

      return;
    }

    case "SPD": {
      const busY = node.topBusConnected ? y(page, Y_TOP_BUS_WITH_TOP) : mainBusY;
      wireDot(ctx, cx, busY, symbolTopY(node.y));
      phaseMarks(ctx, cx, busY + (symbolTopY(node.y) - busY) / 2, node.phaseCount, node.phase, true);
      symSpd(ctx, cx, node.y + MODULE_HEIGHT / 2);
      text(ctx, node.designation, cx + 12, node.y + 25, 8.5, COLORS.textDes, true);
      
      const spdBottom = node.y + MODULE_HEIGHT / 2 + 32;
      const nY = y(page, node.topBusConnected ? Y_N_WITH_TOP : Y_N);
      const peY = y(page, node.topBusConnected ? Y_PE_WITH_TOP : Y_PE);
      
      ctx.save();
      ctx.setLineDash([4, 3]);
      
      // N path
      strokeLine(ctx, cx - 8, spdBottom, cx - 8, nY, COLORS.n, 1.2);
      drawDot(ctx, cx - 8, nY, COLORS.n, 2.2);

      // PE path
      strokeLine(ctx, cx + 8, spdBottom, cx + 8, peY, COLORS.pe, 1.2);
      drawDot(ctx, cx + 8, peY, COLORS.pe, 2.2);
      
      ctx.restore();
      return;
    }

    case "RCD":
      drawRcd(ctx, node, page, hasTopSwitch);
      return;

    case "MCB":
      wireDot(ctx, cx, mainBusY, symbolTopY(node.y));
      phaseMarks(ctx, cx, mainBusY + (symbolTopY(node.y) - mainBusY) / 2, node.phaseCount, node.phase);
      drawMcb(ctx, node, node.y, page, hasTopSwitch);
      return;

    case "Other":
      return;
  }
}

function drawGroupedMainBreaker(ctx: CanvasRenderingContext2D, breaker: SchematicNode, page: PageInfo, hasTopSwitch = false): void {
  const cx = breaker.x + MODULE_WIDTH / 2;
  const displayPhase = (breaker.phaseCount === 1 && breaker.phase === "L1 L2 L3") ? "L1" : breaker.phase;

  if (breaker.topDevice) {
    const topDisplayPhase = (breaker.topDevice.phaseCount === 1 && breaker.topDevice.phase === "L1 L2 L3") ? "L1" : breaker.topDevice.phase;
    drawFrSupplyConnection(ctx, page, cx, symbolTopY(breaker.topDevice.y), breaker.topDevice.phaseCount, topDisplayPhase);
    drawMainSwitch(ctx, cx, breaker.topDevice.y + MODULE_HEIGHT / 2, COLORS.fr, breaker.topDevice);
    text(ctx, breaker.topDevice.designation, cx + 12, breaker.topDevice.y + 25, 9, COLORS.textDes, true);
    textRight(ctx, breaker.topDevice.protection, cx - 18, breaker.topDevice.y + MODULE_HEIGHT / 2 + 5, 7.5, COLORS.textDim);
    drawWireLine(ctx, cx, symbolBottomY(breaker.topDevice.y), symbolTopY(breaker.y), COLORS.wire, 1.8);
    phaseMarks(ctx, cx, symbolBottomY(breaker.topDevice.y) + (symbolTopY(breaker.y) - symbolBottomY(breaker.topDevice.y)) / 2, breaker.topDevice.phaseCount, topDisplayPhase);
  } else {
    drawFrSupplyConnection(ctx, page, cx, symbolTopY(breaker.y), breaker.phaseCount, displayPhase);
  }

  drawMainSwitch(ctx, cx, breaker.y + MODULE_HEIGHT / 2, COLORS.fr, breaker);
  text(ctx, breaker.designation, cx + 12, breaker.y + 25, 9, COLORS.textDes, true);
  textRight(ctx, breaker.protection, cx - 18, breaker.y + MODULE_HEIGHT / 2 + 5, 7.5, COLORS.textDim);

  if (breaker.children.length === 0) {
    return;
  }

  const hasDistributionBlock = breaker.distributionBlockLabel.trim().length > 0;
  const useMainBusAsDistribution = breaker.phaseCount === 1;
  const mainBusY = y(page, hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS);
  const groupBusY = hasTopSwitch ? Y_GROUP_BUS_WITH_TOP : Y_GROUP_BUS;
  const groupY = useMainBusAsDistribution
    ? mainBusY
    : hasDistributionBlock
      ? y(page, groupBusY + 22)
      : y(page, groupBusY);
  const firstX = breaker.children[0].x + MODULE_WIDTH / 2;
  const lastX = breaker.children[breaker.children.length - 1].x + MODULE_WIDTH / 2;

  if (useMainBusAsDistribution) {
    drawWireLine(ctx, cx, symbolBottomY(breaker.y), mainBusY, COLORS.wire, 1.2);
    phaseMarks(ctx, cx, symbolBottomY(breaker.y) + (mainBusY - symbolBottomY(breaker.y)) / 2, breaker.phaseCount, displayPhase);
    drawDot(ctx, cx, mainBusY, COLORS.wire, 2.5);
    drawDistributionBlockLabel(ctx, breaker.distributionBlockLabel, firstX - MODULE_WIDTH / 2 + 4, mainBusY - 10);
  } else if (hasDistributionBlock) {
    const blockWidth = 52;
    const blockHeight = 18;
    const blockTop = groupY - blockHeight - 18;
    const blockLeft = cx - blockWidth / 2;

    drawWireLine(ctx, cx, symbolBottomY(breaker.y), blockTop, COLORS.wire, 1.2);
    phaseMarks(ctx, cx, symbolBottomY(breaker.y) + (blockTop - symbolBottomY(breaker.y)) / 2, breaker.phaseCount, displayPhase);
    drawDistributionBlock(ctx, breaker.distributionBlockLabel, blockLeft, blockTop, blockWidth, blockHeight);
    wireDot(ctx, cx, blockTop + blockHeight, groupY);
  } else {
    wireDot(ctx, cx, symbolBottomY(breaker.y), groupY);
    phaseMarks(ctx, cx, symbolBottomY(breaker.y) + (groupY - symbolBottomY(breaker.y)) / 2, breaker.phaseCount, displayPhase);
  }

  if (!useMainBusAsDistribution) {
    strokeLine(ctx, firstX - 8, groupY, lastX + 8, groupY, COLORS.wire, 2.2);
  }

  for (const child of breaker.children) {
    drawChildFromGroupBus(ctx, child, page, groupY);
  }
}

function drawFrSupplyConnection(
  ctx: CanvasRenderingContext2D,
  page: PageInfo,
  cx: number,
  targetY: number,
  phaseCount: number,
  phase: string,
): void {
  const supplyY = y(page, Y_SUPPLY + FR_SUPPLY_CONNECTION_Y_OFFSET);
  const labelY = supplyY + (targetY - supplyY) / 2;
  const displayPhase = (phaseCount === 1 && phase === "L1 L2 L3") ? "L1" : phase;

  drawWireLine(ctx, cx, supplyY, targetY, COLORS.fr, 1.8);
  phaseMarks(ctx, cx, labelY, phaseCount, displayPhase, true);
  text(ctx, supplyLabel(phaseCount), cx - 38, labelY - 2, 8, COLORS.textDim);
}

function drawRcd(ctx: CanvasRenderingContext2D, rcd: SchematicNode, page: PageInfo, hasTopSwitch = false): void {
  const cx = rcd.x + MODULE_WIDTH / 2;
  const mainBusY = y(page, hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS);
  wireDot(ctx, cx, mainBusY, symbolTopY(rcd.y));
  phaseMarks(ctx, cx, mainBusY + (symbolTopY(rcd.y) - mainBusY) / 2, rcd.phaseCount, rcd.phase, true);
  symRcd(ctx, cx, rcd.y + MODULE_HEIGHT / 2);
  text(ctx, rcd.designation, cx + 12, rcd.y + 25, 9, COLORS.textDes, true);
  textRight(ctx, rcd.protection, cx - 18, rcd.y + MODULE_HEIGHT / 2 + 6, 8.4, COLORS.rcd, false, 110);

  if (rcd.children.length === 0) {
    return;
  }

  const groupBusY = hasTopSwitch ? Y_GROUP_BUS_WITH_TOP : Y_GROUP_BUS;
  const phaseBusY = y(page, groupBusY);
  const nBusY = phaseBusY + RCD_NEUTRAL_BUS_OFFSET_Y;

  const firstX = rcd.children[0].x + MODULE_WIDTH / 2;
  const lastX = rcd.children[rcd.children.length - 1].x + MODULE_WIDTH / 2;
  const busMargin = RCD_BUS_MARGIN;
  const phaseBusX1 = Math.min(cx, firstX) - busMargin;
  const phaseBusX2 = Math.max(cx, lastX) + busMargin;

  const mcbChildren = rcd.children.filter((c) => c.nodeType === "MCB");

  let phaseTextOffsetX = -8; // Move text to the left side

  // Vertical wire from RCD bottom to the phase bus
  wireDot(ctx, cx, symbolBottomY(rcd.y), phaseBusY);
  drawDot(ctx, cx, phaseBusY, COLORS.wire, 2.2);
  phaseMarks(ctx, cx, symbolBottomY(rcd.y) + (phaseBusY - symbolBottomY(rcd.y)) / 2, rcd.phaseCount, rcd.phase, true, phaseTextOffsetX);

  if (rcd.hasNeutralBar) {
    const nRcdX = cx + 18; // Offset to the right for the incoming N line

    // Determine where the short N bus should be placed
    // It will be at verticalNX if there are MCBs, otherwise at nRcdX
    let shortBusCenterX = nRcdX;
    let verticalNX = nRcdX;
    
    if (mcbChildren.length > 0) {
      verticalNX = lastX + 18; // Go up to the right of the last MCB
      shortBusCenterX = verticalNX;
    }

    // The short N bus itself
    const shortBusWidth = 24;
    const shortBusX1 = shortBusCenterX - shortBusWidth / 2;
    const shortBusX2 = shortBusCenterX + shortBusWidth / 2;
    strokeLine(ctx, shortBusX1, nBusY, shortBusX2, nBusY, COLORS.n, 2.2);

    // Label for the N bus
    const nLabel = rcd.neutralBarLabel || `X${rcd.designation}`;
    textCentered(ctx, nLabel, shortBusCenterX, nBusY - 12, 6.5, COLORS.textDim, true);

    // Draw horizontal collector for N from all MCBs
    if (mcbChildren.length > 0) {
      const wireEndYVal = hasTopSwitch ? Y_WIRE_END_WITH_TOP : Y_WIRE_END;
      const terminals = mcbChildren.map(c => 
        getCableTerminalLayout(c.x + MODULE_WIDTH / 2, y(page, wireEndYVal), c.phaseCount, c.phase)
      );
      
      const collectorY = terminals[0].blockY - 25;
      const firstN = terminals[0].nCenterX!;

      ctx.save();
      ctx.setLineDash([2, 2]);
      
      // Horizontal line connecting all MCB N terminals
      strokeLine(ctx, firstN, collectorY, verticalNX, collectorY, COLORS.n, 1.2);
      
      // Vertical drops from horizontal collector to each MCB N terminal
      for (const term of terminals) {
        if (term.nCenterX !== undefined) {
          strokeLine(ctx, term.nCenterX, term.blockY, term.nCenterX, collectorY, COLORS.n, 1.2);
          drawDot(ctx, term.nCenterX, collectorY, COLORS.n, 2.0);
        }
      }
      
      // Main vertical line from horizontal collector up to N bus
      strokeLine(ctx, verticalNX, collectorY, verticalNX, nBusY, COLORS.n, 1.2);
      drawDot(ctx, verticalNX, collectorY, COLORS.n, 2.0);
      drawDot(ctx, verticalNX, nBusY, COLORS.n, 2.0);
      ctx.restore();
    }
  }

  // Draw phase bus (black, horizontal)
  strokeLine(ctx, phaseBusX1, phaseBusY, phaseBusX2, phaseBusY, COLORS.wire, 2.2);

  // Draw children with dual vertical lines
  for (const child of rcd.children) {
    drawChildFromGroupBus(ctx, child, page, phaseBusY, hasTopSwitch);
  }
}

function drawChildFromGroupBus(
  ctx: CanvasRenderingContext2D,
  child: SchematicNode,
  page: PageInfo,
  groupY: number,
  hasTopSwitch = false,
): void {
  const childCx = child.x + MODULE_WIDTH / 2;

  // Phase (L) vertical line — on center axis
  wireDot(ctx, childCx, groupY, symbolTopY(child.y));
  phaseMarks(
    ctx,
    childCx,
    groupY + (symbolTopY(child.y) - groupY) / 2,
    child.phaseCount,
    child.phase,
    child.nodeType === "SPD",
  );

  switch (child.nodeType) {
    case "MCB":
      drawMcb(ctx, child, child.y, page, hasTopSwitch);
      return;
    case "SPD":
      symSpd(ctx, childCx, child.y + MODULE_HEIGHT / 2);
      text(ctx, child.designation, childCx + 12, child.y + 25, 8, COLORS.textDes, true);
      textCenteredBox(ctx, child.protection, childCx - 35, child.y + MODULE_HEIGHT + 22, 70, 6.5, COLORS.textDim);
      return;
    case "PhaseIndicator":
      symKf(ctx, childCx, child.y + MODULE_HEIGHT / 2);
      text(ctx, child.designation, childCx + 12, child.y + 25, 8, COLORS.textDes, true);
      textRight(ctx, child.protection, childCx - 12, child.y + MODULE_HEIGHT / 2 + 5, 7, COLORS.textDim);
      return;
    case "MainBreaker":
    case "RCD":
    case "Other":
      return;
  }
}

function drawDistributionBlock(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.fillStyle = COLORS.boxBg;
  ctx.strokeStyle = COLORS.bus;
  ctx.lineWidth = 1.2;
  roundRect(ctx, x, y, width, height, 4, true, true);

  const cx = x + width / 2;
  drawDot(ctx, cx, y, COLORS.wire, 2.2);
  drawDot(ctx, cx, y + height, COLORS.wire, 2.2);
  textCentered(ctx, label, cx, y + height / 2 + 3, 7, COLORS.textDim, true);
}

function drawDistributionBlockLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
): void {
  if (!label) {
    return;
  }

  text(ctx, label, x, y - 7, 7, COLORS.textDim, true);
}

function drawMcb(ctx: CanvasRenderingContext2D, node: SchematicNode, nodeY: number, page: PageInfo, hasTopSwitch = false): void {
  const phaseColor = phaseColorFor(node.phase);
  const cx = node.x + MODULE_WIDTH / 2;
  const cy = nodeY + MODULE_HEIGHT / 2;

  ctx.save();
  ctx.setLineDash([5, 5]);
  strokeLine(ctx, cx - MODULE_WIDTH / 2 - 4, cy, cx + MODULE_WIDTH / 2 + 4, cy, COLORS.grid, 0.4);
  ctx.restore();

  symMcb(ctx, cx, cy, phaseColor);
  textRight(ctx, node.designation, cx - 12, nodeY + 29, 8.5, COLORS.textDes, true);
  const wireEndY = hasTopSwitch ? Y_WIRE_END_WITH_TOP : Y_WIRE_END;
  const terminal = getCableTerminalLayout(cx, y(page, wireEndY), node.phaseCount, node.phase);
  drawWireLine(ctx, cx, symbolBottomY(nodeY), terminal.blockY, COLORS.wire, 1.2);
  phaseMarks(ctx, cx, symbolBottomY(nodeY) + 15, node.phaseCount, node.phase);

  if (terminal.peCenterX !== undefined) {
    const peY = y(page, hasTopSwitch ? Y_PE_WITH_TOP : Y_PE);
    ctx.save();
    ctx.setLineDash([4, 3]);
    strokeLine(ctx, terminal.peCenterX, peY, terminal.peCenterX, terminal.blockY + CABLE_TERMINAL_CELL_HEIGHT, COLORS.pe, 1);
    ctx.restore();
  }

  drawCableConnectionBlock(ctx, terminal, node.cableDesig);
}

interface CableTerminalLayout {
  labels: string[];
  blockX: number;
  blockY: number;
  nCenterX?: number;
  peCenterX?: number;
  phaseCenterX: number;
}

function getCableTerminalLayout(cx: number, wireEndY: number, phaseCount: number, phaseStr?: string): CableTerminalLayout {
  let phaseLabels = ["L"];
  if (phaseStr && phaseStr !== "PENDING" && phaseStr !== "pending") {
    phaseLabels = phaseStr.split('+').filter(p => p !== 'N' && p !== 'PE');
  } else if (phaseCount >= 3) {
    phaseLabels = ["L1", "L2", "L3"];
  }

  let labels: string[];
  if (phaseLabels.length >= 3) {
    labels = ["N", "PE", ...phaseLabels];
  } else if (phaseLabels.length === 2) {
    labels = ["N", "PE", ...phaseLabels];
  } else {
    labels = ["N", "PE", phaseLabels[0] || "L", " "];
  }

  const phaseIndex = 2; // The wire drops down to the first phase cell
  const blockX = cx - phaseIndex * (CABLE_TERMINAL_CELL_WIDTH + CABLE_TERMINAL_GAP) - CABLE_TERMINAL_CELL_WIDTH / 2;
  const blockY = wireEndY - CABLE_TERMINAL_CELL_HEIGHT - 6;
  const centerOf = (label: string) => {
    const index = labels.indexOf(label);
    return index >= 0
      ? blockX + index * (CABLE_TERMINAL_CELL_WIDTH + CABLE_TERMINAL_GAP) + CABLE_TERMINAL_CELL_WIDTH / 2
      : undefined;
  };
  return {
    labels,
    blockX,
    blockY,
    nCenterX: centerOf("N"),
    peCenterX: centerOf("PE"),
    phaseCenterX: centerOf(phaseLabels[0] || "L")!,
  };
}

function drawCableConnectionBlock(
  ctx: CanvasRenderingContext2D,
  layout: CableTerminalLayout,
  cableDesig?: string,
): void {
  const { labels, blockX, blockY } = layout;
  const colorMap: Record<string, string> = {
    L1: COLORS.l1,
    L2: COLORS.l2,
    L3: COLORS.l3,
    L: COLORS.l1,
    N: COLORS.n,
    PE: COLORS.pe,
  };

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const x = blockX + i * (CABLE_TERMINAL_CELL_WIDTH + CABLE_TERMINAL_GAP);

    ctx.fillStyle = COLORS.page;
    ctx.fillRect(x, blockY, CABLE_TERMINAL_CELL_WIDTH, CABLE_TERMINAL_CELL_HEIGHT);
    ctx.strokeStyle = COLORS.textDim;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, blockY, CABLE_TERMINAL_CELL_WIDTH, CABLE_TERMINAL_CELL_HEIGHT);

    if (label !== " ") {
      ctx.font = "600 5.5px Segoe UI, sans-serif";
      ctx.fillStyle = colorMap[label] || COLORS.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + CABLE_TERMINAL_CELL_WIDTH / 2, blockY + CABLE_TERMINAL_CELL_HEIGHT / 2);
    }
  }

  if (cableDesig) {
    const totalW = labels.length * CABLE_TERMINAL_CELL_WIDTH + (labels.length - 1) * CABLE_TERMINAL_GAP;
    const arrowY = blockY + CABLE_TERMINAL_CELL_HEIGHT + 4;
    text(ctx, `${labels.length === 5 ? "5" : "3"}x`, blockX + totalW / 2 - 6, arrowY - 2, 5.5, COLORS.textDim);
  }
}
function drawCircuitTable(ctx: CanvasRenderingContext2D, page: PageInfo, rootNodes: SchematicNode[]): void {
  const nodes = rootNodes
    .filter((node) => node.pageIndex === page.pageIndex)
    .flatMap((node) => displayTableNodes(node));

  if (nodes.length === 0) {
    return;
  }

  const tableLeft = DRAW_LEFT;
  const tableTop = y(page, Y_ROW_DESIGNATION);
  const tableBottom = y(page, Y_ROW_DESIGNATION + 8 * ROW_HEIGHT);
  const leftX = Math.round(tableLeft);
  const rightX = Math.round(A4_WIDTH_PX - FRAME_MARGIN_RIGHT - TITLEBLOCK_VISUAL_WIDTH - 22);
  const topY = Math.round(tableTop);
  const bottomY = Math.round(tableBottom);
  const headerRx = Math.min(leftX + 150, rightX - 60);
  const columns = buildTableColumns(nodes, headerRx, rightX);

  ctx.fillStyle = COLORS.page;
  ctx.fillRect(leftX, topY, rightX - leftX, bottomY - topY);
  ctx.fillStyle = COLORS.tableHeader;
  ctx.fillRect(leftX, topY, headerRx - leftX, bottomY - topY);

  const rows: Array<[number, string]> = [
    [Y_ROW_DESIGNATION, "Oznaczenie"],
    [Y_ROW_CIRCUIT, "Obwód"],
    [Y_ROW_DESIGNATION + ROW_HEIGHT * 2, "Lokalizacja"],
    [Y_ROW_DESIGNATION + ROW_HEIGHT * 3, "Kabel"],
    [Y_ROW_DESIGNATION + ROW_HEIGHT * 4, "Typ kabla"],
    [Y_ROW_CABLE_SPEC, "Przekrój"],
    [Y_ROW_CABLE_LENGTH, "Długość"],
    [Y_ROW_DESIGNATION + ROW_HEIGHT * 7, "Moc"],
  ];

  for (const [rowY, label] of rows) {
    text(ctx, label, leftX + 12, y(page, rowY) + 5, 12.5, COLORS.tableMuted);
  }

  for (const column of columns) {
    const node = column.node;
    const values = getTableValues(node);

    tableCell(ctx, values.designation, column.x, y(page, Y_ROW_DESIGNATION), column.wrapWidth, COLORS.textDes, true, column.centerX);
    tableCell(ctx, values.circuitName || EMPTY_SCHEMATIC_TABLE_VALUE, column.x, y(page, Y_ROW_CIRCUIT), column.wrapWidth, COLORS.tableDim, false, column.centerX);
    tableCell(ctx, values.location || EMPTY_SCHEMATIC_TABLE_VALUE, column.x, y(page, Y_ROW_LOCATION), column.wrapWidth, COLORS.tableDim, false, column.centerX);
    tableCell(ctx, values.cableDesig || EMPTY_SCHEMATIC_TABLE_VALUE, column.x, y(page, Y_ROW_CABLE), column.wrapWidth, cableDesignationColor(node), true, column.centerX);
    tableCell(ctx, values.cableType || EMPTY_SCHEMATIC_TABLE_VALUE, column.x, y(page, Y_ROW_CABLE_TYPE), column.wrapWidth, COLORS.tableDim, false, column.centerX);
    tableCell(ctx, values.cableSpec, column.x, y(page, Y_ROW_CABLE_SPEC), column.wrapWidth, COLORS.text, false, column.centerX);
    tableCell(ctx, values.cableLength, column.x, y(page, Y_ROW_CABLE_LENGTH), column.wrapWidth, COLORS.tableDim, false, column.centerX);
    tableCell(ctx, values.powerInfo, column.x, y(page, Y_ROW_POWER), column.wrapWidth, COLORS.tableDim, false, column.centerX);
  }

  for (const [rowY] of rows) {
    const lineY = Math.round(y(page, rowY) + ROW_HEIGHT);
    if (lineY < bottomY) {
      strokeLine(ctx, leftX, lineY, rightX, lineY, COLORS.grid, 1);
    }
  }

  for (const column of columns) {
    const cellLeft = Math.round(column.x);
    if (cellLeft > headerRx + 1) {
      strokeLine(ctx, cellLeft, topY, cellLeft, bottomY, COLORS.grid, 1);
    }
  }

  strokeLine(ctx, leftX, y(page, Y_ROW_SEPARATOR), rightX, y(page, Y_ROW_SEPARATOR), "#94a3b8", 1.15);
  strokeLine(ctx, headerRx, topY, headerRx, bottomY, "#818c9b", 1.15);
  ctx.strokeStyle = "#818c9b";
  ctx.lineWidth = 1.15;
  ctx.strokeRect(leftX, topY, rightX - leftX, bottomY - topY);
}

interface TableColumn {
  node: SchematicNode;
  width: number;
  x: number;
  centerX: number;
  wrapWidth: number;
}

function buildTableColumns(nodes: SchematicNode[], startX: number, rightX: number): TableColumn[] {
  const centers = nodes.map((node) => node.x + MODULE_WIDTH / 2);

  return nodes.map((node, index) => {
    const center = centers[index];
    const x = index === 0
      ? startX
      : (centers[index - 1] + center) / 2;
    const nextX = index === nodes.length - 1
      ? rightX
      : (center + centers[index + 1]) / 2;
    const width = Math.max(0, nextX - x);
    const wrapWidth = Math.max(36, Math.min(width, 2 * Math.min(center - x, nextX - center)));

    return { node, width, x, centerX: center, wrapWidth };
  });
}


function getProjectObjectName(metadata?: ProjectMetadata): string {
  if (metadata?.company?.trim()) {
    return metadata.company.trim();
  }
  return "Dokumentacja powykonawcza instalacji elektrycznej";
}

function getContractorName(metadata?: ProjectMetadata): string {
  if (metadata?.contractor?.trim()) {
    return metadata.contractor.trim();
  }
  return "---";
}

function getDesignerName(metadata?: ProjectMetadata): string {
  if (metadata?.author?.trim()) {
    return metadata.author.trim();
  }
  return "---";
}

function getDesignerLicense(metadata?: ProjectMetadata): string {
  if (metadata?.designerId?.trim()) {
    return metadata.designerId.trim();
  }
  if (metadata?.authorLicense?.trim()) {
    return metadata.authorLicense.trim();
  }
  return "---";
}

function getDrawingScale(metadata?: ProjectMetadata): string {
  if (metadata?.drawingScale?.trim()) {
    return metadata.drawingScale.trim();
  }
  return "bez skali";
}

function getDrawingDate(metadata?: ProjectMetadata): string {
  if (metadata?.drawingDate?.trim()) {
    return metadata.drawingDate.trim();
  }
  if (metadata?.dateModified) {
    return metadata.dateModified.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function getSheetLabel(metadata: ProjectMetadata | undefined, pageIndex: number, totalPages: number): string {
  if (metadata?.sheetNumber?.trim()) {
    return metadata.sheetNumber.trim();
  }
  return `${pageIndex + 1}/${totalPages}`;
}

function getStandardsText(metadata?: ProjectMetadata): string {
  if (metadata?.standards) {
    const values = metadata.standards
      .filter((val) => val && val.trim().length > 0)
      .map((val) => val.trim());
    if (values.length > 0) {
      return values.join("; ");
    }
  }
  return "PN-HD 60364; PN-EN 60617";
}

function getDesignerSignature(metadata?: ProjectMetadata): string {
  if (metadata && !metadata.isFormalDocumentationMode) {
    return "nie dotyczy";
  }
  if (metadata?.designerSignature?.trim()) {
    return metadata.designerSignature.trim();
  }
  return ".........................";
}

function getContractorSignature(metadata?: ProjectMetadata): string {
  if (metadata && !metadata.isFormalDocumentationMode) {
    return "nie dotyczy";
  }
  if (metadata?.contractorSignature?.trim()) {
    return metadata.contractorSignature.trim();
  }
  return ".........................";
}

function truncateText(value: string | undefined, maxLen: number): string {
  if (!value || !value.trim()) {
    return "---";
  }
  const normalized = value.trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return normalized.slice(0, maxLen - 3) + "...";
}

function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  page: PageInfo,
  totalPages: number,
  metadata?: ProjectMetadata,
): void {
  const width = TITLEBLOCK_VISUAL_WIDTH;
  const height = TITLEBLOCK_HEIGHT;
  const x = A4_WIDTH_PX - FRAME_MARGIN_RIGHT - width;
  const blockY = A4_HEIGHT_PX - FRAME_MARGIN_BOTTOM - height + page.yOffset;

  ctx.fillStyle = COLORS.page;
  ctx.fillRect(x, blockY, width, height);
  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, blockY, width, height);

  const relativeRows = [1.12, 1, 1, 1.35, 1, 1, 1, 1, 1.08];
  const total = relativeRows.reduce((sum, value) => sum + value, 0);
  const rowHeights = relativeRows.map((value) => (height * value) / total);
  const rowTops = [blockY];
  for (const rowHeight of rowHeights) {
    rowTops.push(rowTops[rowTops.length - 1] + rowHeight);
  }

  for (let i = 1; i < rowTops.length - 1; i++) {
    strokeLine(ctx, x, rowTops[i], x + width, rowTops[i], COLORS.frame, 0.5);
  }

  const splitX = x + width * 0.5;
  for (const [from, to] of [
    [3, 4],
    [4, 5],
    [5, 6],
    [8, 9],
  ] as const) {
    strokeLine(ctx, splitX, rowTops[from], splitX, rowTops[to], COLORS.frame, 0.5);
  }

  const colW = width * 0.5;

  const title = truncateText(getProjectObjectName(metadata), 60);
  const investor = truncateText(metadata?.investor, 60);
  const address = truncateText(metadata?.address, 60);
  const contractor = truncateText(getContractorName(metadata), 30);
  const designer = truncateText(getDesignerName(metadata), 30);
  const designerLicense = truncateText(getDesignerLicense(metadata), 30);
  const drawNum = truncateText(metadata?.projectNumber ?? "PW-01/2026", 28);
  const scale = truncateText(getDrawingScale(metadata), 28);
  const date = truncateText(getDrawingDate(metadata), 28);
  const sheet = truncateText(getSheetLabel(metadata, page.pageIndex, totalPages), 28);
  const revision = truncateText(metadata?.revision ?? "wyd. 1", 60);
  const standards = truncateText(getStandardsText(metadata), 60);
  const designerSig = truncateText(getDesignerSignature(metadata), 30);
  const contractorSig = truncateText(getContractorSignature(metadata), 30);

  drawTitleCell(ctx, x, rowTops[0], width, rowHeights[0], "Zakres / dokumentacja:", title, 6.5, 8.5);
  drawTitleCell(ctx, x, rowTops[1], width, rowHeights[1], "Inwestor:", investor, 6.0, 7.5);
  drawTitleCell(ctx, x, rowTops[2], width, rowHeights[2], "Adres obiektu:", address, 6.0, 7.5);
  drawTitleCell(ctx, x, rowTops[3], colW, rowHeights[3], "Wykonawca:", contractor, 5.5, 7.0);
  drawTitleCell(ctx, splitX, rowTops[3], colW, rowHeights[3], "Elektryk / SEP:", `${designer}\n${designerLicense}`, 5.5, 6.5);
  drawTitleCell(ctx, x, rowTops[4], colW, rowHeights[4], "Nr dokumentacji:", drawNum, 5.5, 7.5);
  drawTitleCell(ctx, splitX, rowTops[4], colW, rowHeights[4], "Skala:", scale, 5.5, 7.5);
  drawTitleCell(ctx, x, rowTops[5], colW, rowHeights[5], "Data wykonania:", date, 5.5, 7.5);
  drawTitleCell(ctx, splitX, rowTops[5], colW, rowHeights[5], "Arkusz:", sheet, 5.5, 7.5);
  drawTitleCell(ctx, x, rowTops[6], width, rowHeights[6], "Rewizja / zmiana:", revision, 6.0, 7.5);
  drawTitleCell(ctx, x, rowTops[7], width, rowHeights[7], "Normy:", standards, 6.0, 7.5);
  drawTitleCell(ctx, x, rowTops[8], colW, rowHeights[8], "Podpis elektryka:", designerSig, 5.5, 7.0);
  drawTitleCell(ctx, splitX, rowTops[8], colW, rowHeights[8], "Podpis wykonawcy:", contractorSig, 5.5, 7.0);
}

function drawPathGuides(ctx: CanvasRenderingContext2D, pageDevices: SchematicNode[], page: PageInfo, hasTopSwitch = false): void {
  const display = pageDevices.flatMap((node) => displayNodes(node));
  for (const node of display) {
    const cx = node.x + MODULE_WIDTH / 2;
    ctx.save();
    ctx.strokeStyle = COLORS.gridText;
    ctx.lineWidth = 0.4;
    ctx.setLineDash([2, 2]);
    const labelTopY = hasTopSwitch ? Y_LABEL_TOP_WITH_TOP : Y_LABEL_TOP;
    strokeLine(ctx, cx, y(page, 18), cx, y(page, labelTopY + SCHEMATIC_BODY_Y_OFFSET), COLORS.grid, 0.4);
    ctx.restore();
  }
}

function drawPathNumberLabels(ctx: CanvasRenderingContext2D, pageDevices: SchematicNode[], page: PageInfo): void {
  const display = pageDevices.flatMap((node) => displayNodes(node));
  display.forEach((node, index) => {
    const cx = node.x + MODULE_WIDTH / 2;
    const labelY = PATH_NUMBER_LABEL_Y;
    const label = String(index + 1);
    ctx.font = "700 9.5px Segoe UI, sans-serif";
    const textWidth = ctx.measureText(label).width;
    const rectWidth = textWidth + 8;
    const rectHeight = 13;
    const rectX = cx - rectWidth / 2;
    const rectY = y(page, labelY) - 1.5;

    ctx.fillStyle = COLORS.page;
    ctx.strokeStyle = COLORS.gridText;
    ctx.lineWidth = 0.6;
    roundRect(ctx, rectX, rectY, rectWidth, rectHeight, 2, true, true);
    textCentered(ctx, label, cx, y(page, labelY), 9.5, COLORS.textDes, true);
  });
}

function drawCableLabels(ctx: CanvasRenderingContext2D, page: PageInfo, pageDevices: SchematicNode[], hasTopSwitch = false): void {
  const display = pageDevices.flatMap((node) => displayNodes(node));
  for (const node of display) {
    if (!node.cableDesig) {
      continue;
    }
    if (node.nodeType === "MCB") {
      continue;
    }
    const wireEndY = hasTopSwitch ? Y_WIRE_END_WITH_TOP : Y_WIRE_END;
    textCentered(ctx, node.cableDesig, node.x + MODULE_WIDTH / 2, y(page, wireEndY) + 11, 8, COLORS.textDim, true);
  }
}

function drawContinuation(ctx: CanvasRenderingContext2D, page: PageInfo, target: number, right: boolean, hasTopSwitch = false): void {
  const mainBusY = hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS;
  const busY = y(page, mainBusY);
  if (right) {
    const x = page.busX2 + 4;
    strokeLine(ctx, x, busY, x + 16, busY, "#b48c1e", 1.2);
    strokeLine(ctx, x + 12, busY - 3, x + 16, busY, "#b48c1e", 1.2);
    strokeLine(ctx, x + 12, busY + 3, x + 16, busY, "#b48c1e", 1.2);
    text(ctx, `→ ark. ${target}`, x, busY - 20, 8, "#b48c1e", true);
  } else {
    const x = page.busX1 - 4;
    strokeLine(ctx, x - 16, busY, x, busY, "#b48c1e", 1.2);
    strokeLine(ctx, x - 12, busY - 3, x - 16, busY, "#b48c1e", 1.2);
    strokeLine(ctx, x - 12, busY + 3, x - 16, busY, "#b48c1e", 1.2);
    text(ctx, `← z ark. ${target}`, x - 48, busY - 20, 8, "#b48c1e", true);
  }
}

function displayTableNodes(device: SchematicNode): SchematicNode[] {
  if (device.nodeType === "RCD") {
    return device.children;
  }

  if (shouldReserveHeadSlot(device)) {
    return [{ ...device, cellWidth: getHeadCellWidth(device), children: [] }, ...device.children]
      .filter((node) => node.nodeType !== "RCD");
  }

  return displayNodes(device).filter((node) => node.nodeType !== "RCD");
}

function displayNodes(device: SchematicNode): SchematicNode[] {
  if (shouldReserveHeadSlot(device)) {
    return [{ ...device, cellWidth: getHeadCellWidth(device), children: [] }, ...device.children];
  }

  if (device.children.length > 0) {
    return device.children;
  }

  return [device];
}


function getTableValues(node: SchematicNode): {
  designation: string;
  protection: string;
  circuitName: string;
  location: string;
  cableDesig: string;
  cableType: string;
  cableSpec: string;
  cableLength: string;
  powerInfo: string;
} {
  const circuitName =
    node.nodeType === "MCB" && isDeviceLabelCircuitName(node)
      ? ""
      : node.circuitName;
  const values = {
    designation: node.designation,
    protection: node.protection,
    circuitName,
    location: node.location,
    cableDesig: node.cableDesig,
    cableType: node.cableType,
    cableSpec: node.cableSpec,
    cableLength: node.cableLength,
    powerInfo: node.powerInfo,
  };

  if (node.nodeType === "MainBreaker") {
    return { ...values, cableDesig: "FR", cableSpec: node.cableDesig };
  }
  if (node.nodeType === "SPD") {
    return { ...values, cableDesig: "SPD", cableType: node.protection, cableSpec: "", cableLength: "", powerInfo: "" };
  }
  if (node.nodeType === "PhaseIndicator") {
    return { ...values, cableDesig: "KF", cableType: node.protection, cableSpec: "", cableLength: "", powerInfo: "" };
  }
  if (node.nodeType !== "MCB") {
    return { ...values, cableType: node.protection, cableSpec: "", cableLength: "", powerInfo: "" };
  }

  return values;
}

function normalizeSchematicTableText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ");
}

function isDeviceLabelCircuitName(node: SchematicNode): boolean {
  const circuitName = normalizeSchematicTableText(node.circuitName);
  if (!circuitName) {
    return false;
  }

  const deviceNames = [
    node.label,
    node.protection,
  ].map(normalizeSchematicTableText);

  return deviceNames.includes(circuitName);
}

function tableCell(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  cellY: number,
  width: number,
  color: string,
  bold = false,
  centerX?: number,
): void {
  if (!value) {
    return;
  }

  const baseSize = CELL_FONT_SIZE;
  ctx.font = `${bold ? "700 " : ""}${baseSize}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const textX = centerX !== undefined ? centerX : x + width / 2;
  const wrappedLines = wrapText(ctx, value, width - 4);
  const lineGap = 1;
  const size = wrappedLines.length > 2 ? 7.4 : wrappedLines.length > 1 ? 8.8 : baseSize;
  const maxLines = Math.max(1, Math.floor((ROW_HEIGHT - 4 + lineGap) / (size + lineGap)));
  const lines = wrappedLines.slice(0, maxLines);
  if (wrappedLines.length > maxLines) {
    lines[lines.length - 1] = truncateToWidth(ctx, `${lines[lines.length - 1]}...`, width - 4);
  }

  ctx.font = `${bold ? "700 " : ""}${size}px Segoe UI, sans-serif`;
  const totalHeight = lines.length * size + (lines.length - 1) * lineGap;
  const startY = cellY + (ROW_HEIGHT - totalHeight) / 2 + size - size * 0.1;

  lines.forEach((line, index) => {
    ctx.fillText(line, textX, startY + index * (size + lineGap));
  });
}

function cableDesignationColor(node: SchematicNode): string {
  switch (node.nodeType) {
    case "MainBreaker":
      return COLORS.fr;
    case "SPD":
      return COLORS.spd;
    case "PhaseIndicator":
      return COLORS.kf;
    default:
      return COLORS.textDes;
  }
}

function drawTitleCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  cellY: number,
  width: number,
  _height: number,
  label: string,
  value: string,
  labelSize: number,
  valueSize: number,
): void {
  text(ctx, label, x + 4, cellY + 4, labelSize, COLORS.textLabel);
  
  ctx.font = `700 ${valueSize}px Segoe UI, sans-serif`;
  const wrappedValue = wrapText(ctx, value, width - 8).join("\n");
  text(ctx, wrappedValue, x + 4, cellY + Math.max(13, labelSize + 9), valueSize, COLORS.text, true);
}

function isNetworkSwitchNode(node: SchematicNode): boolean {
  const desig = (node.designation || "").toUpperCase();
  const label = (node.label || "").toLowerCase();
  const protection = (node.protection || "").toLowerCase();
  
  return (
    desig.startsWith("WS") ||
    (label.includes("przelacznik") && label.includes("siec")) ||
    (label.includes("przełącznik") && label.includes("sieć")) ||
    (protection.includes("przelacznik") && protection.includes("siec")) ||
    (protection.includes("przełącznik") && protection.includes("sieć"))
  );
}

function drawMainSwitch(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, node: SchematicNode): void {
  if (isNetworkSwitchNode(node)) {
    symNetworkSwitch(ctx, cx, cy, color);
  } else {
    symFr(ctx, cx, cy, color);
  }
}

function symNetworkSwitch(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const x = sx(cx);
  const yy = sy(cy);
  
  // Left top line
  strokeLine(ctx, x(130), yy(SYMBOL_TOP_LINE_START), x(130), yy(120), color, 0.85);
  // Right top line
  strokeLine(ctx, x(170), yy(SYMBOL_TOP_LINE_START), x(170), yy(120), color, 0.85);
  
  // Left contact circle
  circle(ctx, x(130), yy(126), px(6), color, false);
  // Right contact circle
  circle(ctx, x(170), yy(126), px(6), color, false);
  
  // Bottom line
  strokeLine(ctx, x(150), yy(180), x(150), yy(SYMBOL_BOTTOM_LINE_END), color, 0.85);
  // Bottom hinge
  circle(ctx, x(150), yy(180), px(3), color, true);
  
  // Lever (tilted towards left contact)
  strokeLine(ctx, x(150), yy(180), x(135), yy(132), color, 0.85);
  
  // Labels
  ctx.save();
  ctx.fillStyle = COLORS.textDim;
  ctx.font = "700 7px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";
  
  // Left label "SIEĆ"
  ctx.textAlign = "right";
  ctx.fillText("SIEĆ", x(118), yy(75));
  
  // Right label "AGREGAT"
  ctx.textAlign = "left";
  ctx.fillText("AGREGAT", x(182), yy(75));
  
  ctx.restore();
}

function symFr(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const x = sx(cx);
  const yy = sy(cy);
  const symbolY = (value: number) => yy(value) + FR_SYMBOL_Y_OFFSET;
  drawP(ctx, color, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), symbolY(120), x(144), symbolY(119), x(156), symbolY(119), x(150), symbolY(180), x(125), symbolY(125), x(150), symbolY(180), x(150), yy(SYMBOL_BOTTOM_LINE_END));
  circle(ctx, x(150), symbolY(126), px(6), color, false);
  circle(ctx, x(150), symbolY(180), px(3), color, true);
}

function symMcb(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, color, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), yy(120), x(144), yy(120), x(156), yy(120), x(150), yy(180), x(125), yy(125), x(144), yy(102), x(156), yy(114), x(144), yy(114), x(156), yy(102), x(150), yy(180), x(150), yy(SYMBOL_BOTTOM_LINE_END));
  circle(ctx, x(150), yy(180), px(3), color, true);
}

function symRcd(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, COLORS.rcd, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), yy(120), x(150), yy(180), x(125), yy(120), x(150), yy(180), x(150), yy(SYMBOL_BOTTOM_LINE_END));
  ctx.strokeStyle = COLORS.rcd;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.ellipse(x(150), yy(230), px(25), py(12), 0, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, x(150), yy(120), px(3), COLORS.rcd, true);
  circle(ctx, x(150), yy(180), px(3), COLORS.rcd, true);

  ctx.save();
  ctx.setLineDash([2, 2]);
  drawP(ctx, COLORS.rcd, 0.55, x(125), yy(230), x(100), yy(230), x(100), yy(230), x(100), yy(150), x(100), yy(150), x(135), yy(150));
  ctx.restore();
}

function symSpd(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, COLORS.spd, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), yy(130), x(150), yy(130), x(150), yy(155), x(143), yy(148), x(150), yy(155), x(150), yy(155), x(157), yy(148), x(150), yy(190), x(150), yy(165), x(143), yy(172), x(150), yy(165), x(150), yy(165), x(157), yy(172), x(150), yy(190), x(150), yy(250), x(125), yy(250), x(175), yy(250), x(135), yy(260), x(165), yy(260), x(145), yy(270), x(155), yy(270));
  ctx.strokeStyle = COLORS.spd;
  ctx.lineWidth = 0.85;
  ctx.strokeRect(x(130), yy(130), px(40), py(60));
  circle(ctx, x(150), yy(60), px(3), COLORS.spd, true);
}

function symKf(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, COLORS.kf, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), yy(130), x(144), yy(154), x(156), yy(166), x(144), yy(166), x(156), yy(154), x(150), yy(190), x(150), yy(SYMBOL_BOTTOM_LINE_END));
  ctx.strokeStyle = COLORS.kf;
  ctx.lineWidth = 0.85;
  ctx.strokeRect(x(130), yy(130), px(40), py(60));
  circle(ctx, x(150), yy(160), px(8), COLORS.kf, false);
  circle(ctx, x(150), yy(60), px(3), COLORS.kf, true);
  circle(ctx, x(150), yy(250), px(3), COLORS.kf, true);
  text(ctx, "N", x(165), yy(350), 5, COLORS.kf, true);
}

function phaseMarks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  count: number,
  phaseText?: string,
  _hasNeutral = false,
  textOffsetX = 8,
): void {
  const totalMarks = Math.min(3, Math.max(1, count));
  const markHeight = 4;
  const gap = 2.5;
  const offset = -((totalMarks - 1) * gap) / 2;

  for (let index = 0; index < totalMarks; index++) {
    const delta = offset + index * gap;
    strokeLine(ctx, cx - markHeight + delta, cy + markHeight, cx + markHeight + delta, cy - markHeight, COLORS.text, 1.15);
  }

  if (_hasNeutral && phaseText && phaseText !== "PENDING" && phaseText !== "pending" && phaseText !== "3P") {
    if (textOffsetX < 0) {
      textRight(ctx, phaseText, cx + textOffsetX, cy + 2, 6, COLORS.textDim);
    } else {
      text(ctx, phaseText, cx + textOffsetX, cy - 1, 6, COLORS.textDim);
    }
  }
}

function drawP(ctx: CanvasRenderingContext2D, color: string, width: number, ...points: number[]): void {
  for (let index = 0; index < points.length; index += 4) {
    strokeLine(ctx, points[index], points[index + 1], points[index + 2], points[index + 3], color, width);
  }
}

function symbolTopY(nodeY: number): number {
  return nodeY + py(SYMBOL_TOP_LINE_START);
}

function symbolBottomY(nodeY: number): number {
  return nodeY + py(SYMBOL_BOTTOM_LINE_END);
}

function wireDot(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number): void {
  drawDot(ctx, x, y1, COLORS.wire, 2.2);
  drawWireLine(ctx, x, y1, y2, COLORS.wire, 1.5);
}

function drawWireLine(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, color: string, width: number): void {
  strokeLine(ctx, x, y1, x, y2, color, width);
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, dotY: number, color: string, radius: number): void {
  circle(ctx, x, dotY, radius, color, true);
}

function circle(ctx: CanvasRenderingContext2D, x: number, circleY: number, radius: number, color: string, fill: boolean): void {
  ctx.beginPath();
  ctx.arc(x, circleY, radius, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.85;
    ctx.stroke();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke: boolean,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) {
    ctx.fill();
  }

  if (stroke) {
    ctx.stroke();
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, node: SchematicNode): void {
  ctx.save();
  ctx.strokeStyle = COLORS.selected;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(node.x - 6, node.y + SCHEMATIC_BODY_Y_OFFSET - 6, MODULE_WIDTH + 12, MODULE_HEIGHT + 12);
  ctx.restore();
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  textY: number,
  size: number,
  color: string,
  bold = false,
  maxWidth?: number,
): void {
  if (!value) {
    return;
  }

  ctx.font = `${bold ? "700 " : ""}${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const lines = value.split("\n");
  lines.forEach((line, index) => {
    const printable = maxWidth ? truncateToWidth(ctx, line, maxWidth) : line;
    ctx.fillText(printable, x, textY + size + index * (size + 1.5));
  });
}

function textRight(
  ctx: CanvasRenderingContext2D,
  value: string,
  rightX: number,
  centerY: number,
  size: number,
  color: string,
  bold = false,
  maxWidth = 88,
): void {
  if (!value) {
    return;
  }

  ctx.font = `${bold ? "700 " : ""}${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const lines = value.split("\n").map((line) => truncateToWidth(ctx, line, maxWidth));
  const lineGap = 1.5;
  const totalHeight = lines.length * size + (lines.length - 1) * lineGap;
  const firstY = centerY - totalHeight / 2 + size / 2;
  lines.forEach((line, index) => ctx.fillText(line, rightX, firstY + index * (size + lineGap)));
}

function textCentered(
  ctx: CanvasRenderingContext2D,
  value: string,
  centerX: number,
  topY: number,
  size: number,
  color: string,
  bold = false,
): void {
  if (!value) {
    return;
  }

  ctx.font = `${bold ? "700 " : ""}${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, centerX, topY + size);
}

function textCenteredBox(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  boxY: number,
  width: number,
  size: number,
  color: string,
): void {
  if (!value) {
    return;
  }

  const lines = value.split("\n").map((line) => truncateToWidth(ctx, line, width - 4));
  const lineGap = 1.5;
  const totalHeight = lines.length * size + (lines.length - 1) * lineGap;
  const firstY = boxY + (ROW_HEIGHT - totalHeight) / 2 + size - size * 0.1;

  ctx.font = `${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  lines.forEach((line, index) => ctx.fillText(line, x + width / 2, firstY + index * (size + lineGap)));
}

function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const manualLines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const manualLine of manualLines) {
    const words = manualLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      continue;
    }

    let current = words[0];
    for (const word of words.slice(1)) {
      const test = `${current} ${word}`;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines.map((line) => truncateToWidth(ctx, line, maxWidth));
}

function truncateToWidth(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) {
    return value;
  }

  let next = value;
  while (next.length > 2 && ctx.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}...`;
}

function getRootNodes(nodes: SchematicNode[]): SchematicNode[] {
  const childIds = new Set(nodes.flatMap((node) => node.children.map((child) => child.id)));
  return nodes.filter((node) => !childIds.has(node.id));
}

function shouldReserveHeadSlot(node: SchematicNode): boolean {
  return node.nodeType === "MainBreaker" && node.children.length > 0;
}

function getHeadCellWidth(node: SchematicNode): number {
  const childWidth = node.children.reduce((sum, child) => sum + child.cellWidth, 0);
  const headWidth = node.cellWidth - childWidth;
  return headWidth > 0 ? headWidth : node.cellWidth;
}

function supplyLabel(phaseCount: number): string {
  return phaseCount >= 3 ? "3~ 400V" : "1~ 230V";
}

function phaseColorFor(phase: string): string {
  if (phase === "L2") return COLORS.l2;
  if (phase === "L3") return COLORS.l3;
  return COLORS.l1;
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  page: PageInfo,
  pageDevices: SchematicNode[],
): void {
  const types = new Set<string>();
  for (const d of pageDevices) {
    types.add(d.nodeType);
    if (d.children && d.children.length > 0) {
      for (const ch of d.children) {
        types.add(ch.nodeType);
      }
    }
  }

  const items: Array<{ sym: string; desc: string; clr: string }> = [];
  if (types.has("MainBreaker")) {
    items.push({ sym: "FR", desc: "Wyłącznik główny", clr: COLORS.fr });
  }
  if (types.has("RCD")) {
    items.push({ sym: "RCD", desc: "Wyłącznik różnicowoprądowy", clr: COLORS.rcd });
  }
  if (types.has("MCB")) {
    items.push({ sym: "MCB", desc: "Wyłącznik nadprądowy", clr: COLORS.wire });
  }
  if (types.has("SPD")) {
    items.push({ sym: "SPD", desc: "Ogranicznik przepięć", clr: COLORS.spd });
  }
  if (types.has("PhaseIndicator")) {
    items.push({ sym: "KF", desc: "Kontrolka fazy", clr: COLORS.kf });
  }

  if (items.length === 0) {
    return;
  }

  const legW = TITLEBLOCK_VISUAL_WIDTH;
  const legX = A4_WIDTH_PX - FRAME_MARGIN_RIGHT - legW;
  const tbBottom = (A4_HEIGHT_PX - FRAME_MARGIN_BOTTOM - TITLEBLOCK_HEIGHT) + page.yOffset;
  const rowHt = 17;
  const legH = items.length * rowHt + 20;
  const legY = tbBottom - legH - 6;

  ctx.fillStyle = COLORS.boxBg;
  ctx.fillRect(legX, legY, legW, legH);

  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(legX, legY, legW, legH);

  text(ctx, "LEGENDA", legX + 8, legY + 3, 6.2, COLORS.textLabel, true);

  for (let i = 0; i < items.length; i++) {
    const { sym, desc, clr } = items[i];
    const ry = legY + 16 + i * rowHt;

    ctx.fillStyle = clr;
    ctx.beginPath();
    ctx.arc(legX + 10, ry + 5, 3, 0, 2 * Math.PI);
    ctx.fill();

    text(ctx, sym, legX + 18, ry - 1, 6, COLORS.text, true);
    text(ctx, desc, legX + 48, ry - 1, 6, COLORS.textDim, false, legW - 56);
  }
}

function y(page: PageInfo, relativeY: number): number {
  return page.yOffset + DRAW_TOP + relativeY;
}

function px(value: number): number {
  return (value / 300) * MODULE_WIDTH;
}

function py(value: number): number {
  return (value / 350) * MODULE_HEIGHT;
}

function sx(cx: number): (value: number) => number {
  return (value: number) => cx - MODULE_WIDTH / 2 + px(value);
}

function sy(cy: number): (value: number) => number {
  return (value: number) => cy - MODULE_HEIGHT / 2 + py(value);
}
