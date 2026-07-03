import { Page, Text, View } from "@react-pdf/renderer";
import type { CircuitListTableRow } from "../../circuitRows";
import { pdfStyles as styles, palette } from "./pdfStyles";
import { EMPTY_FIELD_PLACEHOLDER } from "./pdfHelpers";
import i18next from "i18next";
const t = i18next.t.bind(i18next);

interface PdfCircuitListPageProps {
  chunk: CircuitListTableRow[];
  chunkIdx: number;
  totalChunks: number;
  displayDate: string;
  fallbackObjectName: string;
}

export function PdfCircuitListPage({
  chunk,
  chunkIdx,
  totalChunks,
  displayDate,
  fallbackObjectName,
}: PdfCircuitListPageProps) {
  return (
    <Page size="A4" orientation="landscape" style={[styles.landscapePage, styles.previewA4Page]}>
      <View style={styles.pageTopBar} fixed />

      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <View>
            <Text style={styles.eyebrow}>{t("pdf.circuitList.badge", "Lista obwodów")}</Text>
            <Text style={styles.pageTitle}>{t("pdf.circuitList.title", "Lista obwodów elektrycznych")}</Text>
            <Text style={styles.pageSubtitle}>
              {t("pdf.circuitList.sheet", { current: chunkIdx + 1, total: totalChunks, defaultValue: `Arkusz ${chunkIdx + 1} z ${totalChunks}` })}
            </Text>
          </View>
        </View>
        <View style={styles.pageHeaderRight}>
          <Text style={[styles.metaLabel, { alignSelf: "flex-end" }]}>{t("pdf.circuitList.date", "Data")}</Text>
          <Text style={styles.metaValue}>{displayDate}</Text>
          <Text style={[styles.metaLabel, { marginTop: 8, alignSelf: "flex-end" }]}>{t("pdf.circuitList.object", "Obiekt")}</Text>
          <Text style={[styles.metaValue, { fontSize: 8.5 }]}>{fallbackObjectName}</Text>
        </View>
      </View>

      {/* Single section — table is the content */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>01</Text>
        <Text style={styles.sectionTitle}>
          {chunkIdx === 0
            ? t("pdf.circuitList.section1", "Lista obwodów")
            : t("pdf.circuitList.section1Continued", `Lista obwodów · arkusz ${chunkIdx + 1}`)}
        </Text>
      </View>

      <View style={styles.table}>
        {/* Header row */}
        <View style={styles.tableHeaderRow}>
          <View style={[styles.tableHeaderCellCenter, { width: "4%" }]}><Text>{t("pdf.circuitList.colIndex", "Lp.")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "8%" }]}><Text>{t("pdf.circuitList.colId", "Ozn.")}</Text></View>
          <View style={[styles.tableHeaderCell, { width: "20%" }]}><Text>{t("pdf.circuitList.colDesc", "Nazwa obwodu")}</Text></View>
          <View style={[styles.tableHeaderCell, { width: "13%" }]}><Text>{t("pdf.circuitList.colLocation", "Lokalizacja")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "7%" }]}><Text>{t("pdf.circuitList.colPhase", "Faza")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "12%" }]}><Text>{t("pdf.circuitList.colProt", "Zabezp.")}</Text></View>
          <View style={[styles.tableHeaderCell, { width: "14%" }]}><Text>{t("pdf.circuitList.colRcd", "RCD")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "8%" }]}><Text>{t("pdf.circuitList.colCable", "Przewód")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "7%" }]}><Text>{t("pdf.circuitList.colLength", "Dł. [m]")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "7%" }]}><Text>{t("pdf.circuitList.colPower", "Moc [W]")}</Text></View>
        </View>

        {/* Body rows */}
        {chunk.map(({ index, location, rcdLabel, rcdProtection, row }, rowIdx) => {
          const rowStyle = rowIdx % 2 === 0 ? styles.tableBodyRow : styles.tableBodyRowAlt;
          return (
            <View style={rowStyle} key={row.id}>
              <View style={[styles.tableCellIndex, { width: "4%" }]}><Text>{index}</Text></View>
              <View style={[styles.tableCellEmphasisCenter, { width: "8%" }]}><Text>{row.referenceDesignation || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCellEmphasis, { width: "20%" }]}><Text>{row.circuitName || row.label || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCellMuted, { width: "13%" }]}><Text>{location || row.displayLocation || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCellCenter, { width: "7%" }]}><Text>{row.phase || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCellEmphasisCenter, { width: "12%" }]}><Text>{row.displayProtection || row.protectionType || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCell, { width: "14%", flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }]}>
                <Text style={{ fontSize: 8.5, fontWeight: "bold" }}>{rcdLabel || EMPTY_FIELD_PLACEHOLDER}</Text>
                {rcdProtection ? <Text style={{ fontSize: 7.5, color: palette.inkTertiary, marginTop: 1 }}>{rcdProtection}</Text> : null}
              </View>
              <View style={[styles.tableCellCenter, { width: "8%" }]}><Text>{row.cableCrossSection ? `${row.cableCrossSection} mm²` : EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCellCenter, { width: "7%" }]}><Text>{row.cableLength || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCellCenter, { width: "7%" }]}><Text>{row.powerW || EMPTY_FIELD_PLACEHOLDER}</Text></View>
            </View>
          );
        })}

        {chunk.length === 0 && (
          <View style={[styles.tableBodyRow, { paddingVertical: 24, justifyContent: "center" }]}>
            <View style={{ width: "100%", alignItems: "center" }}>
              <Text style={[styles.dataValueMuted, { fontSize: 9 }]}>{t("pdf.circuitList.empty", "Brak obwodów do pokazania.")}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.pageFooter} fixed>
        <Text style={styles.pageFooterText}>{t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")}</Text>
        <Text
          style={styles.pageFooterText}
          render={({ pageNumber, totalPages }) => t("pdf.footer.pageInfo", { pageNumber, totalPages, defaultValue: `${pageNumber} / ${totalPages}` })}
        />
      </View>
    </Page>
  );
}