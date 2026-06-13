import type { CSSProperties } from "react";
import { isAuxiliaryNonCircuitSymbol, type SymbolItem } from "../../types/symbolItem";
import { MANUAL_REFERENCE_DESIGNATION_KEY } from "./constants";
import type { NormalizedRect, WorldRect } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

export function buildWorldRectStyle(rect: WorldRect): CSSProperties {
  return {
    position: "absolute",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

export function expandRect(rect: WorldRect, padding: number): WorldRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function measureSvgNormalizedRect(node: HTMLDivElement): NormalizedRect | null {
  const svg = node.querySelector("svg");
  if (!(svg instanceof SVGSVGElement)) {
    return null;
  }

  const viewBox = svg.viewBox?.baseVal;
  if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) {
    return null;
  }

  try {
    const bbox = svg.getBBox();
    if (bbox.width <= 0 || bbox.height <= 0) {
      return null;
    }

    const normalized: NormalizedRect = {
      x: (bbox.x - viewBox.x) / viewBox.width,
      y: (bbox.y - viewBox.y) / viewBox.height,
      width: bbox.width / viewBox.width,
      height: bbox.height / viewBox.height,
    };

    if (
      !Number.isFinite(normalized.x)
      || !Number.isFinite(normalized.y)
      || !Number.isFinite(normalized.width)
      || !Number.isFinite(normalized.height)
      || normalized.width <= 0
      || normalized.height <= 0
    ) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

export function worldRectFromNormalizedRect(symbol: SymbolItem, normalized: NormalizedRect): WorldRect {
  return {
    x: symbol.x + normalized.x * symbol.width,
    y: symbol.y + normalized.y * symbol.height,
    width: normalized.width * symbol.width,
    height: normalized.height * symbol.height,
  };
}

export function sameNormalizedRect(left: NormalizedRect, right: NormalizedRect): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

export function getSymbolDesignationLabel(
  symbol: SymbolItem,
  automaticDesignationBySymbolId: Map<string, string>,
): string {
  const manualDesignation = symbol.referenceDesignation.trim();
  const isManualDesignation =
    symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY]?.toLocaleLowerCase("pl-PL") === "true";

  if (isManualDesignation && manualDesignation.length > 0) {
    return manualDesignation;
  }

  // For terminal blocks and distribution blocks, use the pre-computed displayModuleNumber
  // which contains the correct prefix (N1, PE1, BL1, X1)
  if (isAuxiliaryNonCircuitSymbol(symbol)) {
    return symbol.displayModuleNumber || manualDesignation;
  }

  return automaticDesignationBySymbolId.get(symbol.id) ?? "";
}
