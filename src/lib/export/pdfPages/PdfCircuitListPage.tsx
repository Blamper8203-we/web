
import type { CircuitListTableRow } from "../../circuitRows";
import { EMPTY_FIELD_PLACEHOLDER } from "./pdfHelpers";
import i18next from "i18next";
import { Text, View } from "@react-pdf/renderer";
import { palette } from "./pdfStyles";
import {
  PdfPage, PdfHeader, PdfFooter, PdfSection,
  PdfTable, PdfTableHeaderRow, PdfTableHeaderCell, PdfTableBodyRow, PdfTableCell
} from "../pdfComponents";

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
    <PdfPage id={chunkIdx === 0 ? "circuit-list" : undefined} orientation="landscape" variant="preview">
      <PdfHeader
        eyebrow={t("pdf.circuitList.badge", "Lista obwodów")}
        title={t("pdf.circuitList.title", "Zestawienie obwodów instalacji elektrycznej")}
        subtitle={t("pdf.circuitList.sheet", { current: chunkIdx + 1, total: totalChunks, defaultValue: `Arkusz ${chunkIdx + 1} z ${totalChunks} • dane z aktualnej rozdzielnicy` })}
        rightContent={
          <View>
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 7.5, color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", textAlign: "right" }}>{t("pdf.circuitList.date", "Data")}</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: palette.ink, textAlign: "right" }}>{displayDate}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 7.5, color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", textAlign: "right" }}>{t("pdf.circuitList.object", "Obiekt")}</Text>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink, textAlign: "right" }}>{fallbackObjectName}</Text>
            </View>
          </View>
        }
      />

      <PdfSection
        number="01"
        title={chunkIdx === 0
          ? t("pdf.circuitList.section1", "Lista obwodów")
          : t("pdf.circuitList.section1Continued", `Lista obwodów · arkusz ${chunkIdx + 1}`)
        }
      >
        <PdfTable>
          <PdfTableHeaderRow>
            <PdfTableHeaderCell width="4%" align="center">{t("pdf.circuitList.colIndex", "Lp.")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="8%" align="center">{t("pdf.circuitList.colId", "Ozn.")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="20%">{t("pdf.circuitList.colDesc", "Nazwa obwodu")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="13%">{t("pdf.circuitList.colLocation", "Lokalizacja")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="7%" align="center">{t("pdf.circuitList.colPhase", "Faza")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="center">{t("pdf.circuitList.colProt", "Zabezp.")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="14%">{t("pdf.circuitList.colRcd", "RCD")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="8%" align="center">{t("pdf.circuitList.colCable", "Przewód")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="7%" align="center">{t("pdf.circuitList.colLength", "Dł. [m]")}</PdfTableHeaderCell>
            <PdfTableHeaderCell width="7%" align="center">{t("pdf.circuitList.colPower", "Moc [W]")}</PdfTableHeaderCell>
          </PdfTableHeaderRow>

          {chunk.map(({ index, location, rcdLabel, rcdProtection, row }, rowIdx) => (
            <PdfTableBodyRow key={row.id} isAlt={rowIdx % 2 !== 0}>
              <PdfTableCell width="4%" variant="index">{index}</PdfTableCell>
              <PdfTableCell width="8%" align="center" variant="emphasis">{row.referenceDesignation || EMPTY_FIELD_PLACEHOLDER}</PdfTableCell>
              <PdfTableCell width="20%" variant="emphasis">{row.circuitName || row.label || EMPTY_FIELD_PLACEHOLDER}</PdfTableCell>
              <PdfTableCell width="13%" variant="muted">{location || row.displayLocation || EMPTY_FIELD_PLACEHOLDER}</PdfTableCell>
              <PdfTableCell width="7%" align="center">{row.phase || EMPTY_FIELD_PLACEHOLDER}</PdfTableCell>
              <PdfTableCell width="12%" align="center" variant="emphasis">{row.displayProtection || row.protectionType || EMPTY_FIELD_PLACEHOLDER}</PdfTableCell>
              <PdfTableCell width="14%">
                <View style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "bold", color: palette.ink }}>{rcdLabel || EMPTY_FIELD_PLACEHOLDER}</Text>
                  {rcdProtection && <Text style={{ fontSize: 7.5, color: palette.inkTertiary, marginTop: 1 }}>{rcdProtection}</Text>}
                </View>
              </PdfTableCell>
              <PdfTableCell width="8%" align="center">{row.cableCrossSection ? `${row.cableCrossSection} mm²` : EMPTY_FIELD_PLACEHOLDER}</PdfTableCell>
              <PdfTableCell width="7%" align="center">{row.cableLength || EMPTY_FIELD_PLACEHOLDER}</PdfTableCell>
              <PdfTableCell width="7%" align="center">{row.powerW || EMPTY_FIELD_PLACEHOLDER}</PdfTableCell>
            </PdfTableBodyRow>
          ))}

          {chunk.length === 0 && (
            <PdfTableBodyRow>
              <PdfTableCell width="100%" align="center" variant="muted" style={{ paddingTop: 24, paddingBottom: 24 }}>
                {t("pdf.circuitList.empty", "Brak obwodów do pokazania.")}
              </PdfTableCell>
            </PdfTableBodyRow>
          )}
        </PdfTable>
      </PdfSection>

      <PdfFooter leftText={t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")} />
    </PdfPage>
  );
}