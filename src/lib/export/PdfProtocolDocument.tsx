import { Document, Image, Page, View, Text } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../types/projectMetadata";
import type { SymbolItem } from "../../types/symbolItem";
import { buildCircuitListTableRows, buildCircuitRowsFromSymbols } from "../circuitRows";
import { formatDateForField } from "../projectMetadata";

import { pdfStyles as styles } from "./pdfPages/pdfStyles";
import { CIRCUIT_LIST_ROWS_PER_PAGE, UNIFIED_ROWS_PER_PAGE, buildPdfCircuitGroups } from "./pdfPages/pdfHelpers";
import { chunkRows } from "../measurementProtocolHelpers";
import { PdfTitlePage } from "./pdfPages/PdfTitlePage";
import { PdfCircuitListPage } from "./pdfPages/PdfCircuitListPage";
import { PdfUnifiedTablePage } from "./pdfPages/PdfUnifiedTablePage";
import { PdfRcdTablePage } from "./pdfPages/PdfRcdTablePage";

interface PdfProtocolDocumentProps {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  schematicImages?: string[];
  dinRailImages?: string[];
  previewOnly?: string;
}

export function PdfProtocolDocument({
  metadata,
  symbols,
  schematicImages = [],
  dinRailImages = [],
  previewOnly,
}: PdfProtocolDocumentProps) {
  const groupedCircuits = buildPdfCircuitGroups(symbols);
  const circuitListRows = buildCircuitListTableRows(buildCircuitRowsFromSymbols(symbols));

  const displayDate = formatDateForField(metadata.drawingDate) || formatDateForField(new Date().toISOString());
  const fallbackObjectName = metadata.titlePageObjectType || metadata.projectNumber || "Nowe zlecenie";

  const unifiedRows = metadata.measurementProtocols?.unifiedRows ?? [];
  const unifiedChunks = unifiedRows.length > 0 ? chunkRows(unifiedRows, UNIFIED_ROWS_PER_PAGE) : [[]];
  
  const circuitListChunks = circuitListRows.length > 0
    ? chunkRows(circuitListRows, CIRCUIT_LIST_ROWS_PER_PAGE)
    : [[]];

  return (
    <Document title={`Dokumentacja_${metadata.projectNumber || "powykonawcza"}`}>
      {(!previewOnly || previewOnly === "title-page") && (
        <PdfTitlePage metadata={metadata} displayDate={displayDate} />
      )}

      {(!previewOnly || previewOnly !== "title-page") && (
        <>
          {(previewOnly === "circuit-list" || (!previewOnly && circuitListRows.length > 0)) &&
            circuitListChunks.map((chunk: any[], chunkIdx: number) => (
              <PdfCircuitListPage
                key={`circuit-list-${chunkIdx}`}
                chunk={chunk}
                chunkIdx={chunkIdx}
                totalChunks={circuitListChunks.length}
                displayDate={displayDate}
                fallbackObjectName={fallbackObjectName}
              />
            ))}

          {(previewOnly === "unified" || (!previewOnly && unifiedRows.length > 0)) &&
            unifiedChunks.map((chunk: any[], chunkIdx: number) => (
              <PdfUnifiedTablePage
                key={`unified-${chunkIdx}`}
                metadata={metadata}
                chunk={chunk}
                chunkIdx={chunkIdx}
                totalChunks={unifiedChunks.length}
                displayDate={displayDate}
                fallbackObjectName={fallbackObjectName}
              />
            ))}

          {(previewOnly === "rcd-ground" || (!previewOnly && (metadata.measurementProtocols?.rcdRows?.length ?? 0) > 0)) && (
            <PdfRcdTablePage
              metadata={metadata}
              displayDate={displayDate}
              fallbackObjectName={fallbackObjectName}
            />
          )}

          {(!previewOnly || previewOnly === "schematic") &&
            schematicImages.map((src, index) => (
              <Page key={`schematic-${index}`} size="A4" orientation="landscape" style={{ padding: 0 }}>
                <Image src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                <View style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center" }} fixed>
                  <Text style={{ fontSize: 8, color: "#9ca3af", textTransform: "uppercase" }} render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages} • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364`} />
                </View>
              </Page>
            ))}

          {(!previewOnly || previewOnly === "din-rail") &&
            dinRailImages.map((src, index) => (
              <Page key={`din-rail-${index}`} size="A4" orientation="landscape" style={styles.landscapePage}>
                <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, styles.mb4]}>
                  <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>WIDOK ELEWACJI ROZDZIELNICY</Text>
                </View>
                <View style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Image src={src} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </View>
                <View style={[styles.textCenter, styles.mt4]} fixed>
                  <Text
                    style={[styles.textXs, styles.textGray400, styles.uppercase]}
                    render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages} • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364`}
                  />
                </View>
              </Page>
            ))}
            
          {/* Dummy element to suppress unused variable errors for things not currently rendered in unified mode */}
          <View style={{ display: 'none' }}>
             <Text>{!!groupedCircuits ? '' : ''}</Text>
          </View>
        </>
      )}
    </Document>
  );
}
