import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import type { SymbolItem } from '../types/symbolItem';
import { cloneSymbol } from '../types/symbolItem';
import type { SymbolHistorySnapshot } from '../lib/appHelpers';
import { normalizeDinRailModuleOrdering, normalizeGroupConsistency, isEditableShortcutTarget } from '../lib/appHelpers';

interface UseSymbolClipboardParams {
  symbolsRef: MutableRefObject<SymbolItem[]>;
  selectedSymbolIdRef: MutableRefObject<string | null>;
  selectedSymbolIdsRef: MutableRefObject<string[]>;
  executeSymbolsCommand: (
    label: string,
    before: SymbolHistorySnapshot,
    after: SymbolHistorySnapshot,
    statusMessage: string,
  ) => boolean;
}

export function useSymbolClipboard({
  symbolsRef,
  selectedSymbolIdRef,
  selectedSymbolIdsRef,
  executeSymbolsCommand,
}: UseSymbolClipboardParams) {
  const isDeletingRef = useRef(false);
  const isDuplicatingRef = useRef(false);

  const handleDeleteSelected = useCallback(() => {
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
  }, [executeSymbolsCommand, symbolsRef, selectedSymbolIdRef, selectedSymbolIdsRef]);

  const handleDuplicateSelected = useCallback(() => {
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
  }, [executeSymbolsCommand, symbolsRef, selectedSymbolIdRef, selectedSymbolIdsRef]);

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
    handleDeleteSelected,
    handleDuplicateSelected,
  };
}
