import { useCallback } from 'react';
import {
  applyBalancePlan,
  autoBalancePhases,
  calculateTotalDistribution,
  type BalanceMode,
  type BalanceScope,
} from '../lib/phaseDistribution/phaseDistributionCalculator';
import type { SymbolHistorySnapshot } from '../lib/appHelpers';
import type { PhaseAssignment, SymbolItem } from '../types/symbolItem';

export type BalanceChangeDetail = {
  id: string;
  label: string;
  fromPhase: string;
  toPhase: string;
};

export type BalanceSeverity = 'improved' | 'neutral' | 'worse';

interface UsePhaseBalanceActionsParams {
  symbols: SymbolItem[];
  selectedSymbolId: string | null;
  selectedSymbolIds: string[];
  powerFactor: number;
  executeSymbolsCommand: (
    label: string,
    before: SymbolHistorySnapshot,
    after: SymbolHistorySnapshot,
    statusMessage: string,
  ) => boolean;
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;
}

export function usePhaseBalanceActions({
  symbols,
  selectedSymbolId,
  selectedSymbolIds,
  powerFactor,
  executeSymbolsCommand,
  showTemporaryStatus,
}: UsePhaseBalanceActionsParams) {
  const handleAutoBalance = useCallback(
    (mode: BalanceMode, scope: BalanceScope, previewOnly = false) => {
      const distributionBefore = calculateTotalDistribution(symbols, powerFactor);
      const plan = autoBalancePhases(symbols, mode, scope);
      const applied = applyBalancePlan(symbols, plan);
      const distributionAfter = calculateTotalDistribution(applied.symbols, powerFactor);
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
    [executeSymbolsCommand, powerFactor, selectedSymbolId, selectedSymbolIds, showTemporaryStatus, symbols],
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

      const distributionBefore = calculateTotalDistribution(symbols, powerFactor);
      const nextSymbols = symbols.map((symbol) =>
        symbol.id === symbolId
          ? { ...symbol, phase: toPhase as PhaseAssignment }
          : symbol,
      );
      const distributionAfter = calculateTotalDistribution(nextSymbols, powerFactor);
      const label = target.referenceDesignation || target.circuitName || target.label || target.id;
      const message = `Przeniesiono ${label}: ${target.phase} -> ${toPhase}. Asymetria ${distributionBefore.imbalancePercent.toFixed(1)}% -> ${distributionAfter.imbalancePercent.toFixed(1)}%.`;

      executeSymbolsCommand(
        "Sugestia bilansu faz",
        { symbols, selectedSymbolId, selectedSymbolIds },
        { symbols: nextSymbols, selectedSymbolId, selectedSymbolIds },
        message,
      );
    },
    [executeSymbolsCommand, powerFactor, selectedSymbolId, selectedSymbolIds, showTemporaryStatus, symbols],
  );

  return {
    handleAutoBalance,
    handleApplyPhaseMoveSuggestion,
  };
}
