import type { ProjectMetadata, MeasurementUnifiedProtocolRow } from "../../../types/projectMetadata";
import { formatProtocolNumberLabel, formatProtocolTitle, getSuffix, protocolValue } from "./pdfHelpers";
import i18next from "i18next";
import { Text, View } from "@react-pdf/renderer";
import { palette } from "./pdfStyles";
import {
  PdfPage, PdfHeader, PdfFooter, PdfSection, PdfDataRow, PdfGrid, PdfGridColumn, PdfEyebrow, PdfCallout,
  PdfTable, PdfTableHeaderRow, PdfTableHeaderCell, PdfTableBodyRow, PdfTableCell, PdfSignatureRow, PdfSignatureSlot, PdfSignatureEmptySlot
} from "../pdfComponents";

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
    <PdfPage
      id={chunkIdx === 0 ? "unified" : undefined}
      orientation="landscape"
      variant="preview"
    >
      <PdfHeader
        rightLineText={
          <Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: palette.ink, letterSpacing: -0.4, lineHeight: 1.15 }}>
              {t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}
              <Text style={{ color: palette.accent }}>{chunkProtocolNumberLabel}</Text>
            </Text>
            {"\n"}
            <Text style={{ fontSize: 10, color: palette.inkMuted, marginTop: 4 }}>
              {t("pdf.unifiedTable.title", "Zbiorcze wyniki pomiarów pętli zwarcia i rezystancji izolacji")}
            </Text>
          </Text>
        }
        brandText={t("pdf.unifiedTable.badge", "Tabela zbiorcza")}
        brandSubText=""
        rightContent={
          <View>
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 7.5, color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", textAlign: "right" }}>{t("pdf.unifiedTable.date", "Data pomiarów")}</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: palette.ink, textAlign: "right" }}>{displayDate}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 7.5, color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", textAlign: "right" }}>{t("pdf.unifiedTable.object", "Obiekt")}</Text>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink, textAlign: "right" }}>{fallbackObjectName}</Text>
            </View>
          </View>
        }
      />

      {isFirstPage && (
        <PdfSection
          number="01"
          title={t("pdf.unifiedTable.section1", "Dane techniczne i narzędzia pomiarowe")}
        >
          <PdfGrid columns={3}>
            <PdfGridColumn columns={3}>
              <PdfDataRow labelWidth={110} label={t("pdf.unifiedTable.meterLoop", "Miernik (Pętla)")} value={protocolValue(metadata.measurementProtocols?.loopMeterName, "—")} valueStyle={{ fontSize: 9 }} />
              <PdfDataRow labelWidth={110} label={t("pdf.unifiedTable.serialLoop", "Nr ser. (Pętla)")} value={protocolValue(metadata.measurementProtocols?.loopMeterSerialNumber, "—")} valueStyle={{ fontSize: 9 }} />
              <PdfDataRow labelWidth={110} label={t("pdf.unifiedTable.voltage", "Napięcie sieci")} value={protocolValue(metadata.measurementProtocols?.loopNetworkVoltage, "230/400V")} valueStyle={{ fontSize: 9 }} isLast />
            </PdfGridColumn>
            <PdfGridColumn columns={3}>
              <PdfDataRow labelWidth={110} label={t("pdf.unifiedTable.meterInsulation", "Miernik (Izolacja)")} value={protocolValue(metadata.measurementProtocols?.insulationMeterName, "—")} valueStyle={{ fontSize: 9 }} />
              <PdfDataRow labelWidth={110} label={t("pdf.unifiedTable.serialInsulation", "Nr ser. (Izolacja)")} value={protocolValue(metadata.measurementProtocols?.insulationMeterSerialNumber, "—")} valueStyle={{ fontSize: 9 }} />
              <PdfDataRow labelWidth={110} label={t("pdf.unifiedTable.network", "Układ sieci")} value={protocolValue(metadata.measurementProtocols?.loopNetworkSystem, "TN-S / TN-C-S")} valueStyle={{ fontSize: 9 }} isLast />
            </PdfGridColumn>
            <PdfGridColumn columns={3}>
              <PdfDataRow labelWidth={110} label={t("pdf.unifiedTable.testVoltage", "Napięcie próby")} value={protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")} valueStyle={{ fontSize: 9 }} />
              <PdfDataRow labelWidth={110} label={t("pdf.unifiedTable.reqResistance", "Wymagane Riso")} value={metadata.measurementProtocols?.groundRequiredResistance || "> 1.0 MΩ"} valueStyle={{ fontSize: 9 }} isLast />
            </PdfGridColumn>
          </PdfGrid>
        </PdfSection>
      )}

      <PdfSection
        number={isFirstPage ? "02" : "01"}
        title={isFirstPage
          ? t("pdf.unifiedTable.section2", "Zbiorcze wyniki pomiarów obwodów")
          : t("pdf.unifiedTable.section2Continued", `Zbiorcze wyniki pomiarów obwodów · arkusz ${chunkIdx + 1}`)}
      >
        <PdfTable>
          <PdfTableHeaderRow>
            <PdfTableHeaderCell width="4%" align="center">{t("pdf.unifiedTable.colIndex", "Lp.")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="20%">{t("pdf.unifiedTable.colCircuit", "Nazwa obwodu")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%">{t("pdf.unifiedTable.colLocation", "Lokalizacja")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="8%" align="center">{t("pdf.unifiedTable.colIn", "In")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="22%" align="center" style={{ paddingVertical: 4 }}>
              {t("pdf.unifiedTable.colRiso", { req: metadata.measurementProtocols?.groundRequiredResistance || "> 1.0", defaultValue: `Riso [MΩ] · wym. ${metadata.measurementProtocols?.groundRequiredResistance || "> 1.0"}` })}
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="22%" align="center" style={{ paddingVertical: 4 }}>
              {t("pdf.unifiedTable.colLoop", "Pętla zwarcia")}
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="center">{t("pdf.unifiedTable.colResult", "Ocena")}</PdfTableHeaderCell>
          </PdfTableHeaderRow>
          <PdfTableHeaderRow isSubHeader>
            <PdfTableHeaderCell width="4%" align="center" />
            <PdfTableHeaderCell width="20%" />
            <PdfTableHeaderCell width="12%" />
            <PdfTableHeaderCell width="8%" align="center" />
            <PdfTableHeaderCell width="22%" align="center" style={{ paddingTop: 5, paddingBottom: 5 }}>
              <View style={{ display: "flex", flexDirection: "row", flex: 1, width: "100%" }}>
                <View style={{ flex: 1, alignItems: "center", borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.ink, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colLN", "L-N")}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center", borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.ink, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colLPE", "L-PE")}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.ink, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colNPE", "N-PE")}</Text>
                </View>
              </View>
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="22%" align="center" style={{ paddingTop: 5, paddingBottom: 5 }}>
              <View style={{ display: "flex", flexDirection: "row", flex: 1, width: "100%" }}>
                <View style={{ flex: 1, alignItems: "center", borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.ink, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colZs", "Zs [Ω]")}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: palette.ink, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("pdf.unifiedTable.colZadm", "Zadm [Ω]")}</Text>
                </View>
              </View>
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="center" />
          </PdfTableHeaderRow>
          {chunk.map((row, index) => (
            <PdfTableBodyRow key={index} isAlt={index % 2 !== 0}>
              <PdfTableCell width="4%" variant="index">{row.index}</PdfTableCell>
              <PdfTableCell width="20%" variant="emphasis">{row.circuitName}</PdfTableCell>
              <PdfTableCell width="12%" variant="muted">{row.location}</PdfTableCell>
              <PdfTableCell width="8%" align="center" variant="emphasis">{row.protectionType}</PdfTableCell>
              <PdfTableCell width="22%" style={{ paddingHorizontal: 0, backgroundColor: "transparent" }}>
                <View style={{ display: "flex", flexDirection: "row", flex: 1, width: "100%" }}>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 6, paddingBottom: 6, borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.lnResistance}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 6, paddingBottom: 6, borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.lpeResistance}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 6, paddingBottom: 6 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.npeResistance}</Text>
                  </View>
                </View>
              </PdfTableCell>
              <PdfTableCell width="22%" style={{ paddingHorizontal: 0 }}>
                <View style={{ display: "flex", flexDirection: "row", flex: 1, width: "100%" }}>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 6, paddingBottom: 6, borderRightWidth: 0.5, borderRightColor: palette.hairline, borderRightStyle: "solid" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.measuredImpedance}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 6, paddingBottom: 6 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{row.allowedImpedance}</Text>
                  </View>
                </View>
              </PdfTableCell>
              <PdfTableCell width="12%" align="center" variant={row.assessment === "Pozytywna" ? "success" : "emphasis"}>{row.assessment}</PdfTableCell>
            </PdfTableBodyRow>
          ))}
        </PdfTable>
      </PdfSection>

      {isLastPage && (
        <PdfSection
          number={isFirstPage ? "03" : "02"}
          title={t("pdf.unifiedTable.section3", "Uwagi, legenda i zalecenia")}
        >
          <PdfGrid style={{ alignItems: "flex-start" }}>
            <PdfGridColumn>
              <PdfEyebrow style={{ marginBottom: 6 }}>{t("pdf.unifiedTable.noteLabel", "Uwaga")}</PdfEyebrow>
              <Text style={{ fontSize: 8.5, fontWeight: "normal", lineHeight: 1.5, color: palette.ink }}>
                {t("pdf.unifiedTable.noteText", { testVoltage: protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V"), defaultValue: `Wszystkie odbiorniki elektryczne na czas pomiaru rezystancji izolacji zostały odłączone. Pomiary przeprowadzono przy napięciu probierczym stałym ${protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")}.` })}
              </Text>
              <PdfEyebrow style={{ marginTop: 14, marginBottom: 6 }}>{t("pdf.unifiedTable.legendLabel", "Legenda")}</PdfEyebrow>
              <Text style={{ fontSize: 8.5, fontWeight: "normal", lineHeight: 1.5, color: palette.ink }}>
                {t("pdf.unifiedTable.legendText", " In — prąd znamionowy zabezpieczenia, Zs — zmierzona impedancja pętli zwarcia, Zadm — maksymalna dopuszczalna impedancja pętli zwarcia warunkująca szybkie wyłączenie.")}
              </Text>
            </PdfGridColumn>
            <PdfGridColumn>
              {metadata.measurementProtocols?.recommendationsText && (
                <>
                  <PdfEyebrow style={{ marginBottom: 6 }}>{t("pdf.unifiedTable.section4", "Zalecenia")}</PdfEyebrow>
                  <PdfCallout>
                    {metadata.measurementProtocols.recommendationsText}
                  </PdfCallout>
                </>
              )}
            </PdfGridColumn>
          </PdfGrid>

          {metadata.isFormalDocumentationMode !== false && (
            <PdfSignatureRow>
              <PdfSignatureSlot
                label={t("pdf.footer.checkedBy", "Sprawdził (Wykonawca / Elektryk)")}
                subLabel={t("pdf.footer.sepSignature", "Podpis osoby z uprawnieniami SEP")}
                placeholder={t("pdf.footer.signatureSlot", "miejsce na pieczęć / podpis")}
              />
              <PdfSignatureEmptySlot />
              <PdfSignatureEmptySlot />
            </PdfSignatureRow>
          )}
        </PdfSection>
      )}

      <PdfFooter leftText={t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")} />
    </PdfPage>
  );
}