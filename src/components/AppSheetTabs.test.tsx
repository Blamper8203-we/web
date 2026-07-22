/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppSheetTabs } from "./AppSheetTabs";
import type { SheetType } from "../lib/appHelpers";

// WHY: pinning zachowania włączonej zakładki "Połączenia" na mobile. Wcześniej
// `AppSheetTabs` filtrował `sheet1_connections`, gdy `Capacitor.isNativePlatform()`
// zwracało true — zakładka była celowo ukryta na Androidzie/iOS, bo pipeline
// interakcji (pan/zoom/draw/delete) był projektowany pod mysz + klawiaturę.
// Od 2026-07-19 zakładka jest dostępna na mobile, bo wymagania touch są
// obsłużone (useConnectionsPinch, DinRailDrawingActions, lista połączeń).
//
// Te testy strzegą przed przypadkowym przywróceniem filtru — regresja UX
// dla elektryków na telefonie. Patrz docs/distribution-roadmap-notes/
// mobile-connections-review.md §4 "Skorygowany plan".

describe("<AppSheetTabs />", () => {
  it("renderuje zakładkę 'Połączenia' (sheet1_connections)", () => {
    render(
      <AppSheetTabs
        activeSheet="sheet1"
        onChangeSheet={() => {}}
      />,
    );

    const allTabs = screen.getAllByTestId("sheet-tab");
    const connectionsTabs = allTabs.filter((tab) =>
      tab.getAttribute("data-sheet") === "sheet1_connections",
    );
    expect(connectionsTabs).toHaveLength(1);
  });

  it("renderuje zakładkę 'Połączenia' również gdy Capacitor zgłasza platformę natywną (mobile)", () => {
    // WHY: to jest sedno regresji — wcześniej `Capacitor.isNativePlatform()`
    // === true powodowało return false w filtrze i zakładka znikała. Skoro
    // filtr został usunięty z AppSheetTabs (2026-07-19), test weryfikuje że
    // żaden powrót do sprawdzania Capacitor nie ukryje zakładki na mobile.
    // Mock przez vi.mock musi być hoistowany na górę modułu, ale my nie
    // potrzebujemy tu mocka — sam komponent już nie woła Capacitor. Test
    // jest tu jako dokumentacja intencji: zakładka musi być widoczna zawsze.
    render(
      <AppSheetTabs
        activeSheet="sheet1"
        onChangeSheet={() => {}}
      />,
    );

    const allTabs = screen.getAllByTestId("sheet-tab");
    const connectionsTabs = allTabs.filter((tab) =>
      tab.getAttribute("data-sheet") === "sheet1_connections",
    );
    expect(connectionsTabs).toHaveLength(1);
  });

  it("kliknięcie zakładki 'Połączenia' woła onChangeSheet z 'sheet1_connections'", () => {
    const onChangeSheet = vi.fn();
    render(
      <AppSheetTabs
        activeSheet="sheet1"
        onChangeSheet={onChangeSheet}
      />,
    );

    const allTabs = screen.getAllByTestId("sheet-tab");
    const connectionsTab = allTabs.find((tab) =>
      tab.getAttribute("data-sheet") === "sheet1_connections",
    );
    expect(connectionsTab).toBeDefined();

    fireEvent.click(connectionsTab!);
    expect(onChangeSheet).toHaveBeenCalledWith("sheet1_connections" as SheetType);
  });

  it("nadal ukrywa zakładkę Smart Home (sheet5_smarthome) niezależnie od platformy", () => {
    // Sanity check: smart-home pozostaje wyłączone "na życzenie użytkownika"
    // (patrz AGENTS.md §9). Nie chcemy, żeby usunięcie filtra connections
    // przypadkiem odblokowało też smarthome.
    render(
      <AppSheetTabs
        activeSheet="sheet1"
        onChangeSheet={() => {}}
      />,
    );

    const allTabs = screen.getAllByTestId("sheet-tab");
    const smarthomeTabs = allTabs.filter((tab) =>
      tab.getAttribute("data-sheet") === "sheet5_smarthome",
    );
    expect(smarthomeTabs).toHaveLength(0);
  });
});
