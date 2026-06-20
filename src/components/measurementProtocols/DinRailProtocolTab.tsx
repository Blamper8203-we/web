
import { PageFooter } from "./ProtocolShared";

interface DinRailProtocolTabProps {
  dinRailPreviewUrl: string | null;
  dinRailPreviewError: string | null;
  displayDate: string;
  objectType: string;
  dinRailPageIndex: number;
  totalUiPages: number;
}

export function DinRailProtocolTab({
  dinRailPreviewUrl,
  dinRailPreviewError,
  displayDate,
  objectType,
  dinRailPageIndex,
  totalUiPages,
}: DinRailProtocolTabProps) {
  return (
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
        <PageFooter pageNumber={dinRailPageIndex} totalUiPages={totalUiPages} />
      </div>
    </div>
  );
}
