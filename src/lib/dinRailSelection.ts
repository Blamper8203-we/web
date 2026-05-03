import type { SymbolItem } from "../types/symbolItem";

export interface DinRailGroupFrameData {
  anchorSymbolId: string;
  id: string;
  label: string;
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

export function buildDinRailGroupFrames(
  snappedSymbols: SymbolItem[],
  framePadding: number,
): DinRailGroupFrameData[] {
  const grouped = new Map<string, SymbolItem[]>();

  for (const symbol of snappedSymbols) {
    if (!symbol.group) {
      continue;
    }

    const bucket = grouped.get(symbol.group) ?? [];
    bucket.push(symbol);
    grouped.set(symbol.group, bucket);
  }

  return Array.from(grouped.entries()).map(([groupId, groupSymbols]) => {
    const minX = Math.min(...groupSymbols.map((symbol) => symbol.x)) - framePadding;
    const minY = Math.min(...groupSymbols.map((symbol) => symbol.y)) - framePadding;
    const maxX = Math.max(...groupSymbols.map((symbol) => symbol.x + symbol.width)) + framePadding;
    const maxY = Math.max(...groupSymbols.map((symbol) => symbol.y + symbol.height)) + framePadding;
    const label =
      groupSymbols.find((symbol) => symbol.groupName.trim().length > 0)?.groupName ?? groupId;

    return {
      anchorSymbolId:
        groupSymbols.find((symbol) => symbol.deviceKind === "rcd")?.id
        ?? groupSymbols[0]!.id,
      id: groupId,
      label,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  });
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

export function buildSelectionLabel(selectedSymbols: SymbolItem[]): string {
  if (selectedSymbols.length > 1) {
    return `${selectedSymbols.length} moduly`;
  }

  return selectedSymbols[0]?.referenceDesignation || selectedSymbols[0]?.label || "";
}

export function expandSelectionToGroupIds(
  selectedIds: string[],
  snappedSymbols: SymbolItem[],
): string[] {
  const expandedGroupIds = new Set(selectedIds);

  for (const symbolId of selectedIds) {
    const symbol = snappedSymbols.find((item) => item.id === symbolId);
    if (!symbol?.group) {
      continue;
    }

    for (const groupedSymbol of snappedSymbols) {
      if (groupedSymbol.group === symbol.group) {
        expandedGroupIds.add(groupedSymbol.id);
      }
    }
  }

  return Array.from(expandedGroupIds);
}

export function getDragSelectionIds(
  symbolId: string,
  snappedSymbols: SymbolItem[],
  selectedIds: Set<string>,
): string[] {
  const draggedSymbol = snappedSymbols.find((symbol) => symbol.id === symbolId);

  if (draggedSymbol?.group) {
    return snappedSymbols
      .filter((symbol) => symbol.group === draggedSymbol.group)
      .map((symbol) => symbol.id);
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
