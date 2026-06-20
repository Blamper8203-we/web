import { useRef, useEffect, type MutableRefObject } from 'react';
import {
  type SymbolHistorySnapshot,
  type RightTab,
} from '../lib/appHelpers';
import type { SymbolItem } from '../types/symbolItem';

import { useSymbolSelection, resolveSelectionChange, type ResolvedSelectionChange } from './useSymbolSelection';
import { useSymbolEditing } from './useSymbolEditing';
import { useSymbolClipboard } from './useSymbolClipboard';
import { useSymbolDragAndDrop, resolveReleasedDinRailGrouping } from './useSymbolDragAndDrop';

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

// Re-exports for tests and other consumers
export { resolveSelectionChange, resolveReleasedDinRailGrouping };
export type { ResolvedSelectionChange };

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
  // W hookach używane są refy, więc musimy je zainicjalizować tutaj
  // tak jak było wcześniej, by przekazać je do mniejszych hooków
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

  const dragAndDrop = useSymbolDragAndDrop({
    symbols,
    symbolsRef,
    setSymbols,
    selectedSymbolId,
    selectedSymbolIds,
    setHasUnsavedChanges,
    executeSymbolsCommand,
    dragHistorySnapshotRef,
    draggedSymbolIdsRef,
  });

  const selection = useSymbolSelection({
    selectedSymbolIds,
    setSelectedSymbolIds,
    setSelectedSymbolId,
    setActiveRightTab,
  });

  const editing = useSymbolEditing({
    symbolsRef,
    selectedSymbolId,
    selectedSymbolIds,
    executeSymbolsCommand,
  });

  const clipboard = useSymbolClipboard({
    symbolsRef,
    selectedSymbolIdRef,
    selectedSymbolIdsRef,
    executeSymbolsCommand,
  });

  return {
    ...dragAndDrop,
    ...selection,
    ...editing,
    ...clipboard,
  };
}

