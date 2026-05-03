import { useEffect, useState, useCallback, useMemo } from "react";
import { CircuitListPage } from "./components/CircuitListPage";
import { CircuitEditPanel } from "./components/CircuitEditPanel";
import { AppIcon } from "./components/AppIcon";
import { ImportedModulesDialog } from "./components/ImportedModulesDialog";

import { pdfDocumentationTabs, type PdfDocumentationPreviewTab } from "./lib/pdfDocumentation";
import { ModuleAssetPreview } from "./components/ModuleAssetPreview";
import { PdfDocumentationPage } from "./components/PdfDocumentationPage";
import { ProjectPropertiesPage } from "./components/ProjectPropertiesPage";
import { SchematicCanvas } from "./components/SchematicCanvas";
import { MeasurementProtocolsWorkspacePage } from "./components/MeasurementProtocolsWorkspacePage";
import { SvgImportDialog } from "./components/SvgImportDialog";
import { DinRailCanvas, type DinRailCanvasRail } from "./components/DinRailCanvasPixi";
import { PowerBalancePage } from "./components/PowerBalancePage";
import { AppHeader } from "./components/AppHeader";
import { ValidationPanel } from "./components/ValidationPanel";
import { buildCircuitRowsFromSymbols } from "./lib/circuitRows";
import { PROJECT_METADATA_STORAGE_KEY, loadProjectMetadata } from "./lib/projectMetadata";
import { validateProject } from "./lib/validation/electricalValidationService";
import {
  normalizePaletteAssetDimensions,
  getPaletteIconName,
  getPaletteDescription,
  createPaletteDragPreview,
  DEFAULT_DIN_RAIL_CONFIG,
  SYMBOLS_STORAGE_KEY,
  LEGACY_SYMBOLS_STORAGE_KEY,
  type SheetType,
  type RightTab,
} from "./lib/appHelpers";
import { getPaletteTemplateDimensions } from "./lib/modules/moduleCatalog";
import { normalizeSymbolItems } from "./types/symbolItem";
import { createDemoSymbols } from "./fixtures/demoData";
import { useSymbolHistory } from "./hooks/useSymbolHistory";
import { useSymbolActions } from "./hooks/useSymbolActions";
import { useProjectActions } from "./hooks/useProjectActions";
import { usePaletteActions } from "./hooks/usePaletteActions";
import { useImportedModules } from "./hooks/useImportedModules";
import type { ProjectMetadata } from "./types/projectMetadata";
import type { SymbolItem } from "./types/symbolItem";
import "./App.css";

function App() {
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
    return createDemoSymbols();
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
  const [pdfPreviewTab, setPdfPreviewTab] = useState<PdfDocumentationPreviewTab>("title-page");

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
    handleNewProject, handleOpenProject, handleSaveProject, handleExportPdf,
    handleAutoBalance, handleOpenDinRailGenerator, handleRailGenerated,
    handleMetadataChange, handleResetDocumentation,
  } = useProjectActions({
    metadata, setMetadata, symbols, setSymbols,
    currentFilePath, setCurrentFilePath, paletteTemplateMap,
    hasUnsavedChanges, setHasUnsavedChanges,
    selectedSymbolId, selectedSymbolIds,
    setSelectedSymbolId, setSelectedSymbolIds,
    setDinRail, setActiveSheet, setDinRailGeneratorRequest,
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
    window.localStorage.setItem(PROJECT_METADATA_STORAGE_KEY, JSON.stringify(metadata));
  }, [metadata]);

  useEffect(() => {
    window.localStorage.setItem(SYMBOLS_STORAGE_KEY, JSON.stringify(symbols));
  }, [symbols]);

  useEffect(() => {
    if (activeSheet === "sheet3" || activeSheet === "sheet4") setWorkspaceZoomPercent(100);
  }, [activeSheet]);

  useEffect(() => {
    setSymbols((prev) => normalizePaletteAssetDimensions(prev, paletteTemplateMap));
  }, [paletteTemplateMap]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const circuitRows = useMemo(() => buildCircuitRowsFromSymbols(symbols), [symbols]);
  const totalPower = symbols.reduce((sum, s) => sum + s.powerW, 0);
  const groupCount = symbols.filter((s) => s.deviceKind === "rcd").length;
  const validationResult = validateProject(symbols);
  const errorCount = validationResult.errors.length;
  const warningCount = validationResult.warnings.length;
  const projectFileName = currentFilePath ? currentFilePath.split(/[\\\/]/).pop() : "Nowy projekt";
  const activePaletteGroup =
    paletteGroups.find((g) => g.title === activePaletteGroupTitle) ??
    paletteGroups[0] ??
    { title: "", subtitle: "", items: [] };

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
        onUndo={history.handleUndo}
        onRedo={history.handleRedo}
        onDeleteSelected={handleDeleteSelected}
        onOpenDinRailGenerator={handleOpenDinRailGenerator}
        onOpenSvgImport={() => setSvgImportDialogOpen(true)}
        onOpenImportedModulesManager={() => setImportedModulesManagerOpen(true)}
        onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
        onChangeSheet={setActiveSheet}
        showTemporaryStatus={showTemporaryStatus}
      />

      <div
        className={`main-content ${activeRightTab === "circuitEdit" ? "is-circuit-editing" : ""} ${
          showRightPanel ? "" : "is-right-panel-hidden"
        }`}
      >
        <aside className="left-panel">
          <div className="panel-content">
            {activeSheet === "sheet2" && (
              <ProjectPropertiesPage
                metadata={metadata}
                onChange={handleMetadataChange}
                onExportPdf={handleExportPdf}
                onResetDemo={() => handleMetadataChange(loadProjectMetadata())}
              />
            )}
            {activeSheet === "sheet4" && (
              <PdfDocumentationPage
                metadata={metadata}
                symbols={symbols}
                rail={dinRail}
                onChange={handleMetadataChange}
                onResetDocumentation={handleResetDocumentation}
                selectedPreviewTab={pdfPreviewTab}
              />
            )}
            {activeSheet === "sheet3" && (
              <div className="left-panel-empty">
                <span className="workspace-tag">Lista</span>
                <strong>Lista obwodów</strong>
              </div>
            )}
            {activeSheet === "sheet1" && (
              <div className="palette-browser">
                <div className="panel-title-strip">
                  <AppIcon className="panel-title-icon" name="palette" size={18} />
                  <strong>MODUŁY</strong>
                </div>
                <div className="panel-divider" />
                <div className="palette-tabs" aria-label="Kategorie modułów">
                  {paletteGroups.map((group) => (
                    <button
                      className={`palette-tab ${group.title === activePaletteGroup.title ? "active" : ""}`}
                      key={group.title}
                      type="button"
                      onClick={() => setActivePaletteGroupTitle(group.title)}
                    >
                      {group.title}
                    </button>
                  ))}
                </div>
                <section className="palette-group" key={activePaletteGroup.title}>
                  <div className="palette-group-header">
                    <strong>{activePaletteGroup.title}</strong>
                    <span>{activePaletteGroup.subtitle}</span>
                  </div>
                  <div className="palette-grid">
                    {activePaletteGroup.items.map((item) => (
                      <div
                        className="palette-item"
                        key={`${activePaletteGroup.title}-${item.code}`}
                        draggable={true}
                        role="listitem"
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setPaletteContextMenu({ templateId: item.templateId, label: item.label, x: event.clientX, y: event.clientY });
                        }}
                        onDragStart={(event) => {
                          const moduleDimensions = getPaletteTemplateDimensions(item);
                          const zoomScale = activeSheet === "sheet1" ? Math.max(0.1, workspaceZoomPercent / 100) : 1;
                          const previewNode = event.currentTarget.querySelector(".palette-item-visual");
                          const dragPreview = createPaletteDragPreview(
                            previewNode instanceof HTMLElement ? previewNode : null,
                            moduleDimensions.width * zoomScale,
                            moduleDimensions.height * zoomScale,
                          );
                          event.dataTransfer.effectAllowed = "copy";
                          event.dataTransfer.setData("application/x-dinboard-palette", item.templateId);
                          event.dataTransfer.setData("text/plain", item.templateId);
                          if (dragPreview) {
                            event.dataTransfer.setDragImage(dragPreview, Math.round((moduleDimensions.width * zoomScale) / 2), Math.round((moduleDimensions.height * zoomScale) / 2));
                            window.setTimeout(() => dragPreview.remove(), 0);
                          }
                        }}
                      >
                        <span className="palette-item-visual">
                          {item.assetPath ? (
                            <ModuleAssetPreview
                              alt={item.label}
                              className="palette-module-preview"
                              parameters={item.placeholderDefaults}
                              rasterDprCap={3}
                              renderHeight={40}
                              renderMode="raster"
                              renderWidth={44}
                              src={item.assetPath}
                            />
                          ) : (
                            <AppIcon name={getPaletteIconName(item)} size={24} />
                          )}
                        </span>
                        <span className="palette-item-copy">
                          <span className="palette-item-label">{item.label}</span>
                          <span className="palette-item-description">{getPaletteDescription(item)}</span>
                        </span>
                        <span className="palette-item-code">{item.code}</span>
                      </div>
                    ))}
                  </div>
                </section>
                {!dinRail.isVisible && (
                  <button type="button" className="palette-blocker" onClick={handleOpenDinRailGenerator}>
                    <AppIcon name="validation" size={24} />
                    <strong>Najpierw wygeneruj szynę DIN</strong>
                    <span>Moduły będą dostępne po utworzeniu rozdzielnicy.</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        <div className="canvas-area">
          {activeSheet === "sheet1" && (
            <DinRailCanvas
              getPaletteTemplate={(templateId) => paletteTemplateMap.get(templateId)}
              rail={dinRail}
              symbols={symbols}
              generatorRequest={dinRailGeneratorRequest}
              onPaletteDrop={handlePaletteDrop}
              onUnsupportedTemplateDrop={handleUnsupportedDinRailDrop}
              onZoomChange={setWorkspaceZoomPercent}
              onRailGenerated={handleRailGenerated}
              onSymbolMoveStart={handleSymbolMoveStart}
              onSymbolMove={handleSymbolMove}
              onSymbolMoveEnd={handleSymbolMoveEnd}
              onSymbolSelectionChange={handleSymbolSelectionChange}
              onSymbolSelect={handleSymbolSelect}
              selectedSymbolId={selectedSymbolId}
              selectedSymbolIds={selectedSymbolIds}
            />
          )}

          {activeSheet === "sheet2" && (
            <div className="schematic-container">
              <SchematicCanvas
                symbols={symbols}
                onSymbolMoveStart={handleSymbolMoveStart}
                onSymbolMove={handleSymbolMove}
                onSymbolMoveEnd={handleSymbolMoveEnd}
                onSymbolSelect={handleSymbolSelect}
                onPaletteDrop={handlePaletteDrop}
                onCellEdit={handleSchematicCellEdit}
                onZoomChange={setWorkspaceZoomPercent}
                selectedSymbolId={selectedSymbolId}
                selectedSymbolIds={selectedSymbolIds}
              />
            </div>
          )}

          {activeSheet === "sheet3" && (
            <CircuitListPage
              rows={circuitRows}
              onResetDemo={() => {
                history.executeSymbolsCommand(
                  "Reset danych demo",
                  { symbols, selectedSymbolId, selectedSymbolIds },
                  { symbols: createDemoSymbols(), selectedSymbolId: null, selectedSymbolIds: [] },
                  "Przywrócono dane demo",
                );
              }}
            />
          )}

          {activeSheet === "sheet4" && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#0B0B0D',
              overflow: 'hidden',
            }}>
              {/* PDF Preview Tabs — like Avalonia's tab bar */}
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '8px 12px',
                background: 'var(--panel-header-background)',
                borderBottom: '1px solid var(--panel-border)',
                flexShrink: 0,
              }}>
                {pdfDocumentationTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPdfPreviewTab(tab.id)}
                    style={{
                      padding: '5px 12px',
                      minHeight: '30px',
                      border: '1px solid',
                      borderRadius: '5px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: pdfPreviewTab === tab.id ? '600' : '400',
                      background: pdfPreviewTab === tab.id ? 'rgba(249,115,22,0.12)' : 'transparent',
                      borderColor: pdfPreviewTab === tab.id ? 'var(--accent-orange)' : 'var(--panel-border)',
                      color: pdfPreviewTab === tab.id ? 'var(--accent-orange)' : 'var(--text-secondary)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <MeasurementProtocolsWorkspacePage
                metadata={metadata}
                circuitRows={circuitRows}
                onChange={handleMetadataChange}
                activeTab={pdfPreviewTab as any}
              />
            </div>
          )}
        </div>

        {showRightPanel && (
          <aside className="right-panel">
            <div className="right-panel-header">
              <strong>WŁAŚCIWOŚCI</strong>
            </div>
            <div className="right-tabs">
              <button className={`right-tab-btn ${activeRightTab === "config" ? "active" : ""}`} type="button" onClick={() => setActiveRightTab("config")}>
                <AppIcon name="cog" /><span>Konfiguracja</span>
              </button>
              <button className={`right-tab-btn ${activeRightTab === "balance" ? "active" : ""}`} type="button" onClick={() => setActiveRightTab("balance")}>
                <AppIcon name="balance" /><span>Bilans</span>
              </button>
              <button className={`right-tab-btn ${activeRightTab === "validation" ? "active" : ""}`} type="button" onClick={() => setActiveRightTab("validation")}>
                <AppIcon name="validation" /><span>Walidacja</span>
              </button>
              <button className={`right-tab-btn ${activeRightTab === "circuitEdit" ? "active" : ""}`} type="button" onClick={() => setActiveRightTab("circuitEdit")}>
                <AppIcon name="pencil" /><span>Edycja</span>
              </button>
            </div>
            <div className="right-panel-content">
              {activeRightTab === "balance" && (
                <PowerBalancePage symbols={symbols} onApplyBalance={handleAutoBalance} />
              )}
              {activeRightTab === "validation" && <ValidationPanel symbols={symbols} />}
              {activeRightTab === "circuitEdit" && (
                <CircuitEditPanel
                  symbol={selectedSymbol}
                  onSave={handleCircuitEditSave}
                  onClearSelection={() => setSelectedSymbolId(null)}
                />
              )}
              {activeRightTab === "config" && (
                <div className="power-config-panel">
                  <section className="power-config-section">
                    <div className="section-header">KONFIGURACJA ZASILANIA</div>
                    <div className="card power-config-card">
                      <label className="power-config-field">
                        <span><AppIcon className="accent-orange" name="validation" size={12} />Napięcie</span>
                        <select
                          value={metadata.supplyVoltageV}
                          onChange={(e) => handleMetadataChange({ ...metadata, supplyVoltageV: Number(e.target.value) as 230 | 400 })}
                        >
                          <option value="230">230V</option>
                          <option value="400">400V</option>
                        </select>
                      </label>
                      <label className="power-config-field">
                        <span><AppIcon className="accent-orange" name="busbar" size={12} />Liczba faz</span>
                        <select
                          value={metadata.supplyPhases}
                          onChange={(e) => handleMetadataChange({ ...metadata, supplyPhases: Number(e.target.value) as 1 | 3 })}
                        >
                          <option value="1">1-fazowe</option>
                          <option value="3">3-fazowe</option>
                        </select>
                      </label>
                      <label className="power-config-field">
                        <span><AppIcon className="accent-orange" name="delete" size={12} />Zabezpieczenie główne</span>
                        <select
                          value={metadata.mainBreakerA}
                          onChange={(e) => handleMetadataChange({ ...metadata, mainBreakerA: Number(e.target.value) as any })}
                        >
                          <option value="25">25A</option>
                          <option value="32">32A</option>
                          <option value="40">40A</option>
                          <option value="63">63A</option>
                          <option value="80">80A</option>
                          <option value="100">100A</option>
                          <option value="125">125A</option>
                        </select>
                      </label>
                      <label className="power-config-field">
                        <span><AppIcon className="accent-orange" name="balance" size={12} />Moc przyłączeniowa</span>
                        <div className="unit-input">
                          <input
                            value={metadata.contractedPowerKw}
                            inputMode="decimal"
                            type="number"
                            step="0.1"
                            onChange={(e) => handleMetadataChange({ ...metadata, contractedPowerKw: Number(e.target.value) || 0 })}
                          />
                          <span>kW</span>
                        </div>
                      </label>
                    </div>
                  </section>
                  <section className="power-config-section">
                    <div className="section-header">USTAWIENIA RCD</div>
                    <button
                      className="accent-btn power-config-action"
                      type="button"
                      onClick={() => showTemporaryStatus("Zarządzanie RCD zostanie dopięte w kolejnym kroku")}
                    >
                      <AppIcon name="cog" size={14} /><span>Zarządzaj RCD</span>
                    </button>
                  </section>
                </div>
              )}
            </div>
          </aside>
        )}

        <div className="sheet-tabs-bar">
          <button className={`sheet-tab ${activeSheet === "sheet1" ? "active" : ""}`} type="button" onClick={() => setActiveSheet("sheet1")}>
            <AppIcon className="sheet-tab-icon" name="grid" /><span>Rozdzielnica</span>
          </button>
          <button className={`sheet-tab ${activeSheet === "sheet2" ? "active" : ""}`} type="button" onClick={() => setActiveSheet("sheet2")}>
            <AppIcon className="sheet-tab-icon" name="fileTree" /><span>Schemat obwodów</span>
          </button>
          <button className={`sheet-tab ${activeSheet === "sheet3" ? "active" : ""}`} type="button" onClick={() => setActiveSheet("sheet3")}>
            <AppIcon className="sheet-tab-icon" name="list" /><span>Lista obwodów</span>
          </button>
          <button className={`sheet-tab ${activeSheet === "sheet4" ? "active" : ""}`} type="button" onClick={() => setActiveSheet("sheet4")}>
            <AppIcon className="sheet-tab-icon" name="pdf" /><span>Podgląd PDF</span>
          </button>
        </div>
      </div>

      <footer className="statusbar">
        <div className="statusbar-row">
          <div className="statusbar-left">
            <span className="statusbar-item statusbar-project" title={projectFileName}>
              <AppIcon className="statusbar-icon statusbar-icon-muted" name="file" size={12} />
              <strong>{projectFileName}</strong>
              {hasUnsavedChanges && <span className="statusbar-unsaved-dot" title="Niezapisane zmiany" />}
            </span>
            <span className="statusbar-divider" />
            <span className="statusbar-item statusbar-ok">
              <AppIcon className="statusbar-icon" name="check" size={12} />
              <span>{saveStatus || "Gotowy"}</span>
            </span>
          </div>
          <div className="statusbar-right">
            <span className="statusbar-item" title="Poziom zbliżenia">
              <AppIcon className="statusbar-icon statusbar-icon-accent" name="zoomIn" size={12} />
              <strong>{workspaceZoomPercent}%</strong>
            </span>
            <span className="statusbar-item" title="Moc całkowita">
              <AppIcon className="statusbar-icon statusbar-icon-warn" name="power" size={12} />
              {(totalPower / 1000).toFixed(1)} kW
            </span>
            <span className="statusbar-item" title="Liczba grup">
              <AppIcon className="statusbar-icon statusbar-icon-accent" name="group" size={12} />
              Grupy: {groupCount}
            </span>
            <span className="statusbar-item" title="Liczba modułów">
              <AppIcon className="statusbar-icon statusbar-icon-muted" name="module" size={12} />
              Moduły: {symbols.length}
            </span>
            {(errorCount > 0 || warningCount > 0) && <span className="statusbar-divider" />}
            {errorCount > 0 && (
              <span className="statusbar-item statusbar-alert danger">
                <AppIcon className="statusbar-icon" name="validation" size={12} />
                {errorCount} błędów
              </span>
            )}
            {warningCount > 0 && (
              <span className="statusbar-item statusbar-alert warning">
                <AppIcon className="statusbar-icon" name="validation" size={12} />
                {warningCount} ostrzeżeń
              </span>
            )}
          </div>
        </div>
      </footer>

      {svgImportDialogOpen && (
        <SvgImportDialog
          categoryOptions={importedModuleCategoryOptions}
          existingModules={importedModules}
          onClose={() => setSvgImportDialogOpen(false)}
          onImport={handleSvgImportCommit}
        />
      )}

      {paletteContextMenu && (
        <div
          className="palette-context-menu"
          style={{ left: paletteContextMenu.x, top: paletteContextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="palette-context-menu__item danger"
            onClick={() => {
              setPendingPaletteRemoval({ templateId: paletteContextMenu.templateId, label: paletteContextMenu.label });
              setPaletteContextMenu(null);
            }}
          >
            <AppIcon name="delete" size={12} /><span>Usun</span>
          </button>
        </div>
      )}

      {pendingPaletteRemoval && (
        <div className="din-rail-dialog-backdrop" onMouseDown={() => setPendingPaletteRemoval(null)}>
          <div
            className="palette-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Potwierdzenie usuniecia modulu"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="din-rail-dialog-title">
              <AppIcon name="delete" size={18} />
              <strong>Usun modul z lewego panelu?</strong>
            </div>
            <p className="palette-confirm-dialog__copy">
              Moduł <strong>{pendingPaletteRemoval.label}</strong> zniknie z palety po lewej stronie.
            </p>
            <div className="din-rail-dialog-actions">
              <button type="button" onClick={() => setPendingPaletteRemoval(null)}>Anuluj</button>
              <button type="button" className="accent-btn danger" onClick={handleConfirmPaletteRemoval}>Usun</button>
            </div>
          </div>
        </div>
      )}

      {importedModulesManagerOpen && (
        <ImportedModulesDialog
          categoryOptions={importedModuleCategoryOptions}
          modules={importedModules}
          onCategoryChange={handleImportedModuleCategoryChange}
          onClose={() => setImportedModulesManagerOpen(false)}
          onRemove={handleRemoveImportedModule}
        />
      )}
    </main>
  );
}

export default App;
