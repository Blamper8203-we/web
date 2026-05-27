import { createDefaultSymbolItem, type SymbolItem } from "../../types/symbolItem";
import type { SchematicLayout, SchematicNode } from "./schematicLayout";
import {
  A4_WIDTH_PX,
  DRAW_TOP,
  DRAW_LEFT,
  FRAME_MARGIN_RIGHT,
  MODULE_WIDTH,
  ROW_HEIGHT,
  TITLEBLOCK_VISUAL_WIDTH,
  Y_ROW_DESIGNATION,
} from "./schematicLayout";

export type SchematicEditableField =
  | "Designation"
  | "Protection"
  | "CircuitName"
  | "Location"
  | "CableDesig"
  | "CableType"
  | "CableSpec"
  | "CableLength"
  | "PowerInfo";

export interface SchematicCellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SchematicCellHit {
  node: SchematicNode;
  field: SchematicEditableField;
  rect: SchematicCellRect;
}

const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";
const TABLE_ROW_CIRCUIT = Y_ROW_DESIGNATION + ROW_HEIGHT;
const TABLE_ROW_LOCATION = Y_ROW_DESIGNATION + ROW_HEIGHT * 2;
const TABLE_ROW_CABLE = Y_ROW_DESIGNATION + ROW_HEIGHT * 3;
const TABLE_ROW_CABLE_TYPE = Y_ROW_DESIGNATION + ROW_HEIGHT * 4;
const TABLE_ROW_CABLE_SPEC = Y_ROW_DESIGNATION + ROW_HEIGHT * 5;
const TABLE_ROW_CABLE_LENGTH = Y_ROW_DESIGNATION + ROW_HEIGHT * 6;
const TABLE_ROW_POWER = Y_ROW_DESIGNATION + ROW_HEIGHT * 7;

const EDITABLE_ROWS: Array<{ yOffset: number; field: SchematicEditableField }> = [
  { yOffset: Y_ROW_DESIGNATION, field: "Designation" },
  { yOffset: TABLE_ROW_CIRCUIT, field: "CircuitName" },
  { yOffset: TABLE_ROW_LOCATION, field: "Location" },
  { yOffset: TABLE_ROW_CABLE, field: "CableDesig" },
  { yOffset: TABLE_ROW_CABLE_TYPE, field: "CableType" },
  { yOffset: TABLE_ROW_CABLE_SPEC, field: "CableSpec" },
  { yOffset: TABLE_ROW_CABLE_LENGTH, field: "CableLength" },
  { yOffset: TABLE_ROW_POWER, field: "PowerInfo" },
];

export function findSchematicCellAt(
  layout: SchematicLayout,
  worldX: number,
  worldY: number,
): SchematicCellHit | null {
  const editableNodes = getEditableDisplayNodes(layout);

  for (const page of layout.pages) {
    const pageNodes = editableNodes.filter((node) => node.pageIndex === page.pageIndex);
    if (pageNodes.length === 0) {
      continue;
    }

    const rightX = Math.round(A4_WIDTH_PX - FRAME_MARGIN_RIGHT - TITLEBLOCK_VISUAL_WIDTH - 22);
    const headerRx = Math.min(DRAW_LEFT + 150, rightX - 60);
    const columns = buildTableColumns(pageNodes, headerRx, rightX);

    for (const column of columns) {
      for (const row of EDITABLE_ROWS) {
        const cellTop = page.yOffset + DRAW_TOP + row.yOffset;
        const rect = {
          x: column.x,
          y: cellTop,
          width: column.width,
          height: ROW_HEIGHT,
        };

        if (
          worldX >= rect.x &&
          worldX <= rect.x + rect.width &&
          worldY >= rect.y &&
          worldY <= rect.y + rect.height
        ) {
          return { node: column.node, field: row.field, rect };
        }
      }
    }
  }

  return null;
}

export function getSchematicCellValue(
  symbol: SymbolItem | null | undefined,
  node: SchematicNode,
  field: SchematicEditableField,
): string {
  switch (field) {
    case "Designation":
      return symbol?.referenceDesignation ?? node.designation;
    case "Protection":
      return symbol?.protectionType || node.protection;
    case "CircuitName":
      return symbol?.circuitName ?? node.circuitName;
    case "Location":
      return symbol?.location ?? node.location;
    case "CableDesig":
      return node.cableDesig;
    case "CableType":
      return node.cableType;
    case "CableSpec":
      return node.cableSpec;
    case "CableLength":
      return node.cableLength;
    case "PowerInfo":
      return node.powerInfo;
  }
}

export function applySchematicCellEditValue(
  symbol: SymbolItem,
  field: SchematicEditableField,
  rawValue: string,
): SymbolItem {
  const next = createDefaultSymbolItem({
    ...symbol,
    parameters: { ...symbol.parameters },
  });
  const value = field === "Designation" ? rawValue.trim() : rawValue;

  switch (field) {
    case "Designation":
      next.referenceDesignation = value;
      if (value.length > 0) {
        next.parameters[MANUAL_REFERENCE_DESIGNATION_KEY] = "true";
      } else {
        delete next.parameters[MANUAL_REFERENCE_DESIGNATION_KEY];
      }
      break;
    case "Protection":
      next.protectionType = value;
      break;
    case "CircuitName":
      next.circuitName = value;
      break;
    case "Location":
      next.location = value;
      break;
    case "CableDesig":
    case "CableType":
    case "CableSpec":
    case "CableLength":
    case "PowerInfo":
      next.parameters[field] = value;
      break;
  }

  syncSymbolParameters(next);
  return createDefaultSymbolItem(next);
}

function getEditableDisplayNodes(layout: SchematicLayout): SchematicNode[] {
  return getRootNodes(layout.nodes).flatMap((node) => {
    if (node.nodeType === "RCD") {
      return node.children;
    }

    if (shouldReserveHeadSlot(node)) {
      return [{ ...node, cellWidth: getHeadCellWidth(node), children: [] }, ...node.children]
        .filter((item) => item.nodeType !== "RCD");
    }

    return node.children.length > 0 ? node.children : [node];
  }).filter((node) => node.nodeType !== "RCD");
}

interface TableColumn {
  node: SchematicNode;
  width: number;
  x: number;
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

    return { node, width, x };
  });
}


function estimateTableWidth(node: SchematicNode): number {
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

function shouldReserveHeadSlot(node: SchematicNode): boolean {
  return node.nodeType === "MainBreaker" && node.children.length > 0;
}

function getHeadCellWidth(node: SchematicNode): number {
  const childWidth = node.children.reduce((sum, child) => sum + child.cellWidth, 0);
  const headWidth = node.cellWidth - childWidth;
  return headWidth > 0 ? headWidth : estimateTableWidth(node);
}

function getRootNodes(nodes: SchematicNode[]): SchematicNode[] {
  const childIds = new Set(nodes.flatMap((node) => node.children.map((child) => child.id)));
  return nodes.filter((node) => !childIds.has(node.id));
}

function syncSymbolParameters(symbol: SymbolItem): void {
  const moduleType = symbol.deviceKind;
  const label =
    moduleType === "fr"
      ? symbol.frType || symbol.label
      : moduleType === "phaseIndicator"
        ? symbol.phaseIndicatorModel || symbol.label
        : symbol.protectionType || symbol.label;

  symbol.parameters.LABEL = label;
  symbol.parameters.CURRENT =
    moduleType === "rcd" || symbol.type.toLocaleLowerCase("pl-PL").includes("rcd")
      ? `${symbol.rcdRatedCurrent}A`
      : symbol.protectionType || "";
  symbol.parameters.POWER = String(symbol.powerW);
}
