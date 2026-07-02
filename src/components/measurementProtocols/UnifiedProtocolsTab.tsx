
import type { MeasurementProtocolsData, MeasurementUnifiedProtocolRow } from "../../types/projectMetadata";
import { UNIFIED_ROWS_PER_PAGE, formatProtocolNumberLabel } from "../../lib/export/pdfPages/pdfHelpers";
import { createHeaderForPage } from "../../lib/measurementProtocolHelpers";
import { PageFooter } from "./ProtocolShared";
import { useTranslation } from "react-i18next";

interface UnifiedProtocolsTabProps {
  protocols: MeasurementProtocolsData;
  updateProtocols: (patch: Partial<MeasurementProtocolsData>) => void;
  updateTableRow: (
    key: "unifiedRows",
    index: number,
    field: any,
    value: string
  ) => void;
  unifiedPages: MeasurementUnifiedProtocolRow[][];
  displayDate: string;
  objectType: string;
  unifiedStartPage: number;
  totalUiPages: number;
}

export function UnifiedProtocolsTab({
  protocols,
  updateProtocols,
  updateTableRow,
  unifiedPages,
  displayDate,
  objectType,
  unifiedStartPage,
  totalUiPages,
}: UnifiedProtocolsTabProps) {
  const { t } = useTranslation();
  return (
    <>
      {unifiedPages.map((rowsPage, pageIndex) => {
        const pageOffset = pageIndex * UNIFIED_ROWS_PER_PAGE;
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === unifiedPages.length - 1;
        const pageHeader = createHeaderForPage(protocols.unifiedHeader, pageIndex, unifiedPages.length);
        const protocolNumberLabel = formatProtocolNumberLabel(pageHeader.headerTitle);

        return (
          <div className="a4-page a4-page--landscape" key={`unified-page-${pageIndex}`}>
            <div>
              <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 gap-4">
                <div className="flex items-center gap-3 flex-grow" style={{ minWidth: 0 }}>
                  <div className="px-3 py-1 bg-brand text-white font-bold rounded text-xs uppercase tracking-wider">
                    {t("pdf.unified.title", "Tabela zbiorcza")}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase">{t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}<span className="bg-gray-100 px-1 rounded text-brand">{protocolNumberLabel}</span></h2>
                    <p className="text-[9px] text-gray-500 font-medium">{t("pdf.unified.subtitle", "Zbiorcze wyniki pomiarów pętli zwarcia i rezystancji izolacji")}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-gray-400">{t("pdf.unified.measureDate", "Data pomiarów:")} <span className="font-medium text-gray-700">{displayDate}</span></div>
                  <div className="text-[9px] text-gray-500 mt-0.5">{t("pdf.shared.object", "Obiekt:")} <span className="font-semibold text-gray-900">{objectType}</span></div>
                </div>
              </div>

              {isFirstPage && (
                <div className="mt-4">
                  <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-200">
                    {t("pdf.unified.section1Title", "1. Dane techniczne i narzędzia pomiarowe")}
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg p-3 bg-white grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">{t("pdf.unified.techData.meterLoop", "Miernik (Pętla):")}</span>
                      <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.loopMeterName || ""} placeholder="..." onChange={(e) => updateProtocols({ loopMeterName: e.target.value })} />
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">{t("pdf.unified.techData.meterInsulation", "Miernik (Izolacja):")}</span>
                      <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.insulationMeterName || ""} placeholder="..." onChange={(e) => updateProtocols({ insulationMeterName: e.target.value })} />
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">{t("pdf.unified.techData.serialLoop", "Nr ser. (Pętla):")}</span>
                      <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.loopMeterSerialNumber || ""} placeholder="..." onChange={(e) => updateProtocols({ loopMeterSerialNumber: e.target.value })} />
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">{t("pdf.unified.techData.serialInsulation", "Nr ser. (Izolacja):")}</span>
                      <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.insulationMeterSerialNumber || ""} placeholder="..." onChange={(e) => updateProtocols({ insulationMeterSerialNumber: e.target.value })} />
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">{t("pdf.unified.techData.voltage", "Napięcie sieci:")}</span>
                      <input className="mp-editable text-gray-900 font-semibold bg-gray-100 px-1.5 py-0.5 rounded w-24" value={protocols.loopNetworkVoltage || ""} placeholder={t("pdf.unified.techData.voltagePlaceholder", "np. 230/400V")} onChange={(e) => updateProtocols({ loopNetworkVoltage: e.target.value })} />
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">{t("pdf.unified.techData.system", "Układ sieci:")}</span>
                      <input className="mp-editable text-gray-900 font-semibold bg-gray-100 px-1.5 py-0.5 rounded flex-grow" value={protocols.loopNetworkSystem || ""} placeholder={t("pdf.unified.techData.systemPlaceholder", "np. TN-S / TN-C-S")} onChange={(e) => updateProtocols({ loopNetworkSystem: e.target.value })} />
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">{t("pdf.unified.techData.testVoltage", "Napięcie próby:")}</span>
                      <input className="mp-editable text-gray-900 font-semibold bg-gray-100 px-1.5 py-0.5 rounded w-16" value={protocols.insulationTestVoltage || "500V"} onChange={(e) => updateProtocols({ insulationTestVoltage: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-300 flex justify-between items-center">
                  <span>{isFirstPage ? t("pdf.unified.section2Title", "2. Zbiorcze wyniki pomiarów obwodów") : t("pdf.unified.section2TitleContinued", "2. Zbiorcze wyniki pomiarów obwodów (ciąg dalszy {{page}})", { page: pageIndex + 1 })}</span>
                </div>
                <div className="overflow-x-auto border-x border-b border-gray-300 rounded-b-lg">
                  <table className="w-full text-left border-collapse" style={{ fontSize: "10px" }}>
                    <thead>
                      <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                        <th className="p-2 border-r border-gray-300 text-center w-8">{t("pdf.unified.table.no", "Lp.")}</th>
                        <th className="p-2 border-r border-gray-300 w-48">{t("pdf.unified.table.circuitName", "Nazwa obwodu")}</th>
                        <th className="p-2 border-r border-gray-300 w-24">{t("pdf.unified.table.location", "Lokalizacja")}</th>
                        <th className="p-2 border-r border-gray-300 text-center w-16">{t("pdf.unified.table.in", "In")}</th>
                        <th colSpan={3} className="p-1 border-r border-gray-300 text-center bg-blue-50/50 text-gray-800">Riso [MΩ] ({t("pdf.unified.table.req", "Wym.")} {protocols.groundRequiredResistance || "> 1.0"})</th>
                        <th colSpan={2} className="p-1 border-r border-gray-300 text-center bg-gray-100 text-gray-800">{t("pdf.unified.table.loop", "Pętla zwarcia")}</th>
                        <th className="p-2 text-center w-16">{t("pdf.unified.table.evaluation", "Ocena")}</th>
                      </tr>
                      <tr className="bg-gray-50 text-[10px] text-gray-700 border-b border-gray-300">
                        <th colSpan={4} className="border-r border-gray-300"></th>
                        <th className="p-1 border-r border-gray-300 text-center font-bold w-12">{t("auto.ln_21", "L-N")}</th>
                        <th className="p-1 border-r border-gray-300 text-center font-bold w-12">{t("auto.lpe_53", "L-PE")}</th>
                        <th className="p-1 border-r border-gray-300 text-center font-bold w-12">{t("auto.npe_125", "N-PE")}</th>
                        <th className="p-1 border-r border-gray-300 text-center font-bold w-12">{t("auto.zs_62", "Zs [Ω]")}</th>
                        <th className="p-1 border-r border-gray-300 text-center font-bold w-12">{t("auto.zadm_332", "Zadm [Ω]")}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rowsPage.map((row, localIndex) => {
                        const absoluteIndex = pageOffset + localIndex;
                        return (
                          <tr key={absoluteIndex} className="hover:bg-gray-100 border-b border-gray-200">
                            <td className="p-2 border-r border-gray-300 text-center font-bold text-gray-700">{row.index}</td>
                            <td className="p-2 border-r border-gray-300 font-semibold"><input className="mp-editable text-gray-900" value={row.circuitName} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "circuitName", e.target.value)} /></td>
                            <td className="p-2 border-r border-gray-300 text-gray-800"><input className="mp-editable" value={row.location} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "location", e.target.value)} /></td>
                            <td className="p-2 border-r border-gray-300 text-center font-mono font-semibold"><input className="mp-editable text-center" value={row.protectionType} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "protectionType", e.target.value)} /></td>
                            <td className="p-2 border-r border-gray-300 text-center font-mono font-medium bg-blue-50/30"><input className="mp-editable text-center" value={row.lnResistance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "lnResistance", e.target.value)} /></td>
                            <td className="p-2 border-r border-gray-300 text-center font-mono font-medium bg-blue-50/30"><input className="mp-editable text-center" value={row.lpeResistance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "lpeResistance", e.target.value)} /></td>
                            <td className="p-2 border-r border-gray-300 text-center font-mono font-medium bg-blue-50/30"><input className="mp-editable text-center" value={row.npeResistance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "npeResistance", e.target.value)} /></td>
                            <td className="p-2 border-r border-gray-300 text-center font-mono font-semibold"><input className="mp-editable text-center" value={row.measuredImpedance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "measuredImpedance", e.target.value)} /></td>
                            <td className="p-2 border-r border-gray-300 text-center font-mono font-semibold"><input className="mp-editable text-center" value={row.allowedImpedance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "allowedImpedance", e.target.value)} /></td>
                            <td className="p-1 text-center font-bold text-emerald-600"><input className="mp-editable text-center" value={row.assessment} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "assessment", e.target.value)} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {isLastPage && (
                <div className="mt-4 text-[9px] text-gray-500 leading-relaxed space-y-1">
                  <p><span className="font-bold">{t("pdf.unified.noteLabel", "Uwaga:")}</span> <span dangerouslySetInnerHTML={{ __html: t("pdf.unified.noteText", "Wszystkie odbiorniki elektryczne na czas pomiaru rezystancji izolacji zostały odłączone. Pomiary przeprowadzono przy napięciu probierczym stałym {{voltage}}.", { voltage: protocols.insulationTestVoltage || "500V" }) }} /></p>
                  <p><span className="font-bold">{t("pdf.unified.legendLabel", "Legenda:")}</span> <span dangerouslySetInnerHTML={{ __html: t("pdf.unified.legendText", "<span class=\"font-semibold text-gray-700\">In</span> - prąd znamionowy zabezpieczenia, <span class=\"font-semibold text-gray-700\">Zs</span> - zmierzona impedancja pętli zwarcia, <span class=\"font-semibold text-gray-700\">Zadm</span> - maksymalna dopuszczalna impedancja pętli zwarcia warunkująca szybkie wyłączenie.") }} /></p>
                </div>
              )}

              {isLastPage && (
                <div className="mt-4">
                  <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-200">
                    {t("pdf.unified.section3Title", "3. Zalecenia")}
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg p-3 bg-white">
                    <textarea
                      className="mp-editable text-gray-900 w-full text-xs leading-relaxed min-h-[80px] resize-y"
                      value={protocols.recommendationsText || ""}
                      placeholder={t("app.pdfDocumentationPage.editor.unifiedProtocol.recommendationsPlaceholder", "np. Wymienić zabezpieczenie nadprądowe F3 w obwodzie oświetlenia...")}
                      onChange={(e) => updateProtocols({ recommendationsText: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <div className="text-center w-64">
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-[10px] text-gray-300 italic">{t("pdf.unified.stampPlaceholder", "miejsce na pieczęć / podpis")}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-1.5">
                    <p className="text-[10px] font-bold text-gray-700 uppercase">{t("pdf.unified.contractorSignature", "Sprawdził (Wykonawca/Elektryk)")}</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">{t("pdf.unified.contractorSubtitle", "Podpis osoby z uprawnieniami SEP")}</p>
                  </div>
                </div>
              </div>
              <PageFooter pageNumber={unifiedStartPage + pageIndex} totalUiPages={totalUiPages} noBorder />
            </div>
          </div>
        );
      })}
    </>
  );
}
