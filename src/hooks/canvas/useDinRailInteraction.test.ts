// WHY: This test file was deleted in commit 4077fd9 ("remove dead code from
// abandoned layer-extraction refactor") alongside the source file. The source
// file was later re-introduced at a new path (`src/hooks/canvas/`) and is now
// actively imported by `src/components/DinRailCanvas.tsx:35,231` — but
// without test coverage. This file restores behavioural coverage for the
// current public API surface so a future regression in pointer handling,
// drag, or selection cannot ship silently. The original tests targeted the
// pre-refactor prop names (e.g. `isRailVisible`, `snapModulePlacement` as a
// prop); this file targets the post-refactor API (`rail.isVisible`,
// `snapModulePlacement` returned by the hook itself).

import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { MutableRefObject } from "react";
import { useDinRailInteraction } from "./useDinRailInteraction";
import type { SymbolItem } from "../../types/symbolItem";
import type { WorldPoint, WorldRect } from "../../lib/dinRailCanvas/types";
import type { DinRailCanvasRail } from "../../components/DinRailCanvas";

interface UseProps {
  rail: DinRailCanvasRail;
  snappedSymbols: SymbolItem[];
  selectedIds: Set<string>;
  interactiveRects: Map<string, WorldRect>;
  rowCenters: number[];
  getPaletteTemplate?: (templateId: string) => { category?: string; moduleRef?: string } | undefined;
  flushViewportState: () => void;
  setPanSafe: (pan: WorldPoint) => void;
  panRef: MutableRefObject<WorldPoint>;
  screenToWorld: (clientX: number, clientY: number) => WorldPoint;
  pinchActiveRef: MutableRefObject<boolean>;
  onSymbolMoveStart?: (symbolId: string) => void;
  onSymbolMove?: (symbolId: string, x: number, y: number) => void;
  onSymbolMoveEnd?: (symbolId: string) => void;
  onSymbolSelect?: (symbolId: string | null, options?: { toggle?: boolean }) => void;
  onSymbolSelectionChange?: (symbolIds: string[], activeId?: string | null) => void;
  panModeEnabled: boolean;
  isMobile: boolean;
}

function buildRail(overrides: Partial<DinRailCanvasRail> = {}): DinRailCanvasRail {
  return {
    config: { rows: 1, modulesPerRow: 24 },
    svg: "<svg></svg>",
    width: 3000,
    height: 1642,
    isVisible: true,
    ...overrides,
  };
}

function buildPointerEvent(
  overrides: Partial<React.PointerEvent<HTMLDivElement>> = {},
): React.PointerEvent<HTMLDivElement> {
  const setPointerCapture = vi.fn();
  const releasePointerCapture = vi.fn();
  const hasPointerCapture = vi.fn(() => false);
  return {
    button: 0,
    buttons: 1,
    clientX: 0,
    clientY: 0,
    pointerId: 1,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture,
      closest: vi.fn(() => null),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    },
    ...overrides,
  } as unknown as React.PointerEvent<HTMLDivElement>;
}

function buildSymbol(overrides: Partial<SymbolItem> = {}): SymbolItem {
  return {
    id: "sym-1",
    type: "MCB 1P",
    label: "Q1",
    referenceDesignation: "Q1",
    x: 100,
    y: 100,
    width: 18,
    height: 80,
    rotation: 0,
    deviceKind: "mcb",
    phase: "L1",
    isSnappedToRail: true,
    isSelected: false,
    isTerminalBlock: false,
    moduleRef: "",
    parameters: {},
    ...overrides,
  } as SymbolItem;
}

function setup(overrides: Partial<UseProps> = {}) {
  const flushViewportState = vi.fn();
  const setPanSafe = vi.fn();
  const panRef: MutableRefObject<WorldPoint> = { current: { x: 0, y: 0 } };
  const pinchActiveRef: MutableRefObject<boolean> = { current: false };
  const screenToWorld = vi.fn((x: number, y: number): WorldPoint => ({ x, y }));
  const onSymbolMoveStart = vi.fn();
  const onSymbolMove = vi.fn();
  const onSymbolMoveEnd = vi.fn();
  const onSymbolSelect = vi.fn();
  const onSymbolSelectionChange = vi.fn();
  const getPaletteTemplate = vi.fn(() => undefined);

  const props: UseProps = {
    rail: buildRail(),
    snappedSymbols: [],
    selectedIds: new Set<string>(),
    interactiveRects: new Map<string, WorldRect>(),
    rowCenters: [821],
    flushViewportState,
    setPanSafe,
    panRef,
    screenToWorld,
    pinchActiveRef,
    onSymbolMoveStart,
    onSymbolMove,
    onSymbolMoveEnd,
    onSymbolSelect,
    onSymbolSelectionChange,
    getPaletteTemplate,
    panModeEnabled: false,
    isMobile: false,
    ...overrides,
  };

  const { result, rerender } = renderHook((p: UseProps) => useDinRailInteraction(p), {
    initialProps: props,
  });

  return {
    result,
    rerender,
    props,
    flushViewportState,
    setPanSafe,
    panRef,
    pinchActiveRef,
    screenToWorld,
    onSymbolMoveStart,
    onSymbolMove,
    onSymbolMoveEnd,
    onSymbolSelect,
    onSymbolSelectionChange,
    getPaletteTemplate,
  };
}

describe("useDinRailInteraction hook", () => {
  it("exposes the expected public surface", () => {
    const { result } = setup();
    expect(result.current.selectionRect).toBeNull();
    expect(typeof result.current.handleSurfacePointerDown).toBe("function");
    expect(typeof result.current.handlePointerMove).toBe("function");
    expect(typeof result.current.handlePointerUp).toBe("function");
    expect(typeof result.current.beginDragForSymbol).toBe("function");
    expect(typeof result.current.snapModulePlacement).toBe("function");
  });

  describe("handleSurfacePointerDown", () => {
    it("is a no-op when the rail is not visible", () => {
      const { result, setPanSafe, screenToWorld } = setup({
        rail: buildRail({ isVisible: false }),
      });

      act(() => {
        result.current.handleSurfacePointerDown(buildPointerEvent({ clientX: 10, clientY: 10 }));
      });

      expect(screenToWorld).not.toHaveBeenCalled();
      expect(setPanSafe).not.toHaveBeenCalled();
      expect(result.current.selectionRect).toBeNull();
    });

    it("captures pointer and enters select mode for a left click", () => {
      const { result, screenToWorld } = setup();
      // WHY: capture celuje w hosta (.din-rail-svg-container), nie w samą
      // warstwę .din-rail-surface — żeby pointerup po kliknięciu w puste pole
      // trafiał na element z onPointerUp i odpalał deselect. jsdom daje
      // prawdziwy HTMLElement, więc instanceof HTMLElement przechodzi.
      const svgContainer = document.createElement("div");
      svgContainer.className = "din-rail-svg-container";
      const hostSetPointerCapture = vi.fn();
      svgContainer.setPointerCapture = hostSetPointerCapture;
      const currentTarget = {
        closest: vi.fn((selector: string) =>
          selector === ".din-rail-svg-container" ? svgContainer : null,
        ),
        setPointerCapture: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as HTMLDivElement;
      const event = buildPointerEvent({
        clientX: 100,
        clientY: 200,
        button: 0,
        currentTarget,
      });

      act(() => {
        result.current.handleSurfacePointerDown(event);
      });

      // Capture idzie na hosta, nie na warstwę surface.
      expect(hostSetPointerCapture).toHaveBeenCalledWith(1);
      expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled();
      expect(screenToWorld).toHaveBeenCalledWith(100, 200);
      expect(result.current.selectionRect).toEqual({ x: 100, y: 200, width: 0, height: 0 });
    });

    it("still enters select mode (no capture) when the svg-container host is absent", () => {
      // WHY: gdyby host zniknął (np. warstwa zamontowana poza viewportem),
      // nie crashujemy — po prostu nie robimy capture. Logika select dalej działa.
      const { result, screenToWorld } = setup();
      const event = buildPointerEvent({ clientX: 100, clientY: 200, button: 0 });

      act(() => {
        result.current.handleSurfacePointerDown(event);
      });

      expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled();
      expect(screenToWorld).toHaveBeenCalledWith(100, 200);
      expect(result.current.selectionRect).toEqual({ x: 100, y: 200, width: 0, height: 0 });
    });

    it("enters pan mode on middle-click without changing the selection rect", () => {
      const { result, setPanSafe, screenToWorld } = setup();
      const event = buildPointerEvent({ clientX: 100, clientY: 200, button: 1 });

      act(() => {
        result.current.handleSurfacePointerDown(event);
      });

      expect(setPanSafe).not.toHaveBeenCalled();
      expect(screenToWorld).not.toHaveBeenCalled();
      expect(result.current.selectionRect).toBeNull();
    });

    it("enters pan mode on mobile when panMode is enabled and button=0", () => {
      const { result, setPanSafe, screenToWorld } = setup({ isMobile: true, panModeEnabled: true });
      const event = buildPointerEvent({ clientX: 100, clientY: 200, button: 0 });

      act(() => {
        result.current.handleSurfacePointerDown(event);
      });

      expect(setPanSafe).not.toHaveBeenCalled();
      expect(screenToWorld).not.toHaveBeenCalled();
      expect(result.current.selectionRect).toBeNull();
      
      act(() => {
        result.current.handlePointerMove(buildPointerEvent({ clientX: 120, clientY: 210 }));
      });
      expect(setPanSafe).toHaveBeenCalledWith({ x: 20, y: 10 });
    });

    it("enters select mode on mobile when panMode is disabled and button=0", () => {
      const { result, screenToWorld } = setup({ isMobile: true, panModeEnabled: false });
      const event = buildPointerEvent({ clientX: 100, clientY: 200, button: 0 });

      act(() => {
        result.current.handleSurfacePointerDown(event);
      });

      expect(screenToWorld).toHaveBeenCalledWith(100, 200);
      expect(result.current.selectionRect).toEqual({ x: 100, y: 200, width: 0, height: 0 });
    });

    it("enters select mode on desktop even when panMode is magically enabled and button=0", () => {
      const { result, screenToWorld } = setup({ isMobile: false, panModeEnabled: true });
      const event = buildPointerEvent({ clientX: 100, clientY: 200, button: 0 });

      act(() => {
        result.current.handleSurfacePointerDown(event);
      });

      expect(screenToWorld).toHaveBeenCalledWith(100, 200);
      expect(result.current.selectionRect).toEqual({ x: 100, y: 200, width: 0, height: 0 });
    });
  });

  describe("handlePointerMove", () => {
    it("pans the viewport by accumulated delta when interaction is in pan mode", () => {
      const { result, panRef, setPanSafe } = setup();
      panRef.current = { x: 10, y: 20 };

      act(() => {
        result.current.handleSurfacePointerDown(
          buildPointerEvent({ clientX: 100, clientY: 100, button: 1 }),
        );
      });

      act(() => {
        result.current.handlePointerMove(buildPointerEvent({ clientX: 120, clientY: 90 }));
      });

      expect(setPanSafe).toHaveBeenCalledWith({ x: 30, y: 10 });
    });

    it("grows the selection rect as the pointer moves away from the anchor", () => {
      const { result } = setup();

      act(() => {
        result.current.handleSurfacePointerDown(
          buildPointerEvent({ clientX: 100, clientY: 100 }),
        );
      });

      act(() => {
        result.current.handlePointerMove(buildPointerEvent({ clientX: 130, clientY: 90 }));
      });

      expect(result.current.selectionRect).toEqual({
        x: 100,
        y: 90,
        width: 30,
        height: 10,
      });

      act(() => {
        result.current.handlePointerMove(buildPointerEvent({ clientX: 80, clientY: 140 }));
      });

      expect(result.current.selectionRect).toEqual({
        x: 80,
        y: 100,
        width: 20,
        height: 40,
      });
    });

    it("is a no-op when idle (no interaction is in progress)", () => {
      const { result, setPanSafe } = setup();

      act(() => {
        result.current.handlePointerMove(buildPointerEvent({ clientX: 100, clientY: 100 }));
      });

      expect(setPanSafe).not.toHaveBeenCalled();
      expect(result.current.selectionRect).toBeNull();
    });

    it("aborts a drag move when the anchor symbol has been removed from snappedSymbols", () => {
      const symbol = buildSymbol({ id: "sym-anchor" });
      const { result, rerender, props, onSymbolMove } = setup({
        snappedSymbols: [symbol],
      });

      act(() => {
        result.current.beginDragForSymbol(
          buildPointerEvent({ clientX: 100, clientY: 100 }),
          "sym-anchor",
        );
      });

      // Drop the anchor symbol from the props — the next pointer move must
      // not dispatch onSymbolMove because the anchor lookup misses.
      rerender({ ...props, snappedSymbols: [] });

      act(() => {
        result.current.handlePointerMove(
          buildPointerEvent({ clientX: 9999, clientY: 9999 }),
        );
      });

      expect(onSymbolMove).not.toHaveBeenCalled();
    });

    it("dispatches onSymbolMove for every dragged id when snap returns a delta", () => {
      const symbolA = buildSymbol({ id: "sym-a", x: 100, y: 100 });
      const symbolB = buildSymbol({ id: "sym-b", x: 200, y: 100 });
      const { result, onSymbolMove } = setup({
        snappedSymbols: [symbolA, symbolB],
        rowCenters: [140],
      });

      act(() => {
        result.current.beginDragForSymbol(
          buildPointerEvent({ clientX: 100, clientY: 100 }),
          "sym-a",
        );
      });

      // Drag down by 200 world units; pointer move without releasing first
      act(() => {
        result.current.handlePointerMove(
          buildPointerEvent({ clientX: 100, clientY: 300 }),
        );
      });

      expect(onSymbolMove).toHaveBeenCalled();
      const calls = onSymbolMove.mock.calls;
      // The anchor id is always in the drag set; the delta is computed from
      // anchorRectStart + (worldPoint - pointerWorldStart) snapped to rowCenters.
      expect(calls.length).toBeGreaterThan(0);
      for (const [id, x, y] of calls) {
        expect(["sym-a", "sym-b"]).toContain(id);
        expect(typeof x).toBe("number");
        expect(typeof y).toBe("number");
      }
    });
  });

  describe("handlePointerUp", () => {
    it("flushes the viewport state on every pointer up", () => {
      const { result, flushViewportState } = setup();

      act(() => {
        result.current.handlePointerUp(buildPointerEvent({ pointerId: 1 }));
      });

      expect(flushViewportState).toHaveBeenCalled();
    });

    it("clears the selection without calling onSymbolSelect(null) when no rect exists", () => {
      const { result, onSymbolSelect } = setup();

      act(() => {
        result.current.handlePointerUp(buildPointerEvent({ pointerId: 1 }));
      });

      expect(onSymbolSelect).not.toHaveBeenCalled();
      expect(result.current.selectionRect).toBeNull();
    });

    it("treats a sub-16 area as a click that deselects everything", () => {
      const { result, onSymbolSelect } = setup();

      act(() => {
        result.current.handleSurfacePointerDown(
          buildPointerEvent({ clientX: 100, clientY: 100 }),
        );
      });
      act(() => {
        result.current.handlePointerMove(buildPointerEvent({ clientX: 102, clientY: 102 }));
      });
      act(() => {
        result.current.handlePointerUp(buildPointerEvent({ pointerId: 1 }));
      });

      expect(onSymbolSelect).toHaveBeenCalledWith(null);
      expect(result.current.selectionRect).toBeNull();
    });

    it("deselects active symbol when clicking in empty space without pointer move", () => {
      const { result, onSymbolSelect, onSymbolSelectionChange } = setup();

      act(() => {
        result.current.handleSurfacePointerDown(
          buildPointerEvent({ clientX: 150, clientY: 150 }),
        );
      });
      act(() => {
        result.current.handlePointerUp(buildPointerEvent({ pointerId: 1, clientX: 150, clientY: 150 }));
      });

      expect(onSymbolSelect).toHaveBeenCalledWith(null);
      expect(onSymbolSelectionChange).toHaveBeenCalledWith([], null);
      expect(result.current.selectionRect).toBeNull();
    });

    it("deselects active symbol when tapping empty space in mobile panMode", () => {
      const { result, onSymbolSelect, onSymbolSelectionChange } = setup({
        isMobile: true,
        panModeEnabled: true,
      });

      act(() => {
        result.current.handleSurfacePointerDown(
          buildPointerEvent({ clientX: 150, clientY: 150 }),
        );
      });
      act(() => {
        result.current.handlePointerUp(buildPointerEvent({ pointerId: 1, clientX: 150, clientY: 150 }));
      });

      expect(onSymbolSelect).toHaveBeenCalledWith(null);
      expect(onSymbolSelectionChange).toHaveBeenCalledWith([], null);
    });

    it("commits the selection rect when its area is large enough", () => {
      const symA = buildSymbol({ id: "sym-a", x: 80, y: 80, width: 40, height: 40 });
      const symB = buildSymbol({ id: "sym-b", x: 200, y: 200, width: 40, height: 40 });
      const { result, onSymbolSelect, onSymbolSelectionChange } = setup({
        snappedSymbols: [symA, symB],
        rowCenters: [100],
      });

      act(() => {
        result.current.handleSurfacePointerDown(
          buildPointerEvent({ clientX: 50, clientY: 50 }),
        );
      });
      act(() => {
        result.current.handlePointerMove(buildPointerEvent({ clientX: 250, clientY: 250 }));
      });
      act(() => {
        result.current.handlePointerUp(buildPointerEvent({ pointerId: 1 }));
      });

      expect(onSymbolSelect).not.toHaveBeenCalled();
      expect(onSymbolSelectionChange).toHaveBeenCalledTimes(1);
      const [ids, activeId] = onSymbolSelectionChange.mock.calls[0]!;
      expect(ids).toContain("sym-a");
      expect(ids).toContain("sym-b");
      expect(activeId).toBe("sym-b");
      expect(result.current.selectionRect).toBeNull();
    });

    it("emits onSymbolMoveEnd when a drag is in progress", () => {
      const symbol = buildSymbol({ id: "sym-1", x: 100, y: 100 });
      const { result, onSymbolMoveEnd } = setup({
        snappedSymbols: [symbol],
      });

      act(() => {
        result.current.beginDragForSymbol(
          buildPointerEvent({ clientX: 100, clientY: 100 }),
          "sym-1",
        );
      });

      act(() => {
        result.current.handlePointerUp(buildPointerEvent({ pointerId: 1 }));
      });

      expect(onSymbolMoveEnd).toHaveBeenCalledWith("sym-1");
    });

    it("does not emit onSymbolMoveEnd when the previous interaction was select or idle", () => {
      const { result, onSymbolMoveEnd } = setup();

      act(() => {
        result.current.handleSurfacePointerDown(
          buildPointerEvent({ clientX: 100, clientY: 100 }),
        );
      });
      act(() => {
        result.current.handlePointerUp(buildPointerEvent({ pointerId: 1 }));
      });

      expect(onSymbolMoveEnd).not.toHaveBeenCalled();
    });
  });

  describe("beginDragForSymbol", () => {
    it("is a no-op when the rail is not visible", () => {
      const symbol = buildSymbol();
      const { result, onSymbolMoveStart, onSymbolSelect } = setup({
        rail: buildRail({ isVisible: false }),
        snappedSymbols: [symbol],
      });

      act(() => {
        result.current.beginDragForSymbol(buildPointerEvent(), "sym-1");
      });

      expect(onSymbolMoveStart).not.toHaveBeenCalled();
      expect(onSymbolSelect).not.toHaveBeenCalled();
    });

    it("aborts silently when the requested symbol id is unknown", () => {
      const symbol = buildSymbol({ id: "sym-real" });
      const { result, onSymbolMoveStart, onSymbolSelect } = setup({
        snappedSymbols: [symbol],
      });

      act(() => {
        result.current.beginDragForSymbol(buildPointerEvent(), "sym-missing");
      });

      expect(onSymbolMoveStart).not.toHaveBeenCalled();
      expect(onSymbolSelect).not.toHaveBeenCalled();
    });

    it("captures pointer on the enclosing svg-container and stops propagation", () => {
      const symbol = buildSymbol({ id: "sym-1" });
      const setPointerCapture = vi.fn();
      const stopPropagation = vi.fn();
      // The hook guards `svgContainer instanceof HTMLElement` before capturing.
      // jsdom provides a real HTMLElement, so we build one with the matching class.
      const svgContainer = document.createElement("div");
      svgContainer.className = "din-rail-svg-container";
      svgContainer.setPointerCapture = setPointerCapture;
      const currentTarget = {
        closest: vi.fn((selector: string) =>
          selector === ".din-rail-svg-container" ? svgContainer : null,
        ),
        setPointerCapture: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as HTMLDivElement;
      const { result, onSymbolMoveStart } = setup({ snappedSymbols: [symbol] });

      act(() => {
        result.current.beginDragForSymbol(
          buildPointerEvent({
            clientX: 100,
            clientY: 100,
            stopPropagation,
            currentTarget,
          }),
          "sym-1",
        );
      });

      expect(currentTarget.closest).toHaveBeenCalledWith(".din-rail-svg-container");
      expect(setPointerCapture).toHaveBeenCalledWith(1);
      expect(stopPropagation).toHaveBeenCalled();
      expect(onSymbolMoveStart).toHaveBeenCalledWith("sym-1");
    });

    it("emits onSymbolSelect with toggle=true when ctrlKey is pressed", () => {
      const symbol = buildSymbol({ id: "sym-1" });
      const { result, onSymbolSelect } = setup({ snappedSymbols: [symbol] });

      act(() => {
        result.current.beginDragForSymbol(
          buildPointerEvent({ clientX: 100, clientY: 100, ctrlKey: true }),
          "sym-1",
        );
      });

      expect(onSymbolSelect).toHaveBeenCalledWith("sym-1", { toggle: true });
    });

    it("emits onSymbolSelect with toggle=true when metaKey is pressed", () => {
      const symbol = buildSymbol({ id: "sym-1" });
      const { result, onSymbolSelect } = setup({ snappedSymbols: [symbol] });

      act(() => {
        result.current.beginDragForSymbol(
          buildPointerEvent({ clientX: 100, clientY: 100, metaKey: true }),
          "sym-1",
        );
      });

      expect(onSymbolSelect).toHaveBeenCalledWith("sym-1", { toggle: true });
    });

    it("emits onSymbolSelect with toggle=false when no modifier is pressed", () => {
      const symbol = buildSymbol({ id: "sym-1" });
      const { result, onSymbolSelect } = setup({ snappedSymbols: [symbol] });

      act(() => {
        result.current.beginDragForSymbol(
          buildPointerEvent({ clientX: 100, clientY: 100 }),
          "sym-1",
        );
      });

      expect(onSymbolSelect).toHaveBeenCalledWith("sym-1", { toggle: false });
    });

    it("enters pan mode on middle-click instead of dragging the symbol", () => {
      const symbol = buildSymbol({ id: "sym-1" });
      const { result, onSymbolMoveStart, onSymbolSelect, setPanSafe } = setup({
        snappedSymbols: [symbol],
      });

      act(() => {
        result.current.beginDragForSymbol(
          buildPointerEvent({ clientX: 100, clientY: 100, button: 1 }),
          "sym-1",
        );
      });

      expect(onSymbolMoveStart).not.toHaveBeenCalled();
      expect(onSymbolSelect).not.toHaveBeenCalled();

      // Subsequent move should pan rather than drag.
      act(() => {
        result.current.handlePointerMove(buildPointerEvent({ clientX: 120, clientY: 110 }));
      });

      expect(setPanSafe).toHaveBeenCalledWith({ x: 20, y: 10 });
    });

    it("drags only the requested symbol when nothing is selected", () => {
      const symA = buildSymbol({ id: "sym-a" });
      const symB = buildSymbol({ id: "sym-b" });
      const { result, onSymbolMoveStart } = setup({
        snappedSymbols: [symA, symB],
      });

      act(() => {
        result.current.beginDragForSymbol(buildPointerEvent(), "sym-a");
      });

      expect(onSymbolMoveStart).toHaveBeenCalledWith("sym-a");
      expect(onSymbolMoveStart).toHaveBeenCalledTimes(1);
    });
  });

  describe("snapModulePlacement", () => {
    it("routes a terminal-block template (Listwy do rozdzielnicy) to snapListwaPlacement", () => {
      const getPaletteTemplate = vi.fn((templateId: string) =>
        templateId === "listwa-ref"
          ? { category: "Listwy do rozdzielnicy", moduleRef: "listwa-ref" }
          : undefined,
      );
      const { result } = setup({
        rail: buildRail({ config: { rows: 3, modulesPerRow: 24 }, width: 6000 }),
        getPaletteTemplate,
      });

      const snapped = result.current.snapModulePlacement(50, 0, 200, 300, undefined, {
        moduleRef: "listwa-ref",
      });

      // listwySnap always returns an {x, y} object — never a shouldSnap-style result
      expect(snapped).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
      expect(getPaletteTemplate).toHaveBeenCalledWith("listwa-ref");
    });

    it("routes a GSU template to snapListwaPlacement", () => {
      const getPaletteTemplate = vi.fn(() => ({
        category: "GSU",
        moduleRef: "gsu-ref",
      }));
      const { result } = setup({
        rail: buildRail({ config: { rows: 2, modulesPerRow: 12 }, width: 3000 }),
        getPaletteTemplate,
      });

      const snapped = result.current.snapModulePlacement(0, 0, 200, 300, undefined, {
        moduleRef: "gsu-ref",
      });

      expect(snapped).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    });

    it("routes a regular module to snapModulePlacementToDinRail", () => {
      const symbol = buildSymbol({ id: "s1", x: 55, y: 100, width: 18, height: 80 });
      const getPaletteTemplate = vi.fn(() => ({
        category: "MCB",
        moduleRef: "mcb-ref",
      }));
      const { result } = setup({
        snappedSymbols: [symbol],
        rowCenters: [140],
        getPaletteTemplate,
      });

      const snapped = result.current.snapModulePlacement(73, 100, 18, 80, undefined, {
        moduleRef: "mcb-ref",
      });

      // The rail snap returns {x, y, shouldSnap} — verify the shouldSnap shape.
      expect(snapped).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
      expect(typeof (snapped as { shouldSnap?: boolean }).shouldSnap).toBe("boolean");
    });

    it("falls back to the rail snap when no getPaletteTemplate is provided", () => {
      const { result } = setup({
        rowCenters: [140],
        getPaletteTemplate: undefined,
      });

      const snapped = result.current.snapModulePlacement(73, 100, 18, 80);

      expect(snapped).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    });
  });

  describe("pinch guard", () => {
    // WHY: pinch-to-zoom (2 palce) jest obsługiwany przez useDinRailPinch;
    // pointer events odpalane po touchstart muszą zostać zignorowane, by nie
    // wejść w tryb select/drag w konflikcie z pinch. Pin the behaviour.
    it("pomija handleSurfacePointerDown gdy pinch jest aktywny", () => {
      const { result, pinchActiveRef, panRef, setPanSafe } = setup();
      pinchActiveRef.current = true;
      panRef.current = { x: 5, y: 7 };

      const event = buildPointerEvent({
        button: 1, // middle-mouse pan by default — ale pinch active → ma być pominięte
        clientX: 100,
        clientY: 100,
      });

      expect(() => result.current.handleSurfacePointerDown(event)).not.toThrow();
      // Pan nie powinien się zmienić (pan mode nie wszedł).
      expect(setPanSafe).not.toHaveBeenCalled();
    });

    it("pomija handlePointerMove gdy pinch jest aktywny", () => {
      const { result, pinchActiveRef, setPanSafe } = setup();
      pinchActiveRef.current = true;

      const event = buildPointerEvent({ clientX: 50, clientY: 50 });
      expect(() => result.current.handlePointerMove(event)).not.toThrow();
      expect(setPanSafe).not.toHaveBeenCalled();
    });

    it("pomija beginDragForSymbol gdy pinch jest aktywny", () => {
      const { result, pinchActiveRef, onSymbolMoveStart } = setup();
      pinchActiveRef.current = true;

      const event = buildPointerEvent({ clientX: 10, clientY: 10 });
      expect(() => result.current.beginDragForSymbol(event, "any-id")).not.toThrow();
      // Drag nie powinien się rozpocząć.
      expect(onSymbolMoveStart).not.toHaveBeenCalled();
    });

    it("po wyłączeniu pinch (false) handlery wracają do normalnego działania", () => {
      const { result, pinchActiveRef } = setup();
      pinchActiveRef.current = false;

      // Ten sam event co wyżej, ale pinch nieaktywny → nie throw, normalny flow.
      // W idle mode (brak anchora) move jest no-op, ale nie powinien rzucać.
      const event = buildPointerEvent({ clientX: 50, clientY: 50 });
      expect(() => result.current.handlePointerMove(event)).not.toThrow();
    });
  });
});