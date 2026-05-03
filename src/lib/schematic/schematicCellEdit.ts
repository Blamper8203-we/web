import { createDefaultSymbolItem, type SymbolItem } from "../../types/symbolItem";
import type { SchematicLayout, SchematicNode } from "./schematicLayout";
import {
  DRAW_TOP,
  MODULE_WIDTH,
  ROW_HEIGHT,
  Y_ROW_CABLE,
  Y_ROW_CABLE_LENGTH,
  Y_ROW_CABLE_SPEC,
  Y_ROW_CABLE_TYPE,
  Y_ROW_CIRCUIT,
  Y_ROW_DESIGNATION,
  Y_ROW_LOCATION,
  Y_ROW_POWER,
  Y_ROW_PROTECTION,
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

const EDITABLE_ROWS: Array<{ yOffset: number; field: SchematicEditableField }> = [
  { yOffset: Y_ROW_DESIGNATION, field: "Designation" },
  { yOffset: Y_ROW_PROTECTION, field: "Protection" },
  { yOffset: Y_ROW_CIRCUIT, field: "CircuitName" },
  { yOffset: Y_ROW_LOCATION, field: "Location" },
  { yOffset: Y_ROW_CABLE, field: "CableDesig" },
  { yOffset: Y_ROW_CABLE_TYPE, field: "CableType" },
  { yOffset: Y_ROW_CABLE_SPEC, field: "CableSpec" },
  { yOffset: Y_ROW_CABLE_LENGTH, field: "CableLength" },
  { yOffset: Y_ROW_POWER, field: "PowerInfo" },
];

export function findSchematicCellAt(
  layout: SchematicLayout,
  worldX: number,
  worldY: number,
): SchematicCellHit | null {
  for (const node of getEditableDisplayNodes(layout)) {
    const page = layout.pages.find((item) => item.pageIndex === node.pageIndex);
    if (!page) {
      continue;
    }

    const cellWidth = node.cellWidth - 6;
    const centerX = node.x + MODULE_WIDTH / 2;
    const cellLeft = centerX - cellWidth / 2;

    for (const row of EDITABLE_ROWS) {
      const cellTop = page.yOffset + DRAW_TOP + row.yOffset - 1;
      const rect = {
        x: cellLeft,
        y: cellTop,
        width: cellWidth,
        height: ROW_HEIGHT,
      };

      if (
        worldX >= rect.x &&
        worldX <= rect.x + rect.width &&
        worldY >= rect.y &&
        worldY <= rect.y + rect.height
      ) {
        return { node, field: row.field, rect };
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
  return getRootNodes(layout.nodes).flatMap((node) => (node.children.length > 0 ? node.children : [node]));
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
