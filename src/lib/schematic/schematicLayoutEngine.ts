import type { SymbolItem } from "../../types/symbolItem";
import type { SchematicLayout } from "./schematicLayout";
import { A4_HEIGHT_PX, A4_WIDTH_PX, PAGE_GAP } from "./schematicLayout";
import { buildNodes, flattenNodes } from "./schematicGraphBuilder";
import { assignPagesAndPosition } from "./schematicGeometry";

// Zachowujemy wsteczną kompatybilność, jeśli jakikolwiek inny plik importował dawne stałe z tego pliku.
export {
  MANUAL_PHASE_KEY,
  INDUCTION_OVEN_ENABLED_KEY,
  INDUCTION_OVEN_PATTERN_KEY,
} from "./schematicNodeIdentification";

export function buildSchematicLayout(symbols: SymbolItem[]): SchematicLayout {
  const buildResult = buildNodes(symbols);
  const devices = [...buildResult.mainDevices, ...buildResult.circuitDevices];
  const pages = assignPagesAndPosition(buildResult.mainDevices, buildResult.circuitDevices);
  const nodes = flattenNodes(devices);
  const totalPages = Math.max(1, pages.length);

  return {
    pages,
    nodes,
    totalWidth: A4_WIDTH_PX,
    totalHeight: totalPages * A4_HEIGHT_PX + Math.max(0, totalPages - 1) * PAGE_GAP,
    frReference: buildResult.fr?.referenceDesignation ?? "",
  };
}
