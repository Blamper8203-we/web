/**
 * PowerBalancePage — phase-card fill bar scaling.
 *
 * WHY: the three phase cards (L1/L2/L3) render a horizontal fill bar that
 * must be scaled against the HEAVIEST phase, not against the sum of all
 * three. With an ideal 10/10/10 A balance the cards used to fill to 33%
 * each (max = 30 A), making a balanced installation look barely loaded.
 * With the fix, the same installation fills 100% on every card (max = 10 A)
 * and an asymmetric installation fills 100% on the heaviest phase.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PowerBalancePage } from "./PowerBalancePage";
import type { SymbolItem } from "../types/symbolItem";
import { createDefaultSymbolItem } from "../types/symbolItem";
import { createDefaultProjectMetadata } from "../lib/projectMetadata";

function makeMcb(id: string, powerW: number, phase: "L1" | "L2" | "L3"): SymbolItem {
  return createDefaultSymbolItem({
    id,
    deviceKind: "mcb",
    powerW,
    phase,
    circuitType: "Gniazdo",
    circuitName: `Obwod ${id}`,
  });
}

const noopHandlers = {
  onApplyBalance: vi.fn(),
  onApplyPhaseMove: vi.fn(),
};

describe("PowerBalancePage — phase card fill bar", () => {
  it("scales every card to 100% when phases are perfectly balanced", () => {
    // 3 × 1000 W = 1000 W per phase = ~4.83 A per phase (cosφ=0.9, U=230V).
    // Sum would be ~14.5 A (33% per card). Max is ~4.83 A → 100% per card.
    const symbols = [makeMcb("m1", 1000, "L1"), makeMcb("m2", 1000, "L2"), makeMcb("m3", 1000, "L3")];

    render(
      <PowerBalancePage
        symbols={symbols}
        metadata={createDefaultProjectMetadata()}
        {...noopHandlers}
      />,
    );

    const fills = screen.getAllByTestId("pb-phase-fill");
    expect(fills).toHaveLength(3);
    for (const fill of fills) {
      expect((fill as HTMLElement).style.width).toBe("100%");
    }
  });

  it("scales the heaviest phase to 100% and lighter phases proportionally when imbalanced", () => {
    // L1 = 3000 W → ~14.49 A (heaviest, 100%)
    // L2 = 2000 W → ~9.66 A (≈ 66.7% of max)
    // L3 = 1000 W → ~4.83 A (≈ 33.3% of max)
    const symbols = [makeMcb("m1", 3000, "L1"), makeMcb("m2", 2000, "L2"), makeMcb("m3", 1000, "L3")];

    render(
      <PowerBalancePage
        symbols={symbols}
        metadata={createDefaultProjectMetadata()}
        {...noopHandlers}
      />,
    );

    const fills = screen.getAllByTestId("pb-phase-fill");
    expect(fills).toHaveLength(3);
    const widths = fills.map((fill) => (fill as HTMLElement).style.width);

    expect(widths[0]).toBe("100%");
    expect(widths[1]).toMatch(/^66\.[0-9]+%$/);
    expect(widths[2]).toMatch(/^33\.[0-9]+%$/);
  });

  it("shows the minimum 3% fill on every card when the project is empty", () => {
    render(
      <PowerBalancePage
        symbols={[]}
        metadata={createDefaultProjectMetadata()}
        {...noopHandlers}
      />,
    );

    const fills = screen.getAllByTestId("pb-phase-fill");
    expect(fills).toHaveLength(3);
    for (const fill of fills) {
      expect((fill as HTMLElement).style.width).toBe("3%");
    }
  });

  it("renders a per-phase watt breakdown as a tooltip on multi-phase circuit chips", () => {
    // 9000 W L1+L2+L3 -> L1: 3.00 kW, L2: 3.00 kW, L3: 3.00 kW
    const symbols = [
      createDefaultSymbolItem({
        id: "threephase",
        deviceKind: "mcb",
        powerW: 9000,
        phase: "L1+L2+L3",
        circuitType: "Sila",
        circuitName: "Plyta indukcyjna",
      }),
      createDefaultSymbolItem({
        id: "singlephase",
        deviceKind: "mcb",
        powerW: 1000,
        phase: "L1",
        circuitType: "Gniazdo",
        circuitName: "Gniazdko",
      }),
    ];

    render(
      <PowerBalancePage
        symbols={symbols}
        metadata={createDefaultProjectMetadata()}
        {...noopHandlers}
      />,
    );

    // Scope to the table — "L1" also appears as a phase-card label outside the table.
    const table = screen.getByRole("table");
    const chips = within(table).getAllByText(/^L1(\+L2(\+L3)?)?$/);

    const threePhaseChip = chips.find((el) => el.textContent === "L1+L2+L3")?.closest("span.pb-phase-chip");
    expect(threePhaseChip?.getAttribute("title")).toBe("L1: 3.00 kW, L2: 3.00 kW, L3: 3.00 kW");

    const singlePhaseChip = chips.find((el) => el.textContent === "L1")?.closest("span.pb-phase-chip");
    expect(singlePhaseChip?.getAttribute("title")).toBe("");
  });
});