import { useEffect, useState, useCallback, useMemo } from "react";
import type { DinRailCanvasRail } from "./components/DinRailCanvasPixi";
import { AppHeader } from "./components/AppHeader";
import { AppStatusBar } from "./components/AppStatusBar";
import { AppDialogsLayer } from "./components/AppDialogsLayer";
import { MainWorkspace } from "./components/MainWorkspace";
import type { RcdManagerEntry } from "./components/RcdManagementDialog";
import { buildCircuitRowsFromSymbols } from "./lib/circuitRows";
import { loadProjectMetadata } from "./lib/projectMetadata";
import { validateProject, type ValidationResult } from "./lib/validation/electricalValidationService";
import {
  applyValidationQuickFix,
  type ValidationQuickFixId,
} from "./lib/validation/validationQuickFixes";
import {
  normalizePaletteAssetDimensions,
  normalizeGroupConsistency,
  DEFAULT_DIN_RAIL_CONFIG,
  type SheetType,
  type RightTab,
} from "./lib/appHelpers";
import {
  loadInitialSymbols,
  loadInitialConnections,
  loadInitialWireSettings,
} from "./lib/loadInitialState";
import { useSymbolHistory } from "./hooks/useSymbolHistory";
import { useSymbolActions } from "./hooks/useSymbolActions";
import { useProjectActions } from "./hooks/useProjectActions";
import { usePaletteActions } from "./hooks/usePaletteActions";
import { useImportedModules } from "./hooks/useImportedModules";
import { useSheetPanelState } from "./hooks/useSheetPanelState";
import { useDialogState } from "./hooks/useDialogState";
import { useSchematicState } from "./hooks/useSchematicState";
import { applyRcdManagerUpdates } from "./lib/circuitEdit/rcdManagerLogic";
import type { ProjectMetadata } from "./types/projectMetadata";
import type { SymbolItem } from "./types/symbolItem";
import type { ConnectionItem, WireColor, WireType, RoutingMode, FerruleColor } from "./types/connectionItem";
import { PublicLandingPage } from "./components/PublicLandingPage";
import { FeedbackModal } from "./components/FeedbackModal";
import "./App.css";
import "./components/AppLayout.css";
import "./components/Responsive.css";
import "./components/MainContent.css";
import "./components/PhaseList.css";
import "./components/UI/Cards.css";
import "./components/UI/Forms.css";
import "./components/UI/Buttons.css";
import "./components/WorkspaceHUD.css";

import type { ProjectFileData } from "./lib/projectFile";
import { openProjectFile } from "./lib/projectFile";
import { safeGetItemSync, initStorageService } from "./lib/storageService";

import { useAppPersistence, type AppUiTheme, UI_THEME_STORAGE_KEY } from "./hooks/app/useAppPersistence";
import { useAppEventBindings } from "./hooks/app/useAppEventBindings";
import { useUnsavedChangesFlow } from "./hooks/app/useUnsavedChangesFlow";

const APP_ROUTE_PATH = "/app";
const EMPTY_VALIDATION_RESULT: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  info: [],
};

function normalizeRoutePath(pathname: string): "/" | "/app" {
  if (pathname === APP_ROUTE_PATH || pathname === `${APP_ROUTE_PATH}/`) {
    return APP_ROUTE_PATH;
  }

  return "/";
}

export type { AppUiTheme } from "./hooks/app/useAppPersistence";

function loadUiTheme(): AppUiTheme {
  try {
    const value = safeGetItemSync(UI_THEME_STORAGE_KEY);
    return value === "classic" ? "classic" : "modern";
  } catch {
    return "modern";
  }
}

function AppWorkspace({
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

  const handleConnectionsChange = useCallback((
    nextConnections: ConnectionItem[],
    label: string,
    statusMessage: string
  ) => {
    history.executeSymbolsCommand(
      label,
      { symbols, connections, selectedSymbolId, selectedSymbolIds },
      { symbols, connections: nextConnections, selectedSymbolId, selectedSymbolIds },
      statusMessage
    );
  }, [history, symbols, connections, selectedSymbolId, selectedSymbolIds]);

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

  // ── Derived ───────────────────────────────────────────────────────────────────
  const circuitRows = useMemo(() => buildCircuitRowsFromSymbols(symbols), [symbols]);
  const hasGeneratedDinRail = dinRail.isVisible;
  const hasModules = symbols.length > 0;
  const canShowSchematicAndCircuitList = hasGeneratedDinRail && hasModules;
  const totalPower = symbols.reduce((sum, s) => sum + s.powerW, 0);
  const groupCount = symbols.filter((s) => s.deviceKind === "rcd").length;
  const validationResult = useMemo(
    () => {
      if (!hasGeneratedDinRail) {
        return EMPTY_VALIDATION_RESULT;
      }

      return validateProject(symbols, {
        supplyVoltageV: metadata.supplyVoltageV,
        mainBreakerA: metadata.mainBreakerA,
      });
    },
    [hasGeneratedDinRail, symbols, metadata.supplyVoltageV, metadata.mainBreakerA],
  );
  const errorCount = validationResult.errors.length;
  const warningCount = validationResult.warnings.length;
  const projectFileName = (currentFilePath ? currentFilePath.split(/[\\/]/).pop() : "Nowe zlecenie") ?? "Nowe zlecenie";
  const rcdManagerEntries = useMemo<RcdManagerEntry[]>(
    () =>
      symbols
        .filter((symbol) => symbol.deviceKind === "rcd")
        .map((symbol) => ({
          id: symbol.id,
          referenceDesignation: symbol.referenceDesignation,
          label: symbol.label,
          groupName: symbol.groupName,
          rcdRatedCurrent: symbol.rcdRatedCurrent,
          rcdResidualCurrent: symbol.rcdResidualCurrent,
          rcdType: symbol.rcdType,
        })),
    [symbols],
  );

  const handleOpenRcdManager = useCallback(() => {
    if (rcdManagerEntries.length === 0) {
      showTemporaryStatus("Brak modułów RCD do konfiguracji", 3200);
      return;
    }

    dialog.setIsRcdManagerOpen(true);
  }, [rcdManagerEntries.length, showTemporaryStatus, dialog]);

  const handleToggleDinRailGroups = useCallback(() => {
    sheetPanel.setShowDinRailGroups((previous: boolean) => !previous);
  }, [sheetPanel]);

  const handleSaveRcdManager = useCallback(
    (entries: RcdManagerEntry[]) => {
      const nextSymbols = applyRcdManagerUpdates(symbols, entries);

      const changed = history.executeSymbolsCommand(
        "Zarządzanie RCD",
        { symbols, selectedSymbolId, selectedSymbolIds },
        { symbols: nextSymbols, selectedSymbolId, selectedSymbolIds },
        "Zapisano ustawienia RCD",
      );

      if (!changed) {
        showTemporaryStatus("Brak zmian w ustawieniach RCD", 2600);
      }

      dialog.setIsRcdManagerOpen(false);
    },
    [history, dialog, selectedSymbolId, selectedSymbolIds, showTemporaryStatus, symbols],
  );

  const handleValidationSymbolSelect = useCallback(
    (symbolId: string) => {
      setHighlightedCircuitEditTarget(null);
      sheetPanel.setActiveSheet("sheet1");
      handleSymbolSelectionChange([symbolId], symbolId);
    },
    [handleSymbolSelectionChange, sheetPanel],
  );

  const handleValidationFieldEdit = useCallback(
    (symbolId: string, fieldKey: string) => {
      setHighlightedCircuitEditTarget({ symbolId, fieldKey });
      sheetPanel.setActiveSheet("sheet1");
      handleSymbolSelectionChange([symbolId], symbolId);
    },
    [handleSymbolSelectionChange, sheetPanel],
  );

  const handleValidationQuickFix = useCallback(
    (symbolId: string, fixId: ValidationQuickFixId) => {
      const symbol = symbols.find((item) => item.id === symbolId);
      if (!symbol) {
        return;
      }

      const nextSymbol = applyValidationQuickFix(symbol, fixId);
      setHighlightedCircuitEditTarget(null);
      handleCircuitEditSave(nextSymbol);
      sheetPanel.setActiveSheet("sheet1");
      handleSymbolSelectionChange([symbolId], symbolId);
    },
    [handleSymbolSelectionChange, sheetPanel, handleCircuitEditSave, symbols],
  );

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
        onOpenLeftPanel={() => sheetPanel.setShowLeftPanel(true)}
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
          handleOpenDinRailGenerator: handleOpenDinRailGenerator,
          onPaletteItemTap: handlePaletteInsert,
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
          connections,
          selectedConnectionId,
          onConnectionSelect: setSelectedConnectionId,
          onConnectionsChange: handleConnectionsChange,
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
    </main>
  );
}

export default function App() {
  const [routePath, setRoutePath] = useState<"/" | "/app">(() => normalizeRoutePath(window.location.pathname));
  const [initialAction, setInitialAction] = useState<"new" | "last" | "load_data" | null>(null);
  const [initialData, setInitialData] = useState<ProjectFileData | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(normalizeRoutePath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToApp = useCallback(() => {
    if (routePath !== APP_ROUTE_PATH) {
      window.history.pushState({}, "", APP_ROUTE_PATH);
      setRoutePath(APP_ROUTE_PATH);
    }
  }, [routePath]);

  const handleOpenNewProject = useCallback(() => {
    setInitialAction("new");
    navigateToApp();
  }, [navigateToApp]);

  const handleOpenProjectFile = useCallback(async () => {
    try {
      const data = await openProjectFile();
      if (data) {
        setInitialData(data);
        setInitialAction("load_data");
        navigateToApp();
      }
    } catch (e) {
      console.error(e);
    }
  }, [navigateToApp]);

  useEffect(() => {
    initStorageService();
  }, []);

  if (routePath !== APP_ROUTE_PATH) {
    return (
      <>
        <PublicLandingPage
          onOpenNewProject={handleOpenNewProject}
          onOpenProjectFile={handleOpenProjectFile}
          onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        />
        {isFeedbackModalOpen && <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <AppWorkspace
        initialAction={initialAction}
        initialData={initialData}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
      />
      {isFeedbackModalOpen && <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />}
    </>
  );
}
