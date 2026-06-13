import type { SymbolItem } from "../../types/symbolItem";
import type { NormalizedRect, WorldRect } from "./canvasTypes";
import { isAuxiliaryNonCircuitSymbol } from "../../types/symbolItem";

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
      !Number.isFinite(normalized.x) ||
      !Number.isFinite(normalized.y) ||
      !Number.isFinite(normalized.width) ||
      !Number.isFinite(normalized.height) ||
      normalized.width <= 0 ||
      normalized.height <= 0
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
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";

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

  if (isAuxiliaryNonCircuitSymbol(symbol)) {
    return symbol.displayModuleNumber || manualDesignation;
  }

  return automaticDesignationBySymbolId.get(symbol.id) ?? "";
}
