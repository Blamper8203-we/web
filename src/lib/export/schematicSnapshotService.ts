import type { SymbolItem } from "../../types/symbolItem";
import { buildSchematicLayout } from "../schematic/schematicLayoutEngine";
import { renderSchematic } from "../schematic/schematicRenderer";
import { A4_WIDTH_PX, A4_HEIGHT_PX } from "../schematic/schematicLayout";

export async function exportSchematicToDataURL(symbols: SymbolItem[]): Promise<string[]> {
  const layout = buildSchematicLayout(symbols);
  const dataUrls: string[] = [];
  
  if (!layout || layout.pages.length === 0) {
    return dataUrls;
  }

  const scale = 2; // Wyższa rozdzielczość (2x) dla druku wektorowego/PDF
  
  for (const page of layout.pages) {
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
    });
    
    dataUrls.push(canvas.toDataURL("image/png", 1.0));
  }
  
  return dataUrls;
}
