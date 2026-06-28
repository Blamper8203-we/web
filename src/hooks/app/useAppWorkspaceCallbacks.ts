import { useCallback } from 'react';
import type { SymbolItem } from '../../types/symbolItem';
import type { ConnectionItem } from '../../types/connectionItem';
import type { RcdManagerEntry } from '../../components/RcdManagementDialog';
import { applyRcdManagerUpdates } from '../../lib/circuitEdit/rcdManagerLogic';
import { applyValidationQuickFix, type ValidationQuickFixId } from '../../lib/validation/validationQuickFixes';
import type { SymbolHistorySnapshot } from '../../lib/appHelpers';

interface UseAppWorkspaceCallbacksParams {
  symbols: SymbolItem[];
  connections: ConnectionItem[];
  selectedSymbolId: string | null;
  selectedSymbolIds: string[];
  rcdManagerEntries: RcdManagerEntry[];

  setHighlightedCircuitEditTarget: React.Dispatch<React.SetStateAction<{ symbolId: string; fieldKey: string } | null>>;

  executeSymbolsCommand: (
    label: string,
    before: SymbolHistorySnapshot,
    after: SymbolHistorySnapshot,
    statusMessage: string,
  ) => boolean;
  handleSymbolSelectionChange: (ids: string[], primaryId: string | null) => void;
  handleCircuitEditSave: (nextSymbol: SymbolItem) => void;
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;

  // dialog hook setters/actions
  setIsRcdManagerOpen: (open: boolean) => void;
  // sheetPanel hook setters/actions
  setActiveSheet: (sheet: any) => void;
  setShowDinRailGroups: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useAppWorkspaceCallbacks({
  symbols,
  connections,
  selectedSymbolId,
  selectedSymbolIds,
  rcdManagerEntries,

  setHighlightedCircuitEditTarget,

  executeSymbolsCommand,
  handleSymbolSelectionChange,
  handleCircuitEditSave,
  showTemporaryStatus,

  setIsRcdManagerOpen,
  setActiveSheet,
  setShowDinRailGroups,
}: UseAppWorkspaceCallbacksParams) {
  const handleConnectionsChange = useCallback((
    nextConnections: ConnectionItem[],
    label: string,
    statusMessage: string
  ) => {
    executeSymbolsCommand(
      label,
      { symbols, connections, selectedSymbolId, selectedSymbolIds },
      { symbols, connections: nextConnections, selectedSymbolId, selectedSymbolIds },
      statusMessage
    );
  }, [executeSymbolsCommand, symbols, connections, selectedSymbolId, selectedSymbolIds]);

  const handleOpenRcdManager = useCallback(() => {
    if (rcdManagerEntries.length === 0) {
      showTemporaryStatus("Brak modułów RCD do konfiguracji", 3200);
      return;
    }

    setIsRcdManagerOpen(true);
  }, [rcdManagerEntries.length, showTemporaryStatus, setIsRcdManagerOpen]);

  const handleToggleDinRailGroups = useCallback(() => {
    setShowDinRailGroups((previous: boolean) => !previous);
  }, [setShowDinRailGroups]);

  const handleSaveRcdManager = useCallback(
    (entries: RcdManagerEntry[]) => {
      const nextSymbols = applyRcdManagerUpdates(symbols, entries);

      const changed = executeSymbolsCommand(
        "Zarządzanie RCD",
        { symbols, selectedSymbolId, selectedSymbolIds },
        { symbols: nextSymbols, selectedSymbolId, selectedSymbolIds },
        "Zapisano ustawienia RCD",
      );

      if (!changed) {
        showTemporaryStatus("Brak zmian w ustawieniach RCD", 2600);
      }

      setIsRcdManagerOpen(false);
    },
    [executeSymbolsCommand, setIsRcdManagerOpen, selectedSymbolId, selectedSymbolIds, showTemporaryStatus, symbols],
  );

  const handleValidationSymbolSelect = useCallback(
    (symbolId: string) => {
      setHighlightedCircuitEditTarget(null);
      setActiveSheet("sheet1");
      handleSymbolSelectionChange([symbolId], symbolId);
    },
    [handleSymbolSelectionChange, setActiveSheet, setHighlightedCircuitEditTarget],
  );

  const handleValidationFieldEdit = useCallback(
    (symbolId: string, fieldKey: string) => {
      setHighlightedCircuitEditTarget({ symbolId, fieldKey });
      setActiveSheet("sheet1");
      handleSymbolSelectionChange([symbolId], symbolId);
    },
    [handleSymbolSelectionChange, setActiveSheet, setHighlightedCircuitEditTarget],
  );

  const handleValidationQuickFix = useCallback(
    (symbolId: string, fixId: ValidationQuickFixId) => {
      const symbol = symbols.find((item) => item.id === symbolId);
      if (!symbol) {
        return;
      }

      const nextSymbol = applyValidationQuickFix(symbol, fixId);
      setHighlightedCircuitEditTarget(null);
      handleCircuitEditSave(nextSymbol);
      setActiveSheet("sheet1");
      handleSymbolSelectionChange([symbolId], symbolId);
    },
    [handleSymbolSelectionChange, setActiveSheet, handleCircuitEditSave, symbols, setHighlightedCircuitEditTarget],
  );

  return {
    handleConnectionsChange,
    handleOpenRcdManager,
    handleToggleDinRailGroups,
    handleSaveRcdManager,
    handleValidationSymbolSelect,
    handleValidationFieldEdit,
    handleValidationQuickFix,
  };
}
