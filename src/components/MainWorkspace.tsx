import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { AppLeftPanel, type AppLeftPanelProps } from "./AppLeftPanel";
import { AppWorkspaceCanvas, type AppWorkspaceCanvasProps } from "./AppWorkspaceCanvas";
import { AppRightPanel, type AppRightPanelProps } from "./AppRightPanel";
import { AppSheetTabs } from "./AppSheetTabs";
import { PdfWorkspaceShell } from "./PdfWorkspaceShell";
import { BottomNav } from "./mobile/BottomNav";
import { FloatingAddButton } from "./mobile/FloatingAddButton";

import type { SheetType } from "../lib/appHelpers";

/**
 * Główny obszar roboczy aplikacji (header, status bar i dialogs są renderowane
 * w App.tsx). Renderuje:
 * - sheet4 → PdfWorkspaceShell (lazy fallback inline)
 * - sheet1/2/3 → AppLeftPanel + AppWorkspaceCanvas + AppRightPanel
 *
 * Wydzielone z App.tsx, żeby zmniejszyć dług techniczny shella. Wszystkie
 * handlery i stan są przekazywane jako props z App (kompozytor).
 */
export interface MainWorkspaceProps {
  activeSheet: SheetType;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  onCloseLeftPanel: () => void;
  onOpenLeftPanel: () => void;
  onChangeSheet: (sheet: SheetType) => void;
  onRequestLeftPanelTab: (tabName: string) => void;
  leftPanelProps: Omit<AppLeftPanelProps, "showLeftPanel" | "onClose">;
  workspaceCanvasProps: Omit<AppWorkspaceCanvasProps, "activeSheet" | "onRequestLeftPanelTab">;
  rightPanelProps: Omit<AppRightPanelProps, "activeSheet" | "showRightPanel">;
  pdfProps: {
    metadata: NonNullable<AppWorkspaceCanvasProps["metadata"]>;
    symbols: AppWorkspaceCanvasProps["symbols"];
    dinRail: AppWorkspaceCanvasProps["dinRail"];
    circuitRows: AppWorkspaceCanvasProps["circuitRows"];
    connections: AppWorkspaceCanvasProps["connections"];
    handleMetadataChange: AppLeftPanelProps["handleMetadataChange"];
    handleResetDocumentation: () => void;
  };
}

export function MainWorkspace(props: MainWorkspaceProps) {
  const { t } = useTranslation();
  const {
    activeSheet,
    showLeftPanel,
    showRightPanel,
    onCloseLeftPanel,
    onOpenLeftPanel,
    onChangeSheet,
    onRequestLeftPanelTab,
    leftPanelProps,
    workspaceCanvasProps,
    rightPanelProps,
    pdfProps,
  } = props;

  return (
    <div
      className={`main-content ${
        rightPanelProps.activeRightTab === "circuitEdit" ? "is-circuit-editing" : ""
      } ${activeSheet === "sheet4" ? "is-pdf-workspace" : ""} ${
        showRightPanel ? "" : "is-right-panel-hidden"
      } ${showLeftPanel ? "" : "is-left-panel-hidden"}`}
    >
      {activeSheet === "sheet4" ? (
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {t("app.mainWorkspace.loadingPdf", "Ładowanie modułu PDF...")}
            </div>
          }
        >
          <PdfWorkspaceShell
            metadata={pdfProps.metadata}
            symbols={pdfProps.symbols}
            dinRail={pdfProps.dinRail}
            circuitRows={pdfProps.circuitRows}
            connections={pdfProps.connections}
            handleMetadataChange={pdfProps.handleMetadataChange}
            handleResetDocumentation={pdfProps.handleResetDocumentation}
            showLeftPanel={showLeftPanel}
            showRightPanel={showRightPanel}
          />
        </Suspense>
      ) : (
        <>
          <AppLeftPanel
            {...leftPanelProps}
            showLeftPanel={showLeftPanel}
            onClose={onCloseLeftPanel}
          />
          {showLeftPanel && (
            <div className="mobile-panel-overlay" onClick={onCloseLeftPanel} />
          )}
          <AppWorkspaceCanvas
            {...workspaceCanvasProps}
            activeSheet={activeSheet}
            onRequestLeftPanelTab={onRequestLeftPanelTab}
          />
          <AppRightPanel
            {...rightPanelProps}
            activeSheet={activeSheet}
            showRightPanel={showRightPanel}
          />
        </>
      )}

      <AppSheetTabs
        activeSheet={activeSheet}
        onChangeSheet={onChangeSheet}
        showLeftPanel={showLeftPanel}
        onOpenLeftPanel={onOpenLeftPanel}
      />

      <FloatingAddButton 
        isVisible={(activeSheet === "sheet1" || activeSheet === "sheet5_smarthome") && !showLeftPanel} 
        onClick={onOpenLeftPanel} 
      />

      <BottomNav 
        activeSheet={activeSheet} 
        onChangeSheet={onChangeSheet} 
        onOpenMenu={onOpenLeftPanel} 
      />
    </div>
  );
}
