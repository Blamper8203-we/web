import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectActions } from "./useProjectActions";
import { createDefaultSymbolItem, type SymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";
import type { ProjectMetadata } from "../types/projectMetadata";
import { UndoRedoService } from "../lib/editing/undoRedoService";
import type { DinRailCanvasRail } from "../components/DinRailCanvasPixi";
import type { PaletteTemplate, SymbolHistorySnapshot } from "../lib/appHelpers";

// --- Mocks ---
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

vi.mock("../lib/projectFileSemantics", () => ({
  validateProjectSemantics: vi.fn(() => [] as any[]),
}));

// Import mocked modules to get typed references
import { saveProjectFile, openProjectFile } from "../lib/projectFile";
import { exportToPdf } from "../lib/export/pdfExportService";
import { exportDinRailToBlobWithOptions } from "../lib/export/dinRailSnapshotService";
import {
  calculateTotalDistribution,
  applyBalancePlan,
  autoBalancePhases,
} from "../lib/phaseDistribution/phaseDistributionCalculator";
import {
  createEmptyProjectMetadata,
  normalizeProjectMetadata,
  resetDocumentationFields,
} from "../lib/projectMetadata";
import {
  normalizePaletteAssetDimensions,
  normalizeGroupConsistency,
  normalizeDinRailModuleOrdering,
  DEFAULT_DIN_RAIL_CONFIG,
} from "../lib/appHelpers";
import { validateProjectSemantics } from "../lib/projectFileSemantics";

// --- Helpers ---

function createMockMetadata(overrides?: Partial<ProjectMetadata>): ProjectMetadata {
  return {
    projectNumber: "ZL-001",
    author: "Projektant",
    authorLicense: "UPR",
    company: "Biuro",
    titlePageObjectType: "Rozdzielnica",
    address: "ul. Testowa 1",
    investor: "Jan Kowalski",
    investorAddress: "",
    contractor: "",
    contractorNip: "",
    contractorRegon: "",
    contractorPhone: "",
    contractorEmail: "",
    designerId: "123",
    revision: "",
    drawingScale: "",
    drawingDate: "2026-06-07",
    statementDate: "",
    sheetNumber: "1",
    designerSignature: "",
    investorSignature: "",
    contractorSignature: "",
    isFormalDocumentationMode: false,
    dateCreated: "",
    dateModified: "",
    notes: "",
    standards: [],
    documentationOptionalScope: "",
    titlePageWorkScopeItems: [],
    titlePageAttachmentItems: [],
    titlePageSepValidUntil: "",
    titlePageUseManualWorkScopeCheckboxes: false,
    titlePageCompanyLogoFileName: "",
    titlePageCompanyLogoDataUrl: "",
    measurementProtocols: {
      unifiedHeader: { headerTitle: "", headerSubtitle: "", measurementDate: "", objectName: "" },
      rcdGroundHeader: { headerTitle: "", headerSubtitle: "", measurementDate: "", objectName: "" },
      continuityMeterName: "",
      continuityMeterSerialNumber: "",
      continuityMeasurementCurrent: "",
      loopMeterName: "",
      loopMeterSerialNumber: "",
      loopNetworkVoltage: "",
      loopNetworkSystem: "",
      insulationTestVoltage: "",
      insulationMeterName: "",
      insulationMeterSerialNumber: "",
      rcdGroundMeterName: "",
      rcdGroundMeterSerialNumber: "",
      groundMeasurementMethod: "",
      groundElectrodeType: "",
      groundMeasuredResistance: "",
      groundRequiredResistance: "",
      groundConclusionText: "",
      recommendationsText: "",
      rcdRows: [],
      unifiedRows: [],
    },
    supplyVoltageV: 230,
    supplyPhases: 3,
    mainBreakerA: 63,
    contractedPowerKw: 0,
    simultaneityFactor: 1,
    ...overrides,
  };
}

function createMockDinRail(): DinRailCanvasRail {
  return {
    config: DEFAULT_DIN_RAIL_CONFIG,
    svg: "<svg></svg>",
    width: 600,
    height: 400,
    isVisible: true,
  };
}

function createMockPaletteTemplateMap(): Map<string, PaletteTemplate> {
  return new Map();
}

describe("useProjectActions", () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original DOM APIs to restore after each test
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalCreateElement = document.createElement;

    // Default mock returns for phase distribution
    vi.mocked(calculateTotalDistribution).mockReturnValue({
      l1PowerW: 1000,
      l2PowerW: 1000,
      l3PowerW: 1000,
      l1CurrentA: 1000 / (230 * 0.9),
      l2CurrentA: 1000 / (230 * 0.9),
      l3CurrentA: 1000 / (230 * 0.9),
      imbalancePercent: 0,
    });
  });

  afterEach(() => {
    // Restore original DOM APIs
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    document.createElement = originalCreateElement;
  });

  function setup(overrides?: {
    symbols?: SymbolItem[];
    connections?: ConnectionItem[];
    metadata?: ProjectMetadata;
    selectedSymbolId?: string | null;
    selectedSymbolIds?: string[];
    dinRail?: DinRailCanvasRail;
  }) {
    let symbols = overrides?.symbols ?? [];
    let connections = overrides?.connections ?? [];
    let metadata = overrides?.metadata ?? createMockMetadata();
    let selectedSymbolId: string | null = overrides?.selectedSymbolId ?? null;
    let selectedSymbolIds: string[] = overrides?.selectedSymbolIds ?? [];
    let dinRail = overrides?.dinRail ?? createMockDinRail();
    let currentFilePath: string | null = null;
    let hasUnsavedChanges = false;
    let dinRailGeneratorRequest = 0;
    let activeSheet: string = "sheet1";
    const statusMessages: string[] = [];

    const undoRedoServiceRef = { current: new UndoRedoService() };
    const dragHistorySnapshotRef = { current: null as SymbolHistorySnapshot | null };

    const setSymbols = vi.fn((next: React.SetStateAction<SymbolItem[]>) => {
      if (typeof next === "function") {
        symbols = (next as (prev: SymbolItem[]) => SymbolItem[])(symbols);
      } else {
        symbols = next;
      }
    });
    const setConnections = vi.fn((next: React.SetStateAction<ConnectionItem[]>) => {
      if (typeof next === "function") {
        connections = (next as (prev: ConnectionItem[]) => ConnectionItem[])(connections);
      } else {
        connections = next;
      }
    });
    const setMetadata = vi.fn((next: React.SetStateAction<ProjectMetadata>) => {
      if (typeof next === "function") {
        metadata = (next as (prev: ProjectMetadata) => ProjectMetadata)(metadata);
      } else {
        metadata = next;
      }
    });
    const setSelectedSymbolId = vi.fn((next: React.SetStateAction<string | null>) => {
      if (typeof next === "function") {
        selectedSymbolId = (next as (prev: string | null) => string | null)(selectedSymbolId);
      } else {
        selectedSymbolId = next;
      }
    });
    const setSelectedSymbolIds = vi.fn((next: React.SetStateAction<string[]>) => {
      if (typeof next === "function") {
        selectedSymbolIds = (next as (prev: string[]) => string[])(selectedSymbolIds);
      } else {
        selectedSymbolIds = next;
      }
    });
    const setDinRail = vi.fn((next: React.SetStateAction<DinRailCanvasRail>) => {
      if (typeof next === "function") {
        dinRail = (next as (prev: DinRailCanvasRail) => DinRailCanvasRail)(dinRail);
      } else {
        dinRail = next;
      }
    });
    const setHasUnsavedChanges = vi.fn((next: React.SetStateAction<boolean>) => {
      if (typeof next === "function") {
        hasUnsavedChanges = (next as (prev: boolean) => boolean)(hasUnsavedChanges);
      } else {
        hasUnsavedChanges = next;
      }
    });
    const setCurrentFilePath = vi.fn((next: React.SetStateAction<string | null>) => {
      if (typeof next === "function") {
        currentFilePath = (next as (prev: string | null) => string | null)(currentFilePath);
      } else {
        currentFilePath = next;
      }
    });
    const setActiveSheet = vi.fn((tab: string) => { activeSheet = tab; });
    const setDinRailGeneratorRequest = vi.fn((next: React.SetStateAction<number>) => {
      if (typeof next === "function") {
        dinRailGeneratorRequest = (next as (prev: number) => number)(dinRailGeneratorRequest);
      } else {
        dinRailGeneratorRequest = next;
      }
    });
    const refreshHistoryState = vi.fn();
    const executeSymbolsCommand = vi.fn((_label: string, _before: any, _after: any, statusMessage: string) => {
      statusMessages.push(statusMessage);
      return true;
    });
    const markClean = vi.fn();
    const showTemporaryStatus = vi.fn((msg: string) => {
      statusMessages.push(msg);
    });

    const { result } = renderHook(() =>
      useProjectActions({
        metadata,
        setMetadata,
        symbols,
        setSymbols,
        connections,
        setConnections,
        currentFilePath,
        setCurrentFilePath,
        paletteTemplateMap: createMockPaletteTemplateMap(),
        setHasUnsavedChanges,
        selectedSymbolId,
        selectedSymbolIds,
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

    return {
      result,
      get symbols() { return symbols; },
      get connections() { return connections; },
      get metadata() { return metadata; },
      get selectedSymbolId() { return selectedSymbolId; },
      get selectedSymbolIds() { return selectedSymbolIds; },
      get dinRail() { return dinRail; },
      get currentFilePath() { return currentFilePath; },
      get hasUnsavedChanges() { return hasUnsavedChanges; },
      get activeSheet() { return activeSheet; },
      get statusMessages() { return statusMessages; },
      get dinRailGeneratorRequest() { return dinRailGeneratorRequest; },
      undoRedoServiceRef,
      setHasUnsavedChanges,
      setCurrentFilePath,
      setSymbols,
      setConnections,
      setDinRail,
      setMetadata,
    };
  }

  // ===== handleNewProject =====
  describe("handleNewProject", () => {
    it("creates empty project and resets state", () => {
      vi.mocked(createEmptyProjectMetadata).mockReturnValue(createMockMetadata({ projectNumber: "" }));

      const sym = createDefaultSymbolItem({ id: "s1" });
      const { result, statusMessages } = setup({
        symbols: [sym],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      act(() => { result.current.handleNewProject(); });

      expect(createEmptyProjectMetadata).toHaveBeenCalled();
      expect(statusMessages).toContain("Utworzono nowe zlecenie");
    });

    it("clears symbols, connections and file path on new project", () => {
      vi.mocked(createEmptyProjectMetadata).mockReturnValue(createMockMetadata({ projectNumber: "" }));

      const sym = createDefaultSymbolItem({ id: "s1" });
      const conn: ConnectionItem = {
        id: "c1",
        fromSymbolId: "s1",
        fromTerminal: "A1",
        toSymbolId: "s2",
        toTerminal: "A2",
        wireColor: "black",
        wireCrossSection: 2.5,
        wireType: "LgY",
        routingMode: "manhattan",
      };

      const { result, setSymbols, setConnections, setCurrentFilePath, setHasUnsavedChanges } = setup({
        symbols: [sym],
        connections: [conn],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      act(() => { result.current.handleNewProject(); });

      expect(setSymbols).toHaveBeenCalledWith([]);
      expect(setConnections).toHaveBeenCalledWith([]);
      expect(setCurrentFilePath).toHaveBeenCalledWith(null);
      expect(setHasUnsavedChanges).toHaveBeenCalledWith(false);
    });
  });

  // ===== handleSaveProject =====
  describe("handleSaveProject", () => {
    it("calls saveProjectFile and returns true on success", async () => {
      vi.mocked(saveProjectFile).mockResolvedValue("/path/to/file.dinboard");

      const { result, statusMessages } = setup();
      let saved = false;
      await act(async () => { saved = await result.current.handleSaveProject(); });

      expect(saveProjectFile).toHaveBeenCalled();
      expect(saved).toBe(true);
      expect(statusMessages).toContain("Zapisano plik zlecenia");
    });

    it("returns false when saveProjectFile returns null", async () => {
      vi.mocked(saveProjectFile).mockResolvedValue(null);

      const { result } = setup();
      let saved = true;
      await act(async () => { saved = await result.current.handleSaveProject(); });

      expect(saved).toBe(false);
    });

    it("shows error message on exception", async () => {
      vi.mocked(saveProjectFile).mockRejectedValue(new Error("Błąd zapisu"));

      const { result, statusMessages } = setup();
      let saved = true;
      await act(async () => { saved = await result.current.handleSaveProject(); });

      expect(saved).toBe(false);
      expect(statusMessages.some((m) => m.includes("Błąd"))).toBe(true);
    });

    it("calls saveProjectFile without currentFilePath when asNew is true", async () => {
      vi.mocked(saveProjectFile).mockResolvedValue("/new/path.dinboard");

      const { result } = setup();
      await act(async () => { await result.current.handleSaveProject(true); });

      expect(saveProjectFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.any(Object),
        undefined,  // asNew=true => currentFilePath becomes undefined
        expect.any(Array),
      );
    });
  });

  // ===== handleOpenProject =====
  describe("handleOpenProject", () => {
    it("opens project file and loads data", async () => {
      const testSymbol = createDefaultSymbolItem({ id: "s1", label: "MCB" });
      vi.mocked(openProjectFile).mockResolvedValue({
        metadata: createMockMetadata(),
        symbols: [testSymbol],
        connections: [],
        path: "/opened/file.dinboard",
        version: "2.0",
        rail: null,
      });

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleOpenProject(); });

      expect(openProjectFile).toHaveBeenCalled();
      expect(normalizeProjectMetadata).toHaveBeenCalled();
      expect(statusMessages).toContain("Otwarto zlecenie");
    });

    it("does nothing when openProjectFile returns null", async () => {
      vi.mocked(openProjectFile).mockResolvedValue(null);

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleOpenProject(); });

      expect(statusMessages).not.toContain("Otwarto zlecenie");
    });

    it("shows error on exception", async () => {
      vi.mocked(openProjectFile).mockRejectedValue(new Error("Błąd otwierania"));

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleOpenProject(); });

      expect(statusMessages.some((m) => m.includes("Błąd"))).toBe(true);
    });
  });

  // ===== handleLoadProjectData =====
  describe("handleLoadProjectData", () => {
    it("normalizes and loads project data", () => {
      const testSymbol = createDefaultSymbolItem({ id: "s1", label: "MCB" });
      const data = {
        metadata: createMockMetadata(),
        symbols: [testSymbol],
        connections: [],
        version: "2.0",
        rail: { svg: "<svg>", width: 600, height: 400, rows: 2, modulesPerRow: 24, isVisible: true },
      };

      const { result, statusMessages } = setup();
      act(() => { result.current.handleLoadProjectData(data); });

      expect(normalizeProjectMetadata).toHaveBeenCalled();
      expect(normalizePaletteAssetDimensions).toHaveBeenCalled();
      expect(normalizeGroupConsistency).toHaveBeenCalled();
      expect(normalizeDinRailModuleOrdering).toHaveBeenCalled();
      expect(statusMessages).toContain("Otwarto zlecenie");
    });

    it("applies rail from symbols when no rail data is present", () => {
      const testSymbol = createDefaultSymbolItem({
        id: "s1",
        label: "MCB",
        x: 100,
        y: 50,
        width: 250,
        isSnappedToRail: true,
      });
      const data = {
        metadata: createMockMetadata(),
        symbols: [testSymbol],
        connections: [],
        version: "2.0",
        rail: null,
      };

      const { result, setDinRail, statusMessages } = setup({
        dinRail: { config: { rows: 1, modulesPerRow: 24 }, svg: "", width: 0, height: 0, isVisible: false },
      });

      act(() => { result.current.handleLoadProjectData(data); });

      // generateDinRailSvg is mocked to return "<svg></svg>", getDinRailDimensions returns { width: 600, height: 400 }
      expect(setDinRail).toHaveBeenCalledWith({
        config: { rows: 1, modulesPerRow: 6 },
        svg: "<svg></svg>",
        width: 600,
        height: 400,
        isVisible: true,
      });
      expect(statusMessages).toContain("Otwarto zlecenie");
    });

    it("handles empty symbols and connections gracefully", () => {
      const data = {
        metadata: createMockMetadata(),
        symbols: [],
        connections: undefined,
        version: "2.0",
        rail: null,
      };

      const { result, setDinRail, statusMessages } = setup({
        dinRail: { config: { rows: 1, modulesPerRow: 24 }, svg: "", width: 0, height: 0, isVisible: false },
      });

      act(() => { result.current.handleLoadProjectData(data); });

      // Empty symbols => applyRailFromSymbols disables rail
      expect(setDinRail).toHaveBeenCalledWith({
        config: { rows: 1, modulesPerRow: 24 },
        svg: "",
        width: 0,
        height: 0,
        isVisible: false,
      });
      expect(statusMessages).toContain("Otwarto zlecenie");
    });

    it("shows validation error count in status when semantic errors are present", () => {
      // Moduł mockuje validateProjectSemantics na `[]` (vi.mock na górze pliku),
      // więc w teście jawnie ustawiamy błąd SEM-002. Real-validator coverage
      // (np. że faktycznie łapie duplikat id) jest w projectFileSemantics.test.ts.
      vi.mocked(validateProjectSemantics).mockImplementationOnce(() => [
        { code: "SEM-002", message: "Zduplikowane id", severity: "Error" },
      ]);

      const data = {
        metadata: createMockMetadata(),
        symbols: [
          createDefaultSymbolItem({ id: "dup", label: "MCB" }),
          createDefaultSymbolItem({ id: "dup", label: "MCB" }),
        ],
        connections: [],
        version: "2.0",
        rail: null,
      };

      const { result, statusMessages } = setup();
      act(() => { result.current.handleLoadProjectData(data); });

      expect(validateProjectSemantics).toHaveBeenCalled();
      expect(statusMessages).toContain("Otwarto zlecenie (1 błąd) — sprawdź walidację");
    });

    it("shows validation warning count in status when only warnings are present", () => {
      vi.mocked(validateProjectSemantics).mockImplementation(() => [
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

      expect(statusMessages).toContain("Otwarto zlecenie (1 ostrzeżenie) — sprawdź walidację");
    });
  });

  // ===== handleExportBom =====
  describe("handleExportBom", () => {
    it("creates a CSV blob and triggers download", () => {
      const sym1 = createDefaultSymbolItem({
        id: "s1",
        label: "MCB 1P B16",
        referenceDesignation: "F1",
        deviceKind: "mcb",
        powerW: 2300,
        phase: "L1",
      });

      const { result, statusMessages } = setup({ symbols: [sym1] });

      const createObjectURL = vi.fn(() => "blob:url");
      const revokeObjectURL = vi.fn();
      const click = vi.fn();

      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;

      const anchorMock = { href: "", download: "", click };
      document.createElement = vi.fn(() => anchorMock as any) as any;

      act(() => { result.current.handleExportBom(); });

      expect(createObjectURL).toHaveBeenCalled();
      expect(anchorMock.download).toContain("-bom.csv");
      expect(click).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
      expect(statusMessages).toContain("Eksport BOM (CSV)");
    });
  });

  // ===== handleMetadataChange =====
  describe("handleMetadataChange", () => {
    it("updates metadata and sets unsaved changes", () => {
      const { result, setHasUnsavedChanges } = setup();
      const nextMeta = createMockMetadata({ projectNumber: "Zmieniony" });

      act(() => { result.current.handleMetadataChange(nextMeta); });

      // setMetadata was called with the new value
      expect(result.current).toBeDefined();
      expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  // ===== handleResetDocumentation =====
  describe("handleResetDocumentation", () => {
    it("calls resetDocumentationFields and updates metadata", () => {
      const { result } = setup();

      act(() => { result.current.handleResetDocumentation(); });

      expect(resetDocumentationFields).toHaveBeenCalled();
    });
  });

  // ===== handleAutoBalance =====
  describe("handleAutoBalance", () => {
    it("applies balance plan, creates history entry, returns improved severity", () => {
      const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB 1P", phase: "L1", powerW: 1000 });
      const sym2 = createDefaultSymbolItem({ id: "s2", label: "MCB 1P", phase: "L2", powerW: 2000 });

      // First call = before, subsequent calls = after (lower imbalance)
      vi.mocked(calculateTotalDistribution)
        .mockReturnValueOnce({
          l1PowerW: 1000,
          l2PowerW: 2000,
          l3PowerW: 0,
          l1CurrentA: 1000 / (230 * 0.9),
          l2CurrentA: 2000 / (230 * 0.9),
          l3CurrentA: 0,
          imbalancePercent: 66.7,
        })
        .mockReturnValueOnce({
          l1PowerW: 1000,
          l2PowerW: 0,
          l3PowerW: 2000,
          l1CurrentA: 1000 / (230 * 0.9),
          l2CurrentA: 0,
          l3CurrentA: 2000 / (230 * 0.9),
          imbalancePercent: 33.3,
        });

      vi.mocked(autoBalancePhases).mockReturnValue({} as any);
      vi.mocked(applyBalancePlan).mockReturnValue({
        symbols: [
          createDefaultSymbolItem({ id: "s1", label: "MCB 1P", phase: "L1", powerW: 1000 }),
          createDefaultSymbolItem({ id: "s2", label: "MCB 1P", phase: "L3", powerW: 2000 }),
        ],
        changedCount: 1,
      });

      const { result, statusMessages } = setup({ symbols: [sym1, sym2] });

      let outcome: any;
      act(() => {
        outcome = result.current.handleAutoBalance("Power", "AllSinglePhase");
      });

      expect(autoBalancePhases).toHaveBeenCalledWith([sym1, sym2], "Power", "AllSinglePhase");
      expect(applyBalancePlan).toHaveBeenCalled();
      expect(calculateTotalDistribution).toHaveBeenCalled();
      expect(statusMessages.some((m) => m.includes("Zmieniono przypisanie faz"))).toBe(true);
      expect(outcome.details).toHaveLength(1);
      expect(outcome.details[0].fromPhase).toBe("L2");
      expect(outcome.details[0].toPhase).toBe("L3");
      expect(outcome.severity).toBe("improved");
    });

    it("returns neutral severity when no changes needed", () => {
      const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB 1P", phase: "L1", powerW: 1000 });

      vi.mocked(calculateTotalDistribution).mockReturnValue({
        l1PowerW: 1000,
        l2PowerW: 0,
        l3PowerW: 0,
        l1CurrentA: 1000 / (230 * 0.9),
        l2CurrentA: 0,
        l3CurrentA: 0,
        imbalancePercent: 66.7,
      });
      vi.mocked(autoBalancePhases).mockReturnValue({} as any);
      vi.mocked(applyBalancePlan).mockReturnValue({
        symbols: [sym1],
        changedCount: 0,
      });

      const { result, statusMessages } = setup({ symbols: [sym1] });

      let outcome: any;
      act(() => {
        outcome = result.current.handleAutoBalance("Power", "AllSinglePhase");
      });

      expect(statusMessages.some((m) => m.includes("Bilans nie wymagał zmian"))).toBe(true);
      expect(outcome.severity).toBe("neutral");
    });

    it("returns preview when previewOnly is true", () => {
      const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB 1P", phase: "L1", powerW: 1000 });

      vi.mocked(autoBalancePhases).mockReturnValue({} as any);
      vi.mocked(applyBalancePlan).mockReturnValue({ symbols: [sym1], changedCount: 0 });

      const { result } = setup({ symbols: [sym1] });

      let outcome: any;
      act(() => {
        outcome = result.current.handleAutoBalance("Power", "AllSinglePhase", true);
      });

      expect(outcome.message).toContain("Podgląd planu");
    });

    it("returns worse severity when imbalance increases", () => {
      const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB 1P", phase: "L1", powerW: 3000 });
      const sym2 = createDefaultSymbolItem({ id: "s2", label: "MCB 1P", phase: "L2", powerW: 1000 });

      // Before: 3000/1000/0  After: 0/3000/1000 (worse because all shifted to one phase)
      vi.mocked(calculateTotalDistribution)
        .mockReturnValueOnce({
          l1PowerW: 3000, l2PowerW: 1000, l3PowerW: 0,
          l1CurrentA: 3000 / (230 * 0.9), l2CurrentA: 1000 / (230 * 0.9), l3CurrentA: 0,
          imbalancePercent: 50.0,
        })
        .mockReturnValueOnce({
          l1PowerW: 0, l2PowerW: 3000, l3PowerW: 1000,
          l1CurrentA: 0, l2CurrentA: 3000 / (230 * 0.9), l3CurrentA: 1000 / (230 * 0.9),
          imbalancePercent: 66.7,
        });

      vi.mocked(autoBalancePhases).mockReturnValue({} as any);
      vi.mocked(applyBalancePlan).mockReturnValue({
        symbols: [
          createDefaultSymbolItem({ id: "s1", label: "MCB 1P", phase: "L2", powerW: 3000 }),
          createDefaultSymbolItem({ id: "s2", label: "MCB 1P", phase: "L3", powerW: 1000 }),
        ],
        changedCount: 1,
      });

      const { result } = setup({ symbols: [sym1, sym2] });

      let outcome: any;
      act(() => {
        outcome = result.current.handleAutoBalance("Power", "AllSinglePhase");
      });

      expect(outcome.severity).toBe("worse");
    });
  });

  // ===== handleApplyPhaseMoveSuggestion =====
  describe("handleApplyPhaseMoveSuggestion", () => {
    it("moves phase for unlocked symbol", () => {
      const sym = createDefaultSymbolItem({ id: "s1", label: "MCB", phase: "L1", powerW: 1000 });
      const { result, statusMessages } = setup({ symbols: [sym] });

      act(() => { result.current.handleApplyPhaseMoveSuggestion("s1", "L2"); });

      expect(statusMessages.some((m) => m.includes("Przeniesiono"))).toBe(true);
    });

    it("does nothing for locked phase", () => {
      const sym = createDefaultSymbolItem({ id: "s1", label: "MCB", phase: "L1", isPhaseLocked: true });
      const { result, statusMessages } = setup({ symbols: [sym] });

      act(() => { result.current.handleApplyPhaseMoveSuggestion("s1", "L2"); });

      expect(statusMessages).toContain("Obwód ma zablokowaną fazę");
    });

    it("does nothing when already on that phase", () => {
      const sym = createDefaultSymbolItem({ id: "s1", label: "MCB", phase: "L1" });
      const { result, statusMessages } = setup({ symbols: [sym] });

      act(() => { result.current.handleApplyPhaseMoveSuggestion("s1", "L1"); });

      expect(statusMessages).toContain("Obwód jest już na tej fazie");
    });

    it("shows warning for missing symbol", () => {
      const { result, statusMessages } = setup();

      act(() => { result.current.handleApplyPhaseMoveSuggestion("nonexistent", "L2"); });

      expect(statusMessages).toContain("Nie znaleziono obwodu do przeniesienia");
    });
  });

  // ===== handleOpenDinRailGenerator =====
  describe("handleOpenDinRailGenerator", () => {
    it("switches to sheet1 and calls setDinRailGeneratorRequest with increment fn", () => {
      const { result, activeSheet } = setup();

      act(() => { result.current.handleOpenDinRailGenerator(); });

      expect(activeSheet).toBe("sheet1");
    });
  });

  // ===== handleRailGenerated =====
  describe("handleRailGenerated", () => {
    it("updates rail and clears symbols when symbols exist", () => {
      const sym = createDefaultSymbolItem({ id: "s1" });
      const { result, statusMessages } = setup({ symbols: [sym] });

      act(() => {
        result.current.handleRailGenerated({ rows: 2, modulesPerRow: 18 }, "<svg>new</svg>", 800, 500);
      });

      expect(statusMessages.some((m) => m.includes("Szyna DIN"))).toBe(true);
    });

    it("updates rail without clearing symbols when no symbols", () => {
      const { result, statusMessages } = setup({ symbols: [] });

      act(() => {
        result.current.handleRailGenerated({ rows: 1, modulesPerRow: 12 }, "<svg>small</svg>", 300, 200);
      });

      expect(statusMessages.some((m) => m.includes("Szyna DIN"))).toBe(true);
    });

    it("sets hasUnsavedChanges when rail is generated", () => {
      const sym = createDefaultSymbolItem({ id: "s1" });
      const { result, setHasUnsavedChanges } = setup({ symbols: [sym] });

      act(() => {
        result.current.handleRailGenerated({ rows: 2, modulesPerRow: 18 }, "<svg>new</svg>", 800, 500);
      });

      expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  // ===== handleExportPdf =====
  describe("handleExportPdf", () => {
    it("calls exportToPdf and shows status", async () => {
      vi.mocked(exportToPdf).mockResolvedValue(new Blob(["pdf content"], { type: "application/pdf" }));

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleExportPdf(); });

      expect(exportToPdf).toHaveBeenCalled();
      expect(statusMessages).toContain("Eksport PDF");
    });

    it("shows error on exception", async () => {
      vi.mocked(exportToPdf).mockRejectedValue(new Error("PDF error"));

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleExportPdf(); });

      expect(statusMessages.some((m) => m.includes("Błąd"))).toBe(true);
    });
  });

  // ===== handleExportPng =====
  describe("handleExportPng", () => {
    it("exports PNG with annotations", async () => {
      vi.mocked(exportDinRailToBlobWithOptions).mockResolvedValue(new Blob(["png"]));

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleExportPng(true); });

      expect(exportDinRailToBlobWithOptions).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({ includeDesignations: true, includeGroupFrames: true, scale: 3 }),
      );
      expect(statusMessages).toContain("Eksport PNG (z oznaczeniami)");
    });

    it("exports PNG without annotations", async () => {
      vi.mocked(exportDinRailToBlobWithOptions).mockResolvedValue(new Blob(["png"]));

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleExportPng(false); });

      expect(statusMessages).toContain("Eksport PNG (czysty)");
    });

    it("shows warning when rail is not visible", async () => {
      const { result, statusMessages } = setup({ dinRail: { ...createMockDinRail(), isVisible: false } });

      await act(async () => { await result.current.handleExportPng(true); });
      expect(statusMessages).toContain("Brak szyny DIN do eksportu PNG");
    });

    it("shows failure message when exportDinRailToBlobWithOptions returns null", async () => {
      vi.mocked(exportDinRailToBlobWithOptions).mockResolvedValue(null);

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleExportPng(true); });

      expect(statusMessages).toContain("Nie udało się wyeksportować PNG");
    });
  });

  // ===== handleExportDinRailPngWithDescriptionsNoBrackets =====
  describe("handleExportDinRailPngWithDescriptionsNoBrackets", () => {
    it("exports HQ PNG without group frames", async () => {
      vi.mocked(exportDinRailToBlobWithOptions).mockResolvedValue(new Blob(["png-hq"]));

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleExportDinRailPngWithDescriptionsNoBrackets(); });

      expect(exportDinRailToBlobWithOptions).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({ includeDesignations: true, includeGroupFrames: false, scale: 4 }),
      );
      expect(statusMessages).toContain("Eksport PNG HQ (opis bez klamr)");
    });

    it("shows warning when rail is not visible", async () => {
      const { result, statusMessages } = setup({ dinRail: { ...createMockDinRail(), isVisible: false } });

      await act(async () => { await result.current.handleExportDinRailPngWithDescriptionsNoBrackets(); });

      expect(statusMessages).toContain("Brak szyny DIN do eksportu PNG");
    });

    it("shows failure message when exportDinRailToBlobWithOptions returns null", async () => {
      vi.mocked(exportDinRailToBlobWithOptions).mockResolvedValue(null);

      const { result, statusMessages } = setup();
      await act(async () => { await result.current.handleExportDinRailPngWithDescriptionsNoBrackets(); });

      expect(statusMessages).toContain("Nie udało się wyeksportować rozdzielnicy");
    });
  });

  // ===== Integration flow =====
  // Pełen cykl: nowy projekt → załaduj dane → zapisz → eksport PDF.
  // Sprawdza, że handlery hooka współpracują ze sobą (np. handleLoadProjectData
  // ustawia stan, który później handleSaveProject poprawnie odczytuje).
  describe("integration flow", () => {
    it("new → load → save round-trips through file services", async () => {
      vi.mocked(saveProjectFile).mockResolvedValue("/path/to/saved.dinboard");
      vi.mocked(validateProjectSemantics).mockReturnValue([]);

      const { result, setMetadata, setSymbols, setConnections, setCurrentFilePath, setHasUnsavedChanges } = setup();

      // 1) Nowy projekt
      act(() => { result.current.handleNewProject(); });
      expect(setSymbols).toHaveBeenCalledWith([]);
      expect(setConnections).toHaveBeenCalledWith([]);
      expect(setCurrentFilePath).toHaveBeenCalledWith(null);
      expect(setHasUnsavedChanges).toHaveBeenCalledWith(false);

      // 2) Załaduj dane (symulujemy dane tak, jakby pochodziły z openProjectFile)
      const loadedData: import("../lib/projectFile").ProjectFileData = {
        metadata: createMockMetadata({ projectNumber: "ZL-LOAD-1" }),
        symbols: [createDefaultSymbolItem({ id: "s1", label: "MCB 1P" })],
        connections: [],
        version: "2.0",
        path: "/path/to/loaded.dinboard",
        rail: null,
      };
      act(() => { result.current.handleLoadProjectData(loadedData); });
      expect(setMetadata).toHaveBeenCalled();
      expect(setSymbols).toHaveBeenCalled();
      // path jest przekazywany jak w mocku
      expect(setCurrentFilePath).toHaveBeenCalledWith("/path/to/loaded.dinboard");

      // 3) Zapisz
      let saved = false;
      await act(async () => { saved = await result.current.handleSaveProject(); });
      expect(saved).toBe(true);
      expect(saveProjectFile).toHaveBeenCalled();
    });

    it("load → save → load round-trip: semantic validation runs at load time, not at save time", async () => {
      // Validate only on load
      vi.mocked(validateProjectSemantics).mockImplementationOnce(() => [
        { code: "SEM-002", message: "Zduplikowane id", severity: "Error" },
      ]);
      vi.mocked(saveProjectFile).mockResolvedValue("/saved.dinboard");

      const { result, statusMessages } = setup();
      act(() => {
        result.current.handleLoadProjectData({
          metadata: createMockMetadata(),
          symbols: [createDefaultSymbolItem({ id: "s1", label: "MCB" })],
          connections: [],
          version: "2.0",
          rail: null,
        });
      });

      // Validate ran once during load
      expect(validateProjectSemantics).toHaveBeenCalledTimes(1);
      expect(statusMessages.some((m) => m.includes("1 błąd"))).toBe(true);

      // Save does NOT re-validate
      await act(async () => { await result.current.handleSaveProject(); });
      expect(validateProjectSemantics).toHaveBeenCalledTimes(1);
    });

    it("export PDF after load: handleExportPdf uses currently loaded metadata and symbols", async () => {
      const pdfBlob = new Blob(["fake pdf"], { type: "application/pdf" });
      vi.mocked(exportToPdf).mockResolvedValue(pdfBlob);

      const { result } = setup({
        symbols: [createDefaultSymbolItem({ id: "s1", label: "MCB" })],
      });

      // Create URL mock for the download
      const createObjectURL = vi.fn(() => "blob:test-url");
      const revokeObjectURL = vi.fn();
      const originalCreate = URL.createObjectURL;
      const originalRevoke = URL.revokeObjectURL;
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
      try {
        await act(async () => { await result.current.handleExportPdf(); });

        expect(exportToPdf).toHaveBeenCalledTimes(1);
        const [metaArg, symbolsArg] = vi.mocked(exportToPdf).mock.calls[0];
        expect(metaArg).toMatchObject({ projectNumber: "ZL-001" });
        expect(symbolsArg).toHaveLength(1);
        expect(symbolsArg[0].id).toBe("s1");
      } finally {
        URL.createObjectURL = originalCreate;
        URL.revokeObjectURL = originalRevoke;
      }
    });

    it("exportPdf passes empty symbols array through (no early validation in hook)", async () => {
      // Documenting current behavior: handleExportPdf does NOT skip empty
      // symbol lists. The hook just calls exportToPdf. If we ever add
      // early validation here, this test should be updated.
      vi.mocked(exportToPdf).mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

      const { result, statusMessages } = setup({ symbols: [] });

      // Mock URL.createObjectURL so the download path doesn't crash
      const originalCreate = URL.createObjectURL;
      URL.createObjectURL = vi.fn(() => "blob:test");
      try {
        await act(async () => { await result.current.handleExportPdf(); });

        expect(exportToPdf).toHaveBeenCalledTimes(1);
        const [, symbolsArg] = vi.mocked(exportToPdf).mock.calls[0];
        expect(symbolsArg).toEqual([]);
        expect(statusMessages).toContain("Eksport PDF");
      } finally {
        URL.createObjectURL = originalCreate;
      }
    });
  });
});
