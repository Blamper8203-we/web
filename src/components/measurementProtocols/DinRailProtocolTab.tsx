
import { PageFooter } from "./ProtocolShared";

interface DinRailProtocolTabProps {
  dinRailPreviewUrl: string | null;
  dinRailPreviewError: string | null;
  displayDate: string;
  objectType: string;
  dinRailPageIndex: number;
  totalUiPages: number;
  mode?: "clean" | "connections";
}

export function DinRailProtocolTab({
  dinRailPreviewUrl,
  dinRailPreviewError,
  displayDate,
  objectType,
  dinRailPageIndex,
  totalUiPages,
  mode = "clean",
}: DinRailProtocolTabProps) {
  const isConnections = mode === "connections";
  const altText = isConnections
    ? "Widok rozdzielnicy z połączeniami"
    : "Widok rozdzielnicy elektrycznej";

return (
    <div className="a4-page a4-page--portrait" key="din-rail-page">
      <div>
        {/* Compact header — keeps the badge + project info but drops the
            secondary title and the "1. Widok..." frame so the rail image gets
            as much vertical space as possible on A4 portrait. */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-2 gap-4">
          <div className="flex items-center gap-3 flex-grow" style={{ minWidth: 0 }}>
            <div className="px-3 py-1 bg-brand text-white font-bold rounded text-xs uppercase tracking-wider">
              {isConnections ? "Połączenia" : "Rozdzielnica elektryczna"}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] text-gray-400">Data: <span className="font-medium text-gray-700">{displayDate}</span></div>
            <div className="text-[9px] text-gray-500 mt-0.5">Obiekt: <span className="font-semibold text-gray-900">{objectType}</span></div>
          </div>
        </div>

        <div className="mt-3 mp-din-rail-preview-frame">
          {dinRailPreviewUrl ? (
            <div className="mp-din-rail-preview-image text-center">
              <img 
                src={dinRailPreviewUrl} 
                alt={altText} 
                style={{ maxWidth: "100%", height: "auto", display: "inline-block" }} 
              />
            </div>
          ) : (
            <div className="mp-din-rail-preview-empty">
              <strong>{dinRailPreviewError ? "Nie udało się odświeżyć widoku." : "Odświeżanie widoku rozdzielnicy..."}</strong>
              <span>{dinRailPreviewError ?? "Podgląd zostanie pokazany po przygotowaniu snapshotu szyny DIN."}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <PageFooter pageNumber={dinRailPageIndex} totalUiPages={totalUiPages} />
      </div>
    </div>
  );
}
