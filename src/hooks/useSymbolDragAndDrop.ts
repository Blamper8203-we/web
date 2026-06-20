import { useCallback, type MutableRefObject } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { SymbolItem } from '../types/symbolItem';
import type { SymbolHistorySnapshot } from '../lib/appHelpers';
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
} from '../lib/appHelpers';

function shouldExcludeFromReleaseGrouping(symbol: SymbolItem): boolean {
  if (symbol.deviceKind === "rcd" && !symbol.group) {
    return false;
  }
  return shouldExcludeFromAutoGrouping(symbol);
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

interface UseSymbolDragAndDropParams {
  symbols: SymbolItem[];
  symbolsRef: MutableRefObject<SymbolItem[]>;
  setSymbols: React.Dispatch<React.SetStateAction<SymbolItem[]>>;
  selectedSymbolId: string | null;
  selectedSymbolIds: string[];
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

export function useSymbolDragAndDrop({
  symbols,
  symbolsRef,
  setSymbols,
  selectedSymbolId,
  selectedSymbolIds,
  setHasUnsavedChanges,
  executeSymbolsCommand,
  dragHistorySnapshotRef,
  draggedSymbolIdsRef,
}: UseSymbolDragAndDropParams) {
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
    [dragHistorySnapshotRef, draggedSymbolIdsRef, setHasUnsavedChanges, setSymbols, symbolsRef],
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
      symbolsRef,
    ],
  );

  return {
    handleSymbolMoveStart,
    handleSymbolMove,
    handleSymbolMoveEnd,
  };
}
