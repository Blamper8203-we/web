import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="workspace-hud workspace-hud--top-left">
      <span className="workspace-tag">{t("auto.rozdzielnica_310", "Rozdzielnica")}</span>
      <strong>{t("auto.szynadin_555", "Szyna DIN")}</strong>
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
  panMode?: boolean;
  onTogglePanMode?: () => void;
}

export function DinRailZoomToolbar({
  canInteract,
  onFit,
  onZoomIn,
  onZoomOut,
  onToggleGroups,
  showGroups = true,
  panMode = false,
  onTogglePanMode,
}: DinRailZoomToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="workspace-hud workspace-hud--top-right">
      {onTogglePanMode && (
        <button
          type="button"
          className={`workspace-tool-btn ${panMode ? "is-active" : ""}`}
          title={panMode ? "Zaznaczanie" : "Przesuwanie widoku"}
          aria-label={panMode ? "Zaznaczanie" : "Przesuwanie widoku"}
          onClick={onTogglePanMode}
          disabled={!canInteract}
        >
          <AppIcon name="move" size={17} />
        </button>
      )}
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
          {/* Pionowy separator — działa zarówno w kolumnie (desktop)
              jak i w wierszu (mobile) */}
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: 'auto 4px' }} />
        </>
      )}
      <button
        type="button"
        className="workspace-tool-btn"
        title={t("auto.pomniejsz_963", "Pomniejsz")}
        aria-label={t("auto.pomniejsz_460", "Pomniejsz")}
        onClick={onZoomOut}
        disabled={!canInteract}
      >
        <AppIcon name="zoomOut" size={17} />
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        title={t("auto.dopasujdowidoku_884", "Dopasuj do widoku")}
        aria-label={t("auto.dopasujdowidoku_857", "Dopasuj do widoku")}
        onClick={onFit}
        disabled={!canInteract}
      >
        <AppIcon name="zoomFit" size={17} />
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        title={t("auto.powiksz_499", "Powiększ")}
        aria-label={t("auto.powiksz_911", "Powiększ")}
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
  const { t } = useTranslation();
  return (
    <button type="button" className="din-rail-empty-action" onClick={onOpenGenerator}>
      <AppIcon name="module" size={48} />
      <strong>{t("auto.wygenerujszyndi_901", "Wygeneruj szynę DIN")}</strong>
      <span>{t("auto.kliknijtutajlub_394", "Kliknij tutaj lub użyj ikony na pasku narzędzi")}</span>
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
  const { t } = useTranslation();
  return (
    <div className="din-rail-dialog-backdrop" onPointerDown={onClose}>
      <div
        className="din-rail-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("auto.generatorszynyd_58", "Generator szyny DIN")}
        onPointerDown={(event) => event.stopPropagation()}
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
            <strong>{t("auto.generatorszynyd_788", "Generator szyny DIN")}</strong>
          </div>

          <label className="din-rail-dialog-field">
            <span>{t("auto.liczbarzdw_743", "Liczba rzędów")}</span>
            <input
              type="number"
              min={1}
              max={10}
              value={draftConfig.rows === 0 ? "" : draftConfig.rows}
              onChange={(event) => onRowsChange(event.target.value)}
            />
          </label>

          <label className="din-rail-dialog-field">
            <span>{t("auto.moduynarzd_384", "Moduły na rząd")}</span>
            <input
              type="number"
              min={6}
              max={48}
              step={6}
              value={draftConfig.modulesPerRow === 0 ? "" : draftConfig.modulesPerRow}
              onChange={(event) => onModulesPerRowChange(event.target.value)}
            />
          </label>

          <div className="din-rail-dialog-spacer" />

          <div className="din-rail-dialog-actions">
            <button type="button" className="accent-btn" onClick={onGenerate}>
              <AppIcon name="check" size={12} />
              <span>{t("auto.generuj_866", "Generuj")}</span>
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
