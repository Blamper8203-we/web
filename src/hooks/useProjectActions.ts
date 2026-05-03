import { useCallback, type MutableRefObject } from 'react';
import {
  createDefaultProjectMetadata,
  normalizeProjectMetadata,
  resetDocumentationFields,
} from '../lib/projectMetadata';
import { openProjectFile, saveProjectFile } from '../lib/projectFile';
import { exportToPdf } from '../lib/export/pdfExportService';
import { validateProject } from '../lib/validation/electricalValidationService';
import {
  applyBalancePlan,
  autoBalancePhases,
  calculateTotalDistribution,
  type BalanceMode,
  type BalanceScope,
} from '../lib/phaseDistribution/phaseDistributionCalculator';
import { normalizePaletteAssetDimensions, DEFAULT_DIN_RAIL_CONFIG, type SymbolHistorySnapshot } from '../lib/appHelpers';
import { type DinRailConfig } from '../lib/schematic/dinRailGenerator';
import type { ProjectMetadata } from '../types/projectMetadata';
import type { SymbolItem } from '../types/symbolItem';
import type { DinRailCanvasRail } from '../components/DinRailCanvasPixi';
import type { PaletteTemplate } from '../lib/appHelpers';
import type { SheetType } from '../lib/appHelpers';
import type { UndoRedoService } from '../lib/editing/undoRedoService';

interface UseProjectActionsParams {
  metadata: ProjectMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ProjectMetadata>>;
  symbols: SymbolItem[];
  setSymbols: React.Dispatch<React.SetStateAction<SymbolItem[]>>;
  currentFilePath: string | null;
  setCurrentFilePath: React.Dispatch<React.SetStateAction<string | null>>;
  paletteTemplateMap: Map<string, PaletteTemplate>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSymbolId: string | null;
  selectedSymbolIds: string[];
  setSelectedSymbolId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSymbolIds: React.Dispatch<React.SetStateAction<string[]>>;
  setDinRail: React.Dispatch<React.SetStateAction<DinRailCanvasRail>>;
  setActiveSheet: React.Dispatch<React.SetStateAction<SheetType>>;
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
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;
}

export function useProjectActions({
  metadata,
  setMetadata,
  symbols,
  setSymbols,
  currentFilePath,
  setCurrentFilePath,
  paletteTemplateMap,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  selectedSymbolId,
  selectedSymbolIds,
  setSelectedSymbolId,
  setSelectedSymbolIds,
  setDinRail,
  setActiveSheet,
  setDinRailGeneratorRequest,
  undoRedoServiceRef,
  dragHistorySnapshotRef,
  refreshHistoryState,
  executeSymbolsCommand,
  showTemporaryStatus,
}: UseProjectActionsParams) {
  const resetProjectState = useCallback(() => {
    setSelectedSymbolId(null);
    setSelectedSymbolIds([]);
    setDinRail({ config: DEFAULT_DIN_RAIL_CONFIG, svg: '', width: 0, height: 0, isVisible: false });
    setHasUnsavedChanges(false);
    dragHistorySnapshotRef.current = null;
    undoRedoServiceRef.current.clear();
    refreshHistoryState();
  }, [
    dragHistorySnapshotRef,
    refreshHistoryState,
    setDinRail,
    setHasUnsavedChanges,
    setSelectedSymbolId,
    setSelectedSymbolIds,
    undoRedoServiceRef,
  ]);

  const handleNewProject = useCallback(() => {
    setMetadata(createDefaultProjectMetadata());
    setSymbols([]);
    setCurrentFilePath(null);
    resetProjectState();
    setActiveSheet('sheet1');
    setDinRailGeneratorRequest((r) => r + 1);
    showTemporaryStatus('Utworzono nowy projekt', 3000);
  }, [
    resetProjectState,
    setActiveSheet,
    setCurrentFilePath,
    setDinRailGeneratorRequest,
    setMetadata,
    setSymbols,
    showTemporaryStatus,
  ]);

  const handleOpenProject = useCallback(async () => {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        'Masz niezapisane zmiany. Czy na pewno chcesz otworzyć nowy projekt bez ich zapisywania?',
      )
    ) {
      return;
    }

    try {
      const data = await openProjectFile();
      if (!data) return;

      setMetadata(normalizeProjectMetadata(data.metadata));
      setSymbols(normalizePaletteAssetDimensions(data.symbols, paletteTemplateMap));
      setCurrentFilePath(data.path ?? null);
      resetProjectState();
      showTemporaryStatus('Otwarto projekt', 3000);
    } catch (e) {
      showTemporaryStatus(`Blad: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
    }
  }, [
    hasUnsavedChanges,
    paletteTemplateMap,
    resetProjectState,
    setCurrentFilePath,
    setMetadata,
    setSymbols,
    showTemporaryStatus,
  ]);

  const handleSaveProject = useCallback(
    async (asNew = false) => {
      try {
        const path = await saveProjectFile(
          metadata,
          symbols,
          asNew ? undefined : currentFilePath ?? undefined,
        );
        if (path) {
          setCurrentFilePath(path);
          setHasUnsavedChanges(false);
          showTemporaryStatus('Pobrano plik projektu', 3000);
        }
      } catch (e) {
        showTemporaryStatus(`Blad: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
      }
    },
    [currentFilePath, metadata, setCurrentFilePath, setHasUnsavedChanges, showTemporaryStatus, symbols],
  );

  const handleExportPdf = useCallback(async () => {
    const distribution = calculateTotalDistribution(symbols);
    const validation = validateProject(symbols);
    try {
      await exportToPdf(metadata, symbols, distribution, validation);
      showTemporaryStatus('Eksport PDF', 3000);
    } catch (e) {
      showTemporaryStatus(`Blad: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
    }
  }, [metadata, showTemporaryStatus, symbols]);

  const handleAutoBalance = useCallback(
    (mode: BalanceMode, scope: BalanceScope) => {
      const distributionBefore = calculateTotalDistribution(symbols);
      const plan = autoBalancePhases(symbols, mode, scope);
      const applied = applyBalancePlan(symbols, plan);
      const distributionAfter = calculateTotalDistribution(applied.symbols);

      const message =
        applied.changedCount > 0
          ? `Zmieniono przypisanie faz dla ${applied.changedCount} elementow. Asymetria ${distributionBefore.imbalancePercent.toFixed(1)}% -> ${distributionAfter.imbalancePercent.toFixed(1)}%.`
          : `Bilans nie wymagal zmian. Asymetria pozostala na poziomie ${distributionAfter.imbalancePercent.toFixed(1)}%.`;

      if (applied.changedCount > 0) {
        executeSymbolsCommand(
          'Bilansowanie faz',
          { symbols, selectedSymbolId, selectedSymbolIds },
          { symbols: applied.symbols, selectedSymbolId, selectedSymbolIds },
          message,
        );
      } else {
        showTemporaryStatus(message, 4000);
      }

      return { message };
    },
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, showTemporaryStatus, symbols],
  );

  const handleOpenDinRailGenerator = useCallback(() => {
    setActiveSheet('sheet1');
    setDinRailGeneratorRequest((r) => r + 1);
  }, [setActiveSheet, setDinRailGeneratorRequest]);

  const handleRailGenerated = useCallback(
    (cfg: DinRailConfig, svg: string, width: number, height: number) => {
      setDinRail({ config: cfg, svg, width, height, isVisible: true });
      setHasUnsavedChanges(true);
      showTemporaryStatus(
        `Szyna DIN: ${cfg.rows}x${cfg.modulesPerRow} (${width.toFixed(0)}x${height.toFixed(0)})`,
      );
    },
    [setDinRail, setHasUnsavedChanges, showTemporaryStatus],
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
    handleSaveProject,
    handleExportPdf,
    handleAutoBalance,
    handleOpenDinRailGenerator,
    handleRailGenerated,
    handleMetadataChange,
    handleResetDocumentation,
  };
}
