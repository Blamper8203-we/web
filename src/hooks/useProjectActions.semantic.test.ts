import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectActions } from "./useProjectActions";
import { createDefaultSymbolItem, type SymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";
import type { ProjectMetadata } from "../types/projectMetadata";
import { UndoRedoService } from "../lib/editing/undoRedoService";
import type { DinRailCanvasRail } from "../components/DinRailCanvas";
import type { SymbolHistorySnapshot } from "../lib/appHelpers";

vi.mock("../lib/projectFileSemantics", () => ({
  validateProjectSemantics: vi.fn(),
}));

import { validateProjectSemantics } from "../lib/projectFileSemantics";
const mockValidateProjectSemantics = vi.mocked(validateProjectSemantics);

vi.mock("../lib/projectFile", () => ({
  saveProjectFile: vi.fn(),
  openProjectFile: vi.fn(),
}));

vi.mock("../lib/export/pdfExportService", () => ({
  exportToPdf: vi.fn(),
}));

vi.mock("../lib/export/dinRailSnapshotService", () => ({
  exportDinRailToBlobWithOptions: vi.fn(),
}));

vi.mock("../lib/phaseDistribution/phaseDistributionCalculator", () => ({
  calculateTotalDistribution: vi.fn(),
  applyBalancePlan: vi.fn(),
  autoBalancePhases: vi.fn(),
}));

vi.mock("../lib/projectMetadata", () => ({
  createEmptyProjectMetadata: vi.fn(),
  normalizeProjectMetadata: vi.fn((m: any) => m),
  resetDocumentationFields: vi.fn((m: any) => ({ ...m, documentationReset: true })),
}));

vi.mock("../lib/schematic/dinRailGenerator", () => ({
  generateDinRailSvg: vi.fn(() => "<svg></svg>"),
  getDinRailDimensions: vi.fn(() => ({ width: 600, height: 400 })),
}));

vi.mock("../lib/appHelpers", () => ({
  normalizeDinRailModuleOrdering: vi.fn((s: any) => s),
  normalizeGroupConsistency: vi.fn((s: any) => s),
  normalizePaletteAssetDimensions: vi.fn((s: any) => s),
  DEFAULT_DIN_RAIL_CONFIG: { rows: 1, modulesPerRow: 24 },
}));

function createMockMetadata(overrides?: Partial<ProjectMetadata>): ProjectMetadata {
  return {
    projectNumber: "ZL-001",
    author: "Projektant",
    authorLicense: "UPR",
    company: "Biuro",
    titlePageObjectType: "Rozdzielnica",
    address: "ul. Testowa 1",
    investor: "Jan Kowalski",
    ...overrides,
  } as ProjectMetadata;
}

function createMockDinRail(): DinRailCanvasRail {
  return {
    config: { rows: 1, modulesPerRow: 24 },
    svg: "",
    width: 0,
    height: 0,
    isVisible: false,
  };
}

function setup() {
  const symbols: SymbolItem[] = [];
  const connections: ConnectionItem[] = [];
  const metadata = createMockMetadata();
  const dinRail = createMockDinRail();
  const statusMessages: string[] = [];
  const undoRedoServiceRef = { current: new UndoRedoService() };
  const dragHistorySnapshotRef = { current: null as SymbolHistorySnapshot | null };

  const setSymbols = vi.fn((next: React.SetStateAction<SymbolItem[]>) => {
    if (typeof next === "function") {
      (symbols as any).value = (next as (p: SymbolItem[]) => SymbolItem[])([]);
    }
  });
  const setConnections = vi.fn();
  const setMetadata = vi.fn();
  const setSelectedSymbolId = vi.fn();
  const setSelectedSymbolIds = vi.fn();
  const setDinRail = vi.fn();
  const setHasUnsavedChanges = vi.fn();
  const setCurrentFilePath = vi.fn();
  const setActiveSheet = vi.fn();
  const setDinRailGeneratorRequest = vi.fn();
  const refreshHistoryState = vi.fn();
  const executeSymbolsCommand = vi.fn((_l: string, _b: any, _a: any, msg: string) => {
    statusMessages.push(msg);
    return true;
  });
  const markClean = vi.fn();
  const showTemporaryStatus = vi.fn((msg: string) => {
    statusMessages.push(msg);
  });
  const paletteTemplateMap = new Map<string, never>();

  const { result } = renderHook(() =>
    useProjectActions({
      metadata,
      setMetadata,
      symbols,
      setSymbols,
      connections,
      setConnections,
      currentFilePath: null,
      setCurrentFilePath,
      paletteTemplateMap,
      setHasUnsavedChanges,
      selectedSymbolId: null,
      selectedSymbolIds: [],
      setSelectedSymbolId,
      setSelectedSymbolIds,
      setDinRail,
      dinRail,
      setActiveSheet,
      setDinRailGeneratorRequest,
      undoRedoServiceRef,
      dragHistorySnapshotRef,
      refreshHistoryState,
      executeSymbolsCommand,
      markClean,
      showTemporaryStatus,
    }),
  );

  return { result, statusMessages };
}

describe("useProjectActions - semantic validation integration", () => {
  it("calls validateProjectSemantics during handleLoadProjectData", () => {
    mockValidateProjectSemantics.mockReset();
    mockValidateProjectSemantics.mockReturnValue([]);

    const data = {
      metadata: createMockMetadata(),
      symbols: [createDefaultSymbolItem({ id: "s1", label: "MCB" })],
      connections: [],
      version: "2.0",
      rail: null,
    };

    const { result, statusMessages } = setup();
    act(() => { result.current.handleLoadProjectData(data); });

    expect(mockValidateProjectSemantics).toHaveBeenCalled();
    expect(statusMessages).toContain("Otwarto zlecenie");
  });

  it("surfaces error and warning counts in status message", () => {
    mockValidateProjectSemantics.mockReset();
    mockValidateProjectSemantics.mockReturnValue([
      { code: "SEM-002", message: "Zduplikowane id", severity: "Error" },
      { code: "SEM-005", message: "Cykl RCD", severity: "Error" },
      { code: "SEM-010", message: "Lekka moc", severity: "Warning" },
    ]);

    const data = {
      metadata: createMockMetadata(),
      symbols: [createDefaultSymbolItem({ id: "s1", label: "MCB" })],
      connections: [],
      version: "2.0",
      rail: null,
    };

    const { result, statusMessages } = setup();
    act(() => { result.current.handleLoadProjectData(data); });

    expect(mockValidateProjectSemantics).toHaveBeenCalled();
    expect(statusMessages).toContain("Otwarto zlecenie (2 błędy, 1 ostrzeżenie) — sprawdź walidację");
  });
});
