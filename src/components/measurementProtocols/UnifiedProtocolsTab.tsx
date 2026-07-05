import type { MeasurementProtocolsData, MeasurementUnifiedProtocolRow } from "../../types/projectMetadata";
import { UNIFIED_ROWS_PER_PAGE, formatProtocolNumberLabel } from "../../lib/export/pdfPages/pdfHelpers";
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
        const originalTitle = protocols.unifiedHeader?.headerTitle || "Protokół Nr 01 / 2026";
        const protocolNumberLabel = formatProtocolNumberLabel(originalTitle);

        return (
          <div className="a4-page a4-page--landscape" key={`unified-page-${pageIndex}`}>
            <div className="pd-page-top-bar" />

            {/* Header */}
            <div className="pd-page-header">
              <div className="pd-page-header-left">
                <div>
                  <div className="pd-eyebrow">{t("pdf.unified.title", "Tabela zbiorcza")}</div>
                  <div className="pd-page-title">
                    {t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}
                    <span className="pd-protocol-pill" style={{ marginLeft: 6, display: "inline-block" }}>{protocolNumberLabel}</span>
                  </div>
                  <div className="pd-page-subtitle">
                    {isFirstPage
                      ? t("pdf.unified.subtitle", "Zbiorcze wyniki pomiarów pętli zwarcia i rezystancji izolacji")
                      : t("pdf.unified.subtitleContinued", "Zbiorcze wyniki pomiarów pętli zwarcia i rezystancji izolacji · arkusz {{page}}", { page: pageIndex + 1 })
                    }
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

            {/* Section 01 (first page only) — Dane techniczne */}
            {isFirstPage && (
              <>
                <div className="pd-section-heading">
                  <span className="pd-section-number">01</span>
                  <span className="pd-section-title">{t("pdf.unified.section1Title", "Dane techniczne i narzędzia pomiarowe")}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2" style={{ marginBottom: 18 }}>
                  <div className="pd-data-row">
                    <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.unified.techData.meterLoop", "Miernik (Pętla):")}</span>
                    <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.loopMeterName || ""} placeholder="..." onChange={(e) => updateProtocols({ loopMeterName: e.target.value })} />
                  </div>
                  <div className="pd-data-row">
                    <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.unified.techData.meterInsulation", "Miernik (Izolacja):")}</span>
                    <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.insulationMeterName || ""} placeholder="..." onChange={(e) => updateProtocols({ insulationMeterName: e.target.value })} />
                  </div>
                  <div className="pd-data-row">
                    <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.unified.techData.serialLoop", "Nr ser. (Pętla):")}</span>
                    <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.loopMeterSerialNumber || ""} placeholder="..." onChange={(e) => updateProtocols({ loopMeterSerialNumber: e.target.value })} />
                  </div>
                  <div className="pd-data-row">
                    <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.unified.techData.serialInsulation", "Nr ser. (Izolacja):")}</span>
                    <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.insulationMeterSerialNumber || ""} placeholder="..." onChange={(e) => updateProtocols({ insulationMeterSerialNumber: e.target.value })} />
                  </div>
                  <div className="pd-data-row">
                    <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.unified.techData.voltage", "Napięcie sieci:")}</span>
                    <input className="mp-editable text-gray-900 font-semibold flex-grow" style={{ background: "var(--pd-row-alt)", padding: "2px 6px", borderRadius: 2 }} value={protocols.loopNetworkVoltage || ""} placeholder={t("pdf.unified.techData.voltagePlaceholder", "np. 230/400V")} onChange={(e) => updateProtocols({ loopNetworkVoltage: e.target.value })} />
                  </div>
                  <div className="pd-data-row">
                    <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.unified.techData.system", "Układ sieci:")}</span>
                    <input className="mp-editable text-gray-900 font-semibold flex-grow" style={{ background: "var(--pd-row-alt)", padding: "2px 6px", borderRadius: 2 }} value={protocols.loopNetworkSystem || ""} placeholder={t("pdf.unified.techData.systemPlaceholder", "np. TN-S / TN-C-S")} onChange={(e) => updateProtocols({ loopNetworkSystem: e.target.value })} />
                  </div>
                  <div className="pd-data-row">
                    <span className="pd-data-label" style={{ width: 130 }}>{t("pdf.unified.techData.testVoltage", "Napięcie próby:")}</span>
                    <input className="mp-editable text-gray-900 font-semibold flex-grow" style={{ background: "var(--pd-row-alt)", padding: "2px 6px", borderRadius: 2, maxWidth: 100 }} value={protocols.insulationTestVoltage || "500V"} onChange={(e) => updateProtocols({ insulationTestVoltage: e.target.value })} />
                  </div>
                </div>
              </>
            )}

            {/* Section — Tabela pomiarów */}
            <div className="pd-section-heading">
              <span className="pd-section-number">{isFirstPage ? "02" : "01"}</span>
              <span className="pd-section-title">
                {isFirstPage
                  ? t("pdf.unified.section2Title", "Zbiorcze wyniki pomiarów obwodów")
                  : t("pdf.unified.section2TitleContinued", "Zbiorcze wyniki pomiarów obwodów · arkusz {{page}}", { page: pageIndex + 1 })}
              </span>
            </div>

            <table className="pd-table">
              <thead>
                <tr>
                  <th className="pd-center" style={{ width: 32 }}>{t("pdf.unified.table.no", "Lp.")}</th>
                  <th style={{ width: 192 }}>{t("pdf.unified.table.circuitName", "Nazwa obwodu")}</th>
                  <th style={{ width: 96 }}>{t("pdf.unified.table.location", "Lokalizacja")}</th>
                  <th className="pd-center" style={{ width: 64 }}>{t("pdf.unified.table.in", "In")}</th>
                  <th className="pd-center" style={{ width: 176 }}>Riso [MΩ] ({t("pdf.unified.table.req", "Wym.")} {protocols.groundRequiredResistance || "> 1.0"})</th>
                  <th className="pd-center" style={{ width: 176 }}>{t("pdf.unified.table.loop", "Pętla zwarcia")}</th>
                  <th className="pd-center" style={{ width: 64 }}>{t("pdf.unified.table.evaluation", "Ocena")}</th>
                </tr>
                <tr className="pd-subhead">
                  <th colSpan={4}></th>
                  <th className="pd-center" style={{ padding: 0 }}>
                    <div style={{ display: "flex" }}>
                      <div className="pd-sub-divider" style={{ flex: 1, textAlign: "center", padding: "5px 0" }}>{t("auto.ln_21", "L-N")}</div>
                      <div className="pd-sub-divider" style={{ flex: 1, textAlign: "center", padding: "5px 0" }}>{t("auto.lpe_53", "L-PE")}</div>
                      <div style={{ flex: 1, textAlign: "center", padding: "5px 0" }}>{t("auto.npe_125", "N-PE")}</div>
                    </div>
                  </th>
                  <th className="pd-center" style={{ padding: 0 }}>
                    <div style={{ display: "flex" }}>
                      <div className="pd-sub-divider" style={{ flex: 1, textAlign: "center", padding: "5px 0" }}>{t("auto.zs_62", "Zs [Ω]")}</div>
                      <div style={{ flex: 1, textAlign: "center", padding: "5px 0" }}>{t("auto.zadm_332", "Zadm [Ω]")}</div>
                    </div>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rowsPage.map((row, localIndex) => {
                  const absoluteIndex = pageOffset + localIndex;
                  const altCls = localIndex % 2 === 1 ? "pd-alt" : "";
                  return (
                    <tr key={absoluteIndex} className={altCls}>
                      <td className="pd-index">{row.index}</td>
                      <td className="pd-emphasis"><input className="mp-editable text-gray-900" value={row.circuitName} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "circuitName", e.target.value)} /></td>
                      <td className="pd-muted"><input className="mp-editable" value={row.location} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "location", e.target.value)} /></td>
                      <td className="pd-center pd-emphasis font-mono"><input className="mp-editable text-center" value={row.protectionType} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "protectionType", e.target.value)} /></td>
                      <td className="pd-center pd-info-tint" style={{ padding: 0 }}>
                        <div style={{ display: "flex" }}>
                          <div className="pd-info-tint" style={{ flex: 1, textAlign: "center", borderRight: "0.5px solid var(--pd-hairline)" }}><input className="mp-editable text-center" style={{ background: "transparent" }} value={row.lnResistance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "lnResistance", e.target.value)} /></div>
                          <div className="pd-info-tint" style={{ flex: 1, textAlign: "center", borderRight: "0.5px solid var(--pd-hairline)" }}><input className="mp-editable text-center" style={{ background: "transparent" }} value={row.lpeResistance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "lpeResistance", e.target.value)} /></div>
                          <div className="pd-info-tint" style={{ flex: 1, textAlign: "center" }}><input className="mp-editable text-center" style={{ background: "transparent" }} value={row.npeResistance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "npeResistance", e.target.value)} /></div>
                        </div>
                      </td>
                      <td className="pd-center" style={{ padding: 0 }}>
                        <div style={{ display: "flex" }}>
                          <div style={{ flex: 1, textAlign: "center", borderRight: "0.5px solid var(--pd-hairline)" }}><input className="mp-editable text-center" style={{ background: "transparent" }} value={row.measuredImpedance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "measuredImpedance", e.target.value)} /></div>
                          <div style={{ flex: 1, textAlign: "center" }}><input className="mp-editable text-center" style={{ background: "transparent" }} value={row.allowedImpedance} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "allowedImpedance", e.target.value)} /></div>
                        </div>
                      </td>
                      <td className="pd-center pd-success"><input className="mp-editable text-center" style={{ background: "transparent", color: "var(--pd-success)", fontWeight: 700 }} value={row.assessment} onChange={(e) => updateTableRow("unifiedRows", absoluteIndex, "assessment", e.target.value)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Section — Uwagi / Legenda / Zalecenia (last page only) */}
            {isLastPage && (
              <>
                <div className="pd-section-heading">
                  <span className="pd-section-number">{isFirstPage ? "03" : "02"}</span>
                  <span className="pd-section-title">{t("pdf.unified.section3Title", "Uwagi, legenda i zalecenia")}</span>
                </div>
                <div className="pd-two-col-grid">
                  <div className="pd-two-col-item">
                    <div className="pd-eyebrow" style={{ marginBottom: 6 }}>{t("pdf.unified.noteLabel", "Uwaga")}</div>
                    <p className="text-[9px] text-gray-700 leading-relaxed">
                      <span dangerouslySetInnerHTML={{ __html: t("pdf.unified.noteText", "Wszystkie odbiorniki elektryczne na czas pomiaru rezystancji izolacji zostały odłączone. Pomiary przeprowadzono przy napięciu probierczym stałym {{voltage}}.", { voltage: protocols.insulationTestVoltage || "500V" }) }} />
                    </p>
                    <div className="pd-eyebrow" style={{ marginTop: 14, marginBottom: 6 }}>{t("pdf.unified.legendLabel", "Legenda")}</div>
                    <p className="text-[9px] text-gray-700 leading-relaxed">
                      <span dangerouslySetInnerHTML={{ __html: t("pdf.unified.legendText", "<span style=\"font-weight:600;color:#334155\">In</span> - prąd znamionowy zabezpieczenia, <span style=\"font-weight:600;color:#334155\">Zs</span> - zmierzona impedancja pętli zwarcia, <span style=\"font-weight:600;color:#334155\">Zadm</span> - maksymalna dopuszczalna impedancja pętli zwarcia warunkująca szybkie wyłączenie.") }} />
                    </p>
                  </div>
                  <div className="pd-two-col-item">
                    {protocols.recommendationsText ? (
                      <>
                        <div className="pd-eyebrow" style={{ marginBottom: 6 }}>{t("pdf.unified.section3Title", "Zalecenia")}</div>
                        <div className="pd-callout">
                          <textarea
                            className="mp-editable w-full"
                            style={{ fontSize: 9, lineHeight: 1.55, color: "#334155", background: "transparent", border: "none", padding: 0, minHeight: 80, resize: "vertical" }}
                            value={protocols.recommendationsText || ""}
                            placeholder={t("app.pdfDocumentationPage.editor.unifiedProtocol.recommendationsPlaceholder", "np. Wymienić zabezpieczenie nadprądowe F3 w obwodzie oświetlenia...")}
                            onChange={(e) => updateProtocols({ recommendationsText: e.target.value })}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </>
            )}

            {/* Signature (last page only) */}
            {isLastPage && (
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
            )}

            <div className="mt-auto">
              <PageFooter pageNumber={unifiedStartPage + pageIndex} totalUiPages={totalUiPages} noBorder />
            </div>
          </div>
        );
      })}
    </>
  );
}