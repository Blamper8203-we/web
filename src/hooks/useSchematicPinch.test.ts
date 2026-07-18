import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import type { SchematicLayout } from "../lib/schematic/schematicLayout";
import type { ViewportState } from "../lib/schematic/schematicViewportController";
import { useSchematicPinch } from "./useSchematicPinch";

type MockTouchEvent = Event & {
  touches: Array<{ identifier: number; clientX: number; clientY: number }>;
  preventDefault: () => void;
};

function makeTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>): MockTouchEvent {
  const baseEvent = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(baseEvent, {
    touches: touches.map((t, i) => ({ identifier: i, ...t })),
    preventDefault: vi.fn(),
  });
}

const LAYOUT: SchematicLayout = {
  nodes: [],
  edges: [],
  pages: [],
  totalWidth: 1000,
  totalHeight: 1400,
} as unknown as SchematicLayout;

function setup(initialViewport: ViewportState = { zoom: 1, panX: 0, panY: 0 }) {
  const canvasRect = {
    left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400, x: 0, y: 0, toJSON: () => ({}),
  };
  const canvasRef = { current: { getBoundingClientRect: () => canvasRect, width: 400, height: 400 } };

  // Wrapper trzyma viewport w useState, by setViewport z hooka aktualizował
  // widok między gestami (useSchematicPinch czyta viewport w onTouchMove).
  const wrapper = ({ children }: { children: React.ReactNode }) => children;

  const utils = renderHook(
    ({ initial }: { initial: ViewportState }) => {
      const [viewport, setViewport] = useState<ViewportState>(initial);
      const pinch = useSchematicPinch({ canvasRef: canvasRef as never, layout: LAYOUT, viewport, setViewport });
      return { viewport, setViewport, pinch };
    },
    { initialProps: { initial: initialViewport }, wrapper },
  );

  return utils;
}

describe("useSchematicPinch", () => {
  it("ignores touchstart z < 2 palcami", () => {
    const { result } = setup();
    act(() => {
      result.current.pinch.onTouchStart(makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]) as never);
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(false);
  });

  it("start pinch z 2 palcami ustawia pinchActiveRef=true", () => {
    const { result } = setup();
    act(() => {
      result.current.pinch.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(true);
  });

  it("zoom-in 2× aktualizuje viewport.zoom do 2", () => {
    const { result } = setup({ zoom: 1, panX: 0, panY: 0 });
    act(() => {
      result.current.pinch.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });
    act(() => {
      result.current.pinch.onTouchMove(makeTouchEvent("touchmove", [
        { clientX: 50, clientY: 100 },
        { clientX: 250, clientY: 100 },
      ]) as never);
    });
    expect(result.current.viewport.zoom).toBeCloseTo(2, 5);
  });

  it("zoom nie przekracza MAX_ZOOM (5.0)", () => {
    const { result } = setup({ zoom: 4, panX: 0, panY: 0 });
    act(() => {
      result.current.pinch.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 110, clientY: 100 }, // distance 10
      ]) as never);
    });
    // Rozsunięcie do distance 1000 → ratio 100 → 4*100 → clamp do 5.
    act(() => {
      result.current.pinch.onTouchMove(makeTouchEvent("touchmove", [
        { clientX: 0, clientY: 100 },
        { clientX: 1000, clientY: 100 },
      ]) as never);
    });
    expect(result.current.viewport.zoom).toBeLessThanOrEqual(5.0);
  });

  it("translacja dwoma palcami (ratio=1) przesuwa pan o delta midpoint", () => {
    const { result } = setup({ zoom: 1.5, panX: 20, panY: 40 });
    // Start: mid (100,200), distance 150.
    act(() => {
      result.current.pinch.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 25, clientY: 200 },
        { clientX: 175, clientY: 200 },
      ]) as never);
    });
    // Move: mid (150,230), distance 150.
    act(() => {
      result.current.pinch.onTouchMove(makeTouchEvent("touchmove", [
        { clientX: 75, clientY: 230 },
        { clientX: 225, clientY: 230 },
      ]) as never);
    });
    // scaleRatio=1 → pan = initialPan + delta(+50,+30) = (70,70),
    // ewentualnie zmodyfikowane przez constrainPan.
    expect(result.current.viewport.panX).toBeGreaterThan(20);
    expect(result.current.viewport.panY).toBeGreaterThan(40);
  });

  it("touchend z 0 palcami resetuje pinchActiveRef", () => {
    const { result } = setup();
    act(() => {
      result.current.pinch.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(true);

    act(() => {
      result.current.pinch.onTouchEnd(makeTouchEvent("touchend", []) as never);
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(false);
  });

  it("REGRESJA: wiele onTouchMove z tą samą odległością NIE kumuluje zoomu", () => {
    // WHY: test pinning dla błędu "jazdy bez trzymanki". Przed naprawą każdy
    // move mnożył zoom przez ratio względem poprzedniego viewport.zoom
    // zamiast startu gestu → 3× move z ratio 2 dawało scale 8 zamiast 2.
    const { result } = setup({ zoom: 1, panX: 0, panY: 0 });

    // Start gestu: distance 100, zoom 1.
    act(() => {
      result.current.pinch.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });

    // 3 kolejne move z tą SAMĄ odległością 200 (ratio 2 każdy).
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.pinch.onTouchMove(makeTouchEvent("touchmove", [
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ]) as never);
      });
    }

    // Po naprawie: zoom = 1 × 2 = 2 (zamrożone initialScale). Przed naprawą: 8.
    expect(result.current.viewport.zoom).toBeCloseTo(2, 5);
  });
});
