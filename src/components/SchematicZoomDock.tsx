
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
  return (
    <div className="schematic-zoom-dock" aria-label="Sterowanie zoomem">
      <button
        type="button"
        className="workspace-tool-btn"
        title="Pomniejsz"
        aria-label="Pomniejsz"
        onClick={onZoomOut}
      >
        <AppIcon name="zoomOut" size={17} />
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        title="Dopasuj do widoku"
        aria-label="Dopasuj do widoku"
        onClick={onZoomFit}
      >
        <AppIcon name="zoomFit" size={17} />
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        title="Powiększ"
        aria-label="Powiększ"
        onClick={onZoomIn}
      >
        <AppIcon name="zoomIn" size={17} />
      </button>
      <div className="schematic-zoom-badge">{zoomPercent}%</div>
    </div>
  );
}
