import { AppIcon } from "./AppIcon";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div
      className="flyout-menu wide"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="flyout-section">{t("app.viewMenu.section")}</span>
      <button className="flyout-item" onClick={() => { onClose(); onToggleRightPanel(); }}>
        <AppIcon className="flyout-icon" name="dockRight" />
        <span className="flyout-label">{t("app.viewMenu.rightPanel")}</span>
        {showRightPanel && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onToggleDinRailGroups(); }}>
        <AppIcon className="flyout-icon" name="group" />
        <span className="flyout-label">{showDinRailGroups ? t("app.viewMenu.hideGroups") : t("app.viewMenu.showGroups")}</span>
        {showDinRailGroups && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <span className="flyout-divider" />
      <span className="flyout-section">{t("app.viewMenu.sheets")}</span>
      <button className="flyout-item" onClick={() => { onClose(); onChangeSheet("sheet1"); }}>
        <AppIcon className="flyout-icon" name="grid" />
        <span className="flyout-label">{t("app.viewMenu.sheet1")}</span>
        {activeSheet === "sheet1" && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onChangeSheet("sheet2"); }}>
        <AppIcon className="flyout-icon" name="fileTree" />
        <span className="flyout-label">{t("app.viewMenu.sheet2")}</span>
        {activeSheet === "sheet2" && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onChangeSheet("sheet3"); }}>
        <AppIcon className="flyout-icon" name="list" />
        <span className="flyout-label">{t("app.viewMenu.sheet3")}</span>
        {activeSheet === "sheet3" && <AppIcon className="flyout-check-icon" name="check" />}
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onChangeSheet("sheet4"); }}>
        <AppIcon className="flyout-icon" name="pdf" />
        <span className="flyout-label">{t("app.viewMenu.sheet4")}</span>
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
  const { t } = useTranslation();
  return (
    <div
      className="flyout-menu wide"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="flyout-section">{t("app.toolsMenu.section")}</span>
      <button className="flyout-item" onClick={() => { onClose(); onOpenDinRailGenerator(); }}>
        <AppIcon className="flyout-icon accent-blue" name="module" />
        <span className="flyout-label">{t("app.toolsMenu.dinRail")}</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onOpenSvgImport(); }}>
        <AppIcon className="flyout-icon" name="import" />
        <span className="flyout-label">{t("app.toolsMenu.importSvg")}</span>
      </button>
      <button
        className="flyout-item"
        onClick={() => { onClose(); onOpenImportedModulesManager(); }}
      >
        <AppIcon className="flyout-icon" name="list" />
        <span className="flyout-label">{t("app.toolsMenu.manageImport")}</span>
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
  const { t } = useTranslation();
  return (
    <div
      className="flyout-menu settings-menu"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="flyout-section">{t("app.settingsMenu.appearance")}</span>
      <div className="flyout-card">
        <div className="settings-row">
          <AppIcon name="theme" />
          <span>{t("app.settingsMenu.theme")}</span>
          <strong>{t("app.settingsMenu.dark")}</strong>
        </div>
        <div className="settings-segmented" role="group" aria-label={t("app.settingsMenu.style")}>
          <button
            type="button"
            className={uiTheme === "modern" ? "active" : ""}
            onClick={() => { onClose(); onChangeUiTheme("modern"); }}
          >
            {t("app.settingsMenu.shadows")}
          </button>
          <button
            type="button"
            className={uiTheme === "classic" ? "active" : ""}
            onClick={() => { onClose(); onChangeUiTheme("classic"); }}
          >
            {t("app.settingsMenu.classic")}
          </button>
        </div>
      </div>

      <span className="flyout-divider" />
      <span className="flyout-section">{t("app.settingsMenu.interface")}</span>
      <div className="flyout-card">
        <label className="settings-slider">
          <span>{t("app.settingsMenu.iconSize")}</span>
          <input max={64} min={24} readOnly type="range" value={36} />
        </label>
        <div className="settings-row">
          <AppIcon name="dockRight" />
          <span>{t("app.settingsMenu.propertyPanel")}</span>
          <strong>{showRightPanel ? t("app.settingsMenu.visible") : t("app.settingsMenu.hidden")}</strong>
        </div>
      </div>
    </div>
  );
}
