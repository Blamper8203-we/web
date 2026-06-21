import type { SymbolItem } from "../../types/symbolItem";
import type { ProjectMetadata } from "../../types/projectMetadata";
import type { SchematicLayout } from "../schematic/schematicLayout";
import { buildSchematicLayout } from "../schematic/schematicLayoutEngine";
import { renderSchematic } from "../schematic/schematicRenderer";
import { A4_WIDTH_PX, A4_HEIGHT_PX } from "../schematic/schematicLayout";

/**
 * WHY: assignPagesAndPosition emits a PageInfo for every page index from 0 to
 * maxPage, even when a page has zero devices (e.g. when mainDevices end exactly
 * on a page boundary and circuit devices start on the next one, or when a
 * circuit group fills its width without crossing into a new page). The blank
 * pages render as empty A4 sheets in both the workspace preview (SchematicTab
 * in MeasurementProtocolsWorkspacePage) and the exported PDF
 * (PdfProtocolDocument). They are a layout-engine artifact, not real schematic
 * pages — drop them so the preview and the export agree on what the schematic
 * actually contains. The page count is also fed into the global "STRONA X Z Y"
 * counter, so dropping these here keeps the counter honest.
 *
 * Extracted as a pure function so it can be unit-tested without spinning up
 * a real canvas (jsdom does not implement HTMLCanvasElement.getContext).
 */
export function filterEmptySchematicPages(layout: SchematicLayout): SchematicLayout["pages"] {
  return layout.pages.filter((page) =>
    layout.nodes.some((node) => node.pageIndex === page.pageIndex),
  );
}

export async function exportSchematicToDataURL(symbols: SymbolItem[], metadata?: ProjectMetadata): Promise<string[]> {
  const layout = buildSchematicLayout(symbols);
  const dataUrls: string[] = [];

  if (!layout || layout.pages.length === 0) {
    return dataUrls;
  }

  const scale = 2; // Wyższa rozdzielczość (2x) dla druku wektorowego/PDF
  const renderablePages = filterEmptySchematicPages(layout);

  for (const page of renderablePages) {
    const canvas = document.createElement("canvas");
    canvas.width = A4_WIDTH_PX * scale;
    canvas.height = A4_HEIGHT_PX * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rysuje cały schemat, ale przesunięty w górę tak, by aktualna strona była na (0,0)
    renderSchematic(ctx, layout, {
      canvasWidth: canvas.width,
      canvasHeight: layout.totalHeight * scale, // pozwalamy rendererowi narysować całość (clipping tnie to co poza canvas)
      zoom: scale,
      panX: 0,
      panY: -(page.yOffset * scale),
      activePageIndex: page.pageIndex,
      metadata,
    });

    dataUrls.push(canvas.toDataURL("image/png", 1.0));
  }

  return dataUrls;
}
