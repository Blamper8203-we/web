import type { DinRailConfig } from "../lib/schematic/dinRailGenerator";
import { AppIcon } from "./AppIcon";

interface DinRailViewportHudProps {
  isVisible: boolean;
  modulesPerRow: number;
  rows: number;
}

export function DinRailViewportHud({
  isVisible,
  modulesPerRow,
  rows,
}: DinRailViewportHudProps) {
  return (
    <div className="workspace-hud workspace-hud--top-left">
      <span className="workspace-tag">Rozdzielnica</span>
      <strong>Szyna DIN</strong>
      <span>
        {isVisible
          ? `${rows} rzad / ${modulesPerRow} modulow`
          : "Wymaga wygenerowania"}
      </span>
    </div>
  );
}

interface DinRailZoomToolbarProps {
  canInteract: boolean;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function DinRailZoomToolbar({
  canInteract,
  onFit,
  onZoomIn,
  onZoomOut,
}: DinRailZoomToolbarProps) {
  return (
    <div className="workspace-hud workspace-hud--top-right">
      <button
        type="button"
        className="workspace-tool-btn"
        title="Pomniejsz"
        aria-label="Pomniejsz"
        onClick={onZoomOut}
        disabled={!canInteract}
      >
        <AppIcon name="zoomOut" size={17} />
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        title="Dopasuj do widoku"
        aria-label="Dopasuj do widoku"
        onClick={onFit}
        disabled={!canInteract}
      >
        <AppIcon name="zoomFit" size={17} />
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        title="Powieksz"
        aria-label="Powieksz"
        onClick={onZoomIn}
        disabled={!canInteract}
      >
        <AppIcon name="zoomIn" size={17} />
      </button>
    </div>
  );
}

interface DinRailEmptyStateProps {
  onOpenGenerator: () => void;
}

export function DinRailEmptyState({ onOpenGenerator }: DinRailEmptyStateProps) {
  return (
    <button type="button" className="din-rail-empty-action" onClick={onOpenGenerator}>
      <AppIcon name="module" size={48} />
      <strong>Wygeneruj szyne DIN</strong>
      <span>Kliknij tutaj lub uzyj ikony na pasku narzedzi</span>
    </button>
  );
}

interface DinRailGeneratorDialogProps {
  draftConfig: DinRailConfig;
  onClose: () => void;
  onGenerate: () => void;
  onModulesPerRowChange: (value: string) => void;
  onRowsChange: (value: string) => void;
  previewHeight: number;
  previewScale: number;
  previewSvg: string;
  previewWidth: number;
}

export function DinRailGeneratorDialog({
  draftConfig,
  onClose,
  onGenerate,
  onModulesPerRowChange,
  onRowsChange,
  previewHeight,
  previewScale,
  previewSvg,
  previewWidth,
}: DinRailGeneratorDialogProps) {
  return (
    <div className="din-rail-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="din-rail-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Generator szyny DIN"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="din-rail-dialog-preview">
          <div className="din-rail-dialog-preview-canvas">
            <div
              className="din-rail-dialog-preview-rail"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
              style={{
                width: previewWidth,
                height: previewHeight,
                transform: `translate(-50%, -50%) scale(${previewScale})`,
              }}
            />
          </div>
        </div>

        <div className="din-rail-dialog-controls">
          <div className="din-rail-dialog-title">
            <AppIcon name="module" size={18} />
            <strong>Generator szyny DIN</strong>
          </div>

          <label className="din-rail-dialog-field">
            <span>Liczba rzedow</span>
            <input
              type="number"
              min={1}
              max={10}
              value={draftConfig.rows}
              onChange={(event) => onRowsChange(event.target.value)}
            />
          </label>

          <label className="din-rail-dialog-field">
            <span>Moduly na rzad</span>
            <input
              type="number"
              min={6}
              max={48}
              step={6}
              value={draftConfig.modulesPerRow}
              onChange={(event) => onModulesPerRowChange(event.target.value)}
            />
          </label>

          <div className="din-rail-dialog-spacer" />

          <div className="din-rail-dialog-actions">
            <button type="button" className="accent-btn" onClick={onGenerate}>
              <AppIcon name="check" size={12} />
              <span>Generuj</span>
            </button>
            <button type="button" onClick={onClose}>
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DinRailStatusBarProps {
  height: number;
  isVisible: boolean;
  scale: number;
  totalModules: number;
  width: number;
}

export function DinRailStatusBar({
  height,
  isVisible,
  scale,
  totalModules,
  width,
}: DinRailStatusBarProps) {
  return (
    <div className="workspace-statusbar">
      {isVisible ? (
        <>
          <span>
            <AppIcon name="grid" size={12} />
            {width.toFixed(1)} mm
          </span>
          <span>{height.toFixed(1)} mm</span>
          <span>
            <AppIcon name="module" size={12} />
            {totalModules} modulow
          </span>
          <span>
            <AppIcon name="zoomIn" size={12} />
            {(scale * 100).toFixed(0)}%
          </span>
        </>
      ) : (
        <span>
          <AppIcon name="validation" size={12} />
          Wygeneruj szyne DIN, aby wlaczyc ukladanie modulow
        </span>
      )}
    </div>
  );
}
