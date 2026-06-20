import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import type { ProjectMetadata } from "../../types/projectMetadata";
import type { SymbolItem } from "../../types/symbolItem";
import type { ConnectionItem } from "../../types/connectionItem";
import { buildCircuitRowsFromSymbols } from "../circuitRows";
import { buildEditableMeasurementProtocols } from "../measurementProtocols";
import { exportDinRailToDataURL } from "./dinRailSnapshotService";
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

  const [schematicImages, dinRailImages] = await Promise.all([
    exportSchematicToDataURL(symbols, effectiveMetadata),
    exportDinRailToDataURL(symbols, rail, connections),
  ]);

  const documentNode = createElement(PdfProtocolDocument, {
    metadata: effectiveMetadata,
    symbols,
    schematicImages,
    dinRailImages,
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
