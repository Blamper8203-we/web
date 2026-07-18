import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { WorldPoint } from "../../lib/dinRailCanvas/types";
import { useDinRailPinch } from "./useDinRailPinch";

// Touch event mock — React.TouchEvent wymaga listy `touches`. jsdom nie ma
// konstruktora TouchEvent, więc budujemy Event i doklejamy pola. Wzorzec z
// PinchZoomImage.test.tsx.
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

function setup(overrides: Partial<{
  scaleRef: { current: number };
  panRef: { current: WorldPoint };
  containerRect: DOMRect;
}> = {}) {
  const setScaleSafe = vi.fn();
  const setPanSafe = vi.fn();
  const scaleRef = overrides.scaleRef ?? { current: 1 };
  const panRef = overrides.panRef ?? { current: { x: 0, y: 0 } };

  // Mock containerRect — containerRef.current.getBoundingClientRect.
  const containerRect = overrides.containerRect ?? {
    left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400, x: 0, y: 0, toJSON: () => ({}),
  };
  const containerRef = { current: { getBoundingClientRect: () => containerRect } };

  const { result } = renderHook(() =>
    useDinRailPinch({
      containerRef: containerRef as never,
      scaleRef: scaleRef as never,
      panRef: panRef as never,
      setScaleSafe,
      setPanSafe,
    }),
  );

  return { result, setScaleSafe, setPanSafe, scaleRef, panRef };
}

describe("useDinRailPinch", () => {
  it("ignores touchstart z mniej niż 2 palcami", () => {
    const { result, setScaleSafe, setPanSafe } = setup();
    act(() => {
      result.current.onTouchStart(makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]) as never);
    });
    expect(result.current.pinchActiveRef.current).toBe(false);
    expect(setScaleSafe).not.toHaveBeenCalled();
    expect(setPanSafe).not.toHaveBeenCalled();
  });

  it("start pinch z 2 palcami ustawia pinchActiveRef=true", () => {
    const { result } = setup();
    act(() => {
      result.current.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });
    expect(result.current.pinchActiveRef.current).toBe(true);
  });

  it("touchmove bez aktywnego gestu nie wywołuje setterów", () => {
    const { result, setScaleSafe, setPanSafe } = setup();
    act(() => {
      result.current.onTouchMove(makeTouchEvent("touchmove", [
        { clientX: 50, clientY: 50 },
        { clientX: 250, clientY: 50 },
      ]) as never);
    });
    expect(setScaleSafe).not.toHaveBeenCalled();
    expect(setPanSafe).not.toHaveBeenCalled();
  });

  it("zoom-in 2× wywołuje setScaleSafe(2) i setPanSafe z zakotwiczeniem", () => {
    const { result, setScaleSafe, setPanSafe } = setup({
      scaleRef: { current: 1 },
      panRef: { current: { x: 0, y: 0 } },
    });

    // Start: palce w (100,100) i (200,100). Mid (150,100), distance 100.
    act(() => {
      result.current.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });

    // Move: rozsunięte do (50,100) i (250,100). Mid (150,100), distance 200.
    act(() => {
      result.current.onTouchMove(makeTouchEvent("touchmove", [
        { clientX: 50, clientY: 100 },
        { clientX: 250, clientY: 100 },
      ]) as never);
    });

    expect(setScaleSafe).toHaveBeenCalledWith(2);
    // Pan: zakotwiczenie w mid (150,100), bez translacji → panX=-150, panY=-100.
    expect(setPanSafe).toHaveBeenCalledWith({ x: -150, y: -100 });
  });

  it("translacja dwoma palcami (ratio=1) przesuwa pan o delta midpoint", () => {
    const { result, setScaleSafe, setPanSafe } = setup({
      scaleRef: { current: 1.5 },
      panRef: { current: { x: 20, y: 40 } },
    });

    // Start: mid (100,200), distance 150.
    act(() => {
      result.current.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 25, clientY: 200 },
        { clientX: 175, clientY: 200 },
      ]) as never);
    });

    // Move: mid (150,230), distance 150 (ratio 1 → czysty pan).
    act(() => {
      result.current.onTouchMove(makeTouchEvent("touchmove", [
        { clientX: 75, clientY: 230 },
        { clientX: 225, clientY: 230 },
      ]) as never);
    });

    // scaleRatio = 1 → panZoomed = initialPan; + delta (+50,+30) = (70,70).
    expect(setScaleSafe).toHaveBeenCalledWith(1.5);
    expect(setPanSafe).toHaveBeenCalledWith({ x: 70, y: 70 });
  });

  it("touchend z 0 palcami resetuje pinchActiveRef", () => {
    const { result } = setup();
    act(() => {
      result.current.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });
    expect(result.current.pinchActiveRef.current).toBe(true);

    act(() => {
      result.current.onTouchEnd(makeTouchEvent("touchend", []) as never);
    });
    expect(result.current.pinchActiveRef.current).toBe(false);
  });

  it("touchend z jeszcze jednym palcem NIE resetuje pinchActiveRef", () => {
    const { result } = setup();
    act(() => {
      result.current.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });

    // Drugi palec odczepiony — zostaje 1. Keep pinch active (user może kontynuować).
    act(() => {
      result.current.onTouchEnd(makeTouchEvent("touchend", [
        { clientX: 100, clientY: 100 },
      ]) as never);
    });
    expect(result.current.pinchActiveRef.current).toBe(true);
  });

  it("REGRESJA: wiele onTouchMove z tą samą odległością NIE kumuluje zoomu", () => {
    // WHY: to jest test pinning dla błędu "jazdy bez trzymanki". Przed naprawą
    // każdy move mnożył zoom przez ratio względem poprzedniego stanu
    // (scaleRef.current) zamiast startu gestu → 3× move z ratio 2 dawało
    // scale 8 zamiast 2. Po naprawie zoom jest liniowy względem startu.
    //
    // Symulacja realnego viewportu: setScaleSafe aktualizuje scaleRef.current
    // (jak useDinRailViewport.setScaleSafe faktycznie robi).
    const scaleRef = { current: 1 };
    const panRef = { current: { x: 0, y: 0 } };
    const setScaleSafe = vi.fn((next: number) => { scaleRef.current = next; });
    const setPanSafe = vi.fn((next: { x: number; y: number }) => { panRef.current = next; });

    const containerRef = {
      current: {
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400, x: 0, y: 0, toJSON: () => ({}) }),
      },
    };

    const { result } = renderHook(() =>
      useDinRailPinch({
        containerRef: containerRef as never,
        scaleRef: scaleRef as never,
        panRef: panRef as never,
        setScaleSafe,
        setPanSafe,
      }),
    );

    // Start gestu: distance 100, scale 1.
    act(() => {
      result.current.onTouchStart(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]) as never);
    });

    // 3 kolejne move z tą SAMĄ odległością 200 (ratio 2 każdy).
    // Bez zamrożenia initialScale = 1 × 2 × 2 × 2 = 8 (kumulacja).
    // Z zamrożeniem: zawsze 1 × 2 = 2.
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.onTouchMove(makeTouchEvent("touchmove", [
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ]) as never);
      });
    }

    // Ostatnie wywołanie setScaleSafe musi dawać 2, NIE 8.
    expect(setScaleSafe).toHaveBeenLastCalledWith(2);
  });
});
