/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DinRailDrawingActions } from "./DinRailDrawingActions";

// WHY: HUD "Anuluj / Cofnij punkt" jest jedyną drogą anulowania/cofania
// rysowania przewodu na mobile (brak klawiatury → brak Escape; brak prawokliku
// → brak cofnięcia punktu). Testy pinują:
//   - render obu przycisków
//   - "Cofnij punkt" jest disabled, gdy explicitPointsCount === 0 (nie ma
//     czego cofać — pierwszy załamanek jeszcze nie postawiony)
//   - klik woła właściwy callback
// Patrz docs/distribution-roadmap-notes/mobile-connections-review.md §4 faza 4.

describe("<DinRailDrawingActions />", () => {
  it("renderuje przyciski 'Cofnij punkt' i 'Anuluj'", () => {
    render(
      <DinRailDrawingActions
        explicitPointsCount={2}
        onUndoPoint={() => {}}
        onCancelDrawing={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /cofnij ostatni punkt trasy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anuluj rysowanie przewodu/i })).toBeInTheDocument();
  });

  it("'Cofnij punkt' jest disabled, gdy explicitPointsCount === 0", () => {
    // WHY: przy 0 postawionych załamków nie ma czego cofnąć — pierwszy punkt
    // trasy powstaje dopiero w handlePointerDown. Disabled zapobiega
    // wywołaniu onUndoPoint z pustej listy (slice(0, -1) na [] daje []).
    render(
      <DinRailDrawingActions
        explicitPointsCount={0}
        onUndoPoint={() => {}}
        onCancelDrawing={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /cofnij ostatni punkt trasy/i })).toBeDisabled();
  });

  it("'Cofnij punkt' jest enabled, gdy explicitPointsCount > 0", () => {
    render(
      <DinRailDrawingActions
        explicitPointsCount={1}
        onUndoPoint={() => {}}
        onCancelDrawing={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /cofnij ostatni punkt trasy/i })).toBeEnabled();
  });

  it("klik 'Cofnij punkt' woła onUndoPoint", () => {
    const onUndoPoint = vi.fn();
    render(
      <DinRailDrawingActions
        explicitPointsCount={3}
        onUndoPoint={onUndoPoint}
        onCancelDrawing={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cofnij ostatni punkt trasy/i }));
    expect(onUndoPoint).toHaveBeenCalledTimes(1);
  });

  it("klik 'Anuluj' woła onCancelDrawing niezależnie od liczby punktów", () => {
    const onCancelDrawing = vi.fn();
    const { rerender } = render(
      <DinRailDrawingActions
        explicitPointsCount={0}
        onUndoPoint={() => {}}
        onCancelDrawing={onCancelDrawing}
      />,
    );

    // Anuluj musi działać nawet przy 0 punktów (user dotknął hotspot, ale
    // nic jeszcze nie postawił — chce wyjść z trybu rysowania).
    fireEvent.click(screen.getByRole("button", { name: /anuluj rysowanie przewodu/i }));
    expect(onCancelDrawing).toHaveBeenCalledTimes(1);

    rerender(
      <DinRailDrawingActions
        explicitPointsCount={5}
        onUndoPoint={() => {}}
        onCancelDrawing={onCancelDrawing}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /anuluj rysowanie przewodu/i }));
    expect(onCancelDrawing).toHaveBeenCalledTimes(2);
  });
});
