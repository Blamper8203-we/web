import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSheetPanelState } from "./useSheetPanelState";

// WHY: regression test dla responsiveness fix #6 z MOBILE_RESPONSIVENESS_ANALYSIS.md.
// useSheetPanelState musi reagować na zmianę szerokości okna (obrót telefonu,
// split-view na tablecie) i automatycznie pokazywać/ukrywać panele, ale TYLKO
// przy przekroczeniu granicy 768px — żeby nie nadpisywać ręcznych przełączeń.

function setInnerWidth(value: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value,
  });
}

describe("useSheetPanelState — responsive resize", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setInnerWidth(1200);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("początkowo pokazuje oba panele przy szerokim oknie", () => {
    const { result } = renderHook(() => useSheetPanelState());

    expect(result.current.showLeftPanel).toBe(true);
    expect(result.current.showRightPanel).toBe(true);
  });

  it("początkowo ukrywa oba panele przy wąskim oknie", () => {
    setInnerWidth(600);
    const { result } = renderHook(() => useSheetPanelState());

    expect(result.current.showLeftPanel).toBe(false);
    expect(result.current.showRightPanel).toBe(false);
  });

  it("ukrywa panele po resize szerokie → wąskie (z debounce 200ms)", () => {
    const { result } = renderHook(() => useSheetPanelState());
    expect(result.current.showLeftPanel).toBe(true);

    setInnerWidth(600);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(200);
    });

    expect(result.current.showLeftPanel).toBe(false);
    expect(result.current.showRightPanel).toBe(false);
  });

  it("przywraca panele po resize wąskie → szerokie", () => {
    setInnerWidth(600);
    const { result } = renderHook(() => useSheetPanelState());
    expect(result.current.showLeftPanel).toBe(false);

    setInnerWidth(1200);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(200);
    });

    expect(result.current.showLeftPanel).toBe(true);
    expect(result.current.showRightPanel).toBe(true);
  });

  it("nie zmienia stanu gdy resize nie przekracza granicy 768px", () => {
    const { result } = renderHook(() => useSheetPanelState());
    const initialLeft = result.current.showLeftPanel;
    const initialRight = result.current.showRightPanel;

    // resize w ramach szerokiego: 1200 → 1000
    setInnerWidth(1000);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(200);
    });

    expect(result.current.showLeftPanel).toBe(initialLeft);
    expect(result.current.showRightPanel).toBe(initialRight);
  });

  it("nie nadpisuje ręcznego ukrycia panelu (crossing boundary)", () => {
    // startujemy szeroko, user ukrywa prawy panel ręcznie
    const { result } = renderHook(() => useSheetPanelState());

    act(() => {
      result.current.setShowRightPanel(false);
    });
    expect(result.current.showRightPanel).toBe(false);

    // resize do wąskiego — listener ukrywa OBIE (bo to jedyne bezpieczne zachowanie
    // dla breakpoint crossing; user i tak nie widzi nic poza canvas na mobile)
    setInnerWidth(500);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(200);
    });

    expect(result.current.showLeftPanel).toBe(false);
    expect(result.current.showRightPanel).toBe(false);
  });
});
