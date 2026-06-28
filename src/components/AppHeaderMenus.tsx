import { AppIcon } from "./AppIcon";
import type { AppUiTheme } from "../hooks/app/useAppPersistence";
import type { SheetType } from "../lib/appHelpers";

interface AppHeaderViewMenuProps {
  showRightPanel: boolean;
  showDinRailGroups: boolean;
  activeSheet: SheetType;
  onClose: () => void;
  onToggleRightPanel: () => void;
  onToggleDinRailGroups: () => void;
  onChangeSheet: (sheet: SheetType) => void;
}

/**
 * Dropdown menu "Widok" — Panel prawy, Pokaż grupy, Arkusze (1-4).
 */
export function AppHeaderViewMenu({
  showRightPanel,
  showDinRailGroups,
  activeSheet,
  onClose,
  onToggleRightPanel,
  onToggleDinRailGroups,
  onChangeSheet,
}: AppHeaderViewMenuProps) {
  return (
    <div
      className="flyout-menu wide"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="flyout-section">Wyświetlanie</span>
      <button className="flyout-item" onClick={() => { onClose(); onToggleRightPanel(); }}>
        <AppIcon className="flyout-icon" name="dockRight" />
        <span className="flyout-label">Panel prawy</span>
        {showRightPanel && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onToggleDinRailGroups(); }}>
        <AppIcon className="flyout-icon" name="group" />
        <span className="flyout-label">{showDinRailGroups ? "Ukryj grupy" : "Pokaż grupy"}</span>
        {showDinRailGroups && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <span className="flyout-divider" />
      <span className="flyout-section">Arkusze</span>
      <button className="flyout-item" onClick={() => { onClose(); onChangeSheet("sheet1"); }}>
        <AppIcon className="flyout-icon" name="grid" />
        <span className="flyout-label">Szyna DIN</span>
        {activeSheet === "sheet1" && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onChangeSheet("sheet2"); }}>
        <AppIcon className="flyout-icon" name="fileTree" />
        <span className="flyout-label">Schemat jednokreskowy</span>
        {activeSheet === "sheet2" && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onChangeSheet("sheet3"); }}>
        <AppIcon className="flyout-icon" name="list" />
        <span className="flyout-label">Lista obwodów</span>
        {activeSheet === "sheet3" && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onChangeSheet("sheet4"); }}>
        <AppIcon className="flyout-icon" name="pdf" />
        <span className="flyout-label">Dokumentacja PDF</span>
        {activeSheet === "sheet4" && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
    </div>
  );
}

interface AppHeaderToolsMenuProps {
  onClose: () => void;
  onOpenDinRailGenerator: () => void;
  onOpenSvgImport: () => void;
  onOpenImportedModulesManager: () => void;
}

/**
 * Dropdown menu "Narzędzia" — Generator szyny DIN, Import SVG, Zarządzaj importem.
 */
export function AppHeaderToolsMenu({
  onClose,
  onOpenDinRailGenerator,
  onOpenSvgImport,
  onOpenImportedModulesManager,
}: AppHeaderToolsMenuProps) {
  return (
    <div
      className="flyout-menu wide"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="flyout-section">Narzędzia</span>
      <button className="flyout-item" onClick={() => { onClose(); onOpenDinRailGenerator(); }}>
        <AppIcon className="flyout-icon accent-blue" name="module" />
        <span className="flyout-label">Szyna DIN</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onOpenSvgImport(); }}>
        <AppIcon className="flyout-icon" name="import" />
        <span className="flyout-label">Import SVG</span>
      </button>
      <button
        className="flyout-item"
        onClick={() => { onClose(); onOpenImportedModulesManager(); }}
      >
        <AppIcon className="flyout-icon" name="list" />
        <span className="flyout-label">Zarządzaj importem SVG</span>
      </button>
    </div>
  );
}

interface AppHeaderSettingsMenuProps {
  uiTheme: AppUiTheme;
  showRightPanel: boolean;
  onClose: () => void;
  onChangeUiTheme: (theme: AppUiTheme) => void;
}

/**
 * Dropdown menu "Ustawienia" — Motyw (Modern/Classic), info o panelu.
 */
export function AppHeaderSettingsMenu({
  uiTheme,
  showRightPanel,
  onClose,
  onChangeUiTheme,
}: AppHeaderSettingsMenuProps) {
  return (
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
            onClick={() => { onClose(); onChangeUiTheme("modern"); }}
          >
            Z cieniami
          </button>
          <button
            type="button"
            className={uiTheme === "classic" ? "active" : ""}
            onClick={() => { onClose(); onChangeUiTheme("classic"); }}
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
  );
}
