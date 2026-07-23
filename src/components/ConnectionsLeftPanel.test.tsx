/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionsLeftPanel } from "./ConnectionsLeftPanel";
import type { ConnectionItem } from "../types/connectionItem";

// WHY: lista połączeń w ConnectionsLeftPanel rozwiązuje show-stopper
// mobile-connections-review §3.2.3 — na mobile trafienie palcem w cienką
// linię przewodu SVG jest loterią. Tap w wiersz listy = select, przycisk
// "Usuń" = delete. Testy pinują:
//   - empty state przy 0 połączeń (AGENTS.md "Empty state test")
//   - render N wierszy dla N połączeń
//   - tap w wiersz woła onConnectionSelect z właściwym id
//   - click "Usuń" woła onConnectionsChange z N-1 połączeniami
//   - wiersz zaznaczony dostaje podświetlenie (aria-pressed / aktywna klasa)
// Patrz docs/distribution-roadmap-notes/mobile-connections-review.md §4 faza 5.

const baseDefaultWireSettings = {
  wireColor: "black" as const,
  wireCrossSection: 2.5,
  wireType: "LgY" as const,
  routingMode: "orthogonal" as const,
  ferruleColor: "white" as const,
};

function makeConnection(overrides: Partial<ConnectionItem> = {}): ConnectionItem {
  return {
    id: "conn-1",
    fromSymbolId: "sym-A",
    fromTerminal: "1",
    toSymbolId: "sym-B",
    toTerminal: "2",
    wireColor: "black",
    wireCrossSection: 2.5,
    wireType: "LgY",
    routingMode: "orthogonal",
    ...overrides,
  };
}



describe("<ConnectionsLeftPanel />", () => {
  it("renderuje nagłówek panelu i ustawienia nowego przewodu", () => {
    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
      />,
    );

    expect(screen.getByText("Tryb przewodnika")).toBeInTheDocument();
    expect(screen.getByText(/ustawienia nowego przewodu/i)).toBeInTheDocument();
  });

  it("wywołuje onChangeDefaultWireSettings po zmianie koloru izolacji", () => {
    const onChangeDefaultWireSettings = vi.fn();
    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={onChangeDefaultWireSettings}
      />,
    );

    const blueColorButton = screen.getByTitle(/Niebieski/i);
    fireEvent.click(blueColorButton);

    expect(onChangeDefaultWireSettings).toHaveBeenCalledWith(
      expect.objectContaining({ wireColor: "blue" }),
    );
  });

  it("nie renderuje listy połączeń (została usunięta z palety na życzenie)", () => {
    const connections: ConnectionItem[] = [
      makeConnection({ id: "c1", fromSymbolId: "s1", fromTerminal: "1", toSymbolId: "s2", toTerminal: "2" }),
    ];

    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
        connections={connections}
      />,
    );

    expect(screen.queryByText(/brak połączeń/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /usuń połączenie/i })).not.toBeInTheDocument();
  });
});
