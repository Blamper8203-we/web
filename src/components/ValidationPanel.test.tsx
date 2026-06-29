/**
 * ValidationPanel — tooltip with rule description on the VAL-XXX code badge.
 *
 * WHY: an electrician who hasn't read the codebase shouldn't need to google
 * what "VAL-007" means. The tooltip pulls from a registry file that pairs
 * each rule code with a one-sentence explanation and (when relevant) the
 * standard section the rule follows.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ValidationPanel } from "./ValidationPanel";
import type { ValidationResult } from "../lib/validation/electricalValidationService";
import { createDefaultSymbolItem } from "../types/symbolItem";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

function resultWithError(code: string, message: string): ValidationResult {
  return {
    isValid: false,
    errors: [{ code, message, severity: "Error", symbolId: "sym-1" }],
    warnings: [],
    info: [],
  };
}

const baseProps = {
  symbols: [],
  isDinRailGenerated: true,
  onSelectSymbol: vi.fn(),
  onEditSymbolField: vi.fn(),
  onApplyQuickFix: vi.fn(),
};

describe("ValidationPanel — rule-code tooltip", () => {
  // Each test passes a minimal MCB so `readiness` resolves to "ready" and
  // the panel actually renders the findings list instead of an empty-state
  // placeholder ("Walidacja gotowa" / "Brak obwodów do sprawdzenia").
  const readySymbols = [
    createDefaultSymbolItem({
      id: "sym-1",
      deviceKind: "mcb" as const,
      referenceDesignation: "F1",
      circuitName: "Oświetlenie",
      label: "F1",
      type: "MCB",
      displayModuleNumber: "#1",
      moduleNumber: 1,
    }),
  ];

  it("renders a tooltip with the rule description when VAL-001 fires", () => {
    render(
      <ValidationPanel
        {...baseProps}
        symbols={readySymbols}
        result={resultWithError("VAL-001", "Asymetria faz 47%")}
      />,
    );

    const codeBadge = screen.getByText("VAL-001");
    expect(codeBadge.tagName).toBe("SPAN");
    const title = codeBadge.getAttribute("title");
    expect(title).toContain("asymetrii");
    expect(title).toContain("PN-HD 60364");
  });

  it("renders a tooltip with the standard reference for VAL-005", () => {
    render(
      <ValidationPanel
        {...baseProps}
        symbols={readySymbols}
        result={resultWithError("VAL-005", "Zabezpieczenie zbyt duże dla przewodu")}
      />,
    );

    const title = screen.getByText("VAL-005").getAttribute("title");
    expect(title).toContain("1,45");
    expect(title).toContain("IEC 60364");
  });

  it("renders an empty tooltip for an unknown rule code (future-proof)", () => {
    render(
      <ValidationPanel
        {...baseProps}
        symbols={readySymbols}
        result={resultWithError("VAL-999", "Coś nowego")}
      />,
    );

    const title = screen.getByText("VAL-999").getAttribute("title");
    expect(title).toBe("");
  });

  it("still renders the existing empty state when there are no findings", () => {
    // Provide at least one MCB so `readiness` resolves to "ready" (otherwise
    // the panel shows "Walidacja gotowa" / "Brak obwodów" empty states).
    const symbols = [
      createDefaultSymbolItem({ id: "sym-1", deviceKind: "mcb" as const }),
    ];

    render(
      <ValidationPanel
        {...baseProps}
        symbols={symbols}
        result={emptyResult()}
      />,
    );

    expect(screen.getByText("Dokumentacja poprawna")).toBeInTheDocument();
  });

  it("renders the remediation hint as a 'Co zrobić' line under the finding", () => {
    render(
      <ValidationPanel
        {...baseProps}
        symbols={readySymbols}
        result={resultWithError("VAL-007", "Przeciążenie wyłącznika głównego")}
      />,
    );

    expect(screen.getByText(/Co zrobić:/)).toBeInTheDocument();
    expect(screen.getByText(/Bilans/)).toBeInTheDocument();
  });

  it("renders the collapsible Rules reference section with the rule count", () => {
    render(
      <ValidationPanel
        {...baseProps}
        symbols={readySymbols}
        result={resultWithError("VAL-001", "Asymetria faz 47%")}
      />,
    );

    // Header is always rendered; the list starts collapsed.
    expect(screen.getByText(/Reguły walidacji \(\d+\)/)).toBeInTheDocument();
    // No individual rule descriptions visible yet (collapsed by default).
    expect(screen.queryByText(/Sprawdza czy obciążenie L1\/L2\/L3/)).not.toBeInTheDocument();
  });

  it("expands the Rules reference section when the header is clicked", () => {
    render(
      <ValidationPanel
        {...baseProps}
        symbols={readySymbols}
        result={resultWithError("VAL-001", "Asymetria faz 47%")}
      />,
    );

    const header = screen.getByRole("button", { name: /Reguły walidacji/ });
    fireEvent.click(header);

    // After expanding, VAL-001's specific description should be in the DOM,
    // verifying the registry is wired end-to-end.
    expect(screen.getByText(/Sprawdza czy obciążenie L1\/L2\/L3/)).toBeInTheDocument();
  });
});