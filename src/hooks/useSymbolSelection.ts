import { useCallback } from 'react';
import type { RightTab } from '../lib/appHelpers';

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

interface UseSymbolSelectionParams {
  selectedSymbolIds: string[];
  setSelectedSymbolIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedSymbolId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveRightTab: (tab: RightTab) => void;
}

export function useSymbolSelection({
  selectedSymbolIds,
  setSelectedSymbolIds,
  setSelectedSymbolId,
  setActiveRightTab,
}: UseSymbolSelectionParams) {
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

  return {
    handleSymbolSelect,
    handleSymbolSelectionChange,
  };
}
