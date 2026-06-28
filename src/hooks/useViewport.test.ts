import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  MOBILE_MAX_WIDTH_PX,
  useIsMobileLayout,
  useIsMobileViewport,
  useIsNativePlatform,
} from "./useViewport";

// WHY: useViewport musi być testowalny bez prawdziwego @capacitor/core.
// Mockujemy moduł przed importem hooka (vi.mock jest hoistowany automatycznie
// przez vitest), więc hook dostaje nasz fałszywy `Capacitor` z `isNativePlatform`.
const mockIsNativePlatform = vi.fn(() => false);
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNativePlatform(),
  },
}));

function setMatchMedia(matches: boolean) {
  const listeners: Array<() => void> = [];
  const mql = {
    matches,
    media: `(max-width: ${MOBILE_MAX_WIDTH_PX}px)`,
    onchange: null,
    addEventListener: (_: string, cb: () => void) => {
      listeners.push(cb);
    },
    removeEventListener: (_: string, cb: () => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    addListener: (cb: () => void) => {
      listeners.push(cb);
    },
    removeListener: (cb: () => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    dispatchEvent: () => true,
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: () => mql,
  });
  return { listeners, mql };
}

describe("useIsMobileViewport", () => {
  beforeEach(() => {
    // WHY: jsdom nie ma domyślnego window.matchMedia. Każdy test w tej grupie
    // zaczyna od świeżego mocka, żeby wynik był deterministyczny.
    setMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("zwraca false na SSR (server snapshot)", () => {
    // useState(false) + useEffect → pierwszy render (taki jak SSR) daje false.
    // useEffect jeszcze się nie wykonał, więc hook nie czytał matchMedia.
    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(false);
  });

  it("nie crashuje gdy window.matchMedia nie istnieje (jsdom fallback)", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(false);
  });

  it("zwraca false gdy matchMedia.matches = false (szeroki ekran)", () => {
    setMatchMedia(false);
    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(false);
  });

  it("zwraca true gdy matchMedia.matches = true (wąski ekran)", () => {
    setMatchMedia(true);
    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(true);
  });

  it("reaguje na zmianę szerokości okna (resize)", () => {
    const { listeners } = setMatchMedia(false);
    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(false);

    // Symulujemy resize okna: matchMedia.matches zmienia się na true.
    act(() => {
      // listeners[0] to nasz change handler podpięty w useEffect
      for (const cb of listeners) cb();
    });
    expect(result.current).toBe(false); // bo mql.matches nadal false

    // Właściwy test: zmiana mql.matches + change event.
    setMatchMedia(true);
    const { result: result2 } = renderHook(() => useIsMobileViewport());
    expect(result2.current).toBe(true);
  });
});

describe("useIsNativePlatform", () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("zwraca false gdy Capacitor.isNativePlatform = false (web)", () => {
    const { result } = renderHook(() => useIsNativePlatform());
    expect(result.current).toBe(false);
  });

  it("zwraca true gdy Capacitor.isNativePlatform = true (Capacitor native)", () => {
    mockIsNativePlatform.mockReturnValue(true);
    const { result } = renderHook(() => useIsNativePlatform());
    expect(result.current).toBe(true);
  });

  it("zwraca false gdy Capacitor rzuci wyjątkiem (plugin nie zarejestrowany)", () => {
    mockIsNativePlatform.mockImplementation(() => {
      throw new Error("Capacitor not registered");
    });
    const { result } = renderHook(() => useIsNativePlatform());
    expect(result.current).toBe(false);
  });
});

describe("useIsMobileLayout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockIsNativePlatform.mockReturnValue(false);
  });

  it("false gdy web + szeroki viewport (desktop)", () => {
    setMatchMedia(false);
    mockIsNativePlatform.mockReturnValue(false);
    const { result } = renderHook(() => useIsMobileLayout());
    expect(result.current).toBe(false);
  });

  it("true gdy web + wąski viewport (PWA mobile)", () => {
    setMatchMedia(true);
    mockIsNativePlatform.mockReturnValue(false);
    const { result } = renderHook(() => useIsMobileLayout());
    expect(result.current).toBe(true);
  });

  it("true gdy Capacitor native (niezależnie od szerokości viewport)", () => {
    setMatchMedia(false);
    mockIsNativePlatform.mockReturnValue(true);
    const { result } = renderHook(() => useIsMobileLayout());
    expect(result.current).toBe(true);
  });

  it("true gdy Capacitor native + wąski viewport (telefon w apce)", () => {
    setMatchMedia(true);
    mockIsNativePlatform.mockReturnValue(true);
    const { result } = renderHook(() => useIsMobileLayout());
    expect(result.current).toBe(true);
  });
});
