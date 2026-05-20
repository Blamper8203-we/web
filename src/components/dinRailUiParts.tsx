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
          ? `${rows} rząd / ${modulesPerRow} modułów`
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
  onToggleGroups?: () => void;
  showGroups?: boolean;
}

export function DinRailZoomToolbar({
  canInteract,
  onFit,
  onZoomIn,
  onZoomOut,
  onToggleGroups,
  showGroups = true,
}: DinRailZoomToolbarProps) {
  return (
    <div className="workspace-hud workspace-hud--top-right">
      {onToggleGroups && (
        <>
          <button
            type="button"
            className={`workspace-tool-btn ${showGroups ? "is-active" : ""}`}
            title={showGroups ? "Ukryj klamry grup" : "Pokaż klamry grup"}
            aria-label={showGroups ? "Ukryj klamry grup" : "Pokaż klamry grup"}
            onClick={onToggleGroups}
            disabled={!canInteract}
          >
            <AppIcon name="module" size={17} />
          </button>
          <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.15)', margin: '4px auto' }} />
        </>
      )}
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
        title="Powiększ"
        aria-label="Powiększ"
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
      <strong>Wygeneruj szynę DIN</strong>
      <span>Kliknij tutaj lub użyj ikony na pasku narzędzi</span>
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
              className="din-rail-dialog-preview-rail-wrap"
            >
              <div
                className="din-rail-dialog-preview-rail"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
                style={{
                  width: previewWidth * previewScale,
                  height: previewHeight * previewScale,
                }}
              />
            </div>
          </div>
        </div>

        <div className="din-rail-dialog-controls">
          <div className="din-rail-dialog-title">
            <AppIcon name="module" size={18} />
            <strong>Generator szyny DIN</strong>
          </div>

          <label className="din-rail-dialog-field">
            <span>Liczba rzędów</span>
            <input
              type="number"
              min={1}
              max={10}
              value={draftConfig.rows}
              onChange={(event) => onRowsChange(event.target.value)}
            />
          </label>

          <label className="din-rail-dialog-field">
            <span>Moduły na rząd</span>
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
            {totalModules} modułów
          </span>
          <span>
            <AppIcon name="zoomIn" size={12} />
            {(scale * 100).toFixed(0)}%
          </span>
        </>
      ) : (
        <span>
          <AppIcon name="validation" size={12} />
          Wygeneruj szynę DIN, aby włączyć układanie modułów
        </span>
      )}
    </div>
  );
}
