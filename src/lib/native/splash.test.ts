import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hideNativeSplash } from "./splash";

// WHY: hideNativeSplash polega na Capacitor.isNativePlatform() i dynamicznym
// import @capacitor/splash-screen. Mockujemy oba, żeby testy były deterministyczne
// i nie wymagały prawdziwego środowiska natywnego.

const mockIsNativePlatform = vi.fn(() => false);
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNativePlatform(),
  },
}));

// WHY: mock dynamicznego importu @capacitor/splash-screen. hideNativeSplash
// woła `await import("@capacitor/splash-screen")` — vi.mock z factory
// zastępuje ten moduł niezależnie od tego, czy import jest statyczny czy dynamiczny.
const mockSplashHide = vi.fn((_options?: unknown) => Promise.resolve());
vi.mock("@capacitor/splash-screen", () => ({
  SplashScreen: {
    hide: (options?: unknown) => mockSplashHide(options),
  },
}));

beforeEach(() => {
  mockIsNativePlatform.mockReturnValue(false);
  mockSplashHide.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hideNativeSplash", () => {
  it("nie woła SplashScreen.hide na platformie web", async () => {
    mockIsNativePlatform.mockReturnValue(false);
    await hideNativeSplash();
    expect(mockSplashHide).not.toHaveBeenCalled();
  });

  it("woła SplashScreen.hide na platformie natywnej (Android)", async () => {
    mockIsNativePlatform.mockReturnValue(true);
    await hideNativeSplash();
    expect(mockSplashHide).toHaveBeenCalledTimes(1);
    expect(mockSplashHide).toHaveBeenCalledWith({
      fadeOutDuration: 300,
    });
  });

  it("woła SplashScreen.hide na platformie natywnej (iOS)", async () => {
    mockIsNativePlatform.mockReturnValue(true);
    await hideNativeSplash();
    expect(mockSplashHide).toHaveBeenCalledTimes(1);
  });

  it("nie crashuje gdy Capacitor.isNativePlatform rzuca (plugin niezarejestrowany)", async () => {
    mockIsNativePlatform.mockImplementation(() => {
      throw new Error("Capacitor not registered");
    });
    await expect(hideNativeSplash()).resolves.toBeUndefined();
    expect(mockSplashHide).not.toHaveBeenCalled();
  });

  it("nie crashuje gdy SplashScreen.hide rzuca (błąd pluginu)", async () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockSplashHide.mockRejectedValueOnce(new Error("plugin unavailable"));
    // WHY: hideNativeSplash łapie błąd w try/catch, więc Promise resolve'uje.
    await expect(hideNativeSplash()).resolves.toBeUndefined();
  });

  it("nie rzuca gdy window nie istnieje (SSR guard)", async () => {
    const originalWindow = globalThis.window;
    // WHY: symulacja SSR — ukrywamy window. hideNativeSplash musi bezpiecznie
    // zwrócić undefined bez dostępu do window ani Capacitora.
    // @ts-expect-error — celowe usunięcie window na czas testu
    delete globalThis.window;
    try {
      await expect(hideNativeSplash()).resolves.toBeUndefined();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
