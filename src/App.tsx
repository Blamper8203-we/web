import { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import type { PdfDocumentationPreviewTab } from "./lib/pdfDocumentation";
import type { DinRailCanvasRail } from "./components/DinRailCanvasPixi";
import { AppHeader } from "./components/AppHeader";
import { AppRightPanel } from "./components/AppRightPanel";
import { AppLeftPanel } from "./components/AppLeftPanel";
import { AppStatusBar } from "./components/AppStatusBar";
import { AppSheetTabs } from "./components/AppSheetTabs";
import { AppDialogsLayer } from "./components/AppDialogsLayer";
import { AppWorkspaceCanvas } from "./components/AppWorkspaceCanvas";
import { PdfWorkspaceShell } from "./components/PdfWorkspaceShell";
import type { RcdManagerEntry } from "./components/RcdManagementDialog";
import { buildCircuitRowsFromSymbols } from "./lib/circuitRows";
import { PROJECT_METADATA_STORAGE_KEY, loadProjectMetadata } from "./lib/projectMetadata";
import { handleGlobalAppShortcut } from "./lib/appShortcuts";
import { reportRuntimeError } from "./lib/runtimeDiagnostics";
import { validateProject } from "./lib/validation/electricalValidationService";
import {
  normalizePaletteAssetDimensions,
  DEFAULT_DIN_RAIL_CONFIG,
  SYMBOLS_STORAGE_KEY,
  LEGACY_SYMBOLS_STORAGE_KEY,
  type SheetType,
  type RightTab,
} from "./lib/appHelpers";
import { createDefaultSymbolItem, normalizeSymbolItems } from "./types/symbolItem";
import { useSymbolHistory } from "./hooks/useSymbolHistory";
import { useSymbolActions } from "./hooks/useSymbolActions";
import { useProjectActions } from "./hooks/useProjectActions";
import { usePaletteActions } from "./hooks/usePaletteActions";
import { useImportedModules } from "./hooks/useImportedModules";
import type { ProjectMetadata } from "./types/projectMetadata";
import type { SymbolItem } from "./types/symbolItem";
import { PublicLandingPage } from "./components/PublicLandingPage";
import "./App.css";

const APP_ROUTE_PATH = "/app";
const LOCAL_STORAGE_WRITE_DEBOUNCE_MS = 250;
const SHOW_DIN_RAIL_GROUPS_STORAGE_KEY = "dinboard.show_din_rail_groups";

function normalizeRoutePath(pathname: string): "/" | "/app" {
  if (pathname === APP_ROUTE_PATH || pathname === `${APP_ROUTE_PATH}/`) {
    return APP_ROUTE_PATH;
  }

  return "/";
}



function AppWorkspace() {
  // ── Core state ───────────────────────────────────────────────────────────────
  const [metadata, setMetadata] = useState<ProjectMetadata>(() => loadProjectMetadata());
  const [symbols, setSymbols] = useState<SymbolItem[]>(() => {
    try {
      const raw =
        window.localStorage.getItem(SYMBOLS_STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_SYMBOLS_STORAGE_KEY);
      if (raw) {
        const normalized = normalizeSymbolItems(JSON.parse(raw) as Partial<SymbolItem>[]);
        if (normalized.length > 0) return normalized;
      }
    } catch { /* ignore */ }
    return [];
  });
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [selectedSymbolIds, setSelectedSymbolIds] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>("sheet1");
  const [workspaceZoomPercent, setWorkspaceZoomPercent] = useState(100);
  const [dinRailGeneratorRequest, setDinRailGeneratorRequest] = useState(0);
  const [dinRail, setDinRail] = useState<DinRailCanvasRail>({
    config: DEFAULT_DIN_RAIL_CONFIG, svg: "", width: 0, height: 0, isVisible: false,
  });
  const [activeRightTab, setActiveRightTab] = useState<RightTab>("balance");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isRcdManagerOpen, setIsRcdManagerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showDinRailGroups, setShowDinRailGroups] = useState<boolean>(() => {
    try {
      const raw = window.localStorage.getItem(SHOW_DIN_RAIL_GROUPS_STORAGE_KEY);
      if (!raw) {
        return true;
      }

      const parsed = JSON.parse(raw);
      return typeof parsed === "boolean" ? parsed : true;
    } catch {
      return true;
    }
  });
  const [pdfPreviewTab, setPdfPreviewTab] = useState<PdfDocumentationPreviewTab>("title-page");
  const [, startPdfTabTransition] = useTransition();

  const showTemporaryStatus = useCallback((message: string, timeoutMs = 3500) => {
    setSaveStatus(message);
    window.setTimeout(() => setSaveStatus(""), timeoutMs);
  }, []);

  // ── Hooks ─────────────────────────────────────────────────────────────────────
  const {
    importedModules,
    paletteGroups,
    paletteTemplateMap,
    importedModuleCategoryOptions,
    activePaletteGroupTitle,
    setActivePaletteGroupTitle,
    svgImportDialogOpen,
    setSvgImportDialogOpen,
    importedModulesManagerOpen,
    setImportedModulesManagerOpen,
    handleHidePaletteTemplate,
    handleSvgImportCommit,
    handleImportedModuleCategoryChange,
    handleRemoveImportedModule,
  } = useImportedModules(showTemporaryStatus);

  const history = useSymbolHistory({
    setSymbols, setSelectedSymbolId, setSelectedSymbolIds, setHasUnsavedChanges, showTemporaryStatus,
  });

  const {
    handleSymbolMoveStart, handleSymbolMove, handleSymbolMoveEnd,
    handleSymbolSelect, handleSymbolSelectionChange,
    handleCircuitEditSave, handleSchematicCellEdit,
    handleDeleteSelected,
  } = useSymbolActions({
    symbols, setSymbols,
    selectedSymbolId, setSelectedSymbolId,
    selectedSymbolIds, setSelectedSymbolIds,
    setActiveRightTab, setHasUnsavedChanges,
    executeSymbolsCommand: history.executeSymbolsCommand,
    dragHistorySnapshotRef: history.dragHistorySnapshotRef,
    draggedSymbolIdsRef: history.draggedSymbolIdsRef,
  });

  const {
    handleNewProject, handleOpenProject, handleSaveProject, handleExportPdf, handleExportBom, handleExportPng,
    handleExportDinRailPngWithDescriptionsNoBrackets,
    handleAutoBalance, handleOpenDinRailGenerator, handleRailGenerated,
    handleMetadataChange, handleResetDocumentation,
  } = useProjectActions({
    metadata, setMetadata, symbols, setSymbols,
    currentFilePath, setCurrentFilePath, paletteTemplateMap,
    hasUnsavedChanges, setHasUnsavedChanges,
    selectedSymbolId, selectedSymbolIds,
    setSelectedSymbolId, setSelectedSymbolIds,
    setDinRail, dinRail, setActiveSheet, setDinRailGeneratorRequest,
    undoRedoServiceRef: history.undoRedoServiceRef,
    dragHistorySnapshotRef: history.dragHistorySnapshotRef,
    refreshHistoryState: history.refreshHistoryState,
    executeSymbolsCommand: history.executeSymbolsCommand,
    showTemporaryStatus,
  });

  const selectedSymbol = symbols.find((s) => s.id === selectedSymbolId) ?? null;

  const {
    paletteContextMenu, setPaletteContextMenu,
    pendingPaletteRemoval, setPendingPaletteRemoval,
    handlePaletteDrop, handleUnsupportedDinRailDrop, handleConfirmPaletteRemoval,
  } = usePaletteActions({
    symbols, paletteTemplateMap, dinRail, activeSheet,
    selectedSymbol, selectedSymbolId, selectedSymbolIds,
    setActiveRightTab, setActiveSheet,
    executeSymbolsCommand: history.executeSymbolsCommand,
    showTemporaryStatus, handleOpenDinRailGenerator, handleHidePaletteTemplate,
  });

  // ── Persistence ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(PROJECT_METADATA_STORAGE_KEY, JSON.stringify(metadata));
      } catch (error) {
        reportRuntimeError(error, {
          source: "unhandled-error",
        });
      }
    }, LOCAL_STORAGE_WRITE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [metadata]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(SYMBOLS_STORAGE_KEY, JSON.stringify(symbols));
      } catch (error) {
        reportRuntimeError(error, {
          source: "unhandled-error",
        });
      }
    }, LOCAL_STORAGE_WRITE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [symbols]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          SHOW_DIN_RAIL_GROUPS_STORAGE_KEY,
          JSON.stringify(showDinRailGroups),
        );
      } catch (error) {
        reportRuntimeError(error, {
          source: "unhandled-error",
        });
      }
    }, LOCAL_STORAGE_WRITE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [showDinRailGroups]);

  useEffect(() => {
    if (activeSheet === "sheet3" || activeSheet === "sheet4") setWorkspaceZoomPercent(100);
  }, [activeSheet]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      handleGlobalAppShortcut(event, {
        openHelp: () => setIsHelpOpen(true),
        newProject: handleNewProject,
        openProject: handleOpenProject,
        saveProject: handleSaveProject,
        print: () => window.print(),
      });
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleNewProject, handleOpenProject, handleSaveProject]);

  useEffect(() => {
    setSymbols((prev) => normalizePaletteAssetDimensions(prev, paletteTemplateMap));
  }, [paletteTemplateMap]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const circuitRows = useMemo(() => buildCircuitRowsFromSymbols(symbols), [symbols]);
  const hasGeneratedDinRail = dinRail.isVisible;
  const hasModules = symbols.length > 0;
  const canShowSchematicAndCircuitList = hasGeneratedDinRail && hasModules;
  const totalPower = symbols.reduce((sum, s) => sum + s.powerW, 0);
  const groupCount = symbols.filter((s) => s.deviceKind === "rcd").length;
  const validationResult = useMemo(
    () =>
      validateProject(symbols, {
        supplyVoltageV: metadata.supplyVoltageV,
        mainBreakerA: metadata.mainBreakerA,
      }),
    [symbols, metadata.supplyVoltageV, metadata.mainBreakerA],
  );
  const errorCount = validationResult.errors.length;
  const warningCount = validationResult.warnings.length;
  const projectFileName = (currentFilePath ? currentFilePath.split(/[\\\/]/).pop() : "Nowy projekt") ?? "Nowy projekt";
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

    setIsRcdManagerOpen(true);
  }, [rcdManagerEntries.length, showTemporaryStatus]);

  const handleToggleDinRailGroups = useCallback(() => {
    setShowDinRailGroups((previous) => !previous);
  }, []);

  const handleSaveRcdManager = useCallback(
    (entries: RcdManagerEntry[]) => {
      const rcdById = new Map(entries.map((entry) => [entry.id, entry] as const));

      const nextSymbols = symbols.map((symbol) => {
        if (symbol.deviceKind === "rcd") {
          const nextRcd = rcdById.get(symbol.id);
          if (!nextRcd) {
            return symbol;
          }

          return createDefaultSymbolItem({
            ...symbol,
            rcdRatedCurrent: Math.max(1, Math.round(nextRcd.rcdRatedCurrent)),
            rcdResidualCurrent: Math.max(1, Math.round(nextRcd.rcdResidualCurrent)),
            rcdType: nextRcd.rcdType.trim().toUpperCase() || "A",
          });
        }

        if (symbol.rcdSymbolId) {
          const parentRcd = rcdById.get(symbol.rcdSymbolId);
          if (!parentRcd) {
            return symbol;
          }

          return createDefaultSymbolItem({
            ...symbol,
            rcdRatedCurrent: Math.max(1, Math.round(parentRcd.rcdRatedCurrent)),
            rcdResidualCurrent: Math.max(1, Math.round(parentRcd.rcdResidualCurrent)),
            rcdType: parentRcd.rcdType.trim().toUpperCase() || "A",
          });
        }

        return symbol;
      });

      const changed = history.executeSymbolsCommand(
        "Zarządzanie RCD",
        { symbols, selectedSymbolId, selectedSymbolIds },
        { symbols: nextSymbols, selectedSymbolId, selectedSymbolIds },
        "Zapisano ustawienia RCD",
      );

      if (!changed) {
        showTemporaryStatus("Brak zmian w ustawieniach RCD", 2600);
      }

      setIsRcdManagerOpen(false);
    },
    [history, selectedSymbolId, selectedSymbolIds, showTemporaryStatus, symbols],
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="app-shell">
      <AppHeader
        projectFileName={currentFilePath ? currentFilePath.split(/[\/\\]/).pop() || "Nowy projekt" : "Nowy projekt"}
        hasUnsavedChanges={hasUnsavedChanges}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        undoLabel={history.undoLabel}
        redoLabel={history.redoLabel}
        showRightPanel={showRightPanel}
        activeSheet={activeSheet}
        workspaceZoomPercent={workspaceZoomPercent}
        hasSelectedSymbol={Boolean(selectedSymbol)}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onExportPdf={handleExportPdf}
        onExportBom={handleExportBom}
        onExportPng={handleExportPng}
        onExportDinRailPngWithDescriptionsNoBrackets={handleExportDinRailPngWithDescriptionsNoBrackets}
        onUndo={history.handleUndo}
        onRedo={history.handleRedo}
        onDeleteSelected={handleDeleteSelected}
        onOpenDinRailGenerator={handleOpenDinRailGenerator}
        onOpenSvgImport={() => setSvgImportDialogOpen(true)}
        onOpenImportedModulesManager={() => setImportedModulesManagerOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
        showDinRailGroups={showDinRailGroups}
        onToggleDinRailGroups={handleToggleDinRailGroups}
        onChangeSheet={setActiveSheet}
        showTemporaryStatus={showTemporaryStatus}
      />

      <div
        className={`main-content ${activeRightTab === "circuitEdit" ? "is-circuit-editing" : ""} ${
          activeSheet === "sheet4" ? "is-pdf-workspace" : ""
        } ${showRightPanel ? "" : "is-right-panel-hidden"}`}
      >
        {activeSheet === "sheet4" ? (
          <PdfWorkspaceShell
            metadata={metadata}
            symbols={symbols}
            dinRail={dinRail}
            circuitRows={circuitRows}
            pdfPreviewTab={pdfPreviewTab}
            setPdfPreviewTab={setPdfPreviewTab}
            startPdfTabTransition={startPdfTabTransition}
            handleMetadataChange={handleMetadataChange}
            handleResetDocumentation={handleResetDocumentation}
            showRightPanel={showRightPanel}
          />
        ) : (
          <>
            <AppLeftPanel
              activeSheet={activeSheet}
              metadata={metadata}
              handleMetadataChange={handleMetadataChange}
              handleExportPdf={handleExportPdf}
              dinRail={dinRail}
              paletteGroups={paletteGroups}
              activePaletteGroupTitle={activePaletteGroupTitle}
              setActivePaletteGroupTitle={setActivePaletteGroupTitle}
              setPaletteContextMenu={setPaletteContextMenu}
              handleOpenDinRailGenerator={handleOpenDinRailGenerator}
            />

            <AppWorkspaceCanvas
              activeSheet={activeSheet}
              paletteTemplateMap={paletteTemplateMap}
              dinRail={dinRail}
              symbols={symbols}
              dinRailGeneratorRequest={dinRailGeneratorRequest}
              handlePaletteDrop={handlePaletteDrop}
              handleUnsupportedDinRailDrop={handleUnsupportedDinRailDrop}
              setWorkspaceZoomPercent={setWorkspaceZoomPercent}
              handleRailGenerated={handleRailGenerated}
              handleSymbolMoveStart={handleSymbolMoveStart}
              handleSymbolMove={handleSymbolMove}
              handleSymbolMoveEnd={handleSymbolMoveEnd}
              handleSymbolSelectionChange={handleSymbolSelectionChange}
              handleSymbolSelect={handleSymbolSelect}
              handleDeleteSelected={handleDeleteSelected}
              selectedSymbolId={selectedSymbolId}
              selectedSymbolIds={selectedSymbolIds}
              handleToggleDinRailGroups={handleToggleDinRailGroups}
              showDinRailGroups={showDinRailGroups}
              canShowSchematicAndCircuitList={canShowSchematicAndCircuitList}
              handleSchematicCellEdit={handleSchematicCellEdit}
              circuitRows={circuitRows}
              metadata={metadata}
            />

            <AppRightPanel
              showRightPanel={showRightPanel}
              activeRightTab={activeRightTab}
              setActiveRightTab={setActiveRightTab}
              symbols={symbols}
              handleAutoBalance={handleAutoBalance}
              validationResult={validationResult}
              selectedSymbol={selectedSymbol}
              handleCircuitEditSave={handleCircuitEditSave}
              handleSymbolSelectionChange={handleSymbolSelectionChange}
              metadata={metadata}
              handleMetadataChange={handleMetadataChange}
              handleOpenRcdManager={handleOpenRcdManager}
            />
          </>
        )}

        <AppSheetTabs activeSheet={activeSheet} onChangeSheet={setActiveSheet} />
      </div>

      <AppStatusBar
        projectFileName={projectFileName}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        workspaceZoomPercent={workspaceZoomPercent}
        totalPower={totalPower}
        groupCount={groupCount}
        symbolCount={symbols.length}
        errorCount={errorCount}
        warningCount={warningCount}
      />

      <AppDialogsLayer
        importedModuleCategoryOptions={importedModuleCategoryOptions}
        importedModules={importedModules}
        importedModulesManagerOpen={importedModulesManagerOpen}
        isHelpOpen={isHelpOpen}
        isRcdManagerOpen={isRcdManagerOpen}
        paletteContextMenu={paletteContextMenu}
        pendingPaletteRemoval={pendingPaletteRemoval}
        rcdManagerEntries={rcdManagerEntries}
        svgImportDialogOpen={svgImportDialogOpen}
        onCancelPaletteRemoval={() => setPendingPaletteRemoval(null)}
        onCloseHelp={() => setIsHelpOpen(false)}
        onCloseImportedModulesManager={() => setImportedModulesManagerOpen(false)}
        onClosePaletteContextMenu={() => setPaletteContextMenu(null)}
        onCloseRcdManager={() => setIsRcdManagerOpen(false)}
        onCloseSvgImport={() => setSvgImportDialogOpen(false)}
        onConfirmPaletteRemoval={handleConfirmPaletteRemoval}
        onImportedModuleCategoryChange={handleImportedModuleCategoryChange}
        onRemoveImportedModule={handleRemoveImportedModule}
        onRequestPaletteRemoval={setPendingPaletteRemoval}
        onSaveRcdManager={handleSaveRcdManager}
        onSvgImportCommit={handleSvgImportCommit}
      />
    </main>
  );
}

function App() {
  const [routePath, setRoutePath] = useState<"/" | "/app">(() => normalizeRoutePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(normalizeRoutePath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleOpenWorkspace = useCallback(() => {
    if (routePath !== APP_ROUTE_PATH) {
      window.history.pushState({}, "", APP_ROUTE_PATH);
      setRoutePath(APP_ROUTE_PATH);
    }
  }, [routePath]);

  if (routePath !== APP_ROUTE_PATH) {
    return <PublicLandingPage onOpenWorkspace={handleOpenWorkspace} />;
  }

  return <AppWorkspace />;
}

export default App;
