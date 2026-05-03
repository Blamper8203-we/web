import { useCallback, useEffect, useRef, useState } from 'react';
import { UndoRedoService, createActionCommand } from '../lib/editing/undoRedoService';
import {
  areSymbolSnapshotsEqual,
  cloneSymbolsSnapshot,
  isEditableShortcutTarget,
  type SymbolHistorySnapshot,
} from '../lib/appHelpers';
import type { SymbolItem } from '../types/symbolItem';

interface UseSymbolHistoryParams {
  setSymbols: React.Dispatch<React.SetStateAction<SymbolItem[]>>;
  setSelectedSymbolId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSymbolIds: React.Dispatch<React.SetStateAction<string[]>>;
  setHasUnsavedChanges: (value: boolean) => void;
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;
}

export function useSymbolHistory({
  setSymbols,
  setSelectedSymbolId,
  setSelectedSymbolIds,
  setHasUnsavedChanges,
  showTemporaryStatus,
}: UseSymbolHistoryParams) {
  const undoRedoServiceRef = useRef(new UndoRedoService());
  const dragHistorySnapshotRef = useRef<SymbolHistorySnapshot | null>(null);
  const draggedSymbolIdsRef = useRef<string[] | null>(null);
  const [, setHistoryVersion] = useState(0);

  const refreshHistoryState = useCallback(() => {
    setHistoryVersion((v) => v + 1);
  }, []);

  const applySymbolsSnapshot = useCallback(
    (snapshot: SymbolHistorySnapshot) => {
      setSymbols(cloneSymbolsSnapshot(snapshot.symbols));
      setSelectedSymbolId(snapshot.selectedSymbolId);
      setSelectedSymbolIds(
        snapshot.selectedSymbolIds ??
          (snapshot.selectedSymbolId ? [snapshot.selectedSymbolId] : []),
      );
      setHasUnsavedChanges(true);
    },
    [setHasUnsavedChanges, setSelectedSymbolId, setSelectedSymbolIds, setSymbols],
  );

  const executeSymbolsCommand = useCallback(
    (
      label: string,
      before: SymbolHistorySnapshot,
      after: SymbolHistorySnapshot,
      statusMessage: string,
    ): boolean => {
      if (areSymbolSnapshotsEqual(before.symbols, after.symbols)) {
        return false;
      }

      const beforeSnapshot: SymbolHistorySnapshot = {
        symbols: cloneSymbolsSnapshot(before.symbols),
        selectedSymbolId: before.selectedSymbolId,
        selectedSymbolIds:
          before.selectedSymbolIds ??
          (before.selectedSymbolId ? [before.selectedSymbolId] : []),
      };
      const afterSnapshot: SymbolHistorySnapshot = {
        symbols: cloneSymbolsSnapshot(after.symbols),
        selectedSymbolId: after.selectedSymbolId,
        selectedSymbolIds:
          after.selectedSymbolIds ??
          (after.selectedSymbolId ? [after.selectedSymbolId] : []),
      };

      undoRedoServiceRef.current.execute(
        createActionCommand(
          label,
          () => applySymbolsSnapshot(afterSnapshot),
          () => applySymbolsSnapshot(beforeSnapshot),
        ),
      );
      refreshHistoryState();
      showTemporaryStatus(statusMessage);
      return true;
    },
    [applySymbolsSnapshot, refreshHistoryState, showTemporaryStatus],
  );

  const handleUndo = useCallback(() => {
    const label = undoRedoServiceRef.current.undoLabel;
    if (!undoRedoServiceRef.current.undo()) return;
    refreshHistoryState();
    showTemporaryStatus(label ? `Cofnieto: ${label}` : 'Cofnieto');
  }, [refreshHistoryState, showTemporaryStatus]);

  const handleRedo = useCallback(() => {
    const label = undoRedoServiceRef.current.redoLabel;
    if (!undoRedoServiceRef.current.redo()) return;
    refreshHistoryState();
    showTemporaryStatus(label ? `Ponowiono: ${label}` : 'Ponowiono');
  }, [refreshHistoryState, showTemporaryStatus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const withCmd = event.ctrlKey || event.metaKey;
      const wantsUndo = withCmd && key === 'z' && !event.shiftKey;
      const wantsRedo = withCmd && (key === 'y' || (key === 'z' && event.shiftKey));
      if (!wantsUndo && !wantsRedo) return;
      event.preventDefault();
      if (wantsUndo) handleUndo();
      else handleRedo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    undoRedoServiceRef,
    dragHistorySnapshotRef,
    draggedSymbolIdsRef,
    get canUndo() { return undoRedoServiceRef.current.canUndo; },
    get canRedo() { return undoRedoServiceRef.current.canRedo; },
    get undoLabel() { return undoRedoServiceRef.current.undoLabel; },
    get redoLabel() { return undoRedoServiceRef.current.redoLabel; },
    refreshHistoryState,
    executeSymbolsCommand,
    handleUndo,
    handleRedo,
  };
}
