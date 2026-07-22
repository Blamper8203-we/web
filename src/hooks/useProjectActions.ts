// WHY: useProjectActions jest cienkim kompozytem, który łączy sub-hooki w jedno
// publiczne API. App.tsx destrukturyzuje ten sam obiekt co wcześniej — żaden
// konsument nie wymaga zmiany. Sub-hooki żyją w:
//   - useProjectFileActions.ts   (new/open/load/save)
//   - useProjectExportActions.ts (PDF/BOM/PNG)
//   - usePhaseBalanceActions.ts  (auto-balance, phase move)
// Ten plik zachowuje: DIN rail generator, metadata change, reset documentation.

import { useCallback, type MutableRefObject } from 'react';
import {
  resetDocumentationFields,
} from '../lib/projectMetadata';
import type { ConnectionItem } from '../types/connectionItem';
import type { SymbolHistorySnapshot } from '../lib/appHelpers';
import { type DinRailConfig } from '../lib/schematic/dinRailGenerator';
import type { ProjectMetadata } from '../types/projectMetadata';
import type { SymbolItem } from '../types/symbolItem';
import type { DinRailCanvasRail } from '../components/DinRailCanvas';
import type { PaletteTemplate, SheetType } from '../lib/appHelpers';
import type { UndoRedoService } from '../lib/editing/undoRedoService';

import { useProjectFileActions } from './useProjectFileActions';
import { useProjectExportActions } from './useProjectExportActions';
import { usePhaseBalanceActions } from './usePhaseBalanceActions';

interface UseProjectActionsParams {
  metadata: ProjectMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ProjectMetadata>>;
  symbols: SymbolItem[];
  setSymbols: React.Dispatch<React.SetStateAction<SymbolItem[]>>;
  connections: ConnectionItem[];
  setConnections: React.Dispatch<React.SetStateAction<ConnectionItem[]>>;
  currentFilePath: string | null;
  setCurrentFilePath: React.Dispatch<React.SetStateAction<string | null>>;
  paletteTemplateMap: Map<string, PaletteTemplate>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSymbolId: string | null;
  selectedSymbolIds: string[];
  setSelectedSymbolId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSymbolIds: React.Dispatch<React.SetStateAction<string[]>>;
  setDinRail: React.Dispatch<React.SetStateAction<DinRailCanvasRail>>;
  dinRail: DinRailCanvasRail;
  setActiveSheet: (tab: SheetType) => void;
  setDinRailGeneratorRequest: React.Dispatch<React.SetStateAction<number>>;
  undoRedoServiceRef: MutableRefObject<UndoRedoService>;
  dragHistorySnapshotRef: MutableRefObject<SymbolHistorySnapshot | null>;
  refreshHistoryState: () => void;
  executeSymbolsCommand: (
    label: string,
    before: SymbolHistorySnapshot,
    after: SymbolHistorySnapshot,
    statusMessage: string,
  ) => boolean;
  markClean: (snapshot: SymbolHistorySnapshot) => void;
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;
}

export function useProjectActions({
  metadata,
  setMetadata,
  symbols,
  setSymbols,
  connections,
  setConnections,
  currentFilePath,
  setCurrentFilePath,
  paletteTemplateMap,
  setHasUnsavedChanges,
  selectedSymbolId,
  selectedSymbolIds,
  setSelectedSymbolId,
  setSelectedSymbolIds,
  setDinRail,
  dinRail,
  setActiveSheet,
  setDinRailGeneratorRequest,
  undoRedoServiceRef,
  dragHistorySnapshotRef,
  refreshHistoryState,
  executeSymbolsCommand,
  markClean,
  showTemporaryStatus,
}: UseProjectActionsParams) {
  // ── Delegated sub-hooks ─────────────────────────────────────────────────────
  const {
    handleNewProject,
    handleOpenProject,
    handleLoadProjectData,
    handleSaveProject,
  } = useProjectFileActions({
    metadata, setMetadata, symbols, setSymbols,
    connections, setConnections,
    currentFilePath, setCurrentFilePath, paletteTemplateMap,
    setHasUnsavedChanges,
    selectedSymbolId, selectedSymbolIds,
    setSelectedSymbolId, setSelectedSymbolIds,
    setDinRail, dinRail, setActiveSheet,
    undoRedoServiceRef, dragHistorySnapshotRef,
    refreshHistoryState, markClean, showTemporaryStatus,
  });

  const {
    handleExportPdf,
    handleExportBom,
    handleExportPng,
    handleExportDinRailPngWithDescriptionsNoBrackets,
  } = useProjectExportActions({
    metadata, symbols, connections, dinRail, showTemporaryStatus,
  });

  const {
    handleAutoBalance,
    handleApplyPhaseMoveSuggestion,
  } = usePhaseBalanceActions({
    symbols, selectedSymbolId, selectedSymbolIds,
    powerFactor: metadata.powerFactor,
    executeSymbolsCommand, showTemporaryStatus,
  });

  // ── Local callbacks (DIN rail generator + metadata) ─────────────────────────
  const handleOpenDinRailGenerator = useCallback(() => {
    setActiveSheet('sheet1');
    setDinRailGeneratorRequest((r) => r + 1);
  }, [setActiveSheet, setDinRailGeneratorRequest]);

  const handleRailGenerated = useCallback(
    (cfg: DinRailConfig, svg: string, width: number, height: number) => {
      if (symbols.length > 0) {
        executeSymbolsCommand(
          'Wygenerowanie szyny DIN',
          { symbols, selectedSymbolId, selectedSymbolIds },
          { symbols: [], selectedSymbolId: null, selectedSymbolIds: [] },
          'Wygenerowano nową, czystą szynę DIN'
        );
      }

      setDinRail({ config: cfg, svg, width, height, isVisible: true });
      setHasUnsavedChanges(true);
      showTemporaryStatus(
        `Szyna DIN: ${cfg.rows}x${cfg.modulesPerRow} (${width.toFixed(0)}x${height.toFixed(0)})`,
      );
    },
    [setDinRail, setHasUnsavedChanges, showTemporaryStatus, symbols, selectedSymbolId, selectedSymbolIds, executeSymbolsCommand],
  );

  const handleMetadataChange = useCallback(
    (nextMetadata: ProjectMetadata) => {
      setMetadata(nextMetadata);
      setHasUnsavedChanges(true);
    },
    [setHasUnsavedChanges, setMetadata],
  );

  const handleResetDocumentation = useCallback(() => {
    handleMetadataChange(resetDocumentationFields(metadata));
  }, [handleMetadataChange, metadata]);

  return {
    handleNewProject,
    handleOpenProject,
    handleLoadProjectData,
    handleSaveProject,
    handleExportPdf,
    handleExportBom,
    handleExportPng,
    handleExportDinRailPngWithDescriptionsNoBrackets,
    handleAutoBalance,
    handleApplyPhaseMoveSuggestion,
    handleOpenDinRailGenerator,
    handleRailGenerated,
    handleMetadataChange,
    handleResetDocumentation,
  };
}
