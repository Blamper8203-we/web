import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UndoRedoService, createActionCommand } from '../lib/editing/undoRedoService';
import {
  areSymbolSnapshotsEqual,
  cloneSymbolsSnapshot,
  isEditableShortcutTarget,
  type SymbolHistorySnapshot,
} from '../lib/appHelpers';
import type { SymbolItem } from '../types/symbolItem';
import type { ConnectionItem } from '../types/connectionItem';

interface UseSymbolHistoryParams {
  symbols?: SymbolItem[]; // optional, kept for reference
  connections: ConnectionItem[];
  setSymbols: React.Dispatch<React.SetStateAction<SymbolItem[]>>;
  setConnections: React.Dispatch<React.SetStateAction<ConnectionItem[]>>;
  setSelectedSymbolId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSymbolIds: React.Dispatch<React.SetStateAction<string[]>>;
  setHasUnsavedChanges: (value: boolean) => void;
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;
}

function areConnectionsEqual(first: ConnectionItem[] | undefined, second: ConnectionItem[] | undefined): boolean {
  if (!first || !second) return first === second;
  if (first.length !== second.length) return false;
  for (let i = 0; i < first.length; i++) {
    const a = first[i];
    const b = second[i];
    if (
      a.id !== b.id ||
      a.fromSymbolId !== b.fromSymbolId ||
      a.fromTerminal !== b.fromTerminal ||
      a.toSymbolId !== b.toSymbolId ||
      a.toTerminal !== b.toTerminal ||
      a.wireColor !== b.wireColor ||
      a.wireCrossSection !== b.wireCrossSection ||
      a.wireType !== b.wireType ||
      a.routingMode !== b.routingMode ||
      a.customOffset !== b.customOffset ||
      a.customOffsetX !== b.customOffsetX ||
      a.customOffsetY1 !== b.customOffsetY1 ||
      a.customOffsetY2 !== b.customOffsetY2 ||
      a.isFromTop !== b.isFromTop ||
      a.isToTop !== b.isToTop ||
      a.customRadius !== b.customRadius ||
      a.ferruleColor !== b.ferruleColor ||
      a.fromDirection !== b.fromDirection ||
      a.toDirection !== b.toDirection
    ) {
      return false;
    }
    
    // Porównaj punkty (jeśli istnieją)
    if (a.points && b.points) {
      if (a.points.length !== b.points.length) return false;
      for (let j = 0; j < a.points.length; j++) {
        if (a.points[j].x !== b.points[j].x || a.points[j].y !== b.points[j].y) {
          return false;
        }
      }
    } else if (a.points !== b.points) {
      // Jeden ma punkty, a drugi nie
      return false;
    }
  }
  return true;
}

export function useSymbolHistory({
  connections,
  setSymbols,
  setConnections,
  setSelectedSymbolId,
  setSelectedSymbolIds,
  setHasUnsavedChanges,
  showTemporaryStatus,
}: UseSymbolHistoryParams) {
  const connectionsRef = useRef(connections);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

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
      if (snapshot.connections) {
        setConnections(snapshot.connections.map((c) => ({ ...c })));
      }
      setSelectedSymbolId(snapshot.selectedSymbolId);
      setSelectedSymbolIds(
        snapshot.selectedSymbolIds ??
          (snapshot.selectedSymbolId ? [snapshot.selectedSymbolId] : []),
      );
      setHasUnsavedChanges(true);
    },
    [setHasUnsavedChanges, setSelectedSymbolId, setSelectedSymbolIds, setSymbols, setConnections],
  );

  const executeSymbolsCommand = useCallback(
    (
      label: string,
      before: SymbolHistorySnapshot,
      after: SymbolHistorySnapshot,
      statusMessage: string,
    ): boolean => {
      const currentConnections = connectionsRef.current;
      const effectiveBeforeConnections = before.connections ?? currentConnections;
      const effectiveAfterConnections = after.connections ?? currentConnections;

      if (
        areSymbolSnapshotsEqual(before.symbols, after.symbols) &&
        areConnectionsEqual(effectiveBeforeConnections, effectiveAfterConnections)
      ) {
        return false;
      }

      const beforeSnapshot: SymbolHistorySnapshot = {
        symbols: cloneSymbolsSnapshot(before.symbols),
        connections: effectiveBeforeConnections.map((c) => ({ ...c })),
        selectedSymbolId: before.selectedSymbolId,
        selectedSymbolIds:
          before.selectedSymbolIds ??
          (before.selectedSymbolId ? [before.selectedSymbolId] : []),
      };
      const afterSnapshot: SymbolHistorySnapshot = {
        symbols: cloneSymbolsSnapshot(after.symbols),
        connections: effectiveAfterConnections.map((c) => ({ ...c })),
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
    showTemporaryStatus(label ? `Cofnięto: ${label}` : 'Cofnięto');
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

  return useMemo(
    () => ({
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
    }),
    [refreshHistoryState, executeSymbolsCommand, handleUndo, handleRedo],
  );
}
