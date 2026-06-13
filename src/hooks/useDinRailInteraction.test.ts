import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDinRailInteraction } from "./useDinRailInteraction";
import type { SymbolItem } from "../types/symbolItem";
import type { WorldPoint, WorldRect } from "../components/canvasLayers/canvasTypes";

describe("useDinRailInteraction hook", () => {
  const defaultProps = {
    isRailVisible: true,
    screenToWorld: (x: number, y: number): WorldPoint => ({ x, y }),
    panRef: { current: { x: 0, y: 0 } },
    setPanSafe: vi.fn(),
    flushViewportState: vi.fn(),
    snappedSymbols: [] as SymbolItem[],
    interactiveRects: new Map<string, WorldRect>(),
    selectedIds: new Set<string>(),
    snapModulePlacement: vi.fn((x, y) => ({ x, y })),
    getPaletteTemplate: vi.fn(),
    onSymbolSelect: vi.fn(),
    onSymbolMoveStart: vi.fn(),
    onSymbolMove: vi.fn(),
    onSymbolMoveEnd: vi.fn(),
    onPaletteDrop: vi.fn(),
    onUnsupportedTemplateDrop: vi.fn(),
    onSymbolSelectionChange: vi.fn(),
  };

  it("initializes with default states", () => {
    const { result } = renderHook(() => useDinRailInteraction(defaultProps));
    expect(result.current.selectionRect).toBeNull();
    expect(result.current.isDropTarget).toBe(false);
  });

  it("handles panning correctly when middle mouse button is pressed", () => {
    const panRef = { current: { x: 10, y: 20 } };
    const setPanSafe = vi.fn();
    const { result } = renderHook(() =>
      useDinRailInteraction({
        ...defaultProps,
        panRef,
        setPanSafe,
      })
    );

    // Simulate pointer down on surface with button = 1 (middle click)
    const mockDownEvent = {
      button: 1,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      currentTarget: {
        setPointerCapture: vi.fn(),
      },
    } as unknown as React.PointerEvent<HTMLDivElement>;

    act(() => {
      result.current.handleSurfacePointerDown(mockDownEvent);
    });

    // Simulate pointer move
    const mockMoveEvent = {
      clientX: 120, // moved by dx = 20
      clientY: 90,  // moved by dy = -10
    } as unknown as React.PointerEvent<HTMLDivElement>;

    act(() => {
      result.current.handlePointerMove(mockMoveEvent);
    });

    expect(setPanSafe).toHaveBeenCalledWith({ x: 30, y: 10 });
  });

  it("creates a selection rectangle on pointer move and selects null if small area", () => {
    const onSymbolSelect = vi.fn();
    const { result } = renderHook(() =>
      useDinRailInteraction({
        ...defaultProps,
        onSymbolSelect,
      })
    );

    const mockDownEvent = {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      currentTarget: {
        setPointerCapture: vi.fn(),
      },
    } as unknown as React.PointerEvent<HTMLDivElement>;

    act(() => {
      result.current.handleSurfacePointerDown(mockDownEvent);
    });

    expect(result.current.selectionRect).toEqual({
      x: 100,
      y: 100,
      width: 0,
      height: 0,
    });

    const mockMoveEvent = {
      clientX: 102,
      clientY: 102,
    } as unknown as React.PointerEvent<HTMLDivElement>;

    act(() => {
      result.current.handlePointerMove(mockMoveEvent);
    });

    // selectionRect size should be 2x2
    expect(result.current.selectionRect).toEqual({
      x: 100,
      y: 100,
      width: 2,
      height: 2,
    });

    const mockUpEvent = {
      pointerId: 1,
      currentTarget: {
        hasPointerCapture: vi.fn(() => true),
        releasePointerCapture: vi.fn(),
      },
    } as unknown as React.PointerEvent<HTMLDivElement>;

    act(() => {
      result.current.handlePointerUp(mockUpEvent);
    });

    // Area is 4 (< 16), so it should deselect
    expect(onSymbolSelect).toHaveBeenCalledWith(null);
    expect(result.current.selectionRect).toBeNull();
  });

  it("handles symbol dragging correctly", () => {
    const symbol: SymbolItem = {
      id: "sym-test",
      type: "MCB 1P",
      label: "Q1",
      x: 50,
      y: 50,
      width: 18,
      height: 80,
      phase: "L1",
      deviceKind: "mcb",
      parameters: {},
      referenceDesignation: "Q1",
      isSnappedToRail: true,
    } as any;

    const onSymbolMoveStart = vi.fn();
    const onSymbolMove = vi.fn();
    const onSymbolMoveEnd = vi.fn();

    const { result } = renderHook(() =>
      useDinRailInteraction({
        ...defaultProps,
        snappedSymbols: [symbol],
        onSymbolMoveStart,
        onSymbolMove,
        onSymbolMoveEnd,
      })
    );

    const mockEvent = {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
      ctrlKey: false,
      metaKey: false,
      stopPropagation: vi.fn(),
      currentTarget: {
        closest: vi.fn(() => null),
        setPointerCapture: vi.fn(),
      },
    } as unknown as React.PointerEvent<HTMLElement>;

    act(() => {
      result.current.beginDragForSymbol(mockEvent, "sym-test");
    });

    expect(onSymbolMoveStart).toHaveBeenCalledWith("sym-test");

    // Move
    const mockMoveEvent = {
      clientX: 60, // dx = 10
      clientY: 50, // dy = 0
    } as unknown as React.PointerEvent<HTMLDivElement>;

    act(() => {
      result.current.handlePointerMove(mockMoveEvent);
    });

    expect(onSymbolMove).toHaveBeenCalledWith("sym-test", 60, 50);

    // End drag
    const mockUpEvent = {
      pointerId: 1,
      currentTarget: {
        hasPointerCapture: vi.fn(() => true),
        releasePointerCapture: vi.fn(),
      },
    } as unknown as React.PointerEvent<HTMLDivElement>;

    act(() => {
      result.current.handlePointerUp(mockUpEvent);
    });

    expect(onSymbolMoveEnd).toHaveBeenCalledWith("sym-test");
  });
});
