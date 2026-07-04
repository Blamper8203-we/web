import { Document, Image, Page, View, Text } from "@react-pdf/renderer";
import type { ProjectMetadata, MeasurementUnifiedProtocolRow } from "../../types/projectMetadata";
import type { SymbolItem } from "../../types/symbolItem";
import { buildCircuitListTableRows, buildCircuitRowsFromSymbols, type CircuitListTableRow } from "../circuitRows";
import i18next from "i18next";
const t = i18next.t.bind(i18next);
import { translateDefaultProjectText } from "../projectMetadata";

import {
  CIRCUIT_LIST_ROWS_PER_PAGE,
  UNIFIED_ROWS_PER_PAGE,
  buildPdfCircuitGroups,
  formatDisplayDate,
} from "./pdfPages/pdfHelpers";
import { chunkRows } from "../measurementProtocolHelpers";
import { PdfTitlePage } from "./pdfPages/PdfTitlePage";
import { PdfProjectSummaryPage } from "./pdfPages/PdfProjectSummaryPage";
import { PdfDocumentationContentPage, hasDocumentationContent } from "./pdfPages/PdfDocumentationContentPage";
import { PdfCircuitListPage } from "./pdfPages/PdfCircuitListPage";
import { PdfUnifiedTablePage } from "./pdfPages/PdfUnifiedTablePage";
import { PdfRcdTablePage } from "./pdfPages/PdfRcdTablePage";
import { PdfDinRailSnapshotPage } from "./pdfPages/PdfDinRailSnapshotPage";
import { PdfTableOfContentsPage } from "./pdfPages/PdfTableOfContentsPage";
import { pdfStyles } from "./pdfPages/pdfStyles";

interface PdfProtocolDocumentProps {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  schematicImages?: string[];
  dinRailImages?: string[];
  dinRailWithoutWiresImages?: string[];
  previewOnly?: string;
}

export function PdfProtocolDocument({
  metadata,
  symbols,
  schematicImages = [],
  dinRailImages = [],
  dinRailWithoutWiresImages = [],
  previewOnly,
}: PdfProtocolDocumentProps) {
  const groupedCircuits = buildPdfCircuitGroups(symbols);
  const circuitListRows = buildCircuitListTableRows(buildCircuitRowsFromSymbols(symbols));

  // WHY: must use the same helper as MeasurementProtocolsWorkspacePage so the
  // header date printed in the PDF matches what the user sees in the preview.
  // `formatDateForField` (ISO `YYYY-MM-DD`) was historically called here, but
  // the preview fell back to `toLocaleDateString("pl-PL")` (`DD.MM.YYYY`),
  // producing different strings for the same project — bug.
  const displayDate = formatDisplayDate(metadata);
  const fallbackObjectName = metadata.titlePageObjectType ? translateDefaultProjectText(metadata.titlePageObjectType, t) : (metadata.projectNumber || t("pdf.projectSummary.newOrder", "Nowe zlecenie"));

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

      {(!previewOnly || previewOnly === "toc") && (
        <PdfTableOfContentsPage
          metadata={metadata}
          displayDate={displayDate}
          hasCircuitList={circuitListRows.length > 0}
          hasUnified={unifiedRows.length > 0}
          hasRcd={(metadata.measurementProtocols?.rcdRows?.length ?? 0) > 0}
          schematicCount={schematicImages.length}
          dinRailCount={dinRailWithoutWiresImages.length + dinRailImages.length}
        />
      )}

      {(!previewOnly || previewOnly === "summary") && (
        <PdfProjectSummaryPage
          metadata={metadata}
          groupedCircuits={groupedCircuits}
          displayDate={displayDate}
        />
      )}

      {(!previewOnly || previewOnly === "documentation") && hasDocumentationContent(metadata) && (
        <PdfDocumentationContentPage
          metadata={metadata}
          displayDate={displayDate}
        />
      )}

      {(!previewOnly || previewOnly !== "title-page") && (
        <>
          {(previewOnly === "circuit-list" || (!previewOnly && circuitListRows.length > 0)) &&
            circuitListChunks.map((chunk: CircuitListTableRow[], chunkIdx: number) => (
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
            unifiedChunks.map((chunk: MeasurementUnifiedProtocolRow[], chunkIdx: number) => (
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
              // WHY: paddingBottom > 0 keeps the embedded schematic PNG (which
              // already contains the device legend table near the bottom of the
              // A4 sheet) from sitting under the page footer. The previous
              // padding: 0 made the image fill the entire page and the absolute
              // page footer (bottom: 10) overlapped the last row of the legend
              // table. 25pt ≈ 8.8mm — enough to clear the footer band while
              // still keeping the schematic visually full-bleed.
              <Page
                id={index === 0 ? "schematic" : undefined}
                key={`schematic-${index}`}
                size="A4"
                orientation="landscape"
                style={[pdfStyles.landscapePage, { paddingBottom: 36 }]}
              >
                <View style={pdfStyles.pageTopBar} fixed />
                <View style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Image src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </View>
                <View style={pdfStyles.pageFooter} fixed>
                  <Text style={pdfStyles.pageFooterText}>{t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")}</Text>
                  <Text style={pdfStyles.pageFooterText} render={({ pageNumber, totalPages }) => t("pdf.footer.pageInfo", { pageNumber, totalPages, defaultValue: `${pageNumber} / ${totalPages}` })} />
                </View>
              </Page>
            ))}

          {(!previewOnly || previewOnly === "din-rail" || previewOnly === "din-rail-connections") && (
            <>
              {dinRailWithoutWiresImages.map((svg, index) => (
                <PdfDinRailSnapshotPage
                  id={index === 0 ? "din-rail" : undefined}
                  key={`din-rail-main-${index}`}
                  imageDataUrl={svg}
                />
              ))}

              {dinRailImages.map((svg, index) => (
                <PdfDinRailSnapshotPage
                  key={`din-rail-wires-${index}`}
                  imageDataUrl={svg}
                />
              ))}
            </>
          )}
            
          </>
      )}
    </Document>
  );
}
