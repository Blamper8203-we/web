import { AppIcon } from "../AppIcon";

/**
 * HUD z akcjami dla aktywnego trybu rysowania przewodu (rubber-band preview).
 *
 * Renderowany tylko, gdy `drawingState !== null` (user dotknął hotspotu i
 * prowadzi przewód do drugiego terminalu). Dwa przyciski:
 *
 *  - "Cofnij punkt" — zdejmuje ostatni explicitPoint (odpowiednik prawokliku
 *    na desktopie, patrz `useConnectionsMutations.handlePointerDown` gałąź
 *    `e.button === 2`). Na mobile prawoklik nie istnieje, więc jedyną drogą
 *    cofnięcia ostatniego załamka trasy byłby Escape — a klawiatury na
 *    telefonie nie ma.
 *
 *  - "Anuluj" — przerywa cały draw (delegacja do `useConnectionsDrawing.
 *    cancelDrawing`). Odpowiednik Escape na desktopie.
 *
 * WHY mobile-first, ale działa też na desktop: HUD pojawia się zawsze przy
 * aktywnym draw, więc odkrycie akcji "anuluj" nie wymaga zgadywania, że
 * trzeba wcisnąć Escape. Na desktop Escape dalej działa (patrz
 * `useConnectionsHotkeys`), ten HUD go tylko uzupełnia.
 *
 * Pozycjonowanie: floating bottom-center, nakładka nad SVG. Spójne z
 * `SchematicZoomDock` (top-right) i `drawingWarning` (top-center) — nie
 * pokrywa się z żadnym z nich wizualnie.
 */
export interface DinRailDrawingActionsProps {
  /** Liczba postawionych już załamków trasy. Gdy 0 — "Cofnij punkt" wyłączony. */
  explicitPointsCount: number;
  /** Cofnij ostatni załamanek trasy. */
  onUndoPoint: () => void;
  /** Przerwij cały draw (czyści drawingState + explicitPoints). */
  onCancelDrawing: () => void;
}

export function DinRailDrawingActions({
  explicitPointsCount,
  onUndoPoint,
  onCancelDrawing,
}: DinRailDrawingActionsProps) {
  const canUndo = explicitPointsCount > 0;

  return (
    <div
      className="workspace-hud workspace-hud--bottom-center"
      role="toolbar"
      aria-label="Akcje rysowania przewodu"
      style={{
        position: "absolute",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        gap: "8px",
        padding: "6px",
        background: "var(--bg-card, #1a1d22)",
        borderRadius: "10px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
        border: "1px solid var(--panel-border, rgba(255, 255, 255, 0.08))",
      }}
    >
      <button
        type="button"
        className="workspace-tool-btn"
        onClick={onUndoPoint}
        disabled={!canUndo}
        aria-label="Cofnij ostatni punkt trasy"
        title="Cofnij ostatni punkt trasy"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          background: canUndo ? "transparent" : "rgba(255, 255, 255, 0.03)",
          color: canUndo ? "var(--text-main, #f8fafc)" : "var(--text-tertiary, #6c7280)",
          border: "1px solid var(--panel-border, rgba(255, 255, 255, 0.08))",
          borderRadius: "6px",
          cursor: canUndo ? "pointer" : "not-allowed",
          fontSize: "12px",
          fontWeight: 600,
          fontFamily: "Inter, Roboto, sans-serif",
        }}
      >
        <AppIcon name="undo" size={15} />
        <span>Cofnij punkt</span>
      </button>
      <button
        type="button"
        className="workspace-tool-btn"
        onClick={onCancelDrawing}
        aria-label="Anuluj rysowanie przewodu"
        title="Anuluj rysowanie przewodu"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          background: "rgba(239, 68, 68, 0.12)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 600,
          fontFamily: "Inter, Roboto, sans-serif",
        }}
      >
        <AppIcon name="close" size={15} />
        <span>Anuluj</span>
      </button>
    </div>
  );
}
