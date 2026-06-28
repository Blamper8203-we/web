import { useEffect, useState } from "react";
import { AppIcon } from "./AppIcon";
import "./AppHeader.css";
import type { SheetType } from "../lib/appHelpers";
import type { AppUiTheme } from "../hooks/app/useAppPersistence";
import { Capacitor } from "@capacitor/core";
import { useToolbarMenuState } from "../hooks/useToolbarMenuState";
import { AppHeaderFileMenu } from "./AppHeaderFileMenu";
import { AboutDialog } from "./AboutDialog";
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
  const menu = useToolbarMenuState();
  const isNative = Capacitor.isNativePlatform();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" ? window.innerWidth <= 768 : false,
  );

  // Wykrywanie mobile viewport przez media query (reszta UI używa tego hooka)
  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Drukuj — wydzielone z inline `window.print()` dla testowalności.
  const handlePrint = () => {
    window.print();
  };

  const isMobileLayout = isNative || isMobileViewport;
  const showCenterToolbar = !isMobileLayout && activeSheet !== "sheet4";

  return (
    <header
      className={`toolbar-shell ${activeSheet === "sheet4" ? "toolbar-shell--compact" : ""} ${
        isNative ? "is-native" : ""
      }`}
    >
      <div className="toolbar-left">
        {isMobileLayout ? (
          <button
            type="button"
            className="toolbar-menu-btn mobile-hamburger"
            onClick={(e) => {
              e.stopPropagation();
              menu.toggle("mobile");
            }}
          >
            <AppIcon name="menu" size={24} />
          </button>
        ) : (
          <div
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
        )}

        {!isMobileLayout && (
          <>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className={`toolbar-menu-btn ${menu.isOpen("file") ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  menu.toggle("file");
                }}
              >
                Plik
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
                Widok
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
                Narzędzia
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
              Pomoc
            </button>

            <button
              type="button"
              className="toolbar-menu-btn"
              onClick={() => setIsAboutOpen(true)}
            >
              O aplikacji
            </button>

            <button
              type="button"
              className="toolbar-menu-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#e8eaef" }}
              onClick={onOpenFeedback}
            >
              <AppIcon name="feedback" size={14} />
              Zgłoś pomysł
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
              Postaw kawę
            </a>
          </>
        )}
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
            aria-label="Ustawienia"
            title="Ustawienia"
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

      {isAboutOpen && <AboutDialog onClose={() => setIsAboutOpen(false)} />}
    </header>
  );
}
