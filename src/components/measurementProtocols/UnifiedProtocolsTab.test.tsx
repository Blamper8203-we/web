/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnifiedProtocolsTab } from "./UnifiedProtocolsTab";
import type { MeasurementProtocolsData } from "../../types/projectMetadata";

// WHY: The audit-pdf.md #P1 flagged that loopMeterSerialNumber,
// insulationMeterSerialNumber, loopNetworkVoltage, loopNetworkSystem and
// recommendationsText had no UI to edit them — the user could not set the
// loop network voltage to "400V" or write a recommendations paragraph even
// though the PDF was supposed to render those fields. These tests pin the
// new UI bindings so the contract does not silently regress back to the
// pre-fix state (no inputs, hardcoded "TN-S / TN-C-S" placeholder).

function makeProtocols(overrides: Partial<MeasurementProtocolsData> = {}): MeasurementProtocolsData {
  const base = {
    unifiedHeader: { headerTitle: "Protokół Nr 01 / 2026", headerSubtitle: "", measurementDate: "", objectName: "" },
    rcdGroundHeader: { headerTitle: "", headerSubtitle: "", measurementDate: "", objectName: "" },
    continuityMeterName: "",
    continuityMeterSerialNumber: "",
    continuityMeasurementCurrent: "",
    loopMeterName: "Sonel MPI-530",
    loopMeterSerialNumber: "S/N 12345",
    loopNetworkVoltage: "400V",
    loopNetworkSystem: "TN-S",
    insulationTestVoltage: "500V",
    insulationMeterName: "Sonel MIC-10",
    insulationMeterSerialNumber: "S/N 67890",
    rcdGroundMeterName: "",
    rcdGroundMeterSerialNumber: "",
    groundMeasurementMethod: "",
    groundElectrodeType: "",
    groundMeasuredResistance: "",
    groundRequiredResistance: "",
    groundConclusionText: "",
    recommendationsText: "Wymienić zabezpieczenie F3.",
    rcdRows: [],
    unifiedRows: [],
  } as unknown as MeasurementProtocolsData;
  return { ...base, ...overrides };
}

describe("UnifiedProtocolsTab - Dane techniczne i narzędzia pomiarowe", () => {
  const baseProps = {
    updateProtocols: vi.fn(),
    updateTableRow: vi.fn(),
    unifiedPages: [[]],
    displayDate: "2026-06-21",
    objectType: "Budynek mieszkalny",
    unifiedStartPage: 2,
    totalUiPages: 8,
  };

  it("renders editable inputs for loop meter name and serial number on the first page", () => {
    render(
      <UnifiedProtocolsTab
        {...baseProps}
        protocols={makeProtocols()}
      />,
    );

    const loopNameInput = screen.getByDisplayValue("Sonel MPI-530");
    expect(loopNameInput).toBeInTheDocument();

    const loopSerialInput = screen.getByDisplayValue("S/N 12345");
    expect(loopSerialInput).toBeInTheDocument();
  });

  it("renders editable inputs for insulation meter name and serial number on the first page", () => {
    render(
      <UnifiedProtocolsTab
        {...baseProps}
        protocols={makeProtocols()}
      />,
    );

    expect(screen.getByDisplayValue("Sonel MIC-10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("S/N 67890")).toBeInTheDocument();
  });

  it("renders editable inputs for loop network voltage and system (replacing the old hardcoded label)", () => {
    render(
      <UnifiedProtocolsTab
        {...baseProps}
        protocols={makeProtocols()}
      />,
    );

    // loopNetworkVoltage and loopNetworkSystem used to be hardcoded as
    // "230/400V" and "TN-S / TN-C-S" — now they must be editable inputs.
    expect(screen.getByDisplayValue("400V")).toBeInTheDocument();
    expect(screen.getByDisplayValue("TN-S")).toBeInTheDocument();

    // The static "TN-S / TN-C-S" badge must NOT appear anymore on the first page.
    expect(screen.queryByText("TN-S / TN-C-S")).not.toBeInTheDocument();
  });

  it("calls updateProtocols with loopMeterSerialNumber when the user edits the loop serial input", () => {
    const updateProtocols = vi.fn();
    render(
      <UnifiedProtocolsTab
        {...baseProps}
        protocols={makeProtocols()}
        updateProtocols={updateProtocols}
      />,
    );

    const loopSerialInput = screen.getByDisplayValue("S/N 12345");
    fireEvent.change(loopSerialInput, { target: { value: "S/N 99999" } });

    expect(updateProtocols).toHaveBeenCalledWith({ loopMeterSerialNumber: "S/N 99999" });
  });

  it("calls updateProtocols with loopNetworkSystem when the user edits the system input", () => {
    const updateProtocols = vi.fn();
    render(
      <UnifiedProtocolsTab
        {...baseProps}
        protocols={makeProtocols()}
        updateProtocols={updateProtocols}
      />,
    );

    const systemInput = screen.getByDisplayValue("TN-S");
    fireEvent.change(systemInput, { target: { value: "TN-C-S" } });

    expect(updateProtocols).toHaveBeenCalledWith({ loopNetworkSystem: "TN-C-S" });
  });

  it("renders the Zalecenia textarea on the last page with current value", () => {
    render(
      <UnifiedProtocolsTab
        {...baseProps}
        protocols={makeProtocols()}
      />,
    );

    const textarea = screen.getByDisplayValue("Wymienić zabezpieczenie F3.");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });

  it("calls updateProtocols with recommendationsText when the user edits the textarea", () => {
    const updateProtocols = vi.fn();
    render(
      <UnifiedProtocolsTab
        {...baseProps}
        protocols={makeProtocols()}
        updateProtocols={updateProtocols}
      />,
    );

    const textarea = screen.getByDisplayValue("Wymienić zabezpieczenie F3.");
    fireEvent.change(textarea, { target: { value: "Nowe zalecenie." } });

    expect(updateProtocols).toHaveBeenCalledWith({ recommendationsText: "Nowe zalecenie." });
  });

  it("does not render the Dane techniczne block on continuation pages", () => {
    // Two pages of rows → first page should have the metadata block,
    // second page should not (otherwise the engineer sees duplicate headers).
    const twoPages = [[{ index: 1, circuitName: "Obwód 1", location: "", protectionType: "", lnResistance: "", lpeResistance: "", npeResistance: "", measuredImpedance: "", allowedImpedance: "", assessment: "" } as any]];

    const { container } = render(
      <UnifiedProtocolsTab
        {...baseProps}
        protocols={makeProtocols()}
        unifiedPages={twoPages}
      />,
    );

    // Section header "1. Dane techniczne..." appears exactly once across the
    // entire DOM — pin the contract that isFirstPage gates the block.
    const sectionHeaders = Array.from(container.querySelectorAll("div")).filter(
      (el) => el.textContent === "1. Dane techniczne i narzędzia pomiarowe",
    );
    expect(sectionHeaders).toHaveLength(1);
  });
});