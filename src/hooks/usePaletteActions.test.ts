import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePaletteActions } from "./usePaletteActions";
import type { PaletteTemplate, SymbolHistorySnapshot } from "../lib/appHelpers";
import type { SymbolItem } from "../types/symbolItem";
import type { DinRailCanvasRail } from "../components/DinRailCanvas";

// WHY: hook importuje @capacitor/* — w środowisku jsdom musimy zastąpić te moduły,
// bo natywne wtyczki nie istnieją w przeglądarce testowej (wzorzec z useSymbolActions.test.ts).
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));
vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: { Light: "light", Medium: "medium" },
  NotificationType: { Success: "success" },
}));

// Minimalny, widoczny rail 3 rzędy × 12 modułów — wystarczy, by slot-on-rail
// i getDinRailDimensions zadziałały bez zależności od renderu SVG.
const VISIBLE_RAIL: DinRailCanvasRail = {
  config: { rows: 3, modulesPerRow: 12 },
  svg: "<svg/>",
  width: 12 * 232.58,
  height: 600,
  isVisible: true,
};

function makeTemplate(overrides: Partial<PaletteTemplate>): PaletteTemplate {
  return {
    templateId: overrides.templateId ?? "tpl-1",
    code: overrides.code ?? "TEST",
    label: overrides.label ?? "Test",
    type: overrides.type ?? "Test",
    category: overrides.category ?? "Aparatura",
    deviceKind: overrides.deviceKind ?? "other",
    phase: overrides.phase ?? "L1",
    modules: overrides.modules ?? 1,
    moduleRef: overrides.moduleRef ?? "Aparatura/test.svg",
    assetPath: overrides.assetPath ?? "/assets/modules/Aparatura/test.svg",
    ...overrides,
  };
}

interface SetupOptions {
  templates?: PaletteTemplate[];
  symbols?: SymbolItem[];
  activeSheet?: "sheet1" | "sheet2";
  rail?: DinRailCanvasRail;
}

function setup(options: SetupOptions = {}) {
  const templates = options.templates ?? [];
  const paletteTemplateMap = new Map(templates.map((t) => [t.templateId, t]));

  const commands: Array<{
    label: string;
    before: SymbolHistorySnapshot;
    after: SymbolHistorySnapshot;
  }> = [];
  const sheetChanges: string[] = [];
  let symbols = options.symbols ?? [];

  const result = renderHook(() =>
    usePaletteActions({
      symbols,
      paletteTemplateMap,
      dinRail: options.rail ?? VISIBLE_RAIL,
      activeSheet: (options.activeSheet ?? "sheet1") as any,
      selectedSymbol: null,
      selectedSymbolId: null,
      selectedSymbolIds: [],
      setActiveRightTab: vi.fn(),
      setActiveSheet: vi.fn((sheet: string) => sheetChanges.push(sheet)),
      executeSymbolsCommand: vi.fn(
        (
          label: string,
          _before: SymbolHistorySnapshot,
          after: SymbolHistorySnapshot,
        ): boolean => {
          commands.push({ label, before: _before, after });
          // Symulujemy commit stanu, by kolejne wywołania widziały nowy symbol.
          symbols = after.symbols;
          return true;
        },
      ),
      showTemporaryStatus: vi.fn(),
      handleOpenDinRailGenerator: vi.fn(),
      handleHidePaletteTemplate: vi.fn(),
    }),
  );

  return { ...result, commands, sheetChanges };
}

describe("usePaletteActions — handlePaletteInsert", () => {
  describe('kategoria "GSU"', () => {
    it("kładzie moduł na rozdzielnicy (sheet1) i NIE przechodzi do Schematu (sheet2)", () => {
      const gsu = makeTemplate({
        templateId: "gsu-1",
        code: "GSU",
        label: "GSU",
        category: "GSU",
        deviceKind: "terminalBlock",
        moduleRef: "GSU/GSU.svg",
      });

      const { result, commands, sheetChanges } = setup({ templates: [gsu] });

      act(() => {
        result.current.handlePaletteInsert("gsu-1");
      });

      // Nie wolno przejść na Schemat.
      expect(sheetChanges).not.toContain("sheet2");

      // Moduł trafił do rozdzielnicy: commit historii + isSnappedToRail true.
      expect(commands).toHaveLength(1);
      const added = commands[0].after.symbols;
      expect(added).toHaveLength(1);
      expect(added[0].isSnappedToRail).toBe(true);
      // Dodany moduł NIE jest automatycznie zaznaczany — decyzja użytkownika.
      expect(commands[0].after.selectedSymbolId).toBeNull();
      expect(commands[0].after.selectedSymbolIds).toEqual([]);
    });
  });

  describe('kategoria "Listwy do rozdzielnicy"', () => {
    it("kładzie moduł na rozdzielnicy (sheet1) i NIE przechodzi do Schematu (sheet2)", () => {
      const listwa = makeTemplate({
        templateId: "listwa-1",
        code: "LISTWA",
        label: "Listwa",
        category: "Listwy do rozdzielnicy",
        deviceKind: "terminalBlock",
        moduleRef: "Listwy do rozdzielnicy/listwa.svg",
      });

      const { result, commands, sheetChanges } = setup({ templates: [listwa] });

      act(() => {
        result.current.handlePaletteInsert("listwa-1");
      });

      expect(sheetChanges).not.toContain("sheet2");
      expect(commands).toHaveLength(1);
      const added = commands[0].after.symbols;
      expect(added).toHaveLength(1);
      expect(added[0].isSnappedToRail).toBe(true);
    });
  });

  describe("regresja: moduł zwykły (obsługujący szynę)", () => {
    it("kładzie się na rozdzielnicy bez przejścia do Schematu", () => {
      const mcb = makeTemplate({
        templateId: "mcb-1",
        code: "MCB16",
        category: "Aparatura",
        deviceKind: "mcb",
        modules: 1,
      });

      const { result, commands, sheetChanges } = setup({ templates: [mcb] });

      act(() => {
        result.current.handlePaletteInsert("mcb-1");
      });

      expect(sheetChanges).not.toContain("sheet2");
      expect(commands).toHaveLength(1);
      expect(commands[0].after.symbols[0].isSnappedToRail).toBe(true);
      // Zwykły moduł również nie jest automatycznie zaznaczany.
      expect(commands[0].after.selectedSymbolId).toBeNull();
      expect(commands[0].after.selectedSymbolIds).toEqual([]);
    });
  });

  describe("nie zaznacza automatycznie dodanego modułu", () => {
    // WHY: decyzja o zaznaczeniu należy do użytkownika. Kliknie moduł, by
    // zaznaczyć; kliknie w puste pole, by odznaczyć (useDinRailInteraction).
    it("snapshot 'after' ma pustą selekcję (selectedSymbolId null, ids [])", () => {
      const mcb = makeTemplate({
        templateId: "mcb-auto",
        code: "MCB16",
        category: "Aparatura",
        deviceKind: "mcb",
      });

      const { result, commands } = setup({ templates: [mcb] });

      act(() => {
        result.current.handlePaletteInsert("mcb-auto");
      });

      expect(commands).toHaveLength(1);
      const after = commands[0].after;
      expect(after.symbols).toHaveLength(1);
      expect(after.selectedSymbolId).toBeNull();
      expect(after.selectedSymbolIds).toEqual([]);
    });
  });

  describe("gdy szyna DIN jest niewidoczna", () => {
    it("otwiera generator szyny i NIE dodaje symbolu", () => {
      const gsu = makeTemplate({ category: "GSU", deviceKind: "terminalBlock" });
      const hiddenRail: DinRailCanvasRail = { ...VISIBLE_RAIL, isVisible: false };

      const { result, commands, sheetChanges } = setup({
        templates: [gsu],
        rail: hiddenRail,
      });

      act(() => {
        result.current.handlePaletteInsert(gsu.templateId);
      });

      // Wczesny return w handlePaletteDrop (brak widocznej szyny) — brak commitu,
      // brak przejścia na Schemat. Zachowanie niezależne od mojej zmiany.
      expect(commands).toHaveLength(0);
      expect(sheetChanges).not.toContain("sheet2");
    });
  });
});
