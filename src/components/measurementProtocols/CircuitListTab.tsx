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
          <div>
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 gap-4">
              <div className="flex items-center gap-3 flex-grow" style={{ minWidth: 0 }}>
                <div className="px-3 py-1 bg-brand text-white font-bold rounded text-xs uppercase tracking-wider">
                  {t("app.pdf.circuits.title", "Lista obwodów")}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase">
                    {t("app.pdf.circuits.mainHeader", "Zestawienie obwodów instalacji elektrycznej")}
                  </h2>
                  <p className="text-[9px] text-gray-500 font-medium">
                    {t("app.pdf.circuits.subtitle", "Arkusz {{page}} z {{total}} • dane z aktualnej rozdzielnicy", { page: pageIndex + 1, total: circuitListPages.length })}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[9px] text-gray-400">{t("app.pdf.shared.date", "Data:")} <span className="font-medium text-gray-700">{displayDate}</span></div>
                <div className="text-[9px] text-gray-500 mt-0.5">{t("app.pdf.shared.object", "Obiekt:")} <span className="font-semibold text-gray-900">{objectType}</span></div>
              </div>
            </div>

            <div className="mt-4">
              <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-300 flex justify-between items-center">
                <span>{pageIndex === 0 ? t("app.pdf.circuits.tableHeader", "1. Lista obwodów") : t("app.pdf.circuits.tableHeaderContinued", "1. Lista obwodów (ciąg dalszy {{page}})", { page: pageIndex + 1 })}</span>
                <span className="text-gray-500 font-medium">{circuitListRowsCount} {t("app.pdf.circuits.itemsCount", "pozycji")}</span>
              </div>
              <div className="overflow-x-auto border-x border-b border-gray-300 rounded-b-lg">
                <table className="w-full text-left border-collapse" style={{ fontSize: "9px" }}>
                  <thead>
                    <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                      <th className="p-2 border-r border-gray-300 text-center w-8">{t("app.pdf.circuits.columns.no", "Lp.")}</th>
                      <th className="p-2 border-r border-gray-300 text-center w-16">{t("app.pdf.circuits.columns.designation", "Ozn.")}</th>
                      <th className="p-2 border-r border-gray-300 w-36">{t("app.pdf.circuits.columns.circuitName", "Nazwa obwodu")}</th>
                      <th className="p-2 border-r border-gray-300 w-28">{t("app.pdf.circuits.columns.location", "Lokalizacja")}</th>
                      <th className="p-2 border-r border-gray-300 text-center w-12">{t("app.pdf.circuits.columns.phase", "Faza")}</th>
                      <th className="p-2 border-r border-gray-300 text-center w-20">{t("app.pdf.circuits.columns.protection", "Zabezp.")}</th>
                      <th className="p-2 border-r border-gray-300 text-center w-24">{t("app.pdf.circuits.columns.rcd", "RCD")}</th>
                      <th className="p-2 border-r border-gray-300 text-center w-16">{t("app.pdf.circuits.columns.cable", "Przewód")}</th>
                      <th className="p-2 border-r border-gray-300 text-center w-16">{t("app.pdf.circuits.columns.length", "Dł. [m]")}</th>
                      <th className="p-2 text-center w-16">{t("app.pdf.circuits.columns.power", "Moc [W]")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rowsPage.map(({ index, location, rcdLabel, rcdProtection, row }) => (
                      <tr key={row.id} className="border-b border-gray-200">
                        <td className="p-2 border-r border-gray-300 text-center font-bold text-gray-700">{index}</td>
                        <td className="p-2 border-r border-gray-300 text-center font-mono font-semibold text-gray-900">{row.referenceDesignation || EMPTY_FIELD_PLACEHOLDER}</td>
                        <td className="p-2 border-r border-gray-300 font-semibold text-gray-900">{row.circuitName || row.label || EMPTY_FIELD_PLACEHOLDER}</td>
                        <td className="p-2 border-r border-gray-300 text-gray-700">{location || row.displayLocation || EMPTY_FIELD_PLACEHOLDER}</td>
                        <td className="p-2 border-r border-gray-300 text-center font-mono text-gray-900">{row.phase || EMPTY_FIELD_PLACEHOLDER}</td>
                        <td className="p-2 border-r border-gray-300 text-center font-mono font-semibold text-gray-900">{row.displayProtection || row.protectionType || EMPTY_FIELD_PLACEHOLDER}</td>
                        <td className="p-2 border-r border-gray-300 text-center text-gray-700">
                          <div className="font-semibold">{rcdLabel || EMPTY_FIELD_PLACEHOLDER}</div>
                          {rcdProtection ? <div className="text-[8px] text-gray-500">{rcdProtection}</div> : null}
                        </td>
                        <td className="p-2 border-r border-gray-300 text-center font-mono text-gray-900">{row.cableCrossSection ? `${row.cableCrossSection} mm²` : EMPTY_FIELD_PLACEHOLDER}</td>
                        <td className="p-2 border-r border-gray-300 text-center font-mono text-gray-900">{row.cableLength || EMPTY_FIELD_PLACEHOLDER}</td>
                        <td className="p-2 text-center font-mono text-gray-900">{row.powerW || EMPTY_FIELD_PLACEHOLDER}</td>
                      </tr>
                    ))}
                    {circuitListRowsCount === 0 && (
                      <tr>
                        <td className="p-3 text-center text-gray-500" colSpan={10}>{t("app.pdf.circuits.empty", "Brak obwodów do pokazania.")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <PageFooter pageNumber={circuitListStartPage + pageIndex} totalUiPages={totalUiPages} />
          </div>
        </div>
      ))}
    </>
  );
}
