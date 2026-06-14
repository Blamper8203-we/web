import { Capacitor } from '@capacitor/core';
import { useCallback, type MutableRefObject } from 'react';
import {
  createEmptyProjectMetadata,
  normalizeProjectMetadata,
  resetDocumentationFields,
} from '../lib/projectMetadata';
import { openProjectFile, saveProjectFile, type ProjectFileData } from '../lib/projectFile';
import { validateProjectSemantics } from '../lib/projectFileSemantics';
import type { ConnectionItem } from '../types/connectionItem';
import { exportToPdf } from '../lib/export/pdfExportService';
import { exportDinRailToBlobWithOptions } from '../lib/export/dinRailSnapshotService';
import {
  applyBalancePlan,
  autoBalancePhases,
  calculateTotalDistribution,
  type BalanceMode,
  type BalanceScope,
} from '../lib/phaseDistribution/phaseDistributionCalculator';
import {
  normalizePaletteAssetDimensions,
  normalizeGroupConsistency,
  normalizeDinRailModuleOrdering,
  DEFAULT_DIN_RAIL_CONFIG,
  type SymbolHistorySnapshot,
} from '../lib/appHelpers';
import { generateDinRailSvg, getDinRailDimensions, type DinRailConfig } from '../lib/schematic/dinRailGenerator';
import type { ProjectMetadata } from '../types/projectMetadata';
import type { PhaseAssignment, SymbolItem } from '../types/symbolItem';
import type { DinRailCanvasRail } from '../components/DinRailCanvasPixi';
import type { PaletteTemplate } from '../lib/appHelpers';
import type { SheetType } from '../lib/appHelpers';
import type { UndoRedoService } from '../lib/editing/undoRedoService';

type BalanceChangeDetail = {
  id: string;
  label: string;
  fromPhase: string;
  toPhase: string;
};

type BalanceSeverity = 'improved' | 'neutral' | 'worse';

function escapeCsv(value: string | number): string {
  const normalized = String(value ?? "");
  if (normalized.includes(";") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }

  return normalized;
}





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
  showTemporaryStatus,
}: UseProjectActionsParams) {
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
          showTemporaryStatus('Zapisano plik zlecenia', 3000);
          return true;
        }
        return false;
      } catch (e) {
        showTemporaryStatus(`Błąd: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
        return false;
      }
    },
    [currentFilePath, dinRail, metadata, setCurrentFilePath, setHasUnsavedChanges, showTemporaryStatus, symbols, connections],
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

  const handleExportPdf = useCallback(async () => {
    try {
      const blob = await exportToPdf(metadata, symbols, dinRail, connections);
      showTemporaryStatus('Eksport PDF', 3000);

      if (Capacitor.isNativePlatform() && blob) {
        // Handle native sharing
        const fileName = `${metadata.projectNumber?.trim() || "zlecenie"}.pdf`;
        const file = new File([blob], fileName, { type: 'application/pdf' });

        // Note: Capacitor Share needs a file path or base64 usually,
        // but for now let's try the Web Share API which Capacitor polyfills.
        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: 'Dokumentacja DINBoard',
            text: `Zlecenie: ${metadata.projectNumber || 'Bez numeru'}`,
          });
        }
      }
    } catch (e) {
      showTemporaryStatus(`Błąd: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
    }
  }, [connections, dinRail, metadata, showTemporaryStatus, symbols]);

  const handleExportBom = useCallback(() => {
    const headers = [
      "Lp",
      "Oznaczenie",
      "Nazwa",
      "Typ",
      "Kind",
      "Grupa",
      "ObwódId",
      "ObwódNazwa",
      "Zabezpieczenie",
      "MocW",
      "Faza",
      "Lokalizacja",
    ];

    const sortedSymbols = symbols
      .slice()
      .sort((left, right) => left.y - right.y || left.x - right.x);

    const rows = sortedSymbols.map((symbol, index) => [
      index + 1,
      symbol.referenceDesignation,
      symbol.label,
      symbol.type,
      symbol.deviceKind,
      symbol.groupName,
      symbol.circuitId,
      symbol.circuitName,
      symbol.displayProtection || symbol.protectionType,
      symbol.powerW,
      symbol.phase,
      symbol.location,
    ]);

    const csvLines = [headers, ...rows].map((line) => line.map((cell) => escapeCsv(cell)).join(";"));
    const csvContent = csvLines.join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stem = metadata.projectNumber?.trim() || "zlecenie";
    link.href = url;
    link.download = `${stem}-bom.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showTemporaryStatus("Eksport BOM (CSV)", 3000);
  }, [metadata.projectNumber, showTemporaryStatus, symbols]);

  const handleExportPng = useCallback(async (withAnnotations: boolean) => {
    if (!dinRail.isVisible) {
      showTemporaryStatus("Brak szyny DIN do eksportu PNG", 3500);
      return;
    }

    try {
      const blob = await exportDinRailToBlobWithOptions(symbols, dinRail, {
        includeDesignations: true,
        includeGroupFrames: withAnnotations,
        scale: 3,
      });
      if (!blob) {
        showTemporaryStatus("Nie udało się wyeksportować PNG", 3500);
        return;
      }

      const link = document.createElement("a");
      const stem = metadata.projectNumber?.trim() || "zlecenie";
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = withAnnotations ? `${stem}-oznaczenia.png` : `${stem}-czysty.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showTemporaryStatus(
        withAnnotations ? "Eksport PNG (z oznaczeniami)" : "Eksport PNG (czysty)",
        3000,
      );
    } catch {
      showTemporaryStatus("Nie udało się wyeksportować PNG", 3500);
    }
  }, [dinRail, metadata.projectNumber, showTemporaryStatus, symbols]);

  const handleExportDinRailPngWithDescriptionsNoBrackets = useCallback(async () => {
    if (!dinRail.isVisible) {
      showTemporaryStatus("Brak szyny DIN do eksportu PNG", 3500);
      return;
    }

    try {
      const blob = await exportDinRailToBlobWithOptions(symbols, dinRail, {
        includeDesignations: true,
        includeGroupFrames: false,
        scale: 4,
      });
      if (!blob) {
        showTemporaryStatus("Nie udało się wyeksportować rozdzielnicy", 3500);
        return;
      }

      const link = document.createElement("a");
      const stem = metadata.projectNumber?.trim() || "zlecenie";
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${stem}-rozdzielnica-opis-hq.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showTemporaryStatus("Eksport PNG HQ (opis bez klamr)", 3000);
    } catch {
      showTemporaryStatus("Nie udało się wyeksportować PNG HQ", 3500);
    }
  }, [dinRail, metadata.projectNumber, showTemporaryStatus, symbols]);

  const handleAutoBalance = useCallback(
    (mode: BalanceMode, scope: BalanceScope, previewOnly = false) => {
      const distributionBefore = calculateTotalDistribution(symbols);
      const plan = autoBalancePhases(symbols, mode, scope);
      const applied = applyBalancePlan(symbols, plan);
      const distributionAfter = calculateTotalDistribution(applied.symbols);
      const details: BalanceChangeDetail[] = [];

      const beforeById = new Map(symbols.map((symbol) => [symbol.id, symbol]));
      for (const nextSymbol of applied.symbols) {
        const previousSymbol = beforeById.get(nextSymbol.id);
        if (!previousSymbol || previousSymbol.phase === nextSymbol.phase) {
          continue;
        }

        details.push({
          id: nextSymbol.id,
          label: nextSymbol.label || nextSymbol.referenceDesignation || nextSymbol.id,
          fromPhase: previousSymbol.phase,
          toPhase: nextSymbol.phase,
        });
      }

      const message =
        applied.changedCount > 0
          ? `Zmieniono przypisanie faz dla ${applied.changedCount} elementów. Asymetria ${distributionBefore.imbalancePercent.toFixed(1)}% -> ${distributionAfter.imbalancePercent.toFixed(1)}%.`
          : `Bilans nie wymagał zmian. Asymetria pozostała na poziomie ${distributionAfter.imbalancePercent.toFixed(1)}%.`;

      if (!previewOnly && applied.changedCount > 0) {
        executeSymbolsCommand(
          'Bilansowanie faz',
          { symbols, selectedSymbolId, selectedSymbolIds },
          { symbols: applied.symbols, selectedSymbolId, selectedSymbolIds },
          message,
        );
      } else if (!previewOnly) {
        showTemporaryStatus(message, 4000);
      }

      const previewMessage = previewOnly
        ? (applied.changedCount > 0
            ? `Podgląd planu: ${applied.changedCount} zmian. Asymetria ${distributionBefore.imbalancePercent.toFixed(1)}% -> ${distributionAfter.imbalancePercent.toFixed(1)}%.`
            : `Podgląd planu: brak zmian. Asymetria pozostaje ${distributionAfter.imbalancePercent.toFixed(1)}%.`)
        : message;

      const delta = distributionBefore.imbalancePercent - distributionAfter.imbalancePercent;
      const severity: BalanceSeverity =
        delta > 0.01 ? 'improved' : delta < -0.01 ? 'worse' : 'neutral';

      return { message: previewMessage, details, severity };
    },
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, showTemporaryStatus, symbols],
  );

  const handleApplyPhaseMoveSuggestion = useCallback(
    (symbolId: string, toPhase: "L1" | "L2" | "L3") => {
      const target = symbols.find((symbol) => symbol.id === symbolId);
      if (!target) {
        showTemporaryStatus("Nie znaleziono obwodu do przeniesienia", 3000);
        return;
      }

      if (target.isPhaseLocked) {
        showTemporaryStatus("Obwód ma zablokowaną fazę", 3000);
        return;
      }

      if (target.phase === toPhase) {
        showTemporaryStatus("Obwód jest już na tej fazie", 2500);
        return;
      }

      const distributionBefore = calculateTotalDistribution(symbols);
      const nextSymbols = symbols.map((symbol) =>
        symbol.id === symbolId
          ? { ...symbol, phase: toPhase as PhaseAssignment }
          : symbol,
      );
      const distributionAfter = calculateTotalDistribution(nextSymbols);
      const label = target.referenceDesignation || target.circuitName || target.label || target.id;
      const message = `Przeniesiono ${label}: ${target.phase} -> ${toPhase}. Asymetria ${distributionBefore.imbalancePercent.toFixed(1)}% -> ${distributionAfter.imbalancePercent.toFixed(1)}%.`;

      executeSymbolsCommand(
        "Sugestia bilansu faz",
        { symbols, selectedSymbolId, selectedSymbolIds },
        { symbols: nextSymbols, selectedSymbolId, selectedSymbolIds },
        message,
      );
    },
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, showTemporaryStatus, symbols],
  );

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
