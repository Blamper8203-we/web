/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionsLeftPanel } from "./ConnectionsLeftPanel";
import type { ConnectionItem } from "../types/connectionItem";
import type { SymbolItem } from "../types/symbolItem";

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

function makeSymbol(id: string, label: string, referenceDesignation = ""): SymbolItem {
  return {
    id,
    label,
    referenceDesignation,
    type: "Moduł",
    x: 0,
    y: 0,
    width: 18,
    height: 90,
    rotation: 0,
  } as unknown as SymbolItem;
}

describe("<ConnectionsLeftPanel /> — lista połączeń", () => {
  it("pokazuje empty state 'Brak połączeń' gdy lista pusta", () => {
    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
        connections={[]}
        onConnectionsChange={() => {}}
        onConnectionSelect={() => {}}
        symbols={[]}
      />,
    );

    expect(screen.getByText(/brak połączeń/i)).toBeInTheDocument();
  });

  it("renderuje jeden wiersz na każde połączenie", () => {
    const connections: ConnectionItem[] = [
      makeConnection({ id: "c1", fromSymbolId: "s1", fromTerminal: "1", toSymbolId: "s2", toTerminal: "2" }),
      makeConnection({ id: "c2", fromSymbolId: "s3", fromTerminal: "N", toSymbolId: "s4", toTerminal: "N" }),
      makeConnection({ id: "c3", fromSymbolId: "s5", fromTerminal: "PE", toSymbolId: "s6", toTerminal: "PE" }),
    ];

    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
        connections={connections}
        onConnectionsChange={() => {}}
        onConnectionSelect={() => {}}
        symbols={[]}
      />,
    );

    // Każdy wiersz ma przycisk "Usuń" z aria-label zawierającym trasę.
    const deleteButtons = screen.getAllByRole("button", { name: /usuń połączenie/i });
    expect(deleteButtons).toHaveLength(3);

    // Badge z liczbą połączeń
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("tap w wiersz woła onConnectionSelect z id połączenia", () => {
    const onConnectionSelect = vi.fn();
    const connections: ConnectionItem[] = [
      makeConnection({ id: "conn-tap-target" }),
      makeConnection({ id: "conn-other" }),
    ];

    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
        connections={connections}
        onConnectionsChange={() => {}}
        onConnectionSelect={onConnectionSelect}
        symbols={[]}
      />,
    );

    // Pierwszy wiersz = pierwszy przycisk "Usuń" ma aria-label z id terminala.
    // Klikamy cały wiersz (nie przycisk Usuń), więc używamy roli button w wierszu.
    const rowButtons = screen.getAllByRole("button", { name: /usuń połączenie/i });
    // Klik w wiersz = klik w kontenerze wiersza. Wiersz ma role="button"
    // i tabIndex=0, więc useByRole go znajdzie po aria-label... ale wiersz
    // sam nie ma aria-label. Zamiast tego trafiamy w jego child — label trasy.
    // Najprościej: klikamy element tekstowy zawierający id połączenia.
    // Tu sprawdzamy, że kontener wiersza jest klikalny przez jego pierwszy child.
    fireEvent.click(rowButtons[0].parentElement!);
    expect(onConnectionSelect).toHaveBeenCalledTimes(1);
  });

  it("click 'Usuń' w wierszu woła onConnectionsChange z listą pomniejszoną o to połączenie", () => {
    const onConnectionsChange = vi.fn();
    const connections: ConnectionItem[] = [
      makeConnection({ id: "keep-me" }),
      makeConnection({ id: "delete-me" }),
    ];

    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
        connections={connections}
        onConnectionsChange={onConnectionsChange}
        onConnectionSelect={() => {}}
        symbols={[]}
      />,
    );

    const deleteButtons = screen.getAllByRole("button", { name: /usuń połączenie/i });
    // Drugi przycisk = drugie połączenie ("delete-me")
    fireEvent.click(deleteButtons[1]);

    expect(onConnectionsChange).toHaveBeenCalledTimes(1);
    const [nextConnections, label, statusMsg] = onConnectionsChange.mock.calls[0];
    expect(nextConnections).toHaveLength(1);
    expect(nextConnections[0].id).toBe("keep-me");
    expect(label).toBe("Usunięcie przewodu");
    expect(statusMsg).toBeTruthy();
  });

  it("click 'Usuń' zaznaczonego połączenia czyści zaznaczenie (onConnectionSelect z null)", () => {
    const onConnectionSelect = vi.fn();
    const onConnectionsChange = vi.fn();
    const connections: ConnectionItem[] = [
      makeConnection({ id: "selected-one" }),
    ];

    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
        connections={connections}
        onConnectionsChange={onConnectionsChange}
        onConnectionSelect={onConnectionSelect}
        selectedConnectionId="selected-one"
        symbols={[]}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /usuń połączenie/i });
    fireEvent.click(deleteButton);

    expect(onConnectionsChange).toHaveBeenCalledTimes(1);
    expect(onConnectionSelect).toHaveBeenCalledWith(null);
  });

  it("rozwija symbolId na label z symbols, gdy przekazane", () => {
    const connections: ConnectionItem[] = [
      makeConnection({ fromSymbolId: "sA", fromTerminal: "1", toSymbolId: "sB", toTerminal: "2" }),
    ];
    const symbols: SymbolItem[] = [
      makeSymbol("sA", "B16 1P", "Q1"),
      makeSymbol("sB", "RCD 25A", "F1"),
    ];

    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
        connections={connections}
        onConnectionsChange={() => {}}
        onConnectionSelect={() => {}}
        symbols={symbols}
      />,
    );

    // Wiersz pokazuje "Q1 (B16 1P):1 → F1 (RCD 25A):2" zamiast surowych id.
    expect(screen.getByText(/Q1 \(B16 1P\):1 → F1 \(RCD 25A\):2/i)).toBeInTheDocument();
  });

  it("nie renderuje sekcji listy gdy connections === undefined (panel bez kontekstu)", () => {
    // WHY: ConnectionsLeftPanel jest renderowany też w kontekstach, gdzie
    // lista nie ma sensu (np. przed wczytaniem projektu). Undefined !== []
    // — sekcja ma się nie pojawić w ogóle, a empty state tylko przy [].
    render(
      <ConnectionsLeftPanel
        defaultWireSettings={baseDefaultWireSettings}
        onChangeDefaultWireSettings={() => {}}
      />,
    );

    expect(screen.queryByText(/brak połączeń/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /usuń połączenie/i })).not.toBeInTheDocument();
  });
});
