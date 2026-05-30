import { useEffect, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";
import type { SheetType } from "../lib/appHelpers";
import type { AppUiTheme } from "../App";

interface AppHeaderProps {
  projectFileName: string;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  showRightPanel: boolean;
  showDinRailGroups: boolean;
  uiTheme: AppUiTheme;
  activeSheet: SheetType;
  workspaceZoomPercent: number;
  hasSelectedSymbol: boolean;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: (asNew: boolean) => void;
  onExportPdf: () => void;
  onExportBom: () => void;
  onExportPng: (withAnnotations: boolean) => void;
  onExportDinRailPngWithDescriptionsNoBrackets: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onOpenDinRailGenerator: () => void;
  onOpenSvgImport: () => void;
  onOpenImportedModulesManager: () => void;
  onOpenHelp: () => void;
  onToggleRightPanel: () => void;
  onToggleDinRailGroups: () => void;
  onChangeUiTheme: (theme: AppUiTheme) => void;
  onChangeSheet: (sheet: SheetType) => void;
  showTemporaryStatus: (message: string) => void;
}

export function AppHeader({
  projectFileName,
  hasUnsavedChanges,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  showRightPanel,
  showDinRailGroups,
  uiTheme,
  activeSheet,
  workspaceZoomPercent,
  hasSelectedSymbol,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportPdf,
  onExportBom,
  onExportPng,
  onExportDinRailPngWithDescriptionsNoBrackets,
  onUndo,
  onRedo,
  onDeleteSelected,
  onOpenDinRailGenerator,
  onOpenSvgImport,
  onOpenImportedModulesManager,
  onOpenHelp,
  onToggleRightPanel,
  onToggleDinRailGroups,
  onChangeUiTheme,
  onChangeSheet,
  showTemporaryStatus,
}: AppHeaderProps) {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = () => {
      setFileMenuOpen(false);
      setViewMenuOpen(false);
      setToolsMenuOpen(false);
      setSettingsMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFileMenuOpen(false);
        setViewMenuOpen(false);
        setToolsMenuOpen(false);
        setSettingsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className={`toolbar-shell ${activeSheet === "sheet4" ? "toolbar-shell--compact" : ""}`}>
      <div className="toolbar-left">
        <div style={{ position: "relative" }} ref={fileMenuRef}>
          <button
            type="button"
            className={`toolbar-menu-btn ${fileMenuOpen ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setFileMenuOpen(!fileMenuOpen);
              setViewMenuOpen(false);
              setToolsMenuOpen(false);
              setSettingsMenuOpen(false);
            }}
          >
            Plik
          </button>
          {fileMenuOpen && (
            <div
              className="flyout-menu"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="flyout-section">Zlecenie</span>
              <button className="flyout-item" onClick={() => { setFileMenuOpen(false); onNewProject(); }}>
                <AppIcon className="flyout-icon" name="file" />
                <span className="flyout-label">Nowe zlecenie</span>
                {hasUnsavedChanges && <span className="flyout-alert-dot" />}
                <span className="flyout-shortcut">Ctrl+N</span>
              </button>
              <button className="flyout-item" onClick={() => { setFileMenuOpen(false); onOpenProject(); }}>
                <AppIcon className="flyout-icon" name="folderOpen" />
                <span className="flyout-label">Otwórz</span>
                <span className="flyout-shortcut">Ctrl+O</span>
              </button>
              <button className="flyout-item" onClick={() => { setFileMenuOpen(false); onSaveProject(false); }}>
                <AppIcon className="flyout-icon" name="save" />
                <span className="flyout-label">Zapisz</span>
                <span className="flyout-shortcut">Ctrl+S</span>
              </button>
              <button className="flyout-item" onClick={() => { setFileMenuOpen(false); onSaveProject(true); }}>
                <AppIcon className="flyout-icon" name="saveEdit" />
                <span className="flyout-label">Zapisz jako</span>
              </button>
              <span className="flyout-divider" />
              <span className="flyout-section">Eksport</span>
              <button className="flyout-item" onClick={() => { setFileMenuOpen(false); window.print(); }}>
                <AppIcon className="flyout-icon" name="print" />
                <span className="flyout-label">Drukuj</span>
                <span className="flyout-shortcut">Ctrl+P</span>
              </button>
              <button className="flyout-item" onClick={() => { setFileMenuOpen(false); onExportPdf(); }}>
                <AppIcon className="flyout-icon" name="pdf" />
                <span className="flyout-label">Eksport PDF</span>
              </button>
              <button
                className="flyout-item"
                onClick={() => { setFileMenuOpen(false); onExportPng(false); }}
              >
                <AppIcon className="flyout-icon" name="file" />
                <span className="flyout-label">Eksport PNG (czysty)</span>
              </button>
              <button
                className="flyout-item"
                onClick={() => { setFileMenuOpen(false); onExportPng(true); }}
              >
                <AppIcon className="flyout-icon" name="fileEdit" />
                <span className="flyout-label">Eksport PNG (z oznaczeniami)</span>
              </button>
              <button
                className="flyout-item"
                onClick={() => { setFileMenuOpen(false); onExportDinRailPngWithDescriptionsNoBrackets(); }}
              >
                <AppIcon className="flyout-icon" name="fileEdit" />
                <span className="flyout-label">Eksport PNG HQ (rozdzielnica: opis bez klamr)</span>
              </button>
              <button
                className="flyout-item"
                onClick={() => { setFileMenuOpen(false); onExportBom(); }}
              >
                <AppIcon className="flyout-icon" name="list" />
                <span className="flyout-label">Eksport BOM (CSV)</span>
              </button>
              <span className="flyout-divider" />
              <button
                className="flyout-item danger"
                onClick={() => showTemporaryStatus("Zamykanie aplikacji webowej nie jest dostępne w przeglądarce")}
              >
                <AppIcon className="flyout-icon" name="exit" />
                <span className="flyout-label">Wyjdź</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`toolbar-menu-btn ${viewMenuOpen ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setViewMenuOpen(!viewMenuOpen);
              setFileMenuOpen(false);
              setToolsMenuOpen(false);
              setSettingsMenuOpen(false);
            }}
          >
            Widok
          </button>
          {viewMenuOpen && (
            <div
              className="flyout-menu wide"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="flyout-section">Wyświetlanie</span>
              <button className="flyout-item" onClick={() => { setViewMenuOpen(false); onToggleRightPanel(); }}>
                <AppIcon className="flyout-icon" name="dockRight" />
                <span className="flyout-label">Panel prawy</span>
                {showRightPanel && <AppIcon className="flyout-check-icon" name="check" />}
              </button>
              <button className="flyout-item" onClick={() => { setViewMenuOpen(false); onToggleDinRailGroups(); }}>
                <AppIcon className="flyout-icon" name="group" />
                <span className="flyout-label">{showDinRailGroups ? "Ukryj grupy" : "Pokaż grupy"}</span>
                {showDinRailGroups && <AppIcon className="flyout-check-icon" name="check" />}
              </button>
              <span className="flyout-divider" />
              <span className="flyout-section">Arkusze</span>
              <button className="flyout-item" onClick={() => { setViewMenuOpen(false); onChangeSheet("sheet1"); }}>
                <AppIcon className="flyout-icon" name="grid" />
                <span className="flyout-label">Szyna DIN</span>
                {activeSheet === "sheet1" && <AppIcon className="flyout-check-icon" name="check" />}
              </button>
              <button className="flyout-item" onClick={() => { setViewMenuOpen(false); onChangeSheet("sheet2"); }}>
                <AppIcon className="flyout-icon" name="fileTree" />
                <span className="flyout-label">Schemat jednokreskowy</span>
                {activeSheet === "sheet2" && <AppIcon className="flyout-check-icon" name="check" />}
              </button>
              <button className="flyout-item" onClick={() => { setViewMenuOpen(false); onChangeSheet("sheet3"); }}>
                <AppIcon className="flyout-icon" name="list" />
                <span className="flyout-label">Lista obwodów</span>
                {activeSheet === "sheet3" && <AppIcon className="flyout-check-icon" name="check" />}
              </button>
              <button className="flyout-item" onClick={() => { setViewMenuOpen(false); onChangeSheet("sheet4"); }}>
                <AppIcon className="flyout-icon" name="pdf" />
                <span className="flyout-label">Podgląd PDF</span>
                {activeSheet === "sheet4" && <AppIcon className="flyout-check-icon" name="check" />}
              </button>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`toolbar-menu-btn ${toolsMenuOpen ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setToolsMenuOpen(!toolsMenuOpen);
              setFileMenuOpen(false);
              setViewMenuOpen(false);
              setSettingsMenuOpen(false);
            }}
          >
            Narzędzia
          </button>
          {toolsMenuOpen && (
            <div
              className="flyout-menu wide"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="flyout-section">Narzędzia</span>
              <button className="flyout-item" onClick={() => { setToolsMenuOpen(false); onOpenDinRailGenerator(); }}>
                <AppIcon className="flyout-icon accent-blue" name="module" />
                <span className="flyout-label">Szyna DIN</span>
              </button>
              <button
                className="flyout-item"
                onClick={() => { setToolsMenuOpen(false); onOpenSvgImport(); }}
              >
                <AppIcon className="flyout-icon" name="import" />
                <span className="flyout-label">Import SVG</span>
              </button>
              <button
                className="flyout-item"
                onClick={() => { setToolsMenuOpen(false); onOpenImportedModulesManager(); }}
              >
                <AppIcon className="flyout-icon" name="list" />
                <span className="flyout-label">Zarządzaj importem SVG</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="toolbar-menu-btn"
          onClick={onOpenHelp}
        >
          Pomoc
        </button>

        <a
          href="https://suppi.pl/dinboard"
          target="_blank"
          rel="noopener noreferrer"
          className="toolbar-menu-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#FFB020", textDecoration: "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line></svg>
          Postaw kawę
        </a>
      </div>

      {activeSheet !== "sheet4" ? (
      <div className="toolbar-center">
        <button
          type="button"
          className="toolbar-icon-btn"
          aria-label="Cofnij"
          title={undoLabel ? `Cofnij: ${undoLabel}` : "Cofnij"}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <AppIcon name="undo" size={14} />
        </button>
        <button
          type="button"
          className="toolbar-icon-btn"
          aria-label="Ponów"
          title={redoLabel ? `Ponów: ${redoLabel}` : "Ponów"}
          onClick={onRedo}
          disabled={!canRedo}
        >
          <AppIcon name="redo" size={14} />
        </button>
        <span className="toolbar-separator" />
        <button
          type="button"
          className="toolbar-icon-btn"
          aria-label="Usuń zaznaczone"
          title="Usuń zaznaczone"
          disabled={!hasSelectedSymbol}
          onClick={onDeleteSelected}
        >
          <AppIcon className="accent-red" name="delete" size={14} />
        </button>
        <button
          type="button"
          className="toolbar-icon-btn"
          aria-label="Szyna DIN"
          title="Szyna DIN"
          onClick={onOpenDinRailGenerator}
        >
          <AppIcon className="accent-blue" name="module" size={14} />
        </button>
        <button
          type="button"
          className="toolbar-icon-btn"
          aria-label="Import modułów"
          title="Import modułów"
          onClick={onOpenSvgImport}
        >
          <AppIcon name="import" size={14} />
        </button>
        <span className="toolbar-separator" />
        <button
          type="button"
          className="toolbar-icon-btn"
          aria-label="Przybliż"
          title="Przybliż"
        >
          <AppIcon name="zoomIn" size={14} />
        </button>
        <span className="toolbar-zoom-badge">{workspaceZoomPercent}%</span>
        <button
          type="button"
          className="toolbar-icon-btn"
          aria-label="Oddal"
          title="Oddal"
        >
          <AppIcon name="zoomOut" size={14} />
        </button>
        <button type="button" className="toolbar-icon-btn" aria-label="Dopasuj widok" title="Dopasuj widok">
          <AppIcon className="accent-blue" name="zoomFit" size={14} />
        </button>
      </div>
      ) : null}

      <div className="toolbar-right">
        <span className="toolbar-project-name" title={projectFileName}>
          {projectFileName}
        </span>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`toolbar-icon-btn ${settingsMenuOpen ? "active" : ""}`}
            aria-label="Ustawienia"
            title="Ustawienia"
            onClick={(e) => {
              e.stopPropagation();
              setSettingsMenuOpen(!settingsMenuOpen);
              setFileMenuOpen(false);
              setViewMenuOpen(false);
              setToolsMenuOpen(false);
            }}
          >
            <AppIcon name="cog" size={16} />
          </button>
          {settingsMenuOpen && (
            <div
              className="flyout-menu settings-menu"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="flyout-section">Wygląd</span>
              <div className="flyout-card">
                <div className="settings-row">
                  <AppIcon name="theme" />
                  <span>Motyw aplikacji</span>
                  <strong>Ciemny</strong>
                </div>
                <div className="settings-segmented" role="group" aria-label="Styl UI">
                  <button
                    type="button"
                    className={uiTheme === "modern" ? "active" : ""}
                    onClick={() => onChangeUiTheme("modern")}
                  >
                    Z cieniami
                  </button>
                  <button
                    type="button"
                    className={uiTheme === "classic" ? "active" : ""}
                    onClick={() => onChangeUiTheme("classic")}
                  >
                    Klasyczny
                  </button>
                </div>
              </div>

              <span className="flyout-divider" />
              <span className="flyout-section">Interfejs</span>
              <div className="flyout-card">
                <label className="settings-slider">
                  <span>Rozmiar ikon</span>
                  <input max={64} min={24} readOnly type="range" value={36} />
                </label>
                <div className="settings-row">
                  <AppIcon name="dockRight" />
                  <span>Panel właściwości</span>
                  <strong>{showRightPanel ? "Widoczny" : "Ukryty"}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
