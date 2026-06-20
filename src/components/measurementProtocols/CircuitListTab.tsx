
import { EMPTY_FIELD_PLACEHOLDER } from "../../lib/export/pdfPages/pdfHelpers";
import { PageFooter } from "./ProtocolShared";

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
  return (
    <>
      {circuitListPages.map((rowsPage, pageIndex) => (
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
                <span className="text-gray-500 font-medium">{circuitListRowsCount} pozycji</span>
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
                        <td className="p-3 text-center text-gray-500" colSpan={10}>Brak obwodów do pokazania.</td>
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
