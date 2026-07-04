import { useEffect, useState, useCallback } from "react";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import { AppHeader } from "./AppHeader";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { AppStatusBar } from "./AppStatusBar";
import { AppDialogsLayer } from "./AppDialogsLayer";
import { MainWorkspace } from "./MainWorkspace";
import { loadProjectMetadata } from "../lib/projectMetadata";

import {
  normalizePaletteAssetDimensions,
  normalizeGroupConsistency,
  DEFAULT_DIN_RAIL_CONFIG,
  type SheetType,
  type RightTab,
} from "../lib/appHelpers";
import {
  loadInitialSymbols,
  loadInitialConnections,
  loadInitialWireSettings,
} from "../lib/loadInitialState";
import { useSymbolHistory } from "../hooks/useSymbolHistory";
import { useSymbolActions } from "../hooks/useSymbolActions";
import { useProjectActions } from "../hooks/useProjectActions";
import { usePaletteActions } from "../hooks/usePaletteActions";
import { useImportedModules } from "../hooks/useImportedModules";
import { useSheetPanelState } from "../hooks/useSheetPanelState";
import { useDialogState } from "../hooks/useDialogState";
import { useSchematicState } from "../hooks/useSchematicState";
import { useIsMobileViewport } from "../hooks/useViewport";
import type { ProjectMetadata } from "../types/projectMetadata";
import type { SymbolItem } from "../types/symbolItem";
import type { ConnectionItem, WireColor, WireType, RoutingMode, FerruleColor } from "../types/connectionItem";
import { useAppWorkspaceDerived } from "../hooks/app/useAppWorkspaceDerived";
import { useAppWorkspaceCallbacks } from "../hooks/app/useAppWorkspaceCallbacks";

import type { ProjectFileData } from "../lib/projectFile";
import { safeGetItemSync } from "../lib/storageService";

import { useAppPersistence, type AppUiTheme, UI_THEME_STORAGE_KEY } from "../hooks/app/useAppPersistence";
import { useAppEventBindings } from "../hooks/app/useAppEventBindings";
import { useUnsavedChangesFlow } from "../hooks/app/useUnsavedChangesFlow";

export function loadUiTheme(): AppUiTheme {
  try {
    const value = safeGetItemSync(UI_THEME_STORAGE_KEY);
    return value === "classic" ? "classic" : "modern";
  } catch {
    return "modern";
  }
}

export function AppWorkspace({
  initialAction,
  initialData,
  onOpenFeedback
}: {
  initialAction: "new" | "last" | "load_data" | null;
  initialData: ProjectFileData | null;
  onOpenFeedback: () => void;
}) {
  // ── Core state ───────────────────────────────────────────────────────────────
  const [metadata, setMetadata] = useState<ProjectMetadata>(() => loadProjectMetadata());
  const [symbols, setSymbols] = useState<SymbolItem[]>(() => loadInitialSymbols(safeGetItemSync));
  const [connections, setConnections] = useState<ConnectionItem[]>(() =>
    loadInitialConnections(safeGetItemSync),
  );
  const [currentWireSettings, setCurrentWireSettings] = useState<{
    wireColor: WireColor;
    wireCrossSection: number;
    wireType: WireType;
    routingMode: RoutingMode;
    ferruleColor?: FerruleColor;
  }>(() => loadInitialWireSettings(safeGetItemSync));
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [selectedSymbolIds, setSelectedSymbolIds] = useState<string[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uiTheme, setUiTheme] = useState<AppUiTheme>(() => loadUiTheme());
  const [dinRailGeneratorRequest, setDinRailGeneratorRequest] = useState(0);
  const [dinRail, setDinRail] = useState<DinRailCanvasRail>({
    config: DEFAULT_DIN_RAIL_CONFIG, svg: "", width: 0, height: 0, isVisible: false,
  });
  const [highlightedCircuitEditTarget, setHighlightedCircuitEditTarget] = useState<{
    symbolId: string;
    fieldKey: string;
  } | null>(null);

  const showTemporaryStatus = useCallback((message: string, timeoutMs = 3500) => {
    setSaveStatus(message);
    window.setTimeout(() => setSaveStatus(""), timeoutMs);
  }, []);

  // ── State hooks ──────────────────────────────────────────────────────────────
  const sheetPanel = useSheetPanelState();
  const dialog = useDialogState();
  const schematic = useSchematicState();

  // ── Hooks ────────────────────────────────────────────────────────────────────
  const {
    importedModules,
    paletteGroups,
    paletteTemplateMap,
    importedModuleCategoryOptions,
    activePaletteGroupTitle,
    setActivePaletteGroupTitle,
    handleHidePaletteTemplate,
    handleSvgImportCommit,
    handleImportedModuleCategoryChange,
    handleRemoveImportedModule,
  } = useImportedModules(showTemporaryStatus);

  const history = useSymbolHistory({
    connections,
    setSymbols,
    setConnections,
    setSelectedSymbolId,
    setSelectedSymbolIds,
    setHasUnsavedChanges,
    showTemporaryStatus,
  });

  const selectedSymbol = symbols.find((s) => s.id === selectedSymbolId) ?? null;

  const {
    handleSymbolMoveStart, handleSymbolMove, handleSymbolMoveEnd,
    handleSymbolSelect, handleSymbolSelectionChange,
    handleCircuitEditSave, handleSchematicCellEdit,
    handleDeleteSelected,
  } = useSymbolActions({
    symbols, setSymbols,
    selectedSymbolId, setSelectedSymbolId,
    selectedSymbolIds, setSelectedSymbolIds,
    setActiveRightTab: (tab: RightTab) => sheetPanel.setActiveRightTab(tab), setHasUnsavedChanges,
    executeSymbolsCommand: history.executeSymbolsCommand,
    dragHistorySnapshotRef: history.dragHistorySnapshotRef,
    draggedSymbolIdsRef: history.draggedSymbolIdsRef,
  });

  // ── useAppWorkspaceDerived ───────────────────────────────────────────────────
  const {
    circuitRows,
    hasGeneratedDinRail,
    canShowSchematicAndCircuitList,
    totalPower,
    groupCount,
    validationResult,
    errorCount,
    warningCount,
    projectFileName,
    rcdManagerEntries,
  } = useAppWorkspaceDerived({
    symbols,
    dinRail,
    metadata,
    currentFilePath,
  });

  const {
    handleNewProject, handleOpenProject, handleLoadProjectData, handleSaveProject, handleExportPdf, handleExportBom, handleExportPng,
    handleExportDinRailPngWithDescriptionsNoBrackets,
    handleAutoBalance, handleApplyPhaseMoveSuggestion, handleOpenDinRailGenerator, handleRailGenerated,
    handleMetadataChange, handleResetDocumentation,
  } = useProjectActions({
    metadata, setMetadata, symbols, setSymbols,
    connections, setConnections,
    currentFilePath, setCurrentFilePath, paletteTemplateMap,
    setHasUnsavedChanges,
    selectedSymbolId, selectedSymbolIds,
    setSelectedSymbolId, setSelectedSymbolIds,
    setDinRail, dinRail, setActiveSheet: (sheet: SheetType) => sheetPanel.setActiveSheet(sheet), setDinRailGeneratorRequest,
    undoRedoServiceRef: history.undoRedoServiceRef,
    dragHistorySnapshotRef: history.dragHistorySnapshotRef,
    refreshHistoryState: history.refreshHistoryState,
    executeSymbolsCommand: history.executeSymbolsCommand,
    markClean: history.markClean,
    showTemporaryStatus,
  });

  const { paletteContextMenu, setPaletteContextMenu,
    pendingPaletteRemoval, setPendingPaletteRemoval,
    handlePaletteDrop, handlePaletteInsert, handleUnsupportedDinRailDrop, handleConfirmPaletteRemoval,
  } = usePaletteActions({
    symbols, paletteTemplateMap, dinRail, activeSheet: sheetPanel.activeSheet,
    selectedSymbol, selectedSymbolId, selectedSymbolIds,
    setActiveRightTab: (tab: RightTab) => sheetPanel.setActiveRightTab(tab),
    setActiveSheet: (sheet: SheetType) => sheetPanel.setActiveSheet(sheet),
    executeSymbolsCommand: history.executeSymbolsCommand,
    showTemporaryStatus, handleOpenDinRailGenerator, handleHidePaletteTemplate,
  });

  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dinboardFirstRunComplete") !== "true";
  });

  const handleOnboardingFinish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dinboardFirstRunComplete", "true");
    }
    setShowOnboarding(false);
  };

  const [didHandleInitialAction, setDidHandleInitialAction] = useState(false);

  useEffect(() => {
    if (!didHandleInitialAction && initialAction) {
      setDidHandleInitialAction(true);
      if (initialAction === "new") {
        handleNewProject();
      } else if (initialAction === "load_data" && initialData) {
        handleLoadProjectData(initialData);
      }
    }
  }, [initialAction, initialData, didHandleInitialAction, handleNewProject, handleLoadProjectData]);

  // ── Refactored Hooks ──────────────────────────────────────────────────────────
  useAppPersistence({
    metadata,
    symbols,
    connections,
    currentWireSettings,
    showDinRailGroups: sheetPanel.showDinRailGroups,
    uiTheme,
  });

  const {
    triggerNewProject,
    triggerOpenProject,
    handleSaveUnsavedChanges,
    handleDiscardUnsavedChanges,
    handleCancelUnsavedChanges,
  } = useUnsavedChangesFlow({
    hasUnsavedChanges,
    dialog,
    handleNewProject,
    handleOpenProject,
    handleSaveProject,
    setHasUnsavedChanges,
  });

  useAppEventBindings({
    hasUnsavedChanges,
    dialog,
    triggerNewProject,
    triggerOpenProject,
    handleSaveProject,
    schematic,
  });

  useEffect(() => {
    if (sheetPanel.activeSheet === "sheet3" || sheetPanel.activeSheet === "sheet4") sheetPanel.setWorkspaceZoomPercent(100);
  }, [sheetPanel, sheetPanel.activeSheet]);

  useEffect(() => {
    setSymbols((prev) => normalizeGroupConsistency(normalizePaletteAssetDimensions(prev, paletteTemplateMap)));
  }, [paletteTemplateMap]);

  // ── useAppWorkspaceCallbacks ─────────────────────────────────────────────────
  const {
    handleConnectionsChange,
    handleOpenRcdManager,
    handleToggleDinRailGroups,
    handleSaveRcdManager,
    handleValidationSymbolSelect,
    handleValidationFieldEdit,
    handleValidationQuickFix,
  } = useAppWorkspaceCallbacks({
    symbols,
    connections,
    selectedSymbolId,
    selectedSymbolIds,
    rcdManagerEntries,

    setHighlightedCircuitEditTarget,

    executeSymbolsCommand: history.executeSymbolsCommand,
    handleSymbolSelectionChange,
    handleCircuitEditSave,
    showTemporaryStatus,

    setIsRcdManagerOpen: dialog.setIsRcdManagerOpen,
    setActiveSheet: sheetPanel.setActiveSheet,
    setShowDinRailGroups: sheetPanel.setShowDinRailGroups,
  });

  // Detekcja mobile dla callbacków (tap-to-place, auto-zamknięcie panelu po wyborze).
  // Wcześniej czytaliśmy window.innerWidth bezpośrednio — działało w chwili
  // kliknięcia, ale nie reagowało na obrót telefonu w trakcie sesji. Hook czyta
  // matchMedia i reaguje na resize, więc wartość tu jest aktualna.
  const isMobileViewport = useIsMobileViewport();

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className={`app-shell ui-theme-${uiTheme}`}>
      <AppHeader
        projectFileName={projectFileName}
        hasUnsavedChanges={hasUnsavedChanges}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        undoLabel={history.undoLabel}
        redoLabel={history.redoLabel}
        showRightPanel={sheetPanel.showRightPanel}
        activeSheet={sheetPanel.activeSheet}
        workspaceZoomPercent={sheetPanel.workspaceZoomPercent}
        hasSelectedSymbol={Boolean(selectedSymbol)}
        onNewProject={triggerNewProject}
        onOpenProject={triggerOpenProject}
        onSaveProject={handleSaveProject}
        onExportPdf={handleExportPdf}
        onExportBom={handleExportBom}
        onExportPng={handleExportPng}
        onExportDinRailPngWithDescriptionsNoBrackets={handleExportDinRailPngWithDescriptionsNoBrackets}
        onUndo={history.handleUndo}
        onRedo={history.handleRedo}
        onDeleteSelected={handleDeleteSelected}
        onOpenDinRailGenerator={handleOpenDinRailGenerator}
        onOpenSvgImport={() => dialog.setSvgImportDialogOpen(true)}
        onOpenImportedModulesManager={() => dialog.setImportedModulesManagerOpen(true)}
        onOpenHelp={() => dialog.setIsHelpOpen(true)}
        onToggleRightPanel={() => sheetPanel.setShowRightPanel(!sheetPanel.showRightPanel)}
        showDinRailGroups={sheetPanel.showDinRailGroups}
        uiTheme={uiTheme}
        onChangeUiTheme={setUiTheme}
        onToggleDinRailGroups={handleToggleDinRailGroups}
        onChangeSheet={sheetPanel.setActiveSheet}
        showTemporaryStatus={showTemporaryStatus}
        onOpenFeedback={onOpenFeedback}
      />

      <MainWorkspace
        activeSheet={sheetPanel.activeSheet}
        showLeftPanel={sheetPanel.showLeftPanel}
        showRightPanel={sheetPanel.showRightPanel}
        onCloseLeftPanel={() => sheetPanel.setShowLeftPanel(false)}
        onOpenLeftPanel={() => {
          if (sheetPanel.activeSheet === "sheet1" && !dinRail.isVisible && isMobileViewport) {
            handleOpenDinRailGenerator();
          } else {
            sheetPanel.setShowLeftPanel(true);
          }
        }}
        onChangeSheet={sheetPanel.setActiveSheet}
        onRequestLeftPanelTab={(tabName) => {
          sheetPanel.setShowLeftPanel(true);
          setActivePaletteGroupTitle(tabName);
          if (sheetPanel.activeSheet !== "sheet1") {
            sheetPanel.setActiveSheet("sheet1");
          }
        }}
        leftPanelProps={{
          activeSheet: sheetPanel.activeSheet,
          metadata,
          handleMetadataChange: handleMetadataChange,
          handleExportPdf: handleExportPdf,
          dinRail,
          paletteGroups,
          activePaletteGroupTitle,
          setActivePaletteGroupTitle,
          setPaletteContextMenu,
          handleOpenDinRailGenerator: () => {
            handleOpenDinRailGenerator();
            if (isMobileViewport) {
              sheetPanel.setShowLeftPanel(false);
            }
          },
          onPaletteItemTap: (templateId) => {
            handlePaletteInsert(templateId);
            if (isMobileViewport) {
              sheetPanel.setShowLeftPanel(false);
            }
          },
          currentWireSettings,
          onChangeDefaultWireSettings: setCurrentWireSettings,
          selectedConnectionId,
          connections,
          onConnectionsChange: handleConnectionsChange,
        }}
        workspaceCanvasProps={{
          paletteTemplateMap,
          dinRail,
          symbols,
          dinRailGeneratorRequest,
          handlePaletteDrop: handlePaletteDrop,
          handleUnsupportedDinRailDrop: handleUnsupportedDinRailDrop,
          setWorkspaceZoomPercent: sheetPanel.setWorkspaceZoomPercent,
          handleRailGenerated,
          handleSymbolMoveStart: handleSymbolMoveStart,
          handleSymbolMove: handleSymbolMove,
          handleSymbolMoveEnd: handleSymbolMoveEnd,
          handleSymbolSelectionChange: handleSymbolSelectionChange,
          handleSymbolSelect: handleSymbolSelect,
          handleDeleteSelected: handleDeleteSelected,
          selectedSymbolId,
          selectedSymbolIds,
          handleToggleDinRailGroups: handleToggleDinRailGroups,
          showDinRailGroups: sheetPanel.showDinRailGroups,
          canShowSchematicAndCircuitList,
          handleSchematicCellEdit: handleSchematicCellEdit,
          circuitRows,
          metadata,
          schematicViewportResetRequest: schematic.schematicViewportResetRequest,
          schematicScrollToPageRequest: schematic.schematicScrollToPageRequest,
          connections,
          onConnectionsChange: handleConnectionsChange,
          selectedConnectionId,
          onConnectionSelect: setSelectedConnectionId,
          currentWireSettings,
        }}
        rightPanelProps={{
          activeRightTab: sheetPanel.activeRightTab,
          setActiveRightTab: sheetPanel.setActiveRightTab,
          symbols,
          handleAutoBalance: handleAutoBalance,
          handleApplyPhaseMoveSuggestion: handleApplyPhaseMoveSuggestion,
          validationResult,
          isDinRailGenerated: hasGeneratedDinRail,
          selectedSymbol: selectedSymbol,
          handleCircuitEditSave: handleCircuitEditSave,
          handleSymbolSelectionChange: handleSymbolSelectionChange,
          handleValidationSymbolSelect: handleValidationSymbolSelect,
          handleValidationFieldEdit: handleValidationFieldEdit,
          handleValidationQuickFix: handleValidationQuickFix,
          highlightedCircuitEditFieldKey:
            highlightedCircuitEditTarget?.symbolId === selectedSymbolId
              ? highlightedCircuitEditTarget.fieldKey
              : null,
          metadata,
          handleMetadataChange: handleMetadataChange,
          handleOpenRcdManager: handleOpenRcdManager,
          onScrollToSchematicPage: schematic.handleScrollToSchematicPage,
        }}
        pdfProps={{
          metadata,
          symbols,
          dinRail,
          circuitRows,
          connections,
          handleMetadataChange: handleMetadataChange,
          handleResetDocumentation: handleResetDocumentation,
        }}
      />

      <AppStatusBar
        projectFileName={projectFileName}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        workspaceZoomPercent={sheetPanel.workspaceZoomPercent}
        totalPower={totalPower}
        groupCount={groupCount}
        symbolCount={symbols.length}
        errorCount={errorCount}
        warningCount={warningCount}
      />

      <AppDialogsLayer
        importedModuleCategoryOptions={importedModuleCategoryOptions}
        importedModules={importedModules}
        importedModulesManagerOpen={dialog.importedModulesManagerOpen}
        isHelpOpen={dialog.isHelpOpen}
        isRcdManagerOpen={dialog.isRcdManagerOpen}
        paletteContextMenu={paletteContextMenu}
        pendingPaletteRemoval={pendingPaletteRemoval}
        rcdManagerEntries={rcdManagerEntries}
        svgImportDialogOpen={dialog.svgImportDialogOpen}
        onCancelPaletteRemoval={() => setPendingPaletteRemoval(null)}
        onCloseHelp={() => dialog.setIsHelpOpen(false)}
        onCloseImportedModulesManager={() => dialog.setImportedModulesManagerOpen(false)}
        onClosePaletteContextMenu={() => setPaletteContextMenu(null)}
        onCloseRcdManager={() => dialog.setIsRcdManagerOpen(false)}
        onCloseSvgImport={() => dialog.setSvgImportDialogOpen(false)}
        onConfirmPaletteRemoval={handleConfirmPaletteRemoval}
        onImportedModuleCategoryChange={handleImportedModuleCategoryChange}
        onRemoveImportedModule={handleRemoveImportedModule}
        onRequestPaletteRemoval={setPendingPaletteRemoval}
        onSaveRcdManager={handleSaveRcdManager}
        onSvgImportCommit={handleSvgImportCommit}
        unsavedChangesActionType={dialog.unsavedChangesActionType}
        onSaveUnsavedChanges={handleSaveUnsavedChanges}
        onDiscardUnsavedChanges={handleDiscardUnsavedChanges}
        onCancelUnsavedChanges={handleCancelUnsavedChanges}
      />

      {showOnboarding && <OnboardingOverlay onFinish={handleOnboardingFinish} />}
    </main>
  );
}
