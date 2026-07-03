import { Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata, MeasurementUnifiedProtocolRow } from "../../../types/projectMetadata";
import { pdfStyles as styles, palette } from "./pdfStyles";
import { formatProtocolNumberLabel, formatProtocolTitle, getSuffix, protocolValue } from "./pdfHelpers";
import i18next from "i18next";
const t = i18next.t.bind(i18next);

interface PdfUnifiedTablePageProps {
  metadata: ProjectMetadata;
  chunk: MeasurementUnifiedProtocolRow[];
  chunkIdx: number;
  totalChunks: number;
  displayDate: string;
  fallbackObjectName: string;
}

export function PdfUnifiedTablePage({
  metadata,
  chunk,
  chunkIdx,
  totalChunks,
  displayDate,
  fallbackObjectName,
}: PdfUnifiedTablePageProps) {
  const suffix = getSuffix(totalChunks, chunkIdx);
  const originalTitle = metadata.measurementProtocols?.unifiedHeader?.headerTitle || "Protokół Nr 01 / 2026";
  const chunkHeaderTitle = formatProtocolTitle(originalTitle, suffix);
  const chunkProtocolNumberLabel = formatProtocolNumberLabel(chunkHeaderTitle);
  const isFirstPage = chunkIdx === 0;
  const isLastPage = chunkIdx === totalChunks - 1;

  return (
    <Page size="A4" orientation="landscape" style={[styles.landscapePage, styles.previewA4Page]}>
      <View style={styles.pageTopBar} fixed />

      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <View>
            <Text style={styles.eyebrow}>{t("pdf.unifiedTable.badge", "Tabela zbiorcza")}</Text>
            <Text style={styles.pageTitle}>
              {t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}
              <Text style={{ color: palette.brand }}>{chunkProtocolNumberLabel}</Text>
            </Text>
            <Text style={styles.pageSubtitle}>{t("pdf.unifiedTable.title", "Zbiorcze wyniki pomiarów pętli zwarcia i rezystancji izolacji")}</Text>
          </View>
        </View>
        <View style={styles.pageHeaderRight}>
          <Text style={[styles.metaLabel, { alignSelf: "flex-end" }]}>{t("pdf.unifiedTable.date", "Data pomiarów")}</Text>
          <Text style={styles.metaValue}>{displayDate}</Text>
          <Text style={[styles.metaLabel, { marginTop: 8, alignSelf: "flex-end" }]}>{t("pdf.unifiedTable.object", "Obiekt")}</Text>
          <Text style={[styles.metaValue, { fontSize: 8.5 }]}>{fallbackObjectName}</Text>
        </View>
      </View>

      {/* Section 01 — Dane techniczne (only on first page) */}
      {isFirstPage && (
        <>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionNumber}>01</Text>
            <Text style={styles.sectionTitle}>{t("pdf.unifiedTable.section1", "Dane techniczne i narzędzia pomiarowe")}</Text>
          </View>
          <View style={styles.threeColGrid}>
            <View style={styles.threeColGridItem}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.unifiedTable.meterLoop", "Miernik (Pętla)")}</Text>
                <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.loopMeterName, "....................")}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.unifiedTable.serialLoop", "Nr ser. (Pętla)")}</Text>
                <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.loopMeterSerialNumber, "....................")}</Text>
              </View>
              <View style={styles.dataRowLast}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.unifiedTable.voltage", "Napięcie sieci")}</Text>
                <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.loopNetworkVoltage, "230/400V")}</Text>
              </View>
            </View>
            <View style={styles.threeColGridItem}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.unifiedTable.meterInsulation", "Miernik (Izolacja)")}</Text>
                <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.insulationMeterName, "....................")}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.unifiedTable.serialInsulation", "Nr ser. (Izolacja)")}</Text>
                <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.insulationMeterSerialNumber, "....................")}</Text>
              </View>
              <View style={styles.dataRowLast}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.unifiedTable.network", "Układ sieci")}</Text>
                <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.loopNetworkSystem, "TN-S / TN-C-S")}</Text>
              </View>
            </View>
            <View style={styles.threeColGridItem}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.unifiedTable.testVoltage", "Napięcie próby")}</Text>
                <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")}</Text>
              </View>
              <View style={styles.dataRowLast}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.unifiedTable.reqResistance", "Wymagane Riso")}</Text>
                <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{metadata.measurementProtocols?.groundRequiredResistance || "> 1.0 MΩ"}</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Section 02 — Zbiorcze wyniki pomiarów (table) */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>{isFirstPage ? "02" : "01"}</Text>
        <Text style={styles.sectionTitle}>
          {isFirstPage
            ? t("pdf.unifiedTable.section2", "Zbiorcze wyniki pomiarów obwodów")
            : t("pdf.unifiedTable.section2Continued", `Zbiorcze wyniki pomiarów obwodów · arkusz ${chunkIdx + 1}`)}
        </Text>
      </View>

      <View style={styles.table}>
        {/* Header row 1 — with merged Riso / Loop super-columns */}
        <View style={styles.tableHeaderRow}>
          <View style={[styles.tableHeaderCellCenter, { width: "4%" }]}><Text>{t("pdf.unifiedTable.colIndex", "Lp.")}</Text></View>
          <View style={[styles.tableHeaderCell, { width: "20%" }]}><Text>{t("pdf.unifiedTable.colCircuit", "Nazwa obwodu")}</Text></View>
          <View style={[styles.tableHeaderCell, { width: "12%" }]}><Text>{t("pdf.unifiedTable.colLocation", "Lokalizacja")}</Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "8%" }]}><Text>{t("pdf.unifiedTable.colIn", "In")}</Text></View>
          {/* Riso super-header */}
          <View style={[styles.tableHeaderCellCenter, { width: "22%", paddingVertical: 4 }]}>
            <Text>{t("pdf.unifiedTable.colRiso", { req: metadata.measurementProtocols?.groundRequiredResistance || "> 1.0", defaultValue: `Riso [MΩ] · wym. ${metadata.measurementProtocols?.groundRequiredResistance || "> 1.0"}` })}</Text>
          </View>
          {/* Loop super-header */}
          <View style={[styles.tableHeaderCellCenter, { width: "22%", paddingVertical: 4 }]}>
            <Text>{t("pdf.unifiedTable.colLoop", "Pętla zwarcia")}</Text>
          </View>
          <View style={[styles.tableHeaderCellCenter, { width: "12%" }]}><Text>{t("pdf.unifiedTable.colResult", "Ocena")}</Text></View>
        </View>
        {/* Header row 2 — Riso / Loop sub-labels (white text on navy) */}
        <View style={[styles.tableHeaderRow, { backgroundColor: palette.brandStrong }]}>
          <View style={[styles.tableHeaderCellCenter, { width: "4%" }]}><Text></Text></View>
          <View style={[styles.tableHeaderCell, { width: "20%" }]}><Text></Text></View>
          <View style={[styles.tableHeaderCell, { width: "12%" }]}><Text></Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "8%" }]}><Text></Text></View>
          <View style={[styles.tableHeaderCellCenter, { width: "22%", paddingVertical: 5 }]}>
            <View style={{ flexDirection: "row", flex: 1 }}>
              <View style={{ flex: 1, alignItems: "center", borderRightWidth: 0.5, borderRightColor: "rgba(255,255,255,0.3)", borderRightStyle: "solid" }}>
                <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.inkInverse, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colLN", "L-N")}</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center", borderRightWidth: 0.5, borderRightColor: "rgba(255,255,255,0.3)", borderRightStyle: "solid" }}>
                <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.inkInverse, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colLPE", "L-PE")}</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.inkInverse, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colNPE", "N-PE")}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.tableHeaderCellCenter, { width: "22%", paddingVertical: 5 }]}>
            <View style={{ flexDirection: "row", flex: 1 }}>
              <View style={{ flex: 1, alignItems: "center", borderRightWidth: 0.5, borderRightColor: "rgba(255,255,255,0.3)", borderRightStyle: "solid" }}>
                <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.inkInverse, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colZs", "Zs [Ω]")}</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.inkInverse, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colZadm", "Zadm [Ω]")}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.tableHeaderCellCenter, { width: "12%" }]}><Text></Text></View>
        </View>

        {/* Body rows */}
        {chunk.map((row, index) => {
          const rowStyle = index % 2 === 0 ? styles.tableBodyRow : styles.tableBodyRowAlt;
          const assessmentCell = row.assessment === "Pozytywna" ? styles.tableCellSuccess : styles.tableCellEmphasisCenter;
          return (
            <View style={rowStyle} key={index}>
              <View style={[styles.tableCellIndex, { width: "4%" }]}><Text>{row.index}</Text></View>
              <View style={[styles.tableCellEmphasis, { width: "20%" }]}><Text>{row.circuitName}</Text></View>
              <View style={[styles.tableCellMuted, { width: "12%" }]}><Text>{row.location}</Text></View>
              <View style={[styles.tableCellEmphasisCenter, { width: "8%" }]}><Text>{row.protectionType}</Text></View>

              {/* Riso 3 sub-columns (info tint) */}
              <View style={[styles.tableCellInfo, { width: "22%", paddingHorizontal: 0 }]}>
                <View style={{ flexDirection: "row", flex: 1 }}>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6, borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.lnResistance}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6, borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.lpeResistance}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.npeResistance}</Text>
                  </View>
                </View>
              </View>

              {/* Loop 2 sub-columns */}
              <View style={[styles.tableCell, { width: "22%", paddingHorizontal: 0 }]}>
                <View style={{ flexDirection: "row", flex: 1 }}>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6, borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.measuredImpedance}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.allowedImpedance}</Text>
                  </View>
                </View>
              </View>

              <View style={[assessmentCell, { width: "12%" }]}><Text>{row.assessment}</Text></View>
            </View>
          );
        })}
      </View>

{/* Section 03 — Uwagi / Legenda / Zalecenia (last page) */}
      {isLastPage && (
        <>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionNumber}>{isFirstPage ? "03" : "02"}</Text>
            <Text style={styles.sectionTitle}>{t("pdf.unifiedTable.section3", "Uwagi, legenda i zalecenia")}</Text>
          </View>

          <View style={[styles.twoColGrid, { alignItems: "flex-start" }]}>
            <View style={styles.twoColGridItem}>
              <Text style={[styles.eyebrow, { marginBottom: 6 }]}>{t("pdf.unifiedTable.noteLabel", "Uwaga")}</Text>
              <Text style={[styles.dataValue, { fontSize: 8.5, fontWeight: "normal", lineHeight: 1.5 }]}>
                {t("pdf.unifiedTable.noteText", { testVoltage: protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V"), defaultValue: `Wszystkie odbiorniki elektryczne na czas pomiaru rezystancji izolacji zostały odłączone. Pomiary przeprowadzono przy napięciu probierczym stałym ${protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")}.` })}
              </Text>
              <Text style={[styles.eyebrow, { marginTop: 14, marginBottom: 6 }]}>{t("pdf.unifiedTable.legendLabel", "Legenda")}</Text>
              <Text style={[styles.dataValue, { fontSize: 8.5, fontWeight: "normal", lineHeight: 1.5 }]}>
                {t("pdf.unifiedTable.legendText", " In — prąd znamionowy zabezpieczenia, Zs — zmierzona impedancja pętli zwarcia, Zadm — maksymalna dopuszczalna impedancja pętli zwarcia warunkująca szybkie wyłączenie.")}
              </Text>
            </View>
            <View style={styles.twoColGridItem}>
              {metadata.measurementProtocols?.recommendationsText ? (
                <>
                  <Text style={[styles.eyebrow, { marginBottom: 6 }]}>{t("pdf.unifiedTable.section4", "Zalecenia")}</Text>
                  <View style={styles.callout}>
                    <Text style={styles.calloutBody}>{metadata.measurementProtocols.recommendationsText}</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          {/* Signature — minimal */}
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
        </>
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