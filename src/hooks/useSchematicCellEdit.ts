import { useState, useCallback, useRef, useEffect } from "react";
import type { EditingCell } from "../components/SchematicCellEditor";
import { findSchematicCellAt, getSchematicCellValue } from "../lib/schematic/schematicCellEdit";
import type { SymbolItem } from "../types/symbolItem";

import type { SchematicEditableField } from "../lib/schematic/schematicCellEdit";

export function useSchematicCellEdit(
  symbols: SymbolItem[],
  onCellEdit?: (symbolId: string, field: SchematicEditableField, value: string) => void,
  onSymbolSelect?: (symbolId: string) => void,
) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const editingCellRef = useRef<EditingCell | null>(null);

  useEffect(() => {
    editingCellRef.current = editingCell;
  }, [editingCell]);

  const beginCellEdit = useCallback(
    (hit: NonNullable<ReturnType<typeof findSchematicCellAt>>) => {
      const symbol = symbols.find((item) => item.id === hit.node.id);
      if (!symbol) {
        return false;
      }

      const value = getSchematicCellValue(symbol, hit.node, hit.field);
      const nextCell = {
        symbolId: symbol.id,
        field: hit.field,
        initialValue: value,
        value,
        rect: hit.rect,
      };

      editingCellRef.current = nextCell;
      setEditingCell(nextCell);
      onSymbolSelect?.(symbol.id);
      return true;
    },
    [onSymbolSelect, symbols],
  );

  const commitCellEdit = useCallback(() => {
    const current = editingCellRef.current;
    if (!current) {
      return;
    }

    editingCellRef.current = null;
    setEditingCell(null);

    if (current.value !== current.initialValue) {
      onCellEdit?.(current.symbolId, current.field, current.value);
    }
  }, [onCellEdit]);

  const cancelCellEdit = useCallback(() => {
    editingCellRef.current = null;
    setEditingCell(null);
  }, []);

  return {
    editingCell,
    setEditingCell,
    beginCellEdit,
    commitCellEdit,
    cancelCellEdit,
  };
}
