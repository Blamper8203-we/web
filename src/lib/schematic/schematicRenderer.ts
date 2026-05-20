import type { PageInfo, SchematicLayout, SchematicNode } from "./schematicLayout";
import type { ProjectMetadata } from "../../types/projectMetadata";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  CELL_FONT_SIZE,
  DRAW_LEFT,
  DRAW_RIGHT,
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
  TITLEBLOCK_WIDTH,
  Y_GROUP_BUS,
  Y_LABEL_TOP,
  Y_MAIN_BUS,
  Y_N,
  Y_PE,
  Y_ROW_CABLE,
  Y_ROW_CABLE_LENGTH,
  Y_ROW_CABLE_SPEC,
  Y_ROW_CABLE_TYPE,
  Y_ROW_CIRCUIT,
  Y_ROW_DESIGNATION,
  Y_ROW_LOCATION,
  Y_ROW_POWER,
  Y_ROW_PROTECTION,
  Y_ROW_SEPARATOR,
  Y_SUPPLY,
  Y_TABLE_END,
  Y_WIRE_END,
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
  fr: "#783cdc",
  spd: "#d28200",
  rcd: "#8c32d2",
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

  drawMainBus(ctx, page);
  drawPathNumbers(ctx, pageDevices, page);

  for (const device of pageDevices) {
    drawDevice(ctx, device, page);
  }

  drawNpe(ctx, page);
  drawCableLabels(ctx, page, pageDevices);

  if (page.pageIndex < layout.pages.length - 1) {
    drawContinuation(ctx, page, page.pageIndex + 2, true);
  }
  if (page.pageIndex > 0) {
    drawContinuation(ctx, page, page.pageIndex, false);
  }

  drawLegend(ctx, page, pageDevices);
}

function drawMainBus(ctx: CanvasRenderingContext2D, page: PageInfo): void {
  strokeLine(ctx, page.busX1, y(page, Y_MAIN_BUS), page.busX2, y(page, Y_MAIN_BUS), COLORS.bus, 3.5);
}

function drawNpe(ctx: CanvasRenderingContext2D, page: PageInfo): void {
  strokeLine(ctx, page.busX1, y(page, Y_N), page.busX2, y(page, Y_N), COLORS.n, 1.4);
  text(ctx, "N", page.busX1 - 16, y(page, Y_N) - 4, 9, COLORS.n, true);

  ctx.save();
  ctx.setLineDash([6, 3]);
  strokeLine(ctx, page.busX1, y(page, Y_PE), page.busX2, y(page, Y_PE), COLORS.pe, 1.4);
  ctx.restore();
  text(ctx, "PE", page.busX1 - 22, y(page, Y_PE) - 4, 9, COLORS.pe, true);
}

function drawDevice(ctx: CanvasRenderingContext2D, node: SchematicNode, page: PageInfo): void {
  const cx = node.x + MODULE_WIDTH / 2;
  const mainBusY = y(page, Y_MAIN_BUS);

  switch (node.nodeType) {
    case "MainBreaker":
      if (node.children.length > 0) {
        drawGroupedMainBreaker(ctx, node, page);
        return;
      }

      drawWireLine(ctx, cx, y(page, Y_SUPPLY), node.y, COLORS.fr, 1.8);
      phaseMarks(ctx, cx, y(page, Y_SUPPLY) + (node.y - y(page, Y_SUPPLY)) / 2, node.phaseCount, node.phase, true);
      text(ctx, supplyLabel(node.phaseCount), cx - 38, y(page, Y_SUPPLY) + (node.y - y(page, Y_SUPPLY)) / 2 - 2, 8, COLORS.textDim);
      symFr(ctx, cx, node.y + MODULE_HEIGHT / 2, COLORS.fr);
      text(ctx, node.designation, cx + 12, node.y + 25, 9, COLORS.textDes, true);
      drawWireLine(ctx, cx, node.y + MODULE_HEIGHT, mainBusY, COLORS.wire, 1.2);
      phaseMarks(ctx, cx, node.y + MODULE_HEIGHT + (mainBusY - (node.y + MODULE_HEIGHT)) / 2, node.phaseCount, node.phase, true);
      drawDot(ctx, cx, mainBusY, COLORS.wire, 2.5);
      return;

    case "PhaseIndicator":
      wireDot(ctx, cx, mainBusY, node.y);
      phaseMarks(ctx, cx, mainBusY + (node.y - mainBusY) / 2, node.phaseCount, node.phase);
      symKf(ctx, cx, node.y + MODULE_HEIGHT / 2);
      text(ctx, node.designation, cx + 12, node.y + 25, 8.5, COLORS.textDes, true);
      textRight(ctx, node.protection, cx - 12, node.y + MODULE_HEIGHT / 2 + 5, 7.5, COLORS.textDim);
      return;

    case "SPD":
      wireDot(ctx, cx, mainBusY, node.y);
      phaseMarks(ctx, cx, mainBusY + (node.y - mainBusY) / 2, node.phaseCount, node.phase, true);
      symSpd(ctx, cx, node.y + MODULE_HEIGHT / 2);
      text(ctx, node.designation, cx + 12, node.y + 25, 8.5, COLORS.textDes, true);
      symGround(ctx, cx, node.y + MODULE_HEIGHT + 3);
      textCenteredBox(ctx, node.protection, cx - 35, node.y + MODULE_HEIGHT + 24, 70, 7, COLORS.textDim);
      return;

    case "RCD":
      drawRcd(ctx, node, page);
      return;

    case "MCB":
      wireDot(ctx, cx, mainBusY, node.y);
      phaseMarks(ctx, cx, mainBusY + (node.y - mainBusY) / 2, node.phaseCount, node.phase);
      drawMcb(ctx, node, node.y, page);
      return;

    case "Other":
      return;
  }
}

function drawGroupedMainBreaker(ctx: CanvasRenderingContext2D, breaker: SchematicNode, page: PageInfo): void {
  const cx = breaker.x + MODULE_WIDTH / 2;
  const supplyY = y(page, Y_SUPPLY);

  drawWireLine(ctx, cx, supplyY, breaker.y, COLORS.fr, 1.8);
  phaseMarks(ctx, cx, supplyY + (breaker.y - supplyY) / 2, breaker.phaseCount, breaker.phase, true);
  text(ctx, supplyLabel(breaker.phaseCount), cx - 38, supplyY + (breaker.y - supplyY) / 2 - 2, 8, COLORS.textDim);
  symFr(ctx, cx, breaker.y + MODULE_HEIGHT / 2, COLORS.fr);
  text(ctx, breaker.designation, cx + 12, breaker.y + 25, 9, COLORS.textDes, true);
  textRight(ctx, breaker.protection, cx - 18, breaker.y + MODULE_HEIGHT / 2 + 5, 7.5, COLORS.textDim);

  if (breaker.children.length === 0) {
    return;
  }

  const hasDistributionBlock = breaker.distributionBlockLabel.trim().length > 0;
  const useMainBusAsDistribution = breaker.phaseCount === 1;
  const mainBusY = y(page, Y_MAIN_BUS);
  const groupY = useMainBusAsDistribution
    ? mainBusY
    : hasDistributionBlock
      ? y(page, Y_GROUP_BUS + 22)
      : y(page, Y_GROUP_BUS);
  const firstX = breaker.children[0].x + MODULE_WIDTH / 2;
  const lastX = breaker.children[breaker.children.length - 1].x + MODULE_WIDTH / 2;

  if (useMainBusAsDistribution) {
    drawWireLine(ctx, cx, breaker.y + MODULE_HEIGHT, mainBusY, COLORS.wire, 1.2);
    phaseMarks(ctx, cx, breaker.y + MODULE_HEIGHT + (mainBusY - (breaker.y + MODULE_HEIGHT)) / 2, breaker.phaseCount, breaker.phase);
    drawDot(ctx, cx, mainBusY, COLORS.wire, 2.5);
    drawDistributionBlockLabel(ctx, breaker.distributionBlockLabel, firstX - MODULE_WIDTH / 2 + 4, mainBusY - 10);
  } else if (hasDistributionBlock) {
    const blockWidth = 52;
    const blockHeight = 18;
    const blockTop = groupY - blockHeight - 18;
    const blockLeft = cx - blockWidth / 2;

    drawWireLine(ctx, cx, breaker.y + MODULE_HEIGHT, blockTop, COLORS.wire, 1.2);
    phaseMarks(ctx, cx, breaker.y + MODULE_HEIGHT + (blockTop - (breaker.y + MODULE_HEIGHT)) / 2, breaker.phaseCount, breaker.phase);
    drawDistributionBlock(ctx, breaker.distributionBlockLabel, blockLeft, blockTop, blockWidth, blockHeight);
    wireDot(ctx, cx, blockTop + blockHeight, groupY);
  } else {
    wireDot(ctx, cx, breaker.y + MODULE_HEIGHT, groupY);
    phaseMarks(ctx, cx, breaker.y + MODULE_HEIGHT + (groupY - (breaker.y + MODULE_HEIGHT)) / 2, breaker.phaseCount, breaker.phase);
  }

  if (!useMainBusAsDistribution) {
    strokeLine(ctx, firstX - 8, groupY, lastX + 8, groupY, COLORS.wire, 2.2);
  }

  for (const child of breaker.children) {
    drawChildFromGroupBus(ctx, child, page, groupY);
  }
}

function drawRcd(ctx: CanvasRenderingContext2D, rcd: SchematicNode, page: PageInfo): void {
  const cx = rcd.x + MODULE_WIDTH / 2;
  const mainBusY = y(page, Y_MAIN_BUS);
  wireDot(ctx, cx, mainBusY, rcd.y);
  phaseMarks(ctx, cx, mainBusY + (rcd.y - mainBusY) / 2, rcd.phaseCount, rcd.phase, true);
  symRcd(ctx, cx, rcd.y + MODULE_HEIGHT / 2);
  text(ctx, rcd.designation, cx + 12, rcd.y + 25, 9, COLORS.textDes, true);
  textRight(ctx, rcd.protection, cx - 22, rcd.y + MODULE_HEIGHT / 2 + 5, 7.5, COLORS.rcd);

  if (rcd.children.length === 0) {
    return;
  }

  const groupY = y(page, Y_GROUP_BUS);
  const firstX = rcd.children[0].x + MODULE_WIDTH / 2;
  const lastX = rcd.children[rcd.children.length - 1].x + MODULE_WIDTH / 2;
  wireDot(ctx, cx, rcd.y + MODULE_HEIGHT, groupY);
  phaseMarks(ctx, cx, rcd.y + MODULE_HEIGHT + (groupY - (rcd.y + MODULE_HEIGHT)) / 2, rcd.phaseCount, rcd.phase, true);
  strokeLine(ctx, firstX - 8, groupY, lastX + 8, groupY, COLORS.wire, 2.2);

  for (const child of rcd.children) {
    drawChildFromGroupBus(ctx, child, page, groupY);
  }
}

function drawChildFromGroupBus(ctx: CanvasRenderingContext2D, child: SchematicNode, page: PageInfo, groupY: number): void {
  const childCx = child.x + MODULE_WIDTH / 2;
  wireDot(ctx, childCx, groupY, child.y);
  phaseMarks(
    ctx,
    childCx,
    groupY + (child.y - groupY) / 2,
    child.phaseCount,
    child.phase,
    child.nodeType === "SPD",
  );

  switch (child.nodeType) {
    case "MCB":
      drawMcb(ctx, child, child.y, page);
      return;
    case "SPD":
      symSpd(ctx, childCx, child.y + MODULE_HEIGHT / 2);
      text(ctx, child.designation, childCx + 12, child.y + 25, 8, COLORS.textDes, true);
      symGround(ctx, childCx, child.y + MODULE_HEIGHT + 3);
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

function drawMcb(ctx: CanvasRenderingContext2D, node: SchematicNode, nodeY: number, page: PageInfo): void {
  const phaseColor = phaseColorFor(node.phase);
  const cx = node.x + MODULE_WIDTH / 2;
  const cy = nodeY + MODULE_HEIGHT / 2;

  ctx.save();
  ctx.setLineDash([5, 5]);
  strokeLine(ctx, cx - MODULE_WIDTH / 2 - 4, cy, cx + MODULE_WIDTH / 2 + 4, cy, COLORS.grid, 0.4);
  ctx.restore();

  symMcb(ctx, cx, cy, phaseColor);
  text(ctx, node.designation, cx + 12, nodeY + 25, 8.5, COLORS.textDes, true);
  drawWireLine(ctx, cx, nodeY + MODULE_HEIGHT, y(page, Y_WIRE_END), COLORS.wire, 1.2);
  phaseMarks(ctx, cx, nodeY + MODULE_HEIGHT + (y(page, Y_WIRE_END) - (nodeY + MODULE_HEIGHT)) / 2, node.phaseCount, node.phase);
}

function drawCircuitTable(ctx: CanvasRenderingContext2D, page: PageInfo, rootNodes: SchematicNode[]): void {
  const nodes = rootNodes
    .filter((node) => node.pageIndex === page.pageIndex)
    .flatMap((node) => displayNodes(node));

  if (nodes.length === 0) {
    return;
  }

  const tableLeft = DRAW_LEFT;
  const tableTop = y(page, Y_ROW_DESIGNATION);
  const tableBottom = y(page, Y_TABLE_END);
  let tableRight = tableLeft;
  let firstDataLeft = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const cx = node.x + MODULE_WIDTH / 2;
    const cellLeft = cx - node.cellWidth / 2;
    const cellRight = cx + node.cellWidth / 2;
    firstDataLeft = Math.min(firstDataLeft, cellLeft);
    tableRight = Math.max(tableRight, cellRight);
  }

  const leftX = Math.round(tableLeft);
  const rightX = Math.round(tableRight);
  const topY = Math.round(tableTop);
  const bottomY = Math.round(tableBottom);
  const headerRx = Math.max(leftX, Math.min(rightX, Math.round(Math.min(tableLeft + 170, firstDataLeft))));

  ctx.fillStyle = COLORS.page;
  ctx.fillRect(leftX, topY, rightX - leftX, bottomY - topY);
  ctx.fillStyle = COLORS.tableHeader;
  ctx.fillRect(leftX, topY, headerRx - leftX, bottomY - topY);

  const rows: Array<[number, string]> = [
    [Y_ROW_DESIGNATION, "Oznaczenie"],
    [Y_ROW_PROTECTION, "Zabezp."],
    [Y_ROW_CIRCUIT, "Obwód"],
    [Y_ROW_LOCATION, "Lokalizacja"],
    [Y_ROW_CABLE, "Kabel"],
    [Y_ROW_CABLE_TYPE, "Typ kabla"],
    [Y_ROW_CABLE_SPEC, "Przekrój"],
    [Y_ROW_CABLE_LENGTH, "Długość"],
    [Y_ROW_POWER, "Moc"],
  ];

  for (const [rowY, label] of rows) {
    text(ctx, label, leftX + 12, y(page, rowY) + 5, 12.5, COLORS.tableMuted);
  }

  for (const node of nodes) {
    const cx = node.x + MODULE_WIDTH / 2;
    const cellLeft = cx - node.cellWidth / 2;
    const values = getTableValues(node);

    tableCell(ctx, values.designation, cellLeft, y(page, Y_ROW_DESIGNATION), node.cellWidth, COLORS.textDes, true);
    tableCell(ctx, values.protection, cellLeft, y(page, Y_ROW_PROTECTION), node.cellWidth, COLORS.text, true);
    tableCell(ctx, values.circuitName || "-", cellLeft, y(page, Y_ROW_CIRCUIT), node.cellWidth, COLORS.tableDim);
    tableCell(ctx, values.location || "-", cellLeft, y(page, Y_ROW_LOCATION), node.cellWidth, COLORS.tableDim);
    tableCell(ctx, values.cableDesig, cellLeft, y(page, Y_ROW_CABLE), node.cellWidth, cableDesignationColor(node), true);
    tableCell(ctx, values.cableType, cellLeft, y(page, Y_ROW_CABLE_TYPE), node.cellWidth, COLORS.tableDim);
    tableCell(ctx, values.cableSpec, cellLeft, y(page, Y_ROW_CABLE_SPEC), node.cellWidth, COLORS.text);
    tableCell(ctx, values.cableLength, cellLeft, y(page, Y_ROW_CABLE_LENGTH), node.cellWidth, COLORS.tableDim);
    tableCell(ctx, values.powerInfo, cellLeft, y(page, Y_ROW_POWER), node.cellWidth, COLORS.tableDim);
  }

  for (const [rowY] of rows) {
    const lineY = Math.round(y(page, rowY) + ROW_HEIGHT);
    if (lineY < bottomY) {
      strokeLine(ctx, leftX, lineY, rightX, lineY, COLORS.grid, 1);
    }
  }

  for (const node of nodes) {
    const cx = node.x + MODULE_WIDTH / 2;
    const cellLeft = Math.round(cx - node.cellWidth / 2);
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

function getProjectObjectName(metadata?: ProjectMetadata): string {
  if (metadata?.company?.trim()) {
    return metadata.company.trim();
  }
  return "Rozdzielnica";
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
  const drawNum = truncateText(metadata?.projectNumber ?? "E-SCH-001", 28);
  const scale = truncateText(getDrawingScale(metadata), 28);
  const date = truncateText(getDrawingDate(metadata), 28);
  const sheet = truncateText(getSheetLabel(metadata, page.pageIndex, totalPages), 28);
  const revision = truncateText(metadata?.revision ?? "Rev. 0", 60);
  const standards = truncateText(getStandardsText(metadata), 60);
  const designerSig = truncateText(getDesignerSignature(metadata), 30);
  const contractorSig = truncateText(getContractorSignature(metadata), 30);

  drawTitleCell(ctx, x, rowTops[0], width, rowHeights[0], "Nazwa projektu / inwestycja:", title, 5.2, 7.4);
  drawTitleCell(ctx, x, rowTops[1], width, rowHeights[1], "Inwestor:", investor, 5, 6.6);
  drawTitleCell(ctx, x, rowTops[2], width, rowHeights[2], "Adres obiektu:", address, 5, 6.6);
  drawTitleCell(ctx, x, rowTops[3], colW, rowHeights[3], "Wykonawca:", contractor, 4.8, 6.3);
  drawTitleCell(ctx, splitX, rowTops[3], colW, rowHeights[3], "Projektant:", `${designer}\n${designerLicense}`, 4.8, 6);
  drawTitleCell(ctx, x, rowTops[4], colW, rowHeights[4], "Nr rysunku:", drawNum, 4.8, 6.8);
  drawTitleCell(ctx, splitX, rowTops[4], colW, rowHeights[4], "Skala:", scale, 4.8, 6.8);
  drawTitleCell(ctx, x, rowTops[5], colW, rowHeights[5], "Data:", date, 4.8, 6.8);
  drawTitleCell(ctx, splitX, rowTops[5], colW, rowHeights[5], "Arkusz:", sheet, 4.8, 6.8);
  drawTitleCell(ctx, x, rowTops[6], width, rowHeights[6], "Rewizja / zmiana:", revision, 5, 6.6);
  drawTitleCell(ctx, x, rowTops[7], width, rowHeights[7], "Norma:", standards, 5, 6.6);
  drawTitleCell(ctx, x, rowTops[8], colW, rowHeights[8], "Podpis projektanta:", designerSig, 4.8, 6.2);
  drawTitleCell(ctx, splitX, rowTops[8], colW, rowHeights[8], "Podpis wykonawcy:", contractorSig, 4.8, 6.2);
}

function drawPathNumbers(ctx: CanvasRenderingContext2D, pageDevices: SchematicNode[], page: PageInfo): void {
  const display = pageDevices.flatMap((node) => displayNodes(node));
  display.forEach((node, index) => {
    const cx = node.x + MODULE_WIDTH / 2;
    const label = String(index + 1);
    const textWidth = ctx.measureText(label).width;
    const rectWidth = textWidth + 8;
    const rectHeight = 13;
    const rectX = cx - rectWidth / 2;
    const rectY = y(page, 10) - 1.5;

    ctx.fillStyle = COLORS.page;
    ctx.strokeStyle = COLORS.gridText;
    ctx.lineWidth = 0.6;
    roundRect(ctx, rectX, rectY, rectWidth, rectHeight, 2, true, true);

    ctx.save();
    ctx.strokeStyle = COLORS.gridText;
    ctx.lineWidth = 0.4;
    ctx.setLineDash([2, 2]);
    strokeLine(ctx, cx, y(page, 18), cx, y(page, Y_LABEL_TOP), COLORS.grid, 0.4);
    ctx.restore();

    textCentered(ctx, label, cx, y(page, 10), 9.5, COLORS.textDes, true);
  });
}

function drawCableLabels(ctx: CanvasRenderingContext2D, page: PageInfo, pageDevices: SchematicNode[]): void {
  const display = pageDevices.flatMap((node) => displayNodes(node));
  for (const node of display) {
    if (!node.cableDesig) {
      continue;
    }
    textCentered(ctx, node.cableDesig, node.x + MODULE_WIDTH / 2, y(page, Y_WIRE_END) + 11, 8, COLORS.textDim, true);
  }
}

function drawContinuation(ctx: CanvasRenderingContext2D, page: PageInfo, target: number, right: boolean): void {
  const busY = y(page, Y_MAIN_BUS);
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
  const values = {
    designation: node.designation,
    protection: node.protection,
    circuitName: node.circuitName,
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

function tableCell(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  cellY: number,
  width: number,
  color: string,
  bold = false,
): void {
  if (!value) {
    return;
  }

  const size = CELL_FONT_SIZE;
  ctx.font = `${bold ? "700 " : ""}${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const lines = wrapText(ctx, value, width - 4);
  const lineGap = 1;
  const totalHeight = lines.length * size + (lines.length - 1) * lineGap;
  const startY = cellY + (ROW_HEIGHT - totalHeight) / 2 + size - size * 0.1;

  lines.forEach((line, index) => {
    ctx.fillText(line, x + width / 2, startY + index * (size + lineGap));
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
  text(ctx, label, x + 4, cellY + 3, labelSize, COLORS.textLabel);
  text(ctx, value, x + 4, cellY + Math.max(9, labelSize + 6), valueSize, COLORS.text, true, width - 8);
}

function symFr(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, color, 0.85, x(150), yy(0), x(150), yy(120), x(144), yy(119), x(156), yy(119), x(150), yy(180), x(125), yy(125), x(150), yy(180), x(150), yy(350));
  circle(ctx, x(150), yy(126), px(6), color, false);
  circle(ctx, x(150), yy(180), px(3), color, true);
}

function symMcb(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, color, 0.85, x(150), yy(0), x(150), yy(120), x(144), yy(120), x(156), yy(120), x(150), yy(180), x(125), yy(125), x(144), yy(102), x(156), yy(114), x(144), yy(114), x(156), yy(102), x(150), yy(180), x(150), yy(350));
  circle(ctx, x(150), yy(180), px(3), color, true);
}

function symRcd(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, COLORS.rcd, 0.85, x(150), yy(0), x(150), yy(120), x(150), yy(180), x(125), yy(120), x(150), yy(180), x(150), yy(350));
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
  drawP(ctx, COLORS.spd, 0.85, x(150), yy(0), x(150), yy(130), x(150), yy(130), x(150), yy(155), x(143), yy(148), x(150), yy(155), x(150), yy(155), x(157), yy(148), x(150), yy(190), x(150), yy(165), x(143), yy(172), x(150), yy(165), x(150), yy(165), x(157), yy(172), x(150), yy(190), x(150), yy(250), x(125), yy(250), x(175), yy(250), x(135), yy(260), x(165), yy(260), x(145), yy(270), x(155), yy(270));
  ctx.strokeStyle = COLORS.spd;
  ctx.lineWidth = 0.85;
  ctx.strokeRect(x(130), yy(130), px(40), py(60));
  circle(ctx, x(150), yy(60), px(3), COLORS.spd, true);
}

function symKf(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, COLORS.kf, 0.85, x(150), yy(0), x(150), yy(130), x(144), yy(154), x(156), yy(166), x(144), yy(166), x(156), yy(154), x(150), yy(190), x(150), yy(350));
  ctx.strokeStyle = COLORS.kf;
  ctx.lineWidth = 0.85;
  ctx.strokeRect(x(130), yy(130), px(40), py(60));
  circle(ctx, x(150), yy(160), px(8), COLORS.kf, false);
  circle(ctx, x(150), yy(60), px(3), COLORS.kf, true);
  circle(ctx, x(150), yy(250), px(3), COLORS.kf, true);
  text(ctx, "N", x(165), yy(350), 5, COLORS.kf, true);
}

function symGround(ctx: CanvasRenderingContext2D, cx: number, startY: number): void {
  const groundY = startY + 5;
  const width = MODULE_WIDTH * 0.3;
  strokeLine(ctx, cx, startY, cx, groundY, COLORS.pe, 1.1);
  strokeLine(ctx, cx - width / 2, groundY, cx + width / 2, groundY, COLORS.pe, 1.35);
  strokeLine(ctx, cx - width / 3, groundY + 3, cx + width / 3, groundY + 3, COLORS.pe, 0.95);
  strokeLine(ctx, cx - width / 6, groundY + 6, cx + width / 6, groundY + 6, COLORS.pe, 0.65);
}

function phaseMarks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  count: number,
  phaseText?: string,
  _hasNeutral = false,
): void {
  const totalMarks = Math.min(3, Math.max(1, count));
  const markHeight = 4;
  const gap = 2.5;
  const offset = -((totalMarks - 1) * gap) / 2;

  for (let index = 0; index < totalMarks; index++) {
    const delta = offset + index * gap;
    strokeLine(ctx, cx - markHeight + delta, cy + markHeight, cx + markHeight + delta, cy - markHeight, COLORS.text, 1.15);
  }

  if (phaseText && phaseText !== "PENDING" && phaseText !== "pending" && phaseText !== "3P") {
    text(ctx, phaseText, cx + 8, cy - 1, 6, COLORS.textDim);
  }
}

function drawP(ctx: CanvasRenderingContext2D, color: string, width: number, ...points: number[]): void {
  for (let index = 0; index < points.length; index += 4) {
    strokeLine(ctx, points[index], points[index + 1], points[index + 2], points[index + 3], color, width);
  }
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
  ctx.strokeRect(node.x - 6, node.y - 6, MODULE_WIDTH + 12, MODULE_HEIGHT + 12);
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
): void {
  if (!value) {
    return;
  }

  ctx.font = `${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const lines = value.split("\n").map((line) => truncateToWidth(ctx, line, 88));
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

  const legX = DRAW_RIGHT;
  const legW = TITLEBLOCK_WIDTH;
  const tbBottom = (A4_HEIGHT_PX - FRAME_MARGIN_BOTTOM - TITLEBLOCK_HEIGHT) + page.yOffset;
  const legY = tbBottom - (items.length * 16 + 20);
  const rowHt = 16;
  const legH = items.length * rowHt + 18;

  ctx.fillStyle = COLORS.boxBg;
  ctx.fillRect(legX, legY, legW, legH);

  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(legX, legY, legW, legH);

  text(ctx, "LEGENDA", legX + 3, legY + 2, 5.5, COLORS.textLabel, true);

  for (let i = 0; i < items.length; i++) {
    const { sym, desc, clr } = items[i];
    const ry = legY + 14 + i * rowHt;

    ctx.fillStyle = clr;
    ctx.beginPath();
    ctx.arc(legX + 8, ry + 5, 3, 0, 2 * Math.PI);
    ctx.fill();

    text(ctx, sym, legX + 14, ry, 5.5, COLORS.text, true);
    text(ctx, desc, legX + 14, ry + 7, 4, COLORS.textDim);
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
