import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import type { ProjectMetadata } from "../../types/projectMetadata";
import type { SymbolItem } from "../../types/symbolItem";
import type { ConnectionItem } from "../../types/connectionItem";
import { buildCircuitRowsFromSymbols } from "../circuitRows";
import { buildEditableMeasurementProtocols } from "../measurementProtocols";
import { exportDinRailToDataURLWithOptions } from "./dinRailSnapshotService";
import { PdfProtocolDocument } from "./PdfProtocolDocument";
import { exportSchematicToDataURL } from "./schematicSnapshotService";

export async function exportToPdf(
  metadata: ProjectMetadata,
  symbols: SymbolItem[],
  rail: DinRailCanvasRail,
  connections?: ConnectionItem[],
): Promise<Blob> {
  const effectiveMetadata: ProjectMetadata = {
    ...metadata,
    measurementProtocols: buildEditableMeasurementProtocols(
      metadata,
      buildCircuitRowsFromSymbols(symbols),
    ),
  };

  // A4 portrait page (595 × 842 pt). The rail content is wide (rail runs
  // horizontally), so the renderer scales it to fit the page width. With the
  // page chrome kept minimal (see PdfDinRailSnapshotPage), the available image
  // area is ~535 × ~740 pt.

  const [schematicImages, dinRailWithWiresSvg, dinRailWithoutWiresSvg] = await Promise.all([
    exportSchematicToDataURL(symbols, effectiveMetadata),
    exportDinRailToDataURLWithOptions(symbols, rail, { drawConnections: true, scale: 3 }, connections),
    exportDinRailToDataURLWithOptions(symbols, rail, { drawConnections: false, scale: 3 }, connections),
  ]);

  const documentNode = createElement(PdfProtocolDocument, {
    metadata: effectiveMetadata,
    symbols,
    schematicImages,
    dinRailImages: dinRailWithWiresSvg,
    dinRailWithoutWiresImages: dinRailWithoutWiresSvg,
  }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(documentNode).toBlob();

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `dokumentacja_${effectiveMetadata.projectNumber || "zlecenie"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

  return blob;
}
