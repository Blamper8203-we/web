import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useConnectionsPinch, type Viewport } from "./useConnectionsPinch";

// Touch event mock — React.TouchEvent wymaga listy `touches`. jsdom nie ma
// konstruktora TouchEvent, więc budujemy Event i doklejamy pola. Wzorzec
// skopiowany z useDinRailPinch.test.ts (który z kolei wziął go z
// PinchZoomImage.test.tsx).
type MockTouchEvent = Event & {
  touches: Array<{ identifier: number; clientX: number; clientY: number }>;
  preventDefault: () => void;
};

function makeTouchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
): MockTouchEvent {
  const baseEvent = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(baseEvent, {
    touches: touches.map((t, i) => ({ identifier: i, ...t })),
    preventDefault: vi.fn(),
  });
}

function setup(initialViewport: Viewport = { zoom: 1, pan: { x: 0, y: 0 } }) {
  // Mock svgRect — svgRef.current.getBoundingClientRect.
  const svgRect = {
    left: 0,
    top: 0,
    right: 400,
    bottom: 400,
    width: 400,
    height: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
  const svgRef = { current: { getBoundingClientRect: () => svgRect } };

  // Wrapper trzyma viewport w useState, by setViewport z hooka aktualizował
  // widok między gestami (useConnectionsPinch czyta viewport.zoom/pan
  // w onTouchStart — potrzebujemy aktualnej wartości po poprzednim ruchu).
  // Wzorzec z useSchematicPinch.test.ts.
  const wrapper = ({ children }: { children: React.ReactNode }) => children;

  const utils = renderHook(
    ({ initial }: { initial: Viewport }) => {
      const [viewport, setViewport] = useState<Viewport>(initial);
      const pinch = useConnectionsPinch({
        svgRef: svgRef as never,
        viewport,
        setViewport,
        resetZoom: vi.fn(),
      });
      return { viewport, setViewport, pinch };
    },
    { initialProps: { initial: initialViewport }, wrapper },
  );

  return utils;
}

describe("useConnectionsPinch", () => {
  it("ignores touchstart z mniej niż 2 palcami", () => {
    const { result } = setup();
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]) as never,
      );
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(false);
  });

  it("start pinch z 2 palcami ustawia pinchActiveRef=true", () => {
    const { result } = setup();
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]) as never,
      );
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(true);
  });

  it("touchmove bez aktywnego gestu nie zmienia viewport", () => {
    const { result } = setup();
    const zoomBefore = result.current.viewport.zoom;
    act(() => {
      result.current.pinch.onTouchMove(
        makeTouchEvent("touchmove", [
          { clientX: 50, clientY: 50 },
          { clientX: 250, clientY: 50 },
        ]) as never,
      );
    });
    expect(result.current.viewport.zoom).toBe(zoomBefore);
  });

  it("zoom-in 2× ustawia viewport.zoom na 2 z zakotwiczeniem w środku palców", () => {
    const { result } = setup({ zoom: 1, pan: { x: 0, y: 0 } });

    // Start: palce w (100,100) i (200,100). Mid (150,100), distance 100.
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]) as never,
      );
    });

    // Move: rozsunięte do (50,100) i (250,100). Mid (150,100), distance 200.
    act(() => {
      result.current.pinch.onTouchMove(
        makeTouchEvent("touchmove", [
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ]) as never,
      );
    });

    expect(result.current.viewport.zoom).toBeCloseTo(2, 5);
    // Pan: zakotwiczenie w mid (150,100), bez translacji → panX=-150, panY=-100.
    expect(result.current.viewport.pan.x).toBeCloseTo(-150, 5);
    expect(result.current.viewport.pan.y).toBeCloseTo(-100, 5);
  });

  it("translacja dwoma palcami (ratio=1) przesuwa pan o delta midpoint", () => {
    const { result } = setup({ zoom: 1.5, pan: { x: 20, y: 40 } });

    // Start: mid (100,200), distance 150.
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [
          { clientX: 25, clientY: 200 },
          { clientX: 175, clientY: 200 },
        ]) as never,
      );
    });

    // Move: mid (150,230), distance 150 (ratio 1 → czysty pan).
    act(() => {
      result.current.pinch.onTouchMove(
        makeTouchEvent("touchmove", [
          { clientX: 75, clientY: 230 },
          { clientX: 225, clientY: 230 },
        ]) as never,
      );
    });

    // scaleRatio = 1 → panZoomed = initialPan; + delta (+50,+30) = (70,70).
    expect(result.current.viewport.zoom).toBeCloseTo(1.5, 5);
    expect(result.current.viewport.pan.x).toBeCloseTo(70, 5);
    expect(result.current.viewport.pan.y).toBeCloseTo(70, 5);
  });

  it("zoom nie przekracza MAX_SCALE (4.0)", () => {
    const { result } = setup({ zoom: 3, pan: { x: 0, y: 0 } });
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 110, clientY: 100 }, // distance 10
        ]) as never,
      );
    });
    // Rozsunięcie do distance 1000 → ratio 100 → 3*100 → clamp do 4.
    act(() => {
      result.current.pinch.onTouchMove(
        makeTouchEvent("touchmove", [
          { clientX: 0, clientY: 100 },
          { clientX: 1000, clientY: 100 },
        ]) as never,
      );
    });
    expect(result.current.viewport.zoom).toBeLessThanOrEqual(4.0);
  });

  it("zoom nie spada poniżej MIN_SCALE (0.05)", () => {
    const { result } = setup({ zoom: 0.5, pan: { x: 0, y: 0 } });
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }, // distance 100
        ]) as never,
      );
    });
    // Zbiegnięcie do distance 1 → ratio 0.01 → 0.5*0.01 = 0.005 → clamp do 0.05.
    act(() => {
      result.current.pinch.onTouchMove(
        makeTouchEvent("touchmove", [
          { clientX: 100, clientY: 100 },
          { clientX: 101, clientY: 100 },
        ]) as never,
      );
    });
    expect(result.current.viewport.zoom).toBeGreaterThanOrEqual(0.05);
  });

  it("touchend z 0 palcami resetuje pinchActiveRef", () => {
    const { result } = setup();
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]) as never,
      );
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(true);

    act(() => {
      result.current.pinch.onTouchEnd(makeTouchEvent("touchend", []) as never);
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(false);
  });

  it("touchend z jeszcze jednym palcem NIE resetuje pinchActiveRef", () => {
    const { result } = setup();
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]) as never,
      );
    });

    // Drugi paliec odczepiony — zostaje 1. Keep pinch active (user może kontynuować).
    act(() => {
      result.current.pinch.onTouchEnd(
        makeTouchEvent("touchend", [{ clientX: 100, clientY: 100 }]) as never,
      );
    });
    expect(result.current.pinch.pinchActiveRef.current).toBe(true);
  });

  it("REGRESJA: wiele onTouchMove z tą samą odległością NIE kumuluje zoomu", () => {
    // WHY: to jest test pinning dla błędu "jazdy bez trzymanki". Przed naprawą
    // każdy move mnożyłby zoom przez ratio względem poprzedniego stanu
    // viewport.zoom zamiast startu gestu → 3× move z ratio 2 dawało scale
    // 8 zamiast 2. Po naprawie zoom jest liniowy względem startu (initialScale
    // jest zamrożone w gestureRef.current). Wzorzec z useDinRailPinch.test.ts
    // i useSchematicPinch.test.ts.
    const { result } = setup({ zoom: 1, pan: { x: 0, y: 0 } });

    // Start gestu: distance 100, zoom 1.
    act(() => {
      result.current.pinch.onTouchStart(
        makeTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]) as never,
      );
    });

    // 3 kolejne move z tą SAMĄ odległością 200 (ratio 2 każdy).
    // Bez zamrożenia initialScale = 1 × 2 × 2 × 2 = 8 (kumulacja).
    // Z zamrożeniem: zawsze 1 × 2 = 2.
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.pinch.onTouchMove(
          makeTouchEvent("touchmove", [
            { clientX: 50, clientY: 100 },
            { clientX: 250, clientY: 100 },
          ]) as never,
        );
      });
    }

    // Ostatni stan viewport.zoom musi dawać 2, NIE 8.
    expect(result.current.viewport.zoom).toBeCloseTo(2, 5);
  });
});
