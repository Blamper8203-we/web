import { useCallback, useEffect, type MutableRefObject } from 'react';
import {
  cloneSymbolsSnapshot,
  findDinRailSnapTarget,
  canAutoJoinExistingGroup,
  applyInheritedRcdInfo,
  snapDraggedGroupToNeighborModules,
  normalizeDinRailModuleOrdering,
  isEditableShortcutTarget,
  type SymbolHistorySnapshot,
  type RightTab,
} from '../lib/appHelpers';
import { cloneSymbol } from '../types/symbolItem';
import {
  applySchematicCellEditValue,
  type SchematicEditableField,
} from '../lib/schematic/schematicCellEdit';
import type { SymbolItem } from '../types/symbolItem';

interface UseSymbolActionsParams {
  symbols: SymbolItem[];
  setSymbols: React.Dispatch<React.SetStateAction<SymbolItem[]>>;
  selectedSymbolId: string | null;
  setSelectedSymbolId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedSymbolIds: string[];
  setSelectedSymbolIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveRightTab: React.Dispatch<React.SetStateAction<RightTab>>;
  setHasUnsavedChanges: (value: boolean) => void;
  executeSymbolsCommand: (
    label: string,
    before: SymbolHistorySnapshot,
    after: SymbolHistorySnapshot,
    statusMessage: string,
  ) => boolean;
  dragHistorySnapshotRef: MutableRefObject<SymbolHistorySnapshot | null>;
  draggedSymbolIdsRef: MutableRefObject<string[] | null>;
}

export function useSymbolActions({
  symbols,
  setSymbols,
  selectedSymbolId,
  setSelectedSymbolId,
  selectedSymbolIds,
  setSelectedSymbolIds,
  setActiveRightTab,
  setHasUnsavedChanges,
  executeSymbolsCommand,
  dragHistorySnapshotRef,
  draggedSymbolIdsRef,
}: UseSymbolActionsParams) {
  // ── Drag helpers ─────────────────────────────────────────────────────────────

  const handleSymbolMoveStart = useCallback(
    (id: string) => {
      if (dragHistorySnapshotRef.current) return;

      const draggedSymbol = symbols.find((s) => s.id === id);
      const selectedIds =
        selectedSymbolIds.length > 0
          ? selectedSymbolIds
          : selectedSymbolId
            ? [selectedSymbolId]
            : [];

      if (draggedSymbol?.group) {
        draggedSymbolIdsRef.current = symbols
          .filter((s) => s.group === draggedSymbol.group)
          .map((s) => s.id);
      } else if (selectedIds.length > 1 && selectedIds.includes(id)) {
        draggedSymbolIdsRef.current = selectedIds;
      } else {
        draggedSymbolIdsRef.current = [id];
      }

      dragHistorySnapshotRef.current = {
        symbols: cloneSymbolsSnapshot(symbols),
        selectedSymbolId,
        selectedSymbolIds,
      };
    },
    [dragHistorySnapshotRef, draggedSymbolIdsRef, selectedSymbolId, selectedSymbolIds, symbols],
  );

  const handleSymbolMove = useCallback(
    (id: string, x: number, y: number) => {
      const before = dragHistorySnapshotRef.current;
      const draggedIds =
        draggedSymbolIdsRef.current ??
        before?.selectedSymbolIds ??
        (before?.selectedSymbolId ? [before.selectedSymbolId] : []);

      if (before && draggedIds.length > 0 && draggedIds.includes(id)) {
        const originalDragged = before.symbols.find((s) => s.id === id);
        if (!originalDragged) return;

        let deltaX = x - originalDragged.x;
        const deltaY = y - originalDragged.y;
        const movedSymbols = before.symbols.filter((s) => draggedIds.includes(s.id));

        if (movedSymbols.length > 1 && movedSymbols.every((s) => s.isSnappedToRail)) {
          deltaX = snapDraggedGroupToNeighborModules(
            movedSymbols,
            before.symbols,
            deltaX,
            originalDragged,
            y,
          );
        }

        setSymbols((prev) =>
          prev.map((s) => {
            if (!draggedIds.includes(s.id)) return s;
            const original = before.symbols.find((item) => item.id === s.id);
            return original ? { ...s, x: original.x + deltaX, y: original.y + deltaY } : s;
          }),
        );
      } else {
        setSymbols((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
      }

      setHasUnsavedChanges(true);
    },
    [dragHistorySnapshotRef, draggedSymbolIdsRef, setHasUnsavedChanges, setSymbols],
  );

  const handleSymbolMoveEnd = useCallback(
    (id: string) => {
      const before = dragHistorySnapshotRef.current;
      dragHistorySnapshotRef.current = null;
      const draggedIds = draggedSymbolIdsRef.current ?? [id];
      draggedSymbolIdsRef.current = null;

      if (!before) return;

      let nextSymbols = cloneSymbolsSnapshot(symbols);
      const releasedSymbol = nextSymbols.find((s) => s.id === id);

      if (
        releasedSymbol &&
        draggedIds.length === 1 &&
        releasedSymbol.isSnappedToRail &&
        !releasedSymbol.group
      ) {
        const snapTarget = findDinRailSnapTarget(
          nextSymbols.filter((s) => s.id !== releasedSymbol.id),
          releasedSymbol.x,
          releasedSymbol.y,
          releasedSymbol.width,
          releasedSymbol.height,
        );
        if (snapTarget?.group && canAutoJoinExistingGroup(releasedSymbol, snapTarget)) {
          releasedSymbol.group = snapTarget.group;
          releasedSymbol.groupName = snapTarget.groupName;
          applyInheritedRcdInfo(nextSymbols, releasedSymbol, snapTarget);
        }
      }

      const normalizedSymbols = normalizeDinRailModuleOrdering(nextSymbols);
      const movedSymbol = normalizedSymbols.find((s) => s.id === id);
      const label =
        movedSymbol?.referenceDesignation ||
        movedSymbol?.label ||
        movedSymbol?.type ||
        'element';

      executeSymbolsCommand(
        `Przesuniecie ${label}`,
        before,
        { symbols: normalizedSymbols, selectedSymbolId, selectedSymbolIds },
        `Przesunieto ${label}`,
      );
    },
    [
      dragHistorySnapshotRef,
      draggedSymbolIdsRef,
      executeSymbolsCommand,
      selectedSymbolId,
      selectedSymbolIds,
      symbols,
    ],
  );

  // ── Selection ────────────────────────────────────────────────────────────────

  const handleSymbolSelect = useCallback(
    (id: string | null, options?: { toggle?: boolean }) => {
      if (!id) {
        setSelectedSymbolId(null);
        setSelectedSymbolIds([]);
        return;
      }

      const clickedSymbol = symbols.find((s) => s.id === id) ?? null;
      const selectionUnitIds = clickedSymbol?.group
        ? symbols.filter((s) => s.group === clickedSymbol.group).map((s) => s.id)
        : [id];

      const nextSelection = options?.toggle
        ? selectionUnitIds.every((sid) => selectedSymbolIds.includes(sid))
          ? selectedSymbolIds.filter((sid) => !selectionUnitIds.includes(sid))
          : Array.from(new Set([...selectedSymbolIds, ...selectionUnitIds]))
        : selectionUnitIds;

      const nextActiveId = nextSelection.includes(id)
        ? id
        : nextSelection.length > 0
          ? nextSelection[nextSelection.length - 1]
          : null;

      setSelectedSymbolIds(nextSelection);
      setSelectedSymbolId(nextActiveId);
      if (nextActiveId) setActiveRightTab('circuitEdit');
    },
    [selectedSymbolIds, setActiveRightTab, setSelectedSymbolId, setSelectedSymbolIds, symbols],
  );

  const handleSymbolSelectionChange = useCallback(
    (ids: string[], activeId?: string | null) => {
      const nextIds = Array.from(new Set(ids));
      const nextActiveId =
        activeId && nextIds.includes(activeId)
          ? activeId
          : nextIds.length > 0
            ? (nextIds[nextIds.length - 1] ?? null)
            : null;
      setSelectedSymbolIds(nextIds);
      setSelectedSymbolId(nextActiveId);
      if (nextActiveId) setActiveRightTab('circuitEdit');
    },
    [setActiveRightTab, setSelectedSymbolId, setSelectedSymbolIds],
  );

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const handleCircuitEditSave = useCallback(
    (nextSymbol: SymbolItem) => {
      const currentSymbol = symbols.find((s) => s.id === nextSymbol.id);
      if (!currentSymbol) return;

      const label =
        nextSymbol.referenceDesignation ||
        nextSymbol.circuitName ||
        nextSymbol.label ||
        nextSymbol.type ||
        'element';

      executeSymbolsCommand(
        `Edycja ${label}`,
        { symbols, selectedSymbolId, selectedSymbolIds },
        {
          symbols: symbols.map((s) => (s.id === nextSymbol.id ? nextSymbol : s)),
          selectedSymbolId: nextSymbol.id,
          selectedSymbolIds: [nextSymbol.id],
        },
        `Zapisano parametry: ${label}`,
      );
    },
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, symbols],
  );

  const handleSchematicCellEdit = useCallback(
    (symbolId: string, field: SchematicEditableField, value: string) => {
      const currentSymbol = symbols.find((s) => s.id === symbolId);
      if (!currentSymbol) return;

      const nextSymbol = applySchematicCellEditValue(currentSymbol, field, value);
      const label =
        nextSymbol.referenceDesignation ||
        nextSymbol.circuitName ||
        nextSymbol.label ||
        nextSymbol.type ||
        'element';

      executeSymbolsCommand(
        `Edycja tabeli ${label}`,
        { symbols, selectedSymbolId, selectedSymbolIds },
        {
          symbols: symbols.map((s) => (s.id === symbolId ? nextSymbol : s)),
          selectedSymbolId: symbolId,
          selectedSymbolIds: [symbolId],
        },
        `Zapisano komorke tabeli: ${label}`,
      );
    },
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, symbols],
  );

  // ── Delete / Duplicate ───────────────────────────────────────────────────────

  const handleDeleteSelected = useCallback(() => {
    const activeSelection =
      selectedSymbolIds.length > 0
        ? selectedSymbolIds
        : selectedSymbolId
          ? [selectedSymbolId]
          : [];
    const selectedSet = new Set(activeSelection);
    const symbolsToDelete = symbols.filter((s) => selectedSet.has(s.id));
    if (symbolsToDelete.length === 0) return;

    const primarySymbol = symbolsToDelete[symbolsToDelete.length - 1];
    const label =
      symbolsToDelete.length > 1
        ? `${symbolsToDelete.length} elementow`
        : primarySymbol.referenceDesignation ||
          primarySymbol.circuitName ||
          primarySymbol.label ||
          primarySymbol.type ||
          'element';

    const nextSymbols = symbols
      .filter((s) => !selectedSet.has(s.id))
      .map((s) => (selectedSet.has(s.rcdSymbolId) ? { ...s, rcdSymbolId: '' } : s));

    executeSymbolsCommand(
      `Usuniecie ${label}`,
      { symbols, selectedSymbolId, selectedSymbolIds },
      { symbols: nextSymbols, selectedSymbolId: null, selectedSymbolIds: [] },
      `Usunieto ${label}`,
    );
  }, [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, symbols]);

  const handleDuplicateSelected = useCallback(() => {
    const activeSelection =
      selectedSymbolIds.length > 0
        ? selectedSymbolIds
        : selectedSymbolId
          ? [selectedSymbolId]
          : [];
    const selectedSet = new Set(activeSelection);
    const symbolsToDuplicate = symbols.filter((s) => selectedSet.has(s.id));
    if (symbolsToDuplicate.length === 0) return;

    const nextModuleNumber =
      symbols.length > 0 ? Math.max(...symbols.map((s) => s.moduleNumber)) + 1 : 1;
    const minX = Math.min(...symbolsToDuplicate.map((s) => s.x));
    const maxX = Math.max(...symbolsToDuplicate.map((s) => s.x + s.width));
    const groupOffset = Math.max(20, maxX - minX) + 20;

    const clones = symbolsToDuplicate.map((symbol, index) => {
      const clone = cloneSymbol({
        ...symbol,
        x: symbol.x + groupOffset,
        moduleNumber: nextModuleNumber + index,
        referenceDesignation: '',
        isSelected: true,
        parameters: { ...symbol.parameters },
      });
      delete clone.parameters.ManualReferenceDesignation;
      return clone;
    });
    const cloneIds = clones.map((c) => c.id);

    const primarySymbol = symbolsToDuplicate[symbolsToDuplicate.length - 1];
    const label =
      symbolsToDuplicate.length > 1
        ? `${symbolsToDuplicate.length} elementow`
        : primarySymbol.referenceDesignation ||
          primarySymbol.circuitName ||
          primarySymbol.label ||
          primarySymbol.type ||
          'element';

    executeSymbolsCommand(
      `Kopiowanie ${label}`,
      { symbols, selectedSymbolId, selectedSymbolIds },
      {
        symbols: [...symbols.map((s) => ({ ...s, isSelected: false })), ...clones],
        selectedSymbolId: cloneIds[cloneIds.length - 1] ?? null,
        selectedSymbolIds: cloneIds,
      },
      `Skopiowano ${label}`,
    );
  }, [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, symbols]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'd') {
        event.preventDefault();
        handleDuplicateSelected();
        return;
      }
      if (event.key === 'Delete') {
        event.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected, handleDuplicateSelected]);

  return {
    handleSymbolMoveStart,
    handleSymbolMove,
    handleSymbolMoveEnd,
    handleSymbolSelect,
    handleSymbolSelectionChange,
    handleCircuitEditSave,
    handleSchematicCellEdit,
    handleDeleteSelected,
    handleDuplicateSelected,
  };
}
