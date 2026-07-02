import { useTranslation } from "react-i18next";

import { AppIcon } from "./AppIcon";

interface SchematicZoomDockProps {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
}

export function SchematicZoomDock({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomFit,
}: SchematicZoomDockProps) {
  const { t } = useTranslation();
  return (
    <div className="workspace-hud workspace-hud--top-right" aria-label={t("auto.sterowaniezoome_56", "Sterowanie zoomem")}>
      <button
        type="button"
        className="workspace-tool-btn"
        title={t("auto.pomniejsz_253", "Pomniejsz")}
        aria-label={t("auto.pomniejsz_183", "Pomniejsz")}
        onClick={onZoomOut}
      >
        <AppIcon name="zoomOut" size={17} />
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        title={t("auto.dopasujdowidoku_233", "Dopasuj do widoku")}
        aria-label={t("auto.dopasujdowidoku_717", "Dopasuj do widoku")}
        onClick={onZoomFit}
      >
        <AppIcon name="zoomFit" size={17} />
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        title={t("auto.powiksz_199", "Powiększ")}
        aria-label={t("auto.powiksz_660", "Powiększ")}
        onClick={onZoomIn}
      >
        <AppIcon name="zoomIn" size={17} />
      </button>
      <div className="schematic-zoom-badge">{zoomPercent}%</div>
    </div>
  );
}
