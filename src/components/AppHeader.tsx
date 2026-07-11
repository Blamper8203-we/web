import { useTranslation } from "react-i18next";
import { AppIcon } from "./AppIcon";
import "./AppHeader.css";
import type { SheetType } from "../lib/appHelpers";
import type { AppUiTheme } from "../hooks/app/useAppPersistence";
import { useIsMobileLayout, useIsNativePlatform } from "../hooks/useViewport";
import { useToolbarMenuState } from "../hooks/useToolbarMenuState";
import { AppHeaderFileMenu } from "./AppHeaderFileMenu";
import {
  AppHeaderViewMenu,
  AppHeaderToolsMenu,
  AppHeaderSettingsMenu,
} from "./AppHeaderMenus";
import {
  AppHeaderCenterToolbar,
  AppHeaderMobileDrawer,
} from "./AppHeaderCenterAndDrawer";

export interface AppHeaderProps {
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
  onOpenFeedback: () => void;
  onToggleRightPanel: () => void;
  onToggleDinRailGroups: () => void;
  onChangeUiTheme: (theme: AppUiTheme) => void;
  onChangeSheet: (sheet: SheetType) => void;
  showTemporaryStatus: (message: string) => void;
}

/**
 * Shell toolbara — kompozycja sub-komponentów.
 *
 * Wcześniej ten plik miał 599 linii i renderował inline:
 * - 4 dropdown menu (Plik/Widok/Narzędzia/Ustawienia)
 * - 1 mobile drawer (z touch gestures)
 * - 1 center toolbar (undo/redo/delete/dinRail/svg/zoom)
 * - 1 mobile hamburger button
 * - common state (5 menu states + click-outside + escape listener)
 *
 * Po refaktorze: sub-komponenty są w osobnych plikach, wspólny stan
 * dropdownów jest w `useToolbarMenuState` hook. Ten plik renderuje tylko
 * shell i kompozycję. Łatwiej dodać nowe menu/toolbar — wystarczy nowy
 * sub-komponent + button.
 */
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
  onOpenFeedback,
  onToggleRightPanel,
  onToggleDinRailGroups,
  onChangeUiTheme,
  onChangeSheet,
  showTemporaryStatus,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const menu = useToolbarMenuState();
  const isNative = useIsNativePlatform();
  const isMobileLayout = useIsMobileLayout();

  // Drukuj — wydzielone z inline `window.print()` dla testowalności.
  const handlePrint = () => {
    window.print();
  };

  const showCenterToolbar = !isMobileLayout && activeSheet !== "sheet4";

  return (
    <header
      className={`toolbar-shell ${activeSheet === "sheet4" ? "toolbar-shell--compact" : ""} ${
        isNative ? "is-native" : ""
      }`}
    >
      <div className="toolbar-left">
        {/* Hamburger: widoczny tylko na mobile. Klasa .mobile-only w Responsive.css
            jest ukrywana domyślnie i pokazywana przez `html.is-mobile-viewport`,
            ustawiane przez inline script w index.html PRZED hydration Reacta.
            Dzięki temu eliminujemy FOUC na telefonie — pierwszy render nie
            pokazuje pełnego menu desktopowego przez ~50ms przed przełączeniem.
            Warunek JS nadal jest potrzebny do `menu.toggle("mobile")` w handlerze. */}
        <button
          type="button"
          className="toolbar-menu-btn mobile-only mobile-hamburger"
          onClick={(e) => {
            e.stopPropagation();
            menu.toggle("mobile");
          }}
        >
          <AppIcon name="menu" size={24} />
        </button>

        <div
          className="desktop-only"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            marginLeft: "8px",
            width: "24px",
            height: "24px",
            borderRadius: "4px",
            overflow: "hidden",
            opacity: 0.9,
            cursor: "default",
          }}
        >
          <img
            src="/favicon-192.png"
            alt="DinBoard Logo"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        {/* Menu tekstowe (Plik, Widok, ...): widoczne tylko na desktop (CSS klasa
            .desktop-only). Na mobile ukryte przez `html.is-mobile-viewport` —
            eliminuje FOUC analogicznie do hamburger buttona powyżej. */}
        <div className="desktop-only" style={{ display: "flex", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`toolbar-menu-btn ${menu.isOpen("file") ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                menu.toggle("file");
              }}
            >
              {t("app.header.file")}
            </button>
            {menu.isOpen("file") && (
              <AppHeaderFileMenu
                hasUnsavedChanges={hasUnsavedChanges}
                onClose={menu.closeAll}
                onNewProject={onNewProject}
                onOpenProject={onOpenProject}
                onSaveProject={onSaveProject}
                onExportPdf={onExportPdf}
                onExportPng={onExportPng}
                onExportDinRailPngWithDescriptionsNoBrackets={
                  onExportDinRailPngWithDescriptionsNoBrackets
                }
                onExportBom={onExportBom}
                onPrint={handlePrint}
                showTemporaryStatus={showTemporaryStatus}
              />
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`toolbar-menu-btn ${menu.isOpen("view") ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                menu.toggle("view");
              }}
            >
              {t("app.header.view")}
            </button>
            {menu.isOpen("view") && (
              <AppHeaderViewMenu
                showRightPanel={showRightPanel}
                showDinRailGroups={showDinRailGroups}
                activeSheet={activeSheet}
                onClose={menu.closeAll}
                onToggleRightPanel={onToggleRightPanel}
                onToggleDinRailGroups={onToggleDinRailGroups}
                onChangeSheet={onChangeSheet}
              />
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`toolbar-menu-btn ${menu.isOpen("tools") ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                menu.toggle("tools");
              }}
            >
              {t("app.header.tools")}
            </button>
            {menu.isOpen("tools") && (
              <AppHeaderToolsMenu
                onClose={menu.closeAll}
                onOpenDinRailGenerator={onOpenDinRailGenerator}
                onOpenSvgImport={onOpenSvgImport}
                onOpenImportedModulesManager={onOpenImportedModulesManager}
              />
            )}
          </div>

          <button type="button" className="toolbar-menu-btn" onClick={onOpenHelp}>
            {t("app.header.help")}
          </button>

          <button
            type="button"
            className="toolbar-menu-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={onOpenFeedback}
          >
            <AppIcon name="feedback" size={14} />
            {t("app.header.feedback")}
          </button>

          <a
            href="https://suppi.pl/dinboard"
            target="_blank"
            rel="noopener noreferrer"
            className="toolbar-menu-btn toolbar-menu-btn--donate-tablet"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#FFB020",
              textDecoration: "none",
            }}
          >
            <AppIcon name="coffee" size={14} />
            {t("app.header.donate")}
          </a>
        </div>
      </div>

      {showCenterToolbar && (
        <AppHeaderCenterToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          undoLabel={undoLabel}
          redoLabel={redoLabel}
          hasSelectedSymbol={hasSelectedSymbol}
          workspaceZoomPercent={workspaceZoomPercent}
          onUndo={onUndo}
          onRedo={onRedo}
          onDeleteSelected={onDeleteSelected}
          onOpenDinRailGenerator={onOpenDinRailGenerator}
          onOpenSvgImport={onOpenSvgImport}
        />
      )}

      <div className="toolbar-right">
        <span className="toolbar-project-name" title={projectFileName}>
          {projectFileName}
        </span>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`toolbar-icon-btn ${menu.isOpen("settings") ? "active" : ""}`}
            aria-label={t("auto.ustawienia_452", "Ustawienia")}
            title={t("auto.ustawienia_343", "Ustawienia")}
            onClick={(e) => {
              e.stopPropagation();
              menu.toggle("settings");
            }}
          >
            <AppIcon name="cog" size={16} />
          </button>
          {menu.isOpen("settings") && (
            <AppHeaderSettingsMenu
              uiTheme={uiTheme}
              showRightPanel={showRightPanel}
              onClose={menu.closeAll}
              onChangeUiTheme={onChangeUiTheme}
            />
          )}
        </div>
      </div>

      {menu.isOpen("mobile") && (
        <AppHeaderMobileDrawer
          canUndo={canUndo}
          canRedo={canRedo}
          undoLabel={undoLabel}
          redoLabel={redoLabel}
          onClose={menu.closeAll}
          onNewProject={onNewProject}
          onOpenProject={onOpenProject}
          onSaveProject={onSaveProject}
          onUndo={onUndo}
          onRedo={onRedo}
          onExportPdf={onExportPdf}
          onOpenDinRailGenerator={onOpenDinRailGenerator}
          onOpenSvgImport={onOpenSvgImport}
          onOpenHelp={onOpenHelp}
          onOpenFeedback={onOpenFeedback}
        />
      )}
    </header>
  );
}
