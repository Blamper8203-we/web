import type { ProjectMetadata } from "../../../types/projectMetadata";
import { formatProtocolNumberLabel, formatProtocolTitle, protocolValue } from "./pdfHelpers";
import i18next from "i18next";
import { Text, View } from "@react-pdf/renderer";
import { palette } from "./pdfStyles";
import {
  PdfPage, PdfHeader, PdfFooter, PdfSection, PdfDataRow, PdfGrid, PdfGridColumn, PdfCallout,
  PdfTable, PdfTableHeaderRow, PdfTableHeaderCell, PdfTableBodyRow, PdfTableCell, PdfSignatureRow, PdfSignatureSlot, PdfSignatureEmptySlot
} from "../pdfComponents";

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
    <PdfPage id="rcd" variant="title">
      <PdfHeader
        brandText={t("pdf.rcdTable.badge", "RCD i uziemienie")}
        brandSubText=""
        rightContent={
          <View>
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 7.5, color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", textAlign: "right" }}>{t("pdf.rcdTable.date", "Data pomiarów")}</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: palette.ink, textAlign: "right" }}>{displayDate}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 7.5, color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", textAlign: "right" }}>{t("pdf.rcdTable.object", "Obiekt")}</Text>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink, textAlign: "right" }}>{fallbackObjectName}</Text>
            </View>
          </View>
        }
        rightLineText={
          <Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: palette.ink, letterSpacing: -0.4, lineHeight: 1.15 }}>
              {t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}
              <Text style={{ color: palette.accent }}>{rcdProtocolNumberLabel}</Text>
            </Text>
            {"\n"}
            <Text style={{ fontSize: 10, color: palette.inkMuted, marginTop: 4 }}>
              {t("pdf.rcdTable.title", "Test wyłączników różnicowoprądowych RCD i pomiar rezystancji uziemienia")}
            </Text>
          </Text>
        }
      />

      <PdfSection
        number="01"
        title={t("pdf.rcdTable.section1", "Dane techniczne i narzędzia pomiarowe")}
      >
        <PdfGrid columns={2}>
          <PdfGridColumn>
            <PdfDataRow labelWidth={130} label={t("pdf.rcdTable.meter", "Miernik")} value={protocolValue(metadata.measurementProtocols?.rcdGroundMeterName, "—")} valueStyle={{ fontSize: 9 }} />
            <PdfDataRow labelWidth={130} label={t("pdf.rcdTable.serialNo", "Numer fabryczny")} value={protocolValue(metadata.measurementProtocols?.rcdGroundMeterSerialNumber, "—")} valueStyle={{ fontSize: 9 }} isLast />
          </PdfGridColumn>
          <PdfGridColumn />
        </PdfGrid>
      </PdfSection>

      <PdfSection
        number="02"
        title={t("pdf.rcdTable.section2", "Tabela pomiarów — wyłączniki różnicowoprądowe")}
      >
        <PdfTable>
          <PdfTableHeaderRow>
            <PdfTableHeaderCell width="6%" align="center">{t("pdf.rcdTable.colIndex", "Lp.")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="24%">{t("pdf.rcdTable.colType", "Typ RCD")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="14%" align="center">{t("pdf.rcdTable.colIdn", "IΔn [mA]")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="16%" align="center">{t("pdf.rcdTable.colTripCurrent", "Prąd wyzw. [mA]")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="16%" align="center">{t("pdf.rcdTable.colTripTime", "Czas wyzw. [ms]")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="14%" align="center">{t("pdf.rcdTable.colTest", "Przycisk TEST")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="10%" align="center">{t("pdf.rcdTable.colResult", "Ocena")}</PdfTableHeaderCell>
          </PdfTableHeaderRow>
          
          {(metadata.measurementProtocols?.rcdRows ?? []).map((row, index) => (
            <PdfTableBodyRow key={index} isAlt={index % 2 !== 0}>
              <PdfTableCell width="6%" variant="index">{row.index}</PdfTableCell>
              <PdfTableCell width="24%" variant="emphasis">{row.deviceType}</PdfTableCell>
              <PdfTableCell width="14%" align="center" variant="emphasis">{row.residualCurrent}</PdfTableCell>
              <PdfTableCell width="16%" align="center">{row.tripCurrent}</PdfTableCell>
              <PdfTableCell width="16%" align="center">{row.tripTimeMs}</PdfTableCell>
              <PdfTableCell width="14%" align="center" variant="success">{row.testButtonResult}</PdfTableCell>
              <PdfTableCell width="10%" align="center" variant="success">{row.assessment}</PdfTableCell>
            </PdfTableBodyRow>
          ))}
          
          {(metadata.measurementProtocols?.rcdRows ?? []).length === 0 && (
            <PdfTableBodyRow>
              <PdfTableCell width="100%" align="center" variant="muted" style={{ paddingVertical: 24 }}>
                {t("pdf.rcdTable.empty", "Brak pomiarów RCD do pokazania.")}
              </PdfTableCell>
            </PdfTableBodyRow>
          )}
        </PdfTable>
      </PdfSection>

      <PdfSection
        number="03"
        title={t("pdf.rcdTable.section3", "Pomiar rezystancji uziemienia (GSU)")}
      >
        <PdfGrid columns={2}>
          <PdfGridColumn>
            <PdfDataRow labelWidth={130} label={t("pdf.rcdTable.method", "Metoda pomiaru")} value={protocolValue(metadata.measurementProtocols?.groundMeasurementMethod, "—")} valueStyle={{ fontSize: 9 }} />
            <PdfDataRow labelWidth={130} label={t("pdf.rcdTable.electrodeType", "Rodzaj uziomu")} value={protocolValue(metadata.measurementProtocols?.groundElectrodeType, "—")} valueStyle={{ fontSize: 9 }} isLast />
          </PdfGridColumn>
          <PdfGridColumn>
            <PdfDataRow labelWidth={130} label={t("pdf.rcdTable.measuredRu", "Zmierzona wartość Ru")} value={`${protocolValue(metadata.measurementProtocols?.groundMeasuredResistance, "—")} Ω`} valueStyle={{ fontSize: 12, color: palette.accent }} />
            <PdfDataRow labelWidth={130} label={t("pdf.rcdTable.requiredVal", "Wartość wymagana")} value={`${protocolValue(metadata.measurementProtocols?.groundRequiredResistance, "—")} Ω`} valueStyle={{ fontSize: 12 }} isLast />
          </PdfGridColumn>
        </PdfGrid>
      </PdfSection>

      <PdfCallout title={t("pdf.rcdTable.conclusion", "Orzeczenie techniczne")}>
        {protocolValue(metadata.measurementProtocols?.groundConclusionText, "Instalacja uziemiająca spełnia wymagania...")}
      </PdfCallout>

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

      <PdfFooter leftText={t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")} />
    </PdfPage>
  );
}