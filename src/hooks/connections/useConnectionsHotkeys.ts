import { useEffect, type RefObject } from "react";
import type { ConnectionItem } from "../../types/connectionItem";
import type { SymbolItem } from "../../types/symbolItem";
import { findTerminalByName, getSymbolTerminals } from "../../lib/modules/moduleTerminals";
import type { DrawingState } from "./useConnectionsDrawing";

export interface UseConnectionsHotkeysProps {
  svgRef: RefObject<SVGSVGElement | null>;
  zoomAround: (clientX: number, clientY: number, factor: number) => void;
  drawingState: DrawingState | null;
  cancelDrawing: () => void;
  selectedConnectionId: string | null;
  localConnections: ConnectionItem[];
  symbols: SymbolItem[];
  onConnectionsChange: (conns: ConnectionItem[], reason: string, description: string) => void;
  onConnectionSelect: (id: string | null) => void;
}

export function useConnectionsHotkeys({
  svgRef,
  zoomAround,
  drawingState,
  cancelDrawing,
  selectedConnectionId,
  localConnections,
  symbols,
  onConnectionsChange,
  onConnectionSelect,
}: UseConnectionsHotkeysProps) {
  // Native wheel handler for zoom centering
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = 1.08;
      const zoomFactor = e.deltaY < 0 ? scaleFactor : 1 / scaleFactor;
      zoomAround(e.clientX, e.clientY, zoomFactor);
    };

    svg.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      svg.removeEventListener("wheel", handleWheelNative);
    };
  }, [zoomAround, svgRef]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Anuluj rysowanie
      if (e.code === "Escape" && drawingState) {
        cancelDrawing();
        return;
      }
      // Toggle selected connection's direction with Space
      if (e.code === "Space" && selectedConnectionId && !drawingState) {
        e.preventDefault();
        const conn = localConnections.find((c) => c.id === selectedConnectionId);
        if (conn) {
          const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
          let fallbackIsToTop = true;
          if (toSymbol) {
            const hs = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);
            if (hs) fallbackIsToTop = hs.isTop;
          }
          const currentIsToTop = conn.isToTop ?? fallbackIsToTop;
          const updated = localConnections.map((c) => {
            if (c.id === selectedConnectionId) {
              return { ...c, isToTop: !currentIsToTop };
            }
            return c;
          });
          onConnectionsChange(updated, "Zmień kierunek podłączenia", "Zmieniono kierunek wejścia przewodu");
        }
        return;
      }
      // Delete selected connection
      if ((e.key === "Delete" || e.key === "Backspace") && selectedConnectionId) {
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.hasAttribute("contenteditable")
        ) {
          return;
        }
        const updatedConnections = localConnections.filter((c) => c.id !== selectedConnectionId);
        onConnectionSelect(null);
        onConnectionsChange(updatedConnections, "Usuń połączenie", "Usunięto połączenie przewodem");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedConnectionId, localConnections, onConnectionsChange, onConnectionSelect, drawingState, symbols, cancelDrawing]);
}
