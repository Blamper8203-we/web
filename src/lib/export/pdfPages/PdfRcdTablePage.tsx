import { Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { pdfStyles as styles, palette } from "./pdfStyles";
import { formatProtocolNumberLabel, formatProtocolTitle, protocolValue } from "./pdfHelpers";
import i18next from "i18next";
const t = i18next.t.bind(i18next);

interface PdfRcdTablePageProps {
  metadata: ProjectMetadata;
  displayDate: string;
  fallbackObjectName: string;
}

export function PdfRcdTablePage({
  metadata,
  displayDate,
  fallbackObjectName,
}: PdfRcdTablePageProps) {
  const rcdHeaderTitle = formatProtocolTitle(
    metadata.measurementProtocols?.rcdGroundHeader?.headerTitle || "Protokół Nr 04 / 2026",
    "",
  );
  const rcdProtocolNumberLabel = formatProtocolNumberLabel(rcdHeaderTitle);

  return (
    <Page size="A4" style={styles.titlePage}>
      <View style={styles.pageTopBar} fixed />

      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <View>
            <Text style={styles.eyebrow}>{t("pdf.rcdTable.badge", "RCD i uziemienie")}</Text>
            <Text style={styles.pageTitle}>
              {t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}
              <Text style={{ color: palette.brand }}>{rcdProtocolNumberLabel}</Text>
            </Text>
            <Text style={styles.pageSubtitle}>{t("pdf.rcdTable.title", "Test wyłączników różnicowoprądowych RCD i pomiar rezystancji uziemienia")}</Text>
          </View>
        </View>
        <View style={styles.pageHeaderRight}>
          <Text style={[styles.metaLabel, { alignSelf: "flex-end" }]}>{t("pdf.rcdTable.date", "Data pomiarów")}</Text>
          <Text style={styles.metaValue}>{displayDate}</Text>
          <Text style={[styles.metaLabel, { marginTop: 8, alignSelf: "flex-end" }]}>{t("pdf.rcdTable.object", "Obiekt")}</Text>
          <Text style={[styles.metaValue, { fontSize: 8.5 }]}>{fallbackObjectName}</Text>
        </View>
      </View>

      {/* Section 01 — Dane techniczne */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>01</Text>
        <Text style={styles.sectionTitle}>{t("pdf.rcdTable.section1", "Dane techniczne i narzędzia pomiarowe")}</Text>
      </View>
      <View style={styles.twoColGrid}>
        <View style={styles.twoColGridItem}>
          <View style={styles.dataRow}>
            <Text style={[styles.dataLabel, { width: 130 }]}>{t("pdf.rcdTable.meter", "Miernik")}</Text>
            <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.rcdGroundMeterName, "....................")}</Text>
          </View>
          <View style={styles.dataRowLast}>
            <Text style={[styles.dataLabel, { width: 130 }]}>{t("pdf.rcdTable.serialNo", "Numer fabryczny")}</Text>
            <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.rcdGroundMeterSerialNumber, "....................")}</Text>
          </View>
        </View>
        <View style={styles.twoColGridItem} />
      </View>

      {/* Section 02 — Tabela RCD */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>02</Text>
        <Text style={styles.sectionTitle}>{t("pdf.rcdTable.section2", "Tabela pomiarów — wyłączniki różnicowoprądowe")}</Text>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={[styles.tableHeaderCellCenter, { width: "6%" }]}><Text>{t("pdf.rcdTable.colIndex", "Lp.")}</Text></View>
          <View style={[styles.tableHeaderCell, { width: "24%" }]}><Text>{t("pdf.rcdTable.colType", "Typ RCD")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "14%" }]}><Text>{t("pdf.rcdTable.colIdn", "IΔn [mA]")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "16%" }]}><Text>{t("pdf.rcdTable.colTripCurrent", "Prąd wyzw. [mA]")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "16%" }]}><Text>{t("pdf.rcdTable.colTripTime", "Czas wyzw. [ms]")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "14%" }]}><Text>{t("pdf.rcdTable.colTest", "Przycisk TEST")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "10%" }]}><Text>{t("pdf.rcdTable.colResult", "Ocena")}</Text></View>
        </View>
        {(metadata.measurementProtocols?.rcdRows ?? []).map((row, index) => {
          const rowStyle = index % 2 === 0 ? styles.tableBodyRow : styles.tableBodyRowAlt;
          return (
            <View style={rowStyle} key={index}>
              <View style={[styles.tableCellIndex, { width: "6%" }]}><Text>{row.index}</Text></View>
              <View style={[styles.tableCellEmphasis, { width: "24%" }]}><Text>{row.deviceType}</Text></View>
              <View style={[styles.tableCellEmphasisCenter, { width: "14%" }]}><Text>{row.residualCurrent}</Text></View>
              <View style={[styles.tableCellCenter, { width: "16%" }]}><Text>{row.tripCurrent}</Text></View>
              <View style={[styles.tableCellCenter, { width: "16%" }]}><Text>{row.tripTimeMs}</Text></View>
              <View style={[styles.tableCellSuccess, { width: "14%" }]}><Text>{row.testButtonResult}</Text></View>
              <View style={[styles.tableCellSuccess, { width: "10%" }]}><Text>{row.assessment}</Text></View>
            </View>
          );
        })}
        {(metadata.measurementProtocols?.rcdRows ?? []).length === 0 && (
          <View style={[styles.tableBodyRow, { paddingVertical: 24, justifyContent: "center" }]}>
            <View style={{ width: "100%", alignItems: "center" }}>
              <Text style={[styles.dataValueMuted, { fontSize: 9 }]}>{t("pdf.rcdTable.empty", "Brak pomiarów RCD do pokazania.")}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Section 03 — Pomiar rezystancji uziemienia */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>03</Text>
        <Text style={styles.sectionTitle}>{t("pdf.rcdTable.section3", "Pomiar rezystancji uziemienia (GSU)")}</Text>
      </View>
      <View style={styles.twoColGrid}>
        <View style={styles.twoColGridItem}>
          <View style={styles.dataRow}>
            <Text style={[styles.dataLabel, { width: 130 }]}>{t("pdf.rcdTable.method", "Metoda pomiaru")}</Text>
            <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.groundMeasurementMethod, "....................")}</Text>
          </View>
          <View style={styles.dataRowLast}>
            <Text style={[styles.dataLabel, { width: 130 }]}>{t("pdf.rcdTable.electrodeType", "Rodzaj uziomu")}</Text>
            <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.groundElectrodeType, "....................")}</Text>
          </View>
        </View>
        <View style={styles.twoColGridItem}>
          <View style={styles.dataRow}>
            <Text style={[styles.dataLabel, { width: 130 }]}>{t("pdf.rcdTable.measuredRu", "Zmierzona wartość Ru")}</Text>
            <Text style={[styles.dataValue, { flex: 1, fontSize: 12, color: palette.brand }]}>{protocolValue(metadata.measurementProtocols?.groundMeasuredResistance, "..........")} Ω</Text>
          </View>
          <View style={styles.dataRowLast}>
            <Text style={[styles.dataLabel, { width: 130 }]}>{t("pdf.rcdTable.requiredVal", "Wartość wymagana")}</Text>
            <Text style={[styles.dataValue, { flex: 1, fontSize: 12 }]}>{protocolValue(metadata.measurementProtocols?.groundRequiredResistance, "..........")} Ω</Text>
          </View>
        </View>
      </View>

      {/* Orzeczenie techniczne — callout */}
      <View style={styles.callout}>
        <Text style={styles.calloutTitle}>{t("pdf.rcdTable.conclusion", "Orzeczenie techniczne")}</Text>
        <Text style={styles.calloutBody}>
          {protocolValue(metadata.measurementProtocols?.groundConclusionText, "Instalacja uziemiająca spełnia wymagania...")}
        </Text>
      </View>

      {/* Signature (only if formal) */}
      {metadata.isFormalDocumentationMode !== false && (
        <View style={styles.signatureRow}>
          <View style={styles.signatureSlot}>
            <View style={styles.signatureLine}>
              <Text style={[styles.dataValueMuted, { fontSize: 7 }]}>{t("pdf.footer.signatureSlot", "miejsce na pieczęć / podpis")}</Text>
            </View>
            <Text style={styles.signatureLabel}>{t("pdf.footer.checkedBy", "Sprawdził (Wykonawca / Elektryk)")}</Text>
            <Text style={styles.signatureSubLabel}>{t("pdf.footer.sepSignature", "Podpis osoby z uprawnieniami SEP")}</Text>
          </View>
          <View style={{ width: 160 }} />
          <View style={{ width: 160 }} />
        </View>
      )}

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