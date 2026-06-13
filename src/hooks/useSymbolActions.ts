import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import {
  cloneSymbolsSnapshot,
  findDinRailSnapTarget,
  canAutoJoinExistingGroup,
  applyInheritedRcdInfo,
  getNextGroupName,
  isDistributionSymbol,
  isGroupHeadSymbol,
  shouldExcludeFromAutoGrouping,
  snapDraggedGroupToNeighborModules,
  normalizeDinRailModuleOrdering,
  normalizeGroupConsistency,
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
  setActiveRightTab: (tab: RightTab) => void;
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

export interface ResolvedSelectionChange {
  nextActiveId: string | null;
  nextIds: string[];
}

export function resolveSelectionChange(
  ids: string[],
  activeId?: string | null,
): ResolvedSelectionChange {
  const nextIds = Array.from(new Set(ids));
  const nextActiveId =
    activeId && nextIds.includes(activeId)
      ? activeId
      : nextIds.length > 0
        ? (nextIds[nextIds.length - 1] ?? null)
        : null;

  return {
    nextActiveId,
    nextIds,
  };
}

export function resolveReleasedDinRailGrouping(
  symbols: SymbolItem[],
  releasedSymbolId: string,
): SymbolItem[] {
  let changed = false;
  const nextSymbols = cloneSymbolsSnapshot(symbols);
  const releasedSymbol = nextSymbols.find((s) => s.id === releasedSymbolId);

  if (
    !releasedSymbol
    || !releasedSymbol.isSnappedToRail
    || releasedSymbol.group
    || shouldExcludeFromReleaseGrouping(releasedSymbol)
  ) {
    return nextSymbols;
  }

  const snapTarget = findDinRailSnapTarget(
    nextSymbols.filter((s) => s.id !== releasedSymbol.id),
    releasedSymbol.x,
    releasedSymbol.y,
    releasedSymbol.width,
    releasedSymbol.height,
    releasedSymbol.moduleRef,
  );

  if (!snapTarget || !canAutoJoinExistingGroup(releasedSymbol, snapTarget)) {
    return nextSymbols;
  }

  if (snapTarget.group) {
    releasedSymbol.group = snapTarget.group;
    releasedSymbol.groupName = snapTarget.groupName;
    applyInheritedRcdInfo(nextSymbols, releasedSymbol, snapTarget);
    changed = true;
  } else {
    const targetIsHead = isGroupHeadSymbol(snapTarget);
    const releasedIsHead = isGroupHeadSymbol(releasedSymbol);
    const targetIsDistribution = isDistributionSymbol(snapTarget);
    const releasedIsDistribution = isDistributionSymbol(releasedSymbol);

    if ((targetIsHead || releasedIsHead) && (targetIsDistribution || releasedIsDistribution)) {
      const groupId = crypto.randomUUID();
      const groupName = getNextGroupName(nextSymbols);
      const rcdSymbol = targetIsHead ? snapTarget : releasedSymbol;
      const childSymbol = targetIsHead ? releasedSymbol : snapTarget;

      snapTarget.group = groupId;
      snapTarget.groupName = groupName;
      releasedSymbol.group = groupId;
      releasedSymbol.groupName = groupName;

      if (childSymbol.id !== rcdSymbol.id) {
        childSymbol.rcdSymbolId = rcdSymbol.id;
        childSymbol.rcdRatedCurrent = rcdSymbol.rcdRatedCurrent;
        childSymbol.rcdResidualCurrent = rcdSymbol.rcdResidualCurrent;
        childSymbol.rcdType = rcdSymbol.rcdType;
      }

      changed = true;
    }
  }

  return changed
    ? normalizeDinRailModuleOrdering(normalizeGroupConsistency(nextSymbols))
    : nextSymbols;
}

function shouldExcludeFromReleaseGrouping(symbol: SymbolItem): boolean {
  if (symbol.deviceKind === "rcd" && !symbol.group) {
    return false; // Pozwólmy nowemu RCD (bez grupy) dołączyć do grupy / stworzyć grupę przy upuszczeniu
  }
  return shouldExcludeFromAutoGrouping(symbol);
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
  const symbolsRef = useRef(symbols);
  const selectedSymbolIdRef = useRef(selectedSymbolId);
  const selectedSymbolIdsRef = useRef(selectedSymbolIds);

  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  useEffect(() => {
    selectedSymbolIdRef.current = selectedSymbolId;
  }, [selectedSymbolId]);

  useEffect(() => {
    selectedSymbolIdsRef.current = selectedSymbolIds;
  }, [selectedSymbolIds]);

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  const isDeletingRef = useRef(false);
  const isDuplicatingRef = useRef(false);

  const handleSymbolMoveStart = useCallback(
    (id: string) => {
      if (dragHistorySnapshotRef.current) return;

      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Light });
      }

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

        setSymbols((prev) => {
          const next = prev.map((s) => {
            if (!draggedIds.includes(s.id)) return s;
            const original = before.symbols.find((item) => item.id === s.id);
            return original ? { ...s, x: original.x + deltaX, y: original.y + deltaY } : s;
          });
          symbolsRef.current = next;
          return next;
        });
      } else {
        setSymbols((prev) => {
          const next = prev.map((s) => (s.id === id ? { ...s, x, y } : s));
          symbolsRef.current = next;
          return next;
        });
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

      const latestSymbols = symbolsRef.current;
      const normalizedSymbols = draggedIds.length === 1
        ? resolveReleasedDinRailGrouping(latestSymbols, id)
        : normalizeDinRailModuleOrdering(normalizeGroupConsistency(cloneSymbolsSnapshot(latestSymbols)));
      const movedSymbol = normalizedSymbols.find((s) => s.id === id);
      const label =
        movedSymbol?.referenceDesignation ||
        movedSymbol?.label ||
        movedSymbol?.type ||
        'element';

      executeSymbolsCommand(
        `Przesunięcie ${label}`,
        before,
        { symbols: normalizedSymbols, selectedSymbolId, selectedSymbolIds },
        `Przesunięto ${label}`,
      );

      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Medium });
      }
    },
    [
      dragHistorySnapshotRef,
      draggedSymbolIdsRef,
      executeSymbolsCommand,
      selectedSymbolId,
      selectedSymbolIds,
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

      const selectionUnitIds = [id];

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
    [selectedSymbolIds, setActiveRightTab, setSelectedSymbolId, setSelectedSymbolIds],
  );

  const handleSymbolSelectionChange = useCallback(
    (ids: string[], activeId?: string | null) => {
      const { nextIds, nextActiveId } = resolveSelectionChange(ids, activeId);
      setSelectedSymbolIds(nextIds);
      setSelectedSymbolId(nextActiveId);
      if (nextActiveId) setActiveRightTab('circuitEdit');
    },
    [setActiveRightTab, setSelectedSymbolId, setSelectedSymbolIds],
  );

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const handleCircuitEditSave = useCallback(
    (nextSymbol: SymbolItem) => {
      const currentSymbol = symbolsRef.current.find((s) => s.id === nextSymbol.id);
      if (!currentSymbol) return;

      const label =
        nextSymbol.referenceDesignation ||
        nextSymbol.circuitName ||
        nextSymbol.label ||
        nextSymbol.type ||
        'element';

      const updatedSymbols = symbolsRef.current.map((s) => (s.id === nextSymbol.id ? nextSymbol : s));
      const normalizedSymbols = normalizeDinRailModuleOrdering(
        normalizeGroupConsistency(updatedSymbols)
      );

      executeSymbolsCommand(
        `Edycja ${label}`,
        { symbols: symbolsRef.current, selectedSymbolId, selectedSymbolIds },
        {
          symbols: normalizedSymbols,
          selectedSymbolId: nextSymbol.id,
          selectedSymbolIds: [nextSymbol.id],
        },
        `Zapisano parametry: ${label}`,
      );
    },
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds],
  );

  const handleSchematicCellEdit = useCallback(
    (symbolId: string, field: SchematicEditableField, value: string) => {
      const currentSymbol = symbolsRef.current.find((s) => s.id === symbolId);
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
        { symbols: symbolsRef.current, selectedSymbolId, selectedSymbolIds },
        {
          symbols: normalizeDinRailModuleOrdering(
            normalizeGroupConsistency(symbolsRef.current.map((s) => (s.id === symbolId ? nextSymbol : s)))
          ),
          selectedSymbolId: symbolId,
          selectedSymbolIds: [symbolId],
        },
        `Zapisano komórkę tabeli: ${label}`,
      );
    },
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds],
  );

  // ── Delete / Duplicate ───────────────────────────────────────────────────────

  const handleDeleteSelected = useCallback(() => {
    // Synchronous lock to prevent double-execution from rapid key presses
    // before React re-renders with updated state/refs
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    try {
      const ids = selectedSymbolIdsRef.current;
      const activeId = selectedSymbolIdRef.current;
      const currentSymbols = symbolsRef.current;

      const activeSelection =
        ids.length > 0
          ? ids
          : activeId
            ? [activeId]
            : [];
      const selectedSet = new Set(activeSelection);
      const symbolsToDelete = currentSymbols.filter((s) => selectedSet.has(s.id));
      if (symbolsToDelete.length === 0) return;

      const primarySymbol = symbolsToDelete[symbolsToDelete.length - 1];
      const label =
        symbolsToDelete.length > 1
          ? `${symbolsToDelete.length} elementów`
          : primarySymbol.referenceDesignation ||
            primarySymbol.circuitName ||
            primarySymbol.label ||
            primarySymbol.type ||
            'element';

      const nextSymbols = normalizeDinRailModuleOrdering(
        normalizeGroupConsistency(
          currentSymbols
        .filter((s) => !selectedSet.has(s.id))
        .map((s) =>
          selectedSet.has(s.rcdSymbolId)
            ? {
                ...s,
                rcdSymbolId: '',
                rcdRatedCurrent: 0,
                rcdResidualCurrent: 0,
                rcdType: '',
              }
            : s,
        ),
        ),
      );

      executeSymbolsCommand(
        `Usunięcie ${label}`,
        { symbols: currentSymbols, selectedSymbolId: activeId, selectedSymbolIds: ids },
        { symbols: nextSymbols, selectedSymbolId: null, selectedSymbolIds: [] },
        `Usunięto ${label}`,
      );

      if (Capacitor.isNativePlatform()) {
        Haptics.notification({ type: NotificationType.Success });
      }
    } finally {
      isDeletingRef.current = false;
    }
  }, [executeSymbolsCommand]);

  const handleDuplicateSelected = useCallback(() => {
    // Synchronous lock to prevent double-execution from rapid key presses
    if (isDuplicatingRef.current) return;
    isDuplicatingRef.current = true;
    try {
      const ids = selectedSymbolIdsRef.current;
      const activeId = selectedSymbolIdRef.current;
      const currentSymbols = symbolsRef.current;

      const activeSelection =
        ids.length > 0
          ? ids
          : activeId
            ? [activeId]
            : [];
      const selectedSet = new Set(activeSelection);
      const symbolsToDuplicate = currentSymbols.filter((s) => selectedSet.has(s.id));
      if (symbolsToDuplicate.length === 0) return;

      const nextModuleNumber =
        currentSymbols.length > 0 ? Math.max(...currentSymbols.map((s) => s.moduleNumber)) + 1 : 1;
      const minX = Math.min(...symbolsToDuplicate.map((s) => s.x));
      const maxX = Math.max(...symbolsToDuplicate.map((s) => s.x + s.width));
      const groupOffset = Math.max(20, maxX - minX) + 20;

      const groupIdsToClone = Array.from(
        new Set(
          symbolsToDuplicate
            .map((symbol) => symbol.group)
            .filter((groupId): groupId is string => Boolean(groupId)),
        ),
      );
      const groupIdMap = new Map(groupIdsToClone.map((groupId) => [groupId, crypto.randomUUID()] as const));
      const existingGroupOrders = currentSymbols
        .map((symbol) => {
          const match = symbol.groupName.match(/^Grupa-(\d+)$/i);
          return match ? Number.parseInt(match[1], 10) : 0;
        })
        .filter((value) => Number.isFinite(value) && value > 0);
      let nextGroupOrder = existingGroupOrders.length > 0 ? Math.max(...existingGroupOrders) + 1 : 1;
      const groupNameMap = new Map<string, string>();
      for (const groupId of groupIdsToClone) {
        groupNameMap.set(groupId, `Grupa-${nextGroupOrder++}`);
      }

      const clonedPairs = symbolsToDuplicate.map((symbol, index) => {
        const clone = cloneSymbol({
          ...symbol,
          x: symbol.x + groupOffset,
          moduleNumber: nextModuleNumber + index,
          referenceDesignation: '',
          isSelected: true,
          parameters: { ...symbol.parameters },
        });
        delete clone.parameters.ManualReferenceDesignation;
        return { source: symbol, clone };
      });
      const cloneIdBySourceId = new Map(clonedPairs.map(({ source, clone }) => [source.id, clone.id] as const));
      const clones = clonedPairs.map(({ source, clone }) => {
        const nextClone = { ...clone, parameters: { ...clone.parameters } };
        if (source.group && groupIdMap.has(source.group)) {
          nextClone.group = groupIdMap.get(source.group)!;
          nextClone.groupName = groupNameMap.get(source.group) ?? source.groupName;
        }

        if (source.rcdSymbolId && cloneIdBySourceId.has(source.rcdSymbolId)) {
          nextClone.rcdSymbolId = cloneIdBySourceId.get(source.rcdSymbolId)!;
        } else if (nextClone.deviceKind !== 'rcd') {
          nextClone.rcdSymbolId = '';
          nextClone.rcdRatedCurrent = 0;
          nextClone.rcdResidualCurrent = 0;
          nextClone.rcdType = '';
        }

        return nextClone;
      });
      const cloneIds = clones.map((c) => c.id);
      const normalizedNextSymbols = normalizeDinRailModuleOrdering(
        normalizeGroupConsistency([...currentSymbols.map((s) => ({ ...s, isSelected: false })), ...clones]),
      );

      const primarySymbol = symbolsToDuplicate[symbolsToDuplicate.length - 1];
      const label =
        symbolsToDuplicate.length > 1
          ? `${symbolsToDuplicate.length} elementów`
          : primarySymbol.referenceDesignation ||
            primarySymbol.circuitName ||
            primarySymbol.label ||
            primarySymbol.type ||
            'element';

      executeSymbolsCommand(
        `Kopiowanie ${label}`,
        { symbols: currentSymbols, selectedSymbolId: activeId, selectedSymbolIds: ids },
        {
          symbols: normalizedNextSymbols,
          selectedSymbolId: cloneIds[cloneIds.length - 1] ?? null,
          selectedSymbolIds: cloneIds,
        },
        `Skopiowano ${label}`,
      );
    } finally {
      isDuplicatingRef.current = false;
    }
  }, [executeSymbolsCommand]);

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
