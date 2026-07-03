import { EMPTY_FIELD_PLACEHOLDER } from "../../lib/export/pdfPages/pdfHelpers";
import { PageFooter } from "./ProtocolShared";
import { useTranslation } from "react-i18next";

interface CircuitListTabProps {
  circuitListPages: any[][];
  circuitListRowsCount: number;
  displayDate: string;
  objectType: string;
  circuitListStartPage: number;
  totalUiPages: number;
}

export function CircuitListTab({
  circuitListPages,
  circuitListRowsCount,
  displayDate,
  objectType,
  circuitListStartPage,
  totalUiPages,
}: CircuitListTabProps) {
  const { t } = useTranslation();
  return (
    <>
      {circuitListPages.map((rowsPage, pageIndex) => (
        <div className="a4-page a4-page--landscape" key={`circuit-list-page-${pageIndex}`}>
          <div className="pd-page-top-bar" />

          {/* Header */}
          <div className="pd-page-header">
            <div className="pd-page-header-left">
              <div>
                <div className="pd-eyebrow">{t("app.pdf.circuits.title", "Lista obwodów")}</div>
                <div className="pd-page-title">{t("app.pdf.circuits.mainHeader", "Zestawienie obwodów instalacji elektrycznej")}</div>
                <div className="pd-page-subtitle">
                  {t("app.pdf.circuits.subtitle", "Arkusz {{page}} z {{total}} • dane z aktualnej rozdzielnicy", { page: pageIndex + 1, total: circuitListPages.length })}
                </div>
              </div>
            </div>
            <div className="pd-page-header-right">
              <div className="pd-meta-label">{t("app.pdf.shared.date", "Data")}</div>
              <div className="pd-meta-value">{displayDate}</div>
              <div className="pd-meta-label" style={{ marginTop: 6 }}>{t("app.pdf.shared.object", "Obiekt")}</div>
              <div className="pd-meta-value" style={{ fontSize: 8.5 }}>{objectType}</div>
            </div>
          </div>

          {/* Section — single section (table is the content) */}
          <div className="pd-section-heading">
            <span className="pd-section-number">01</span>
            <span className="pd-section-title">
              {pageIndex === 0
                ? t("app.pdf.circuits.tableHeader", "Lista obwodów")
                : t("app.pdf.circuits.tableHeaderContinued", "Lista obwodów · arkusz {{page}}", { page: pageIndex + 1 })}
            </span>
          </div>

          <table className="pd-table">
            <thead>
              <tr>
                <th className="pd-center" style={{ width: 32 }}>{t("app.pdf.circuits.columns.no", "Lp.")}</th>
                <th className="pd-center" style={{ width: 64 }}>{t("app.pdf.circuits.columns.designation", "Ozn.")}</th>
                <th style={{ width: 144 }}>{t("app.pdf.circuits.columns.circuitName", "Nazwa obwodu")}</th>
                <th style={{ width: 112 }}>{t("app.pdf.circuits.columns.location", "Lokalizacja")}</th>
                <th className="pd-center" style={{ width: 48 }}>{t("app.pdf.circuits.columns.phase", "Faza")}</th>
                <th className="pd-center" style={{ width: 80 }}>{t("app.pdf.circuits.columns.protection", "Zabezp.")}</th>
                <th className="pd-center" style={{ width: 96 }}>{t("app.pdf.circuits.columns.rcd", "RCD")}</th>
                <th className="pd-center" style={{ width: 64 }}>{t("app.pdf.circuits.columns.cable", "Przewód")}</th>
                <th className="pd-center" style={{ width: 64 }}>{t("app.pdf.circuits.columns.length", "Dł. [m]")}</th>
                <th className="pd-center" style={{ width: 64 }}>{t("app.pdf.circuits.columns.power", "Moc [W]")}</th>
              </tr>
            </thead>
            <tbody>
              {rowsPage.map(({ index, location, rcdLabel, rcdProtection, row }, rowIdx) => (
                <tr key={row.id} className={rowIdx % 2 === 1 ? "pd-alt" : ""}>
                  <td className="pd-index">{index}</td>
                  <td className="pd-center pd-emphasis font-mono">{row.referenceDesignation || EMPTY_FIELD_PLACEHOLDER}</td>
                  <td className="pd-emphasis">{row.circuitName || row.label || EMPTY_FIELD_PLACEHOLDER}</td>
                  <td className="pd-muted">{location || row.displayLocation || EMPTY_FIELD_PLACEHOLDER}</td>
                  <td className="pd-center font-mono">{row.phase || EMPTY_FIELD_PLACEHOLDER}</td>
                  <td className="pd-center pd-emphasis font-mono">{row.displayProtection || row.protectionType || EMPTY_FIELD_PLACEHOLDER}</td>
                  <td className="pd-center">
                    <div className="pd-emphasis">{rcdLabel || EMPTY_FIELD_PLACEHOLDER}</div>
                    {rcdProtection ? <div className="text-[8px] text-gray-500 mt-0.5">{rcdProtection}</div> : null}
                  </td>
                  <td className="pd-center font-mono">{row.cableCrossSection ? `${row.cableCrossSection} mm²` : EMPTY_FIELD_PLACEHOLDER}</td>
                  <td className="pd-center font-mono">{row.cableLength || EMPTY_FIELD_PLACEHOLDER}</td>
                  <td className="pd-center font-mono">{row.powerW || EMPTY_FIELD_PLACEHOLDER}</td>
                </tr>
              ))}
              {circuitListRowsCount === 0 && (
                <tr>
                  <td colSpan={10} className="pd-empty-row">{t("app.pdf.circuits.empty", "Brak obwodów do pokazania.")}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-auto">
            <PageFooter pageNumber={circuitListStartPage + pageIndex} totalUiPages={totalUiPages} />
          </div>
        </div>
      ))}
    </>
  );
}