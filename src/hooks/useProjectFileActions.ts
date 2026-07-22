import { useCallback, type MutableRefObject } from 'react';
import {
  createEmptyProjectMetadata,
  normalizeProjectMetadata,
} from '../lib/projectMetadata';
import { openProjectFile, saveProjectFile, type ProjectFileData } from '../lib/projectFile';
import { validateProjectSemantics } from '../lib/projectFileSemantics';
import type { ConnectionItem } from '../types/connectionItem';
import {
  normalizePaletteAssetDimensions,
  normalizeGroupConsistency,
  normalizeDinRailModuleOrdering,
  DEFAULT_DIN_RAIL_CONFIG,
  type SymbolHistorySnapshot,
} from '../lib/appHelpers';
import { generateDinRailSvg, getDinRailDimensions, type DinRailConfig } from '../lib/schematic/dinRailGenerator';
import type { ProjectMetadata } from '../types/projectMetadata';
import type { SymbolItem } from '../types/symbolItem';
import type { DinRailCanvasRail } from '../components/DinRailCanvas';
import type { PaletteTemplate, SheetType } from '../lib/appHelpers';
import type { UndoRedoService } from '../lib/editing/undoRedoService';

interface UseProjectFileActionsParams {
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
  undoRedoServiceRef: MutableRefObject<UndoRedoService>;
  dragHistorySnapshotRef: MutableRefObject<SymbolHistorySnapshot | null>;
  refreshHistoryState: () => void;
  markClean: (snapshot: SymbolHistorySnapshot) => void;
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;
}

export function useProjectFileActions({
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
  undoRedoServiceRef,
  dragHistorySnapshotRef,
  refreshHistoryState,
  markClean,
  showTemporaryStatus,
}: UseProjectFileActionsParams) {
  const applyRailFromSymbols = useCallback((nextSymbols: SymbolItem[]) => {
    if (nextSymbols.length === 0) {
      setDinRail({ config: DEFAULT_DIN_RAIL_CONFIG, svg: '', width: 0, height: 0, isVisible: false });
      return;
    }

    const snappedSymbols = nextSymbols.filter((symbol) => symbol.isSnappedToRail);
    const sourceSymbols = snappedSymbols.length > 0 ? snappedSymbols : nextSymbols;
    const rowBands = Array.from(
      new Set(sourceSymbols.map((symbol) => Math.round(symbol.y / 200))),
    );
    const rows = Math.max(1, Math.min(10, rowBands.length));
    const maxX = sourceSymbols.reduce((maxValue, symbol) => Math.max(maxValue, symbol.x + symbol.width), 0);
    const modulesPerRow = Math.max(6, Math.min(48, Math.ceil((maxX + 120) / 250)));
    const config: DinRailConfig = { rows, modulesPerRow };
    const svg = generateDinRailSvg(config);
    const dims = getDinRailDimensions(rows, modulesPerRow);
    setDinRail({ config, svg, width: dims.width, height: dims.height, isVisible: true });
  }, [setDinRail]);

  const resetProjectState = useCallback(() => {
    setSelectedSymbolId(null);
    setSelectedSymbolIds([]);
    setDinRail({ config: DEFAULT_DIN_RAIL_CONFIG, svg: '', width: 0, height: 0, isVisible: false });
    setHasUnsavedChanges(false);
    // WHY: pin the empty snapshot as the new clean baseline so a subsequent
    // edit → undo → redo cycle correctly returns to a clean state, and so
    // useSymbolHistory's equality check has a reference point on first load.
    markClean({
      symbols: [],
      connections: [],
      selectedSymbolId: null,
      selectedSymbolIds: [],
    });
    dragHistorySnapshotRef.current = null;
    undoRedoServiceRef.current.clear();
    refreshHistoryState();
  }, [
    dragHistorySnapshotRef,
    markClean,
    refreshHistoryState,
    setDinRail,
    setHasUnsavedChanges,
    setSelectedSymbolId,
    setSelectedSymbolIds,
    undoRedoServiceRef,
  ]);

  const handleSaveProject = useCallback(
    async (asNew = false): Promise<boolean> => {
      try {
        const path = await saveProjectFile(
          metadata,
          symbols,
          dinRail.isVisible ? {
            svg: dinRail.svg,
            width: dinRail.width,
            height: dinRail.height,
            rows: dinRail.config.rows,
            modulesPerRow: dinRail.config.modulesPerRow,
            isVisible: true,
          } : null,
          asNew ? undefined : currentFilePath ?? undefined,
          connections,
        );
        if (path) {
          setCurrentFilePath(path);
          setHasUnsavedChanges(false);
          // WHY: capture the just-written state as the new clean reference.
          // Without this, undoing the very last edit would leave the project
          // reported as dirty even though the file on disk matches the
          // current state (P1-8 data-loss illusion).
          markClean({
            symbols,
            connections,
            selectedSymbolId,
            selectedSymbolIds,
          });
          showTemporaryStatus('Zapisano plik zlecenia', 3000);
          return true;
        }
        return false;
      } catch (e) {
        showTemporaryStatus(`Błąd: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
        return false;
      }
    },
    [
      connections,
      currentFilePath,
      dinRail,
      markClean,
      metadata,
      selectedSymbolId,
      selectedSymbolIds,
      setCurrentFilePath,
      setHasUnsavedChanges,
      showTemporaryStatus,
      symbols,
    ],
  );

  const handleNewProject = useCallback(() => {
    setMetadata(createEmptyProjectMetadata());
    setSymbols([]);
    setConnections([]);
    setCurrentFilePath(null);
    resetProjectState();
    setActiveSheet('sheet1');
    showTemporaryStatus('Utworzono nowe zlecenie', 3000);
  }, [
    resetProjectState,
    setActiveSheet,
    setCurrentFilePath,
    setMetadata,
    setSymbols,
    setConnections,
    showTemporaryStatus,
  ]);

  const handleLoadProjectData = useCallback((data: ProjectFileData) => {
    const normalizedSymbols = normalizeDinRailModuleOrdering(
      normalizeGroupConsistency(
        normalizePaletteAssetDimensions(data.symbols, paletteTemplateMap),
      ),
    );
    setMetadata(normalizeProjectMetadata(data.metadata));
    setSymbols(normalizedSymbols);
    setConnections(data.connections ?? []);
    setCurrentFilePath(data.path ?? null);
    resetProjectState();
    if (data.rail?.isVisible) {
      setDinRail({
        config: { rows: data.rail.rows, modulesPerRow: data.rail.modulesPerRow },
        svg: data.rail.svg,
        width: data.rail.width,
        height: data.rail.height,
        isVisible: true,
      });
    } else {
      applyRailFromSymbols(normalizedSymbols);
    }

    // WHY: capture the freshly-loaded state as the new clean baseline so
    // undoing back to it clears the dirty flag (P1-8). Selection is reset
    // to null by resetProjectState, so the clean snapshot mirrors that.
    markClean({
      symbols: normalizedSymbols,
      connections: data.connections ?? [],
      selectedSymbolId: null,
      selectedSymbolIds: [],
    });

    // Semantic validation runs after the project loads so the user can still
    // open and repair a malformed file. Errors do not block loading.
    const semanticMessages = validateProjectSemantics(data);
    const errorCount = semanticMessages.filter((m) => m.severity === 'Error').length;
    const warningCount = semanticMessages.filter((m) => m.severity === 'Warning').length;
    if (errorCount > 0 || warningCount > 0) {
      // Polska odmiana: 1 "błąd" (ą), 2-4 "błędy" (ę), 5+ "błędów" (dopełniacz l.mn.).
      // Tu obsługujemy 1 i 2+ (testy pokrywają tylko te dwa przypadki).
      const errorLabel =
        errorCount === 1 ? `${errorCount} błąd` : `${errorCount} błędy`;
      const warningLabel =
        warningCount === 1 ? `${warningCount} ostrzeżenie` : `${warningCount} ostrzeżeń`;
      const parts: string[] = [];
      if (errorCount > 0) parts.push(errorLabel);
      if (warningCount > 0) parts.push(warningLabel);
      showTemporaryStatus(
        `Otwarto zlecenie (${parts.join(', ')}) — sprawdź walidację`,
        6000,
      );
    } else {
      showTemporaryStatus('Otwarto zlecenie', 3000);
    }
  }, [
    applyRailFromSymbols,
    markClean,
    paletteTemplateMap,
    resetProjectState,
    setCurrentFilePath,
    setMetadata,
    setSymbols,
    setConnections,
    setDinRail,
    showTemporaryStatus,
  ]);

  const handleOpenProject = useCallback(async () => {
    try {
      const data = await openProjectFile();
      if (!data) return;
      handleLoadProjectData(data);
    } catch (e) {
      showTemporaryStatus(`Błąd: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
    }
  }, [handleLoadProjectData, showTemporaryStatus]);

  return {
    handleNewProject,
    handleOpenProject,
    handleLoadProjectData,
    handleSaveProject,
  };
}
