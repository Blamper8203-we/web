import { useCallback, type MutableRefObject } from 'react';
import type { SymbolItem } from '../types/symbolItem';
import type { SymbolHistorySnapshot } from '../lib/appHelpers';
import { normalizeDinRailModuleOrdering, normalizeGroupConsistency } from '../lib/appHelpers';
import { applySchematicCellEditValue, type SchematicEditableField } from '../lib/schematic/schematicCellEdit';

interface UseSymbolEditingParams {
  symbolsRef: MutableRefObject<SymbolItem[]>;
  selectedSymbolId: string | null;
  selectedSymbolIds: string[];
  executeSymbolsCommand: (
    label: string,
    before: SymbolHistorySnapshot,
    after: SymbolHistorySnapshot,
    statusMessage: string,
  ) => boolean;
}

export function useSymbolEditing({
  symbolsRef,
  selectedSymbolId,
  selectedSymbolIds,
  executeSymbolsCommand,
}: UseSymbolEditingParams) {
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
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, symbolsRef],
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
    [executeSymbolsCommand, selectedSymbolId, selectedSymbolIds, symbolsRef],
  );

  return {
    handleCircuitEditSave,
    handleSchematicCellEdit,
  };
}
