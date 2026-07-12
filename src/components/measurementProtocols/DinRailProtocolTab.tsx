
import { PageFooter } from "./ProtocolShared";
import { PinchZoomImage } from "./PinchZoomImage";
import A4ScaledPage from "../A4ScaledPage";
import { useTranslation } from "react-i18next";

interface DinRailProtocolTabProps {
  dinRailPreviewUrl: string | null;
  dinRailPreviewError: string | null;
  onRetry?: () => void;
  displayDate: string;
  objectType: string;
  dinRailPageIndex: number;
  totalUiPages: number;
  mode?: "clean" | "connections";
}

export function DinRailProtocolTab({
  dinRailPreviewUrl,
  dinRailPreviewError,
  onRetry,
  displayDate,
  objectType,
  dinRailPageIndex,
  totalUiPages,
  mode = "clean",
}: DinRailProtocolTabProps) {
  const { t } = useTranslation();
  const isConnections = mode === "connections";
  const altText = isConnections
    ? t("app.pdf.dinRail.connectionsAlt", "Widok rozdzielnicy z połączeniami")
    : t("app.pdf.dinRail.cleanAlt", "Widok rozdzielnicy elektrycznej");

return (
    <A4ScaledPage key="din-rail-page">
    <div className="a4-page a4-page--portrait">
      <div>
        {/* Compact header — keeps the badge + project info but drops the
            secondary title and the "1. Widok..." frame so the rail image gets
            as much vertical space as possible on A4 portrait. */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-2 gap-4">
          <div className="flex items-center gap-3 flex-grow" style={{ minWidth: 0 }}>
            <div className="px-3 py-1 bg-brand text-white font-bold rounded text-xs uppercase tracking-wider">
              {isConnections ? t("app.pdf.dinRail.connectionsTitle", "Połączenia") : t("app.pdf.dinRail.cleanTitle", "Rozdzielnica elektryczna")}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] text-gray-400">{t("app.pdf.shared.date", "Data:")} <span className="font-medium text-gray-700">{displayDate}</span></div>
            <div className="text-[9px] text-gray-500 mt-0.5">{t("app.pdf.shared.object", "Obiekt:")} <span className="font-semibold text-gray-900">{objectType}</span></div>
          </div>
        </div>

        <div className="mt-3 mp-din-rail-preview-frame">
          {dinRailPreviewUrl ? (
            <div className="mp-din-rail-preview-image text-center">
              <PinchZoomImage
                src={dinRailPreviewUrl}
                alt={altText}
                className="mp-zoom-preview"
              />
            </div>
          ) : (
            <div className="mp-din-rail-preview-empty">
              <strong>{dinRailPreviewError ? t("app.pdf.dinRail.errorTitle", "Nie udało się odświeżyć widoku.") : t("app.pdf.dinRail.loadingTitle", "Odświeżanie widoku rozdzielnicy...")}</strong>
              <span>{dinRailPreviewError ?? t("app.pdf.dinRail.loadingDesc", "Podgląd zostanie pokazany po przygotowaniu snapshotu szyny DIN.")}</span>
              {dinRailPreviewError && onRetry ? (
                <button
                  type="button"
                  className="accent-btn"
                  onClick={onRetry}
                  style={{ marginTop: "var(--space-3, 12px)" }}
                >
                  {t("app.pdf.shared.retry", "Spróbuj ponownie")}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <PageFooter pageNumber={dinRailPageIndex} totalUiPages={totalUiPages} />
      </div>
    </div>
    </A4ScaledPage>
  );
}
