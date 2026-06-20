
import type { MeasurementProtocolsData } from "../../types/projectMetadata";
import { formatProtocolNumberLabel } from "../../lib/export/pdfPages/pdfHelpers";
import { createHeaderForPage } from "../../lib/measurementProtocolHelpers";
import { PageFooter } from "./ProtocolShared";

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
  const pageHeader = createHeaderForPage(protocols.rcdGroundHeader, 0, 1);
  const protocolNumberLabel = formatProtocolNumberLabel(pageHeader.headerTitle);
  const rowsPage = protocols.rcdRows || [];
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
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <div className="text-center w-64">
              <div className="h-16 flex items-center justify-center">
                <span className="text-[10px] text-gray-300 italic">miejsce na pieczęć / podpis</span>
              </div>
              <div className="border-t border-gray-300 pt-1.5">
                <p className="text-[10px] font-bold text-gray-700 uppercase">Sprawdził (Wykonawca/Elektryk)</p>
                <p className="text-[8px] text-gray-400 mt-0.5">Podpis osoby z uprawnieniami SEP</p>
              </div>
            </div>
          </div>
          <PageFooter pageNumber={rcdPageIndex} totalUiPages={totalUiPages} noBorder />
        </div>
      </div>
    </div>
  );
}
