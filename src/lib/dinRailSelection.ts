import type { SymbolItem } from "../types/symbolItem";

export const DIN_RAIL_GROUP_FRAME_PADDING = 8;
export const DIN_RAIL_GROUP_BRACKET_OFFSET_Y = 40;
export const DIN_RAIL_GROUP_BRACKET_BAR_HEIGHT = 2;
export const DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT = 22;
export const DIN_RAIL_GROUP_BRACKET_LABEL_GAP = 6;

export interface DinRailGroupFrameData {
  anchorSymbolId: string;
  distributionCount: number;
  headReference: string;
  id: string;
  label: string;
  memberCount: number;
  rcdCount: number;
  symbolIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionBoundsData {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface SelectionRectLike {
  height: number;
  width: number;
  x: number;
  y: number;
}

function buildFrameFromSymbols(
  groupId: string,
  groupSymbols: SymbolItem[],
  framePadding: number,
): DinRailGroupFrameData | null {
  const visibleSymbols = groupSymbols.filter((symbol) => symbol.deviceKind !== "terminalBlock");
  if (visibleSymbols.length === 0) {
    return null;
  }

  const minX = Math.min(...visibleSymbols.map((symbol) => symbol.x)) - framePadding;
  const minY = Math.min(...visibleSymbols.map((symbol) => symbol.y)) - framePadding;
  const maxX = Math.max(...visibleSymbols.map((symbol) => symbol.x + symbol.width)) + framePadding;
  const maxY = Math.max(...visibleSymbols.map((symbol) => symbol.y + symbol.height)) + framePadding;
  const headRcd = groupSymbols.find((symbol) => symbol.deviceKind === "rcd") ?? null;
  const label =
    headRcd?.groupName.trim()
    || groupSymbols.find((symbol) => symbol.groupName.trim().length > 0)?.groupName
    || headRcd?.referenceDesignation
    || headRcd?.label
    || groupId;
  const distributionCount = groupSymbols.filter(
    (symbol) => symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo",
  ).length;
  const rcdCount = groupSymbols.filter((symbol) => symbol.deviceKind === "rcd").length;

  return {
    anchorSymbolId: headRcd?.id ?? groupSymbols[0]!.id,
    distributionCount,
    headReference: headRcd?.referenceDesignation || headRcd?.label || "RCD",
    id: groupId,
    label,
    memberCount: groupSymbols.length,
    rcdCount,
    symbolIds: groupSymbols.map((symbol) => symbol.id),
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getRcdGroupMembers(rcd: SymbolItem, snappedSymbols: SymbolItem[]): SymbolItem[] {
  const memberIds = new Set<string>([rcd.id]);

  for (const symbol of snappedSymbols) {
    if (symbol.rcdSymbolId === rcd.id) {
      memberIds.add(symbol.id);
      continue;
    }

    if (
      rcd.group
      && symbol.group === rcd.group
      && symbol.deviceKind !== "rcd"
    ) {
      memberIds.add(symbol.id);
    }
  }

  return snappedSymbols.filter((symbol) => memberIds.has(symbol.id));
}

function getLogicalGroupIds(symbol: SymbolItem, snappedSymbols: SymbolItem[]): string[] {
  const ids = new Set<string>();
  const parentRcd = symbol.rcdSymbolId
    ? snappedSymbols.find((item) => item.id === symbol.rcdSymbolId && item.deviceKind === "rcd")
    : null;

  if (parentRcd) {
    getRcdGroupMembers(parentRcd, snappedSymbols).forEach((member) => ids.add(member.id));
  }

  if (symbol.deviceKind === "rcd") {
    getRcdGroupMembers(symbol, snappedSymbols).forEach((member) => ids.add(member.id));
  }

  if (ids.size === 0 && symbol.group) {
    for (const groupedSymbol of snappedSymbols) {
      if (groupedSymbol.group === symbol.group) {
        ids.add(groupedSymbol.id);
      }
    }
  }

  ids.add(symbol.id);
  return Array.from(ids);
}

export function buildDinRailGroupFrames(
  snappedSymbols: SymbolItem[],
  framePadding: number,
): DinRailGroupFrameData[] {
  const frames: DinRailGroupFrameData[] = [];
  const assignedIds = new Set<string>();

  for (const rcd of snappedSymbols.filter((symbol) => symbol.deviceKind === "rcd")) {
    const members = getRcdGroupMembers(rcd, snappedSymbols);
    if (members.length <= 1 && !rcd.group) {
      continue;
    }

    members.forEach((member) => assignedIds.add(member.id));
    const frame = buildFrameFromSymbols(`rcd:${rcd.id}`, members, framePadding);
    if (frame) frames.push(frame);
  }

  const fallbackGroups = new Map<string, SymbolItem[]>();
  for (const symbol of snappedSymbols) {
    if (assignedIds.has(symbol.id)) {
      continue;
    }

    if (!symbol.group) {
      continue;
    }

    const bucket = fallbackGroups.get(symbol.group) ?? [];
    bucket.push(symbol);
    fallbackGroups.set(symbol.group, bucket);
  }

  for (const [groupId, groupSymbols] of fallbackGroups.entries()) {
    const frame = buildFrameFromSymbols(groupId, groupSymbols, framePadding);
    if (frame) frames.push(frame);
  }

  return frames.sort((left, right) => (
    Math.abs(left.y - right.y) > 5
      ? left.y - right.y
      : left.x - right.x
  ));
}

export function formatDinRailGroupLabel(label: string, fallbackId: string): string {
  const source = (label.trim() || fallbackId.trim()).replace(/\s+/g, " ");
  const numberedGroup = source.match(/^(?:grupa|group)[-\s]*(\d+)$/i);

  if (numberedGroup) {
    return `Grupa ${numberedGroup[1]}`;
  }

  return source || "Grupa";
}

export function buildSelectionBounds(
  selectedSymbols: SymbolItem[],
): SelectionBoundsData | null {
  if (selectedSymbols.length === 0) {
    return null;
  }

  const minX = Math.min(...selectedSymbols.map((symbol) => symbol.x));
  const minY = Math.min(...selectedSymbols.map((symbol) => symbol.y));
  const maxX = Math.max(...selectedSymbols.map((symbol) => symbol.x + symbol.width));
  const maxY = Math.max(...selectedSymbols.map((symbol) => symbol.y + symbol.height));

  return {
    x: minX - 8,
    y: minY - 8,
    width: maxX - minX + 16,
    height: maxY - minY + 16,
  };
}

export function expandSelectionToGroupIds(
  selectedIds: string[],
  snappedSymbols: SymbolItem[],
): string[] {
  const expandedGroupIds = new Set(selectedIds);

  for (const symbolId of selectedIds) {
    const symbol = snappedSymbols.find((item) => item.id === symbolId);
    if (!symbol) {
      continue;
    }

    getLogicalGroupIds(symbol, snappedSymbols).forEach((id) => expandedGroupIds.add(id));
  }

  return Array.from(expandedGroupIds);
}

export function getDragSelectionIds(
  symbolId: string,
  snappedSymbols: SymbolItem[],
  selectedIds: Set<string>,
): string[] {
  const draggedSymbol = snappedSymbols.find((symbol) => symbol.id === symbolId);

  if (draggedSymbol) {
    const logicalGroupIds = getLogicalGroupIds(draggedSymbol, snappedSymbols);
    if (logicalGroupIds.length > 1) {
      return logicalGroupIds;
    }
  }

  if (selectedIds.has(symbolId)) {
    return Array.from(selectedIds);
  }

  return [symbolId];
}

export function rectsIntersect(
  rect: SelectionRectLike,
  symbol: Pick<SymbolItem, "height" | "width" | "x" | "y">,
): boolean {
  return !(
    rect.x + rect.width < symbol.x
    || rect.x > symbol.x + symbol.width
    || rect.y + rect.height < symbol.y
    || rect.y > symbol.y + symbol.height
  );
}
