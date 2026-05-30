import { useEffect, useState } from "react";
import type { CircuitRow } from "../types/circuitRow";
import type { SymbolItem } from "../types/symbolItem";
import type {
  MeasurementContinuityProtocolRow,
  MeasurementInsulationProtocolRow,
  MeasurementLoopProtocolRow,
  MeasurementProtocolsData,
  MeasurementRcdProtocolRow,
  MeasurementUnifiedProtocolRow,
  ProjectMetadata,
} from "../types/projectMetadata";
import {
  DEFAULT_WORK_SCOPE_ITEMS,
  mergeDefaultAttachmentItems,
} from "../lib/projectMetadata";
import { buildCircuitListTableRows } from "../lib/circuitRows";
import { exportDinRailToDataURL } from "../lib/export/dinRailSnapshotService";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import "./MeasurementProtocolsWorkspacePage.css";
const UNIFIED_ROWS_PER_PAGE = 7;
const CIRCUIT_LIST_ROWS_PER_PAGE = 10;
const TITLE_WORK_SCOPE_MAX_ITEMS = 12;
const TITLE_WORK_SCOPE_COLUMN_SIZE = 6;

type WorkspaceTab = "overview" | "unified" | "continuity" | "loop" | "insulation" | "rcd-ground" | "title-page" | "circuit-list" | "din-rail";

type MeasurementProtocolsWorkspacePageProps = {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  rail: DinRailCanvasRail;
  circuitRows: CircuitRow[];
  onChange: (next: ProjectMetadata) => void;
  activeTab: WorkspaceTab;
};

type ProtocolTableRowsMap = Pick<
  MeasurementProtocolsData,
  "continuityRows" | "loopImpedanceRows" | "insulationRows" | "rcdRows" | "unifiedRows"
>;
type ProtocolTableKey = keyof ProtocolTableRowsMap;
type ProtocolTableRowByKey = {
  continuityRows: MeasurementContinuityProtocolRow;
  loopImpedanceRows: MeasurementLoopProtocolRow;
  insulationRows: MeasurementInsulationProtocolRow;
  rcdRows: MeasurementRcdProtocolRow;
  unifiedRows: MeasurementUnifiedProtocolRow;
};
type StringFieldKeys<T> = {
  [K in keyof T]-?: T[K] extends string ? K : never;
}[keyof T];

function chunkRows<T>(rows: T[], size: number): T[][] {
  if (rows.length === 0) {
    return [[]];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function buildSheetTitle(pageIndex: number, totalPages: number): string {
  const current = String(pageIndex + 1).padStart(2, "0");
  const total = String(totalPages).padStart(2, "0");
  return `Protokół Nr ${current}/${total}`;
}

function createHeaderForPage<T extends { headerTitle?: string }>(
  header: T,
  pageIndex: number,
  totalPages: number,
): T {
  return {
    ...header,
    headerTitle: buildSheetTitle(pageIndex, totalPages),
  };
}

function formatProtocolNumberLabel(headerTitle: string | undefined): string {
  const normalized = headerTitle?.trim();
  if (!normalized) {
    return "";
  }

  return normalized.replace(/^protokół\s+(pomiarów\s+)?nr\s+/i, "").trim();
}

export function MeasurementProtocolsWorkspacePage({
  metadata,
  symbols,
  rail,
  circuitRows,
  onChange,
  activeTab,
}: MeasurementProtocolsWorkspacePageProps) {
  const [dinRailPreviewUrl, setDinRailPreviewUrl] = useState<string | null>(null);
  const [dinRailPreviewError, setDinRailPreviewError] = useState<string | null>(null);
  const protocols = metadata.measurementProtocols;
  const unifiedPages = chunkRows(protocols.unifiedRows, UNIFIED_ROWS_PER_PAGE);
  const circuitListRows = buildCircuitListTableRows(circuitRows);
  const circuitListPages = chunkRows(circuitListRows, CIRCUIT_LIST_ROWS_PER_PAGE);

  useEffect(() => {
    if (activeTab !== "din-rail") {
      return;
    }

    let isCancelled = false;
    setDinRailPreviewUrl(null);
    setDinRailPreviewError(null);

    async function refreshDinRailPreview() {
      try {
        const images = await exportDinRailToDataURL(symbols, rail);
        if (isCancelled) {
          return;
        }

        const previewUrl = images[0] ?? null;
        setDinRailPreviewUrl(previewUrl);
        if (!previewUrl) {
          setDinRailPreviewError("Brak widoku szyny DIN do pokazania w dokumentacji.");
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setDinRailPreviewError(
          error instanceof Error
            ? error.message
            : "Nie udało się przygotować widoku rozdzielnicy.",
        );
      }
    }

    void refreshDinRailPreview();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, symbols, rail]);

  const updateProtocols = (patch: Partial<MeasurementProtocolsData>) => {
    onChange({
      ...metadata,
      measurementProtocols: {
        ...protocols,
        ...patch,
      },
      dateModified: new Date().toISOString(),
    });
  };

  const updateTableRows = <K extends ProtocolTableKey>(
    key: K,
    rows: ProtocolTableRowsMap[K],
  ) => {
    updateProtocols({ [key]: rows } as unknown as Pick<MeasurementProtocolsData, K>);
  };

  const updateTableRow = <
    K extends ProtocolTableKey,
    F extends StringFieldKeys<ProtocolTableRowByKey[K]>
  >(
    key: K,
    index: number,
    field: F,
    value: ProtocolTableRowByKey[K][F],
  ) => {
    const rows = protocols[key] as ProtocolTableRowByKey[K][];
    const nextRows = rows.map((row, i) => (
      i === index ? { ...row, [field]: value } : row
    )) as ProtocolTableRowsMap[K];
    updateTableRows(key, nextRows);
  };

  const displayDate = metadata.drawingDate || new Date().toLocaleDateString("pl-PL");
  const protocolYear = new Date(displayDate).getFullYear() || new Date().getFullYear();
  const protocolNumber = metadata.projectNumber?.trim()
    ? `${metadata.projectNumber.trim()} / ${protocolYear}`
    : `....... / ${protocolYear}`;
  const workScopeItems = metadata.titlePageWorkScopeItems.length > 0
    ? metadata.titlePageWorkScopeItems
    : DEFAULT_WORK_SCOPE_ITEMS.map((text) => ({ text, isChecked: true }));
  const attachmentItems = mergeDefaultAttachmentItems(metadata.titlePageAttachmentItems);
  const titleWorkScopeItems = workScopeItems.slice(0, TITLE_WORK_SCOPE_MAX_ITEMS);
  const titleAttachmentItems = attachmentItems;
  const titleWorkScopeColumns = chunkRows(titleWorkScopeItems, TITLE_WORK_SCOPE_COLUMN_SIZE);
  const titleAttachmentColumns = titleAttachmentItems.length > 3
    ? chunkRows(titleAttachmentItems, Math.ceil(titleAttachmentItems.length / 2))
    : [titleAttachmentItems];
  const objectType = metadata.titlePageObjectType || "Budynek jednorodzinny / Lokal mieszkalny";
  const stampText = metadata.contractorSignature || "PIECZĘĆ WYKONAWCY";

  return (
    <div className="mp-page">
      <div className="mp-stage">
        {activeTab === "title-page" && (
          <div className="a4-page">
            <div>
              <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 mp-title-logo-frame">
                    {metadata.titlePageCompanyLogoDataUrl ? (
                      <img src={metadata.titlePageCompanyLogoDataUrl} alt="Logo firmy" />
                    ) : (
                      <span>LOGO</span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-sm font-bold text-gray-900 tracking-wider uppercase">Dokumentacja Powykonawcza</h1>
                    <p className="text-[9px] text-gray-500 font-medium">ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-semibold text-gray-500 uppercase">Protokół nr</div>
                  <div className="text-xs font-bold text-white bg-brand px-2.5 py-0.5 rounded mt-0.5 inline-block">{protocolNumber}</div>
                  <div className="text-[9px] text-gray-400 mt-1">Data: <span className="font-medium text-gray-700">{displayDate}</span></div>
                </div>
              </div>

              <div className="text-center my-6">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Oświadczenie Wykonawcy</h2>
                <p className="text-xs text-gray-500 italic mt-0.5">instalacji elektrycznej wykonanej zgodnie z przepisami i normami</p>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200/80 p-4 mb-4">
                <h3 className="text-[10px] font-bold text-brand uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">Informacje o obiekcie</h3>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-baseline">
                    <span className="font-bold text-gray-700 w-24 shrink-0">Rodzaj obiektu:</span>
                    <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.titlePageObjectType || ""} placeholder="Budynek jednorodzinny / Lokal mieszkalny" onChange={(e) => onChange({ ...metadata, titlePageObjectType: e.target.value })} />
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold text-gray-700 w-24 shrink-0">Adres:</span>
                    <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.address || ""} placeholder="................................................................" onChange={(e) => onChange({ ...metadata, address: e.target.value })} />
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold text-gray-700 w-24 shrink-0">Inwestor:</span>
                    <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.investor || ""} placeholder="................................................................" onChange={(e) => onChange({ ...metadata, investor: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs text-center font-bold text-blue-600 uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">Zakres prac</h3>
                    <div className={titleWorkScopeColumns.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-3" : "flex flex-col gap-3"}>
                      {titleWorkScopeColumns.map((columnItems, columnIndex) => (
                        <div key={columnIndex} className="flex flex-col gap-3">
                          {columnItems.map((item, itemIndex) => {
                            const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                            return (
                              <label key={absoluteIndex} className="flex items-start gap-2 cursor-pointer relative group border-b border-gray-100 pb-2.5">
                                <input 
                                  type="checkbox" 
                                  style={{ display: "none" }}
                                  checked={item.isChecked}
                                  onChange={(e) => {
                                    const nextItems = [...workScopeItems];
                                    nextItems[absoluteIndex] = { ...nextItems[absoluteIndex], isChecked: e.target.checked };
                                    onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                                  }}
                                />
                                <div className="w-4 h-4 rounded border border-brand flex items-center justify-center bg-transparent shrink-0 mt-0.5">
                                  {item.isChecked ? <span className="text-brand text-[10px] font-bold leading-none">✓</span> : null}
                                </div>
                                <span
                                  className="mp-editable text-[11px] font-medium text-gray-900 leading-tight flex-1 outline-none break-words min-h-[16px]"
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const nextItems = [...workScopeItems];
                                    nextItems[absoluteIndex] = { ...nextItems[absoluteIndex], text: e.currentTarget.innerText };
                                    onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                                  }}
                                  dangerouslySetInnerHTML={{ __html: item.text || "..." }}
                                />
                                <button
                                  type="button"
                                  className="mp-delete-btn shrink-0 mt-0.5"
                                  title="Usuń punkt"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const nextItems = [...workScopeItems];
                                    nextItems.splice(absoluteIndex, 1);
                                    onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                                  }}
                                >
                                  ✕
                                </button>
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    {workScopeItems.length < TITLE_WORK_SCOPE_MAX_ITEMS && (
                      <button
                        type="button"
                        className="mt-3 text-[10px] text-brand font-semibold text-left opacity-70 hover:opacity-100 flex items-center gap-1"
                        onClick={() => {
                          onChange({ ...metadata, titlePageWorkScopeItems: [...workScopeItems, { text: "", isChecked: true }] });
                        }}
                      >
                        + Dodaj kolejny punkt
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs text-center font-bold text-blue-600 uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">Załączniki do protokołu</h3>
                    <div className={titleAttachmentColumns.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-3" : "flex flex-col gap-3"}>
                      {titleAttachmentColumns.map((columnItems, columnIndex) => (
                        <div key={columnIndex} className="flex flex-col gap-3">
                          {columnItems.map((item, itemIndex) => (
                            <div key={`${columnIndex}-${itemIndex}`} className="flex items-start gap-2 border-b border-gray-100 pb-2.5">
                              <div className="w-4 h-4 rounded border border-brand flex items-center justify-center bg-transparent shrink-0 mt-0.5">
                                <span className="text-brand text-[10px] font-bold leading-none">✓</span>
                              </div>
                              <span className="text-[11px] font-medium text-gray-900 leading-tight flex-1 break-words">
                                {item}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
                  <div>
                    <h3 className="text-[10px] font-bold text-brand uppercase tracking-widest mb-2 pb-2 border-b border-gray-100">Wykonawca / Instalator</h3>
                    <input className="mp-editable text-xs font-bold text-gray-950 mt-2" value={metadata.contractor || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, contractor: e.target.value })} />
                    <p className="text-[9px] text-gray-400 mt-1.5">Podmiot odpowiedzialny za montaż instalacji</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
                  <div>
                    <h3 className="text-[10px] font-bold text-brand uppercase tracking-widest mb-2 pb-2 border-b border-gray-100">Uprawnienia SEP (Kwalifikacyjne)</h3>
                    <div className="text-xs flex flex-col gap-2 mt-2">
                      <div className="flex items-baseline">
                        <span className="font-semibold text-gray-700 w-[110px]">Eksploatacja (E):</span>
                        <input className="mp-editable text-gray-950 font-bold ml-1 flex-grow" value={metadata.designerId || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, designerId: e.target.value })} />
                      </div>
                      <div className="flex items-baseline">
                        <span className="font-semibold text-gray-700 w-[110px]">Dozór (D):</span>
                        <input className="mp-editable text-gray-950 font-bold ml-1 flex-grow" value={metadata.authorLicense || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, authorLicense: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-brand text-gray-800 rounded-xl p-4 mb-6 text-center shadow-sm">
                <p className="text-[10px] uppercase font-bold text-brand tracking-wider mb-2 pb-2 border-b border-gray-100">Pełna treść oświadczenia wykonawcy</p>
                <p className="text-[10px] leading-relaxed font-normal text-gray-800">
                  Oświadczam, że instalacja elektryczna w wyżej wymienionym obiekcie została wykonana zgodnie z przepisami ustawy Prawo Budowlane, obowiązującymi normami technicznymi (w tym <span className="font-bold text-gray-950">PN-HD 60364-6</span>) oraz sztuką budowlaną. Przeprowadzone pomiary odbiorcze wykazały skuteczność zastosowanych środków ochrony przeciwporażeniowej.
                </p>
              </div>
            </div>

            <div className="mt-auto">
              <div className="grid grid-cols-3 gap-4 items-end pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-[10px] text-gray-300 italic">miejsce na podpis</span>
                  </div>
                  <div className="border-t border-gray-300 pt-1.5">
                    <p className="text-[10px] font-bold text-gray-700 uppercase">Podpis Inwestora</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">Potwierdzam odbiór prac</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="h-20 border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-2 mb-1 bg-gray-50/30">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{stampText}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-[10px] text-gray-300 italic">miejsce na podpis</span>
                  </div>
                  <div className="border-t border-gray-300 pt-1.5">
                    <p className="text-[10px] font-bold text-gray-700 uppercase">Podpis Elektryka</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">Osoba uprawniona (pomiarowiec)</p>
                  </div>
                </div>
              </div>
              <div className="text-center text-[8px] text-gray-400 mt-6 tracking-wide uppercase">
                Strona 1 z 3 • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364
              </div>
            </div>
          </div>
        )}

        {activeTab === "circuit-list" && circuitListPages.map((rowsPage, pageIndex) => (
          <div className="a4-page a4-page--landscape" key={`circuit-list-page-${pageIndex}`}>
            <div>
              <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 gap-4">
                <div className="flex items-center gap-3 flex-grow" style={{ minWidth: 0 }}>
                  <div className="px-3 py-1 bg-brand text-white font-bold rounded text-xs uppercase tracking-wider">
                    Lista obwodów
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase">
                      Zestawienie obwodów instalacji elektrycznej
                    </h2>
                    <p className="text-[9px] text-gray-500 font-medium">
                      Arkusz {pageIndex + 1} z {circuitListPages.length} • dane z aktualnej rozdzielnicy
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-gray-400">Data: <span className="font-medium text-gray-700">{displayDate}</span></div>
                  <div className="text-[9px] text-gray-500 mt-0.5">Obiekt: <span className="font-semibold text-gray-900">{objectType}</span></div>
                </div>
              </div>

              <div className="mt-4">
                <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-300 flex justify-between items-center">
                  <span>{pageIndex === 0 ? "1. Lista obwodów" : `1. Lista obwodów (ciąg dalszy ${pageIndex + 1})`}</span>
                  <span className="text-gray-500 font-medium">{circuitListRows.length} pozycji</span>
                </div>
                <div className="overflow-x-auto border-x border-b border-gray-300 rounded-b-lg">
                  <table className="w-full text-left border-collapse" style={{ fontSize: "9px" }}>
                    <thead>
                      <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                        <th className="p-2 border-r border-gray-300 text-center w-8">Lp.</th>
                        <th className="p-2 border-r border-gray-300 text-center w-16">Ozn.</th>
                        <th className="p-2 border-r border-gray-300 w-36">Nazwa obwodu</th>
                        <th className="p-2 border-r border-gray-300 w-28">Lokalizacja</th>
                        <th className="p-2 border-r border-gray-300 text-center w-12">Faza</th>
                        <th className="p-2 border-r border-gray-300 text-center w-20">Zabezp.</th>
                        <th className="p-2 border-r border-gray-300 text-center w-24">RCD</th>
                        <th className="p-2 border-r border-gray-300 text-center w-16">Przewód</th>
                        <th className="p-2 border-r border-gray-300 text-center w-16">Dł. [m]</th>
                        <th className="p-2 text-center w-16">Moc [W]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rowsPage.map(({ index, location, rcdLabel, rcdProtection, row }) => (
                        <tr key={row.id} className="border-b border-gray-200">
                          <td className="p-2 border-r border-gray-300 text-center font-bold text-gray-700">{index}</td>
                          <td className="p-2 border-r border-gray-300 text-center font-mono font-semibold text-gray-900">{row.referenceDesignation || "-"}</td>
                          <td className="p-2 border-r border-gray-300 font-semibold text-gray-900">{row.circuitName || row.label || "-"}</td>
                          <td className="p-2 border-r border-gray-300 text-gray-700">{location || row.displayLocation || "-"}</td>
                          <td className="p-2 border-r border-gray-300 text-center font-mono text-gray-900">{row.phase || "-"}</td>
                          <td className="p-2 border-r border-gray-300 text-center font-mono font-semibold text-gray-900">{row.displayProtection || row.protectionType || "-"}</td>
                          <td className="p-2 border-r border-gray-300 text-center text-gray-700">
                            <div className="font-semibold">{rcdLabel || "-"}</div>
                            {rcdProtection ? <div className="text-[8px] text-gray-500">{rcdProtection}</div> : null}
                          </td>
                          <td className="p-2 border-r border-gray-300 text-center font-mono text-gray-900">{row.cableCrossSection ? `${row.cableCrossSection} mm²` : "-"}</td>
                          <td className="p-2 border-r border-gray-300 text-center font-mono text-gray-900">{row.cableLength || "-"}</td>
                          <td className="p-2 text-center font-mono text-gray-900">{row.powerW || "-"}</td>
                        </tr>
                      ))}
                      {circuitListRows.length === 0 && (
                        <tr>
                          <td className="p-3 text-center text-gray-500" colSpan={10}>Brak obwodów do pokazania.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <div className="text-center text-[8px] text-gray-400 tracking-wide uppercase pt-4 border-t border-gray-100">
                Lista obwodów • dokumentacja powykonawcza • PN-HD 60364
              </div>
            </div>
          </div>
        ))}

        {activeTab === "din-rail" && (
          <div className="a4-page a4-page--landscape" key="din-rail-page">
            <div>
              <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 gap-4">
                <div className="flex items-center gap-3 flex-grow" style={{ minWidth: 0 }}>
                  <div className="px-3 py-1 bg-brand text-white font-bold rounded text-xs uppercase tracking-wider">
                    Rozdzielnica elektryczna
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase">
                      Widok elewacji rozdzielnicy
                    </h2>
                    <p className="text-[9px] text-gray-500 font-medium">
                      Dane z aktualnej szyny DIN i modułów w projekcie
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-gray-400">Data: <span className="font-medium text-gray-700">{displayDate}</span></div>
                  <div className="text-[9px] text-gray-500 mt-0.5">Obiekt: <span className="font-semibold text-gray-900">{objectType}</span></div>
                </div>
              </div>

              <div className="mt-4">
                <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-300">
                  1. Widok rozdzielnicy elektrycznej
                </div>
                <div className="mp-din-rail-preview-frame border-x border-b border-gray-300 rounded-b-lg">
                  {dinRailPreviewUrl ? (
                    <img
                      className="mp-din-rail-preview-image"
                      src={dinRailPreviewUrl}
                      alt="Widok rozdzielnicy elektrycznej"
                    />
                  ) : (
                    <div className="mp-din-rail-preview-empty">
                      <strong>{dinRailPreviewError ? "Nie udało się odświeżyć widoku." : "Odświeżanie widoku rozdzielnicy..."}</strong>
                      <span>{dinRailPreviewError ?? "Podgląd zostanie pokazany po przygotowaniu snapshotu szyny DIN."}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <div className="text-center text-[8px] text-gray-400 tracking-wide uppercase pt-4 border-t border-gray-100">
                Rozdzielnica elektryczna • dokumentacja powykonawcza • PN-HD 60364
              </div>
            </div>
          </div>
        )}

        {activeTab === "unified" && unifiedPages.map((rowsPage, pageIndex) => {
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
                      Tabela zbiorcza
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase">Protokół Pomiarów Nr <span className="bg-gray-100 px-1 rounded text-brand">{protocolNumberLabel}</span></h2>
                      <p className="text-[9px] text-gray-500 font-medium">Zbiorcze wyniki pomiarów pętli zwarcia i rezystancji izolacji</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] text-gray-400">Data pomiarów: <span className="font-medium text-gray-700">{displayDate}</span></div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Obiekt: <span className="font-semibold text-gray-900">{objectType}</span></div>
                  </div>
                </div>

                {isFirstPage && (
                  <div className="mt-4">
                    <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-200">
                      1. Dane techniczne i narzędzia pomiarowe
                    </div>
                    <div className="border-x border-b border-gray-200 rounded-b-lg p-3 bg-white grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <div className="flex items-center">
                        <span className="font-bold text-gray-600 mr-2 shrink-0">Miernik (Pętla):</span>
                        <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.loopMeterName || ""} placeholder="..." onChange={(e) => updateProtocols({ loopMeterName: e.target.value })} />
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold text-gray-600 mr-2 shrink-0">Miernik (Izolacja):</span>
                        <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.insulationMeterName || ""} placeholder="..." onChange={(e) => updateProtocols({ insulationMeterName: e.target.value })} />
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold text-gray-600 mr-2 shrink-0">Napięcie próby:</span>
                        <input className="mp-editable text-gray-900 font-semibold bg-gray-100 px-1.5 py-0.5 rounded w-16" value={protocols.insulationTestVoltage || "500V"} onChange={(e) => updateProtocols({ insulationTestVoltage: e.target.value })} />
                      </div>
                      <div className="flex items-center justify-end">
                        <span className="font-bold text-gray-600 mr-2">Układ sieci:</span>
                        <span className="text-brand font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">TN-S / TN-C-S</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-300 flex justify-between items-center">
                    <span>{isFirstPage ? "2. Zbiorcze wyniki pomiarów obwodów" : `2. Zbiorcze wyniki pomiarów obwodów (ciąg dalszy ${pageIndex + 1})`}</span>
                  </div>
                  <div className="overflow-x-auto border-x border-b border-gray-300 rounded-b-lg">
                    <table className="w-full text-left border-collapse" style={{ fontSize: "10px" }}>
                      <thead>
                        <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                          <th className="p-2 border-r border-gray-300 text-center w-8">Lp.</th>
                          <th className="p-2 border-r border-gray-300 w-48">Nazwa obwodu</th>
                          <th className="p-2 border-r border-gray-300 w-24">Lokalizacja</th>
                          <th className="p-2 border-r border-gray-300 text-center w-16">In</th>
                          <th colSpan={3} className="p-1 border-r border-gray-300 text-center bg-blue-50/50 text-gray-800">Riso [MΩ] (Wym. {protocols.groundRequiredResistance || "> 1.0"})</th>
                          <th colSpan={2} className="p-1 border-r border-gray-300 text-center bg-gray-100 text-gray-800">Pętla zwarcia</th>
                          <th className="p-2 text-center w-16">Ocena</th>
                        </tr>
                        <tr className="bg-gray-50 text-[10px] text-gray-700 border-b border-gray-300">
                          <th colSpan={4} className="border-r border-gray-300"></th>
                          <th className="p-1 border-r border-gray-300 text-center font-bold w-12">L-N</th>
                          <th className="p-1 border-r border-gray-300 text-center font-bold w-12">L-PE</th>
                          <th className="p-1 border-r border-gray-300 text-center font-bold w-12">N-PE</th>
                          <th className="p-1 border-r border-gray-300 text-center font-bold w-12">Zs [Ω]</th>
                          <th className="p-1 border-r border-gray-300 text-center font-bold w-12">Zadm [Ω]</th>
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
                    <p><span className="font-bold">Uwaga:</span> Wszystkie odbiorniki elektryczne na czas pomiaru rezystancji izolacji zostały odłączone. Pomiary przeprowadzono przy napięciu probierczym stałym {protocols.insulationTestVoltage || "500V"}.</p>
                    <p><span className="font-bold">Legenda:</span> <span className="font-semibold text-gray-700">In</span> - prąd znamionowy zabezpieczenia, <span className="font-semibold text-gray-700">Zs</span> - zmierzona impedancja pętli zwarcia, <span className="font-semibold text-gray-700">Zadm</span> - maksymalna dopuszczalna impedancja pętli zwarcia warunkująca szybkie wyłączenie.</p>
                  </div>
                )}
              </div>

              <div className="mt-auto">
                <div className="grid grid-cols-2 gap-8 items-end pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-gray-300 italic">miejsce na pieczęć / podpis</span>
                    </div>
                    <div className="border-t border-gray-300 pt-1.5">
                      <p className="text-[10px] font-bold text-gray-700 uppercase">Sprawdził (Wykonawca/Elektryk)</p>
                      <p className="text-[8px] text-gray-400 mt-0.5">Podpis osoby z uprawnieniami SEP</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-gray-300 italic">miejsce na podpis</span>
                    </div>
                    <div className="border-t border-gray-300 pt-1.5">
                      <p className="text-[10px] font-bold text-gray-700 uppercase">Przedstawiciel Inwestora</p>
                      <p className="text-[8px] text-gray-400 mt-0.5">Potwierdzam otrzymanie wyników</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {activeTab === "rcd-ground" && (() => {
          const pageHeader = createHeaderForPage(protocols.rcdGroundHeader, 0, 1);
          const protocolNumberLabel = formatProtocolNumberLabel(pageHeader.headerTitle);
          const rowsPage = protocols.rcdRows;
          const absoluteIndexBase = 0;

          return (
            <div className="a4-page" key="rcd-ground-page-single">
              <div>
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 gap-4">
                  <div className="flex items-center gap-3 flex-grow" style={{ minWidth: 0 }}>
                    <div className="px-3 py-1 bg-brand text-white font-bold rounded text-xs uppercase tracking-wider">
                      RCD i uziemienie
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase">Protokół Pomiarów Nr <span className="bg-gray-100 px-1 rounded text-brand">{protocolNumberLabel}</span></h2>
                      <p className="text-[9px] text-gray-500 font-medium">Test wyłączników różnicowoprądowych RCD i pomiar rezystancji uziemienia</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] text-gray-400">Data pomiarów: <span className="font-medium text-gray-700">{displayDate}</span></div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Obiekt: <span className="font-semibold text-gray-900">{objectType}</span></div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-200">
                    1. Dane techniczne i narzędzia pomiarowe
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg p-3 bg-white grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">Miernik:</span>
                      <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.rcdGroundMeterName || ""} placeholder="..." onChange={(e) => updateProtocols({ rcdGroundMeterName: e.target.value })} />
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-600 mr-2 shrink-0">Nr fabryczny:</span>
                      <input className="mp-editable text-gray-900 font-medium flex-grow" value={protocols.rcdGroundMeterSerialNumber || ""} placeholder="..." onChange={(e) => updateProtocols({ rcdGroundMeterSerialNumber: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-300">
                    2. Tabela pomiarów (Wyłączniki różnicowoprądowe)
                  </div>
                  <div className="overflow-x-auto border-x border-b border-gray-300 rounded-b-lg">
                    <table className="w-full text-left border-collapse" style={{ fontSize: "10px" }}>
                      <thead>
                        <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                          <th className="p-2 border-r border-gray-300 text-center w-8">Lp.</th>
                          <th className="p-2 border-r border-gray-300 w-48">Typ RCD</th>
                          <th className="p-2 border-r border-gray-300 text-center w-20">IΔn [mA]</th>
                          <th className="p-2 border-r border-gray-300 text-center w-24">Prąd wyzw. [mA]</th>
                          <th className="p-2 border-r border-gray-300 text-center w-24">Czas wyzw. [ms]</th>
                          <th className="p-2 border-r border-gray-300 text-center w-20">Przycisk TEST</th>
                          <th className="p-2 text-center w-20">Ocena</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rowsPage.map((row, localIndex) => {
                          const absoluteIndex = absoluteIndexBase + localIndex;
                          return (
                            <tr key={absoluteIndex} className="hover:bg-gray-100 border-b border-gray-200">
                              <td className="p-2 border-r border-gray-300 text-center font-bold text-gray-700">{row.index}</td>
                              <td className="p-2 border-r border-gray-300 font-semibold"><input className="mp-editable text-gray-900" value={row.deviceType} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "deviceType", e.target.value)} /></td>
                              <td className="p-2 border-r border-gray-300 text-center font-mono font-semibold"><input className="mp-editable text-center" value={row.residualCurrent} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "residualCurrent", e.target.value)} /></td>
                              <td className="p-2 border-r border-gray-300 text-center font-mono font-medium"><input className="mp-editable text-center" value={row.tripCurrent} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "tripCurrent", e.target.value)} /></td>
                              <td className="p-2 border-r border-gray-300 text-center font-mono font-medium"><input className="mp-editable text-center" value={row.tripTimeMs} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "tripTimeMs", e.target.value)} /></td>
                              <td className="p-2 border-r border-gray-300 text-center font-bold text-emerald-600"><input className="mp-editable text-center" value={row.testButtonResult} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "testButtonResult", e.target.value)} /></td>
                              <td className="p-2 text-center font-bold text-emerald-600"><input className="mp-editable text-center" value={row.assessment} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "assessment", e.target.value)} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-t-lg border border-gray-300">
                    3. Pomiar rezystancji uziemienia (GSU)
                  </div>
                  <div className="border-x border-b border-gray-300 rounded-b-lg p-4 bg-white text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <span className="font-bold text-gray-700 mr-2 shrink-0">Metoda pomiaru:</span>
                        <input className="mp-editable text-gray-950 font-bold border-b border-gray-300 flex-grow pb-0.5" value={protocols.groundMeasurementMethod || ""} placeholder="..." onChange={(e) => updateProtocols({ groundMeasurementMethod: e.target.value })} />
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold text-gray-700 mr-2 shrink-0">Rodzaj uziomu:</span>
                        <input className="mp-editable text-gray-950 font-bold border-b border-gray-300 flex-grow pb-0.5" value={protocols.groundElectrodeType || ""} placeholder="..." onChange={(e) => updateProtocols({ groundElectrodeType: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="flex items-center">
                        <span className="font-bold text-gray-700 mr-2 shrink-0">Zmierzona wartość Ru:</span>
                        <input className="mp-editable text-brand font-black text-sm px-1 font-mono w-16" value={protocols.groundMeasuredResistance || ""} placeholder="..." onChange={(e) => updateProtocols({ groundMeasuredResistance: e.target.value })} />
                        <span className="font-bold text-gray-900">Ω</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold text-gray-700 mr-2 shrink-0">Wartość wymagana:</span>
                        <input className="mp-editable text-gray-900 font-bold px-1 font-mono w-16" value={protocols.groundRequiredResistance || ""} placeholder="..." onChange={(e) => updateProtocols({ groundRequiredResistance: e.target.value })} />
                        <span className="font-bold text-gray-900">Ω</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <span className="font-bold text-gray-900 uppercase tracking-wider block text-[10px] mb-2">Orzeczenie techniczne:</span>
                      <textarea 
                        className="mp-editable w-full bg-white p-2 rounded border border-gray-300 text-gray-900 font-medium text-xs resize-none" 
                        rows={2}
                        value={protocols.groundConclusionText || ""}
                        placeholder="Wpisz orzeczenie..."
                        onChange={(e) => updateProtocols({ groundConclusionText: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="grid grid-cols-2 gap-8 items-end pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300 italic">miejsce na pieczęć / podpis</span>
                      </div>
                      <div className="border-t border-gray-300 pt-1.5">
                        <p className="text-[10px] font-bold text-gray-700 uppercase">Sprawdził (Wykonawca/Elektryk)</p>
                        <p className="text-[8px] text-gray-400 mt-0.5">Podpis osoby z uprawnieniami SEP</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300 italic">miejsce na podpis</span>
                      </div>
                      <div className="border-t border-gray-300 pt-1.5">
                        <p className="text-[10px] font-bold text-gray-700 uppercase">Przedstawiciel Inwestora</p>
                        <p className="text-[8px] text-gray-400 mt-0.5">Potwierdzam otrzymanie wyników</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Support for legacy pages (continuity, loop, insulation) to render similarly if not unified */}
        {["continuity", "loop", "insulation"].includes(activeTab) && (
          <div className="a4-page a4-page--landscape flex items-center justify-center text-gray-400">
            Protokoły klasyczne: układ nie otrzymał pełnej modernizacji Tailwindowej, zalecany styl zunifikowany. W PDF wyglądają poprawnie.
          </div>
        )}
      </div>
    </div>
  );
}
