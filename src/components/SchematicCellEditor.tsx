import { useEffect, useRef } from "react";
import type { ViewportState } from "../lib/schematic/schematicViewportController";
import type { SchematicCellRect, SchematicEditableField } from "../lib/schematic/schematicCellEdit";

export interface EditingCell {
  symbolId: string;
  field: SchematicEditableField;
  initialValue: string;
  value: string;
  rect: SchematicCellRect;
}

interface SchematicCellEditorProps {
  editingCell: EditingCell;
  viewport: ViewportState;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function SchematicCellEditor({
  editingCell,
  viewport,
  onChange,
  onCommit,
  onCancel,
}: SchematicCellEditorProps) {
  const editorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      editor.focus();
      const caret = editor.value.length;
      editor.setSelectionRange(caret, caret);
    });
  }, []);

  const position = getEditorPosition(editingCell.rect, viewport);

  return (
    <input
      ref={editorRef}
      className="schematic-cell-editor"
      value={editingCell.value}
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
        fontSize: position.fontSize,
        padding: `${position.paddingY}px ${position.paddingX}px`,
        lineHeight: `${position.lineHeight}px`,
      }}
      onChange={(event) => onChange(event.currentTarget.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          onCommit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
    />
  );
}

function getEditorPosition(
  rect: SchematicCellRect,
  viewport: ViewportState,
): {
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  lineHeight: number;
} {
  // We need to implement worldToScreen logic directly or import it
  // Actually, import it from schematicViewportController
  // The import will be: import { worldToScreen } from "../lib/schematic/schematicViewportController"
  // Wait, I can't import worldToScreen if I only imported its type. I'll fix the import.
  const left = (rect.x + viewport.panX) * viewport.zoom;
  const top = (rect.y + viewport.panY) * viewport.zoom;
  
  const height = rect.height * viewport.zoom;
  const fontSize = Math.max(10.5, Math.min(11.5 * viewport.zoom, height * 0.62));

  return {
    left,
    top,
    width: rect.width * viewport.zoom,
    height,
    fontSize,
    paddingX: Math.max(6, 8 * viewport.zoom),
    paddingY: Math.max(2, 3 * viewport.zoom),
    lineHeight: fontSize,
  };
}
