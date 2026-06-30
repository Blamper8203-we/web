import type { PageInfo, SchematicNode } from "../schematicLayout";
import {
  A4_WIDTH_PX,
  DRAW_LEFT,
  FRAME_MARGIN_RIGHT,
  MODULE_WIDTH,
  ROW_HEIGHT,
  TITLEBLOCK_VISUAL_WIDTH,
  Y_ROW_DESIGNATION,
  Y_TABLE_END,
} from "../schematicLayout";
import { COLORS, strokeLine, text, truncateToWidth, wrapText, y } from "./schematicRenderUtils";

const Y_ROW_CIRCUIT = Y_ROW_DESIGNATION + ROW_HEIGHT;
const Y_ROW_LOCATION = Y_ROW_DESIGNATION + ROW_HEIGHT * 2;
const Y_ROW_CABLE = Y_ROW_DESIGNATION + ROW_HEIGHT * 3;
const Y_ROW_CABLE_TYPE = Y_ROW_DESIGNATION + ROW_HEIGHT * 4;
const Y_ROW_CABLE_SPEC = Y_ROW_DESIGNATION + ROW_HEIGHT * 5;
const Y_ROW_CABLE_LENGTH = Y_ROW_DESIGNATION + ROW_HEIGHT * 6;
const Y_ROW_POWER = Y_ROW_DESIGNATION + ROW_HEIGHT * 7;
const Y_ROW_SEPARATOR = Y_ROW_CABLE;
const EMPTY_SCHEMATIC_TABLE_VALUE = "Brak";
const CELL_FONT_SIZE = 9;

export function drawCircuitTable(ctx: CanvasRenderingContext2D, page: PageInfo, rootNodes: SchematicNode[]): void {
  const nodes = rootNodes
    .filter((node) => node.pageIndex === page.pageIndex)
    .flatMap((node) => displayTableNodes(node));

  if (nodes.length === 0) {
    return;
  }

  const tableLeft = DRAW_LEFT;
  const tableTop = y(page, Y_ROW_DESIGNATION);
  const tableBottom = y(page, Y_TABLE_END);
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
    if (lineY <= bottomY) {
      strokeLine(ctx, leftX, lineY, rightX, lineY, COLORS.grid, 1);
    }
  }

  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const cellLeft = Math.round(column.x);
    if (cellLeft > headerRx + 1) {
      strokeLine(ctx, cellLeft, topY, cellLeft, bottomY, COLORS.grid, 1);
    }
    if (i === columns.length - 1) {
      const cellRight = Math.round(column.x + column.width);
      if (cellRight < rightX - 1) {
        strokeLine(ctx, cellRight, topY, cellRight, bottomY, COLORS.grid, 1);
      }
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
    const distToNext = index < nodes.length - 1 ? centers[index + 1] - center : 60;
    const distToPrev = index > 0 ? center - centers[index - 1] : distToNext;

    const x = index === 0
      ? Math.max(startX, center - distToPrev / 2)
      : (centers[index - 1] + center) / 2;
      
    const nextX = index === nodes.length - 1
      ? Math.min(rightX, center + distToNext / 2)
      : (center + centers[index + 1]) / 2;
      
    const width = Math.max(0, nextX - x);
    const wrapWidth = Math.max(36, Math.min(width, 2 * Math.min(center - x, nextX - center)));

    return { node, width, x, centerX: center, wrapWidth };
  });
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

export function displayNodes(device: SchematicNode): SchematicNode[] {
  if (shouldReserveHeadSlot(device)) {
    return [{ ...device, cellWidth: getHeadCellWidth(device), children: [] }, ...device.children];
  }

  if (device.children.length > 0) {
    return device.children;
  }

  return [device];
}

function shouldReserveHeadSlot(node: SchematicNode): boolean {
  return node.nodeType === "MainBreaker" && node.children.length > 0;
}

function getHeadCellWidth(node: SchematicNode): number {
  const childWidth = node.children.reduce((sum, child) => sum + child.cellWidth, 0);
  const headWidth = node.cellWidth - childWidth;
  return headWidth > 0 ? headWidth : node.cellWidth;
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
  // WHY: wrapText i truncateToWidth w schematicRenderUtils (linia 151+).
  // Wczesniej tu byly inline kopie (inlineWrapText/inlineTruncateToWidth) —
  // identyczne cialo, 2 martwe funkcje usuniete w PR-3.4. Brak cyklu
  // importow: schematicRenderUtils jest leafem (nie importuje z table/page).
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

