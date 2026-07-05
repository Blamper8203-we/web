import type { MeasurementProtocolsData } from "../../types/projectMetadata";
import { formatProtocolNumberLabel } from "../../lib/export/pdfPages/pdfHelpers";
import { createHeaderForPage } from "../../lib/measurementProtocolHelpers";
import { PageFooter } from "./ProtocolShared";
import { useTranslation } from "react-i18next";

interface RcdProtocolsTabProps {
  protocols: MeasurementProtocolsData;
  updateProtocols: (patch: Partial<MeasurementProtocolsData>) => void;
  updateTableRow: (
    key: "rcdRows",
    index: number,
    field: any,
    value: string
  ) => void;
  displayDate: string;
  objectType: string;
  rcdPageIndex: number;
  totalUiPages: number;
}

export function RcdProtocolsTab({
  protocols,
  updateProtocols,
  updateTableRow,
  displayDate,
  objectType,
  rcdPageIndex,
  totalUiPages,
}: RcdProtocolsTabProps) {
  const { t } = useTranslation();
  const originalTitle = protocols.rcdGroundHeader?.headerTitle || "Protokół Nr 04 / 2026";
  const protocolNumberLabel = formatProtocolNumberLabel(originalTitle);
  const rowsPage = protocols.rcdRows || [];
  const absoluteIndexBase = 0;

  return (
    <div className="a4-page" key="rcd-ground-page-single">
      <div className="pd-page-top-bar" />

      {/* Header */}
      <div className="pd-page-header">
        <div className="pd-page-header-left">
          <div>
            <div className="pd-eyebrow">{t("pdf.rcd.title", "RCD i uziemienie")}</div>
            <div className="pd-page-title">
              {t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}
              <span className="pd-protocol-pill" style={{ marginLeft: 6, display: "inline-block" }}>{protocolNumberLabel}</span>
            </div>
            <div className="pd-page-subtitle">
              {t("pdf.rcd.subtitle", "Test wyłączników różnicowoprądowych RCD i pomiar rezystancji uziemienia")}
            </div>
          </div>
        </div>
        <div className="pd-page-header-right">
          <div className="pd-meta-label">{t("pdf.unified.measureDate", "Data pomiarów")}</div>
          <div className="pd-meta-value">{displayDate}</div>
          <div className="pd-meta-label" style={{ marginTop: 6 }}>{t("app.pdf.shared.object", "Obiekt")}</div>
          <div className="pd-meta-value" style={{ fontSize: 8.5 }}>{objectType}</div>
        </div>
      </div>

      {/* Section 01 — Dane techniczne */}
      <div className="pd-section-heading">
        <span className="pd-section-number">01</span>
        <span className="pd-section-title">{t("pdf.unified.section1Title", "Dane techniczne i narzędzia pomiarowe")}</span>
      </div>
      <div className="pd-two-col-grid">
        <div className="pd-two-col-item">
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.rcd.meterName", "Miernik:")}</span>
            <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.rcdGroundMeterName || ""} placeholder="..." onChange={(e) => updateProtocols({ rcdGroundMeterName: e.target.value })} />
          </div>
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.rcd.meterSerial", "Nr fabryczny:")}</span>
            <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.rcdGroundMeterSerialNumber || ""} placeholder="..." onChange={(e) => updateProtocols({ rcdGroundMeterSerialNumber: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Section 02 — Tabela RCD */}
      <div className="pd-section-heading">
        <span className="pd-section-number">02</span>
        <span className="pd-section-title">{t("pdf.rcd.section2Title", "Tabela pomiarów — wyłączniki różnicowoprądowe")}</span>
      </div>
      <table className="pd-table">
        <thead>
          <tr>
            <th className="pd-center" style={{ width: 32 }}>{t("pdf.rcd.table.no", "Lp.")}</th>
            <th style={{ width: 192 }}>{t("pdf.rcd.table.rcdType", "Typ RCD")}</th>
            <th className="pd-center" style={{ width: 80 }}>{t("pdf.rcd.table.idn", "IΔn [mA]")}</th>
            <th className="pd-center" style={{ width: 96 }}>{t("pdf.rcd.table.tripCurrent", "Prąd wyzw. [mA]")}</th>
            <th className="pd-center" style={{ width: 96 }}>{t("pdf.rcd.table.tripTime", "Czas wyzw. [ms]")}</th>
            <th className="pd-center" style={{ width: 80 }}>{t("pdf.rcd.table.testBtn", "Przycisk TEST")}</th>
            <th className="pd-center" style={{ width: 80 }}>{t("pdf.rcd.table.eval", "Ocena")}</th>
          </tr>
        </thead>
        <tbody>
          {rowsPage.map((row, localIndex) => {
            const absoluteIndex = absoluteIndexBase + localIndex;
            const altCls = localIndex % 2 === 1 ? "pd-alt" : "";
            return (
              <tr key={absoluteIndex} className={altCls}>
                <td className="pd-index">{row.index}</td>
                <td className="pd-emphasis"><input className="mp-editable text-gray-900" value={row.deviceType} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "deviceType", e.target.value)} /></td>
                <td className="pd-center pd-emphasis font-mono"><input className="mp-editable text-center" style={{ background: "transparent" }} value={row.residualCurrent} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "residualCurrent", e.target.value)} /></td>
                <td className="pd-center font-mono"><input className="mp-editable text-center" style={{ background: "transparent" }} value={row.tripCurrent} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "tripCurrent", e.target.value)} /></td>
                <td className="pd-center font-mono"><input className="mp-editable text-center" style={{ background: "transparent" }} value={row.tripTimeMs} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "tripTimeMs", e.target.value)} /></td>
                <td className="pd-center pd-success"><input className="mp-editable text-center" style={{ background: "transparent", color: "var(--pd-success)", fontWeight: 700 }} value={row.testButtonResult} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "testButtonResult", e.target.value)} /></td>
                <td className="pd-center pd-success"><input className="mp-editable text-center" style={{ background: "transparent", color: "var(--pd-success)", fontWeight: 700 }} value={row.assessment} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "assessment", e.target.value)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Section 03 — Pomiar rezystancji uziemienia */}
      <div className="pd-section-heading">
        <span className="pd-section-number">03</span>
        <span className="pd-section-title">{t("pdf.rcd.section3Title", "Pomiar rezystancji uziemienia (GSU)")}</span>
      </div>
      <div className="pd-two-col-grid">
        <div className="pd-two-col-item">
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.rcd.groundMethod", "Metoda pomiaru:")}</span>
            <input className="mp-editable text-gray-950 font-bold flex-grow" style={{ borderBottom: "0.5px solid var(--pd-hairline)" }} value={protocols.groundMeasurementMethod || ""} placeholder="..." onChange={(e) => updateProtocols({ groundMeasurementMethod: e.target.value })} />
          </div>
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.rcd.groundType", "Rodzaj uziomu:")}</span>
            <input className="mp-editable text-gray-950 font-bold flex-grow" style={{ borderBottom: "0.5px solid var(--pd-hairline)" }} value={protocols.groundElectrodeType || ""} placeholder="..." onChange={(e) => updateProtocols({ groundElectrodeType: e.target.value })} />
          </div>
        </div>
        <div className="pd-two-col-item">
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.rcd.groundMeasured", "Zmierzona wartość Ru:")}</span>
            <input className="mp-editable text-brand font-mono" style={{ fontSize: 11, fontWeight: 800, padding: "0 4px", maxWidth: 80 }} value={protocols.groundMeasuredResistance || ""} placeholder="..." onChange={(e) => updateProtocols({ groundMeasuredResistance: e.target.value })} />
            <span className="font-bold text-gray-900 ml-1">Ω</span>
          </div>
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.rcd.groundRequired", "Wartość wymagana:")}</span>
            <input className="mp-editable text-gray-900 font-bold font-mono" style={{ padding: "0 4px", maxWidth: 80 }} value={protocols.groundRequiredResistance || ""} placeholder="..." onChange={(e) => updateProtocols({ groundRequiredResistance: e.target.value })} />
            <span className="font-bold text-gray-900 ml-1">Ω</span>
          </div>
        </div>
      </div>

      {/* Orzeczenie techniczne — callout */}
      <div className="pd-callout" style={{ marginTop: 8 }}>
        <div className="pd-callout-title">{t("pdf.rcd.conclusionLabel", "Orzeczenie techniczne")}</div>
        <textarea
          className="mp-editable w-full"
          style={{ fontSize: 9.5, lineHeight: 1.55, color: "#334155", background: "transparent", border: "none", padding: 0, minHeight: 40, resize: "vertical" }}
          rows={2}
          value={protocols.groundConclusionText || ""}
          placeholder={t("pdf.rcd.conclusionPlaceholder", "Wpisz orzeczenie...")}
          onChange={(e) => updateProtocols({ groundConclusionText: e.target.value })}
        />
      </div>

      {/* Signature */}
      <div className="pd-signature-row">
        <div className="pd-signature-slot">
          <div className="pd-signature-line">
            <span className="pd-data-value-muted" style={{ fontSize: 7 }}>{t("pdf.unified.stampPlaceholder", "miejsce na pieczęć / podpis")}</span>
          </div>
          <div className="pd-signature-label">{t("pdf.unified.contractorSignature", "Sprawdził (Wykonawca / Elektryk)")}</div>
          <div className="pd-signature-sub-label">{t("pdf.unified.contractorSubtitle", "Podpis osoby z uprawnieniami SEP")}</div>
        </div>
        <div style={{ width: 160 }} />
        <div style={{ width: 160 }} />
      </div>

      <PageFooter pageNumber={rcdPageIndex} totalUiPages={totalUiPages} noBorder />
    </div>
  );
}