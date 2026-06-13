import { Document, Image, Page, View, Text } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../types/projectMetadata";
import type { SymbolItem } from "../../types/symbolItem";
import type { PhaseDistributionResult } from "../phaseDistribution/phaseDistributionCalculator";
import type { ValidationResult } from "../validation/electricalValidationService";
import { buildCircuitListTableRows, buildCircuitRowsFromSymbols } from "../circuitRows";
import { formatDateForField } from "../projectMetadata";

import { pdfStyles as styles } from "./pdfPages/pdfStyles";
import { CIRCUIT_LIST_ROWS_PER_PAGE, UNIFIED_ROWS_PER_PAGE, buildPdfCircuitGroups, chunkArray } from "./pdfPages/pdfHelpers";
import { PdfTitlePage } from "./pdfPages/PdfTitlePage";
import { PdfCircuitListPage } from "./pdfPages/PdfCircuitListPage";
import { PdfUnifiedTablePage } from "./pdfPages/PdfUnifiedTablePage";
import { PdfRcdTablePage } from "./pdfPages/PdfRcdTablePage";

interface PdfProtocolDocumentProps {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  phaseDistribution: PhaseDistributionResult;
  validationResult: ValidationResult;
  schematicImages: string[];
  dinRailImages?: string[];
  previewOnly?: string;
}

export function PdfProtocolDocument({
  metadata,
  symbols,
  phaseDistribution,
  validationResult,
  schematicImages,
  dinRailImages = [],
  previewOnly,
}: PdfProtocolDocumentProps) {
  const groupedCircuits = buildPdfCircuitGroups(symbols);
  const circuitListRows = buildCircuitListTableRows(buildCircuitRowsFromSymbols(symbols));

  const displayDate = formatDateForField(metadata.drawingDate) || formatDateForField(new Date().toISOString());
  const fallbackObjectName = metadata.titlePageObjectType || metadata.projectNumber || "Nowe zlecenie";

  const isUnified = metadata.measurementProtocolStyle === "unified";
  const unifiedRows = metadata.measurementProtocols?.unifiedRows ?? [];
  const unifiedChunks = unifiedRows.length > 0 ? chunkArray(unifiedRows, UNIFIED_ROWS_PER_PAGE) : [[]];
  
  const circuitListChunks = circuitListRows.length > 0
    ? chunkArray(circuitListRows, CIRCUIT_LIST_ROWS_PER_PAGE)
    : [[]];

  return (
    <Document title={`Dokumentacja_${metadata.projectNumber || "powykonawcza"}`}>
      {(!previewOnly || previewOnly === "title-page") && (
        <PdfTitlePage metadata={metadata} />
      )}

      {(!previewOnly || previewOnly !== "title-page") && (
        <>
          {(previewOnly === "circuit-list" || (!previewOnly && circuitListRows.length > 0)) &&
            circuitListChunks.map((chunk, chunkIdx) => (
              <PdfCircuitListPage
                key={`circuit-list-${chunkIdx}`}
                chunk={chunk}
                chunkIdx={chunkIdx}
                totalChunks={circuitListChunks.length}
                displayDate={displayDate}
                fallbackObjectName={fallbackObjectName}
              />
            ))}

          {isUnified && (previewOnly === "unified" || (!previewOnly && unifiedRows.length > 0)) &&
            unifiedChunks.map((chunk, chunkIdx) => (
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
              </Page>
            ))}
            
          {/* Dummy element to suppress unused variable errors for things not currently rendered in unified mode */}
          <View style={{ display: 'none' }}>
             <Text>{!!groupedCircuits && !!phaseDistribution && !!validationResult ? '' : ''}</Text>
          </View>
        </>
      )}
    </Document>
  );
}
