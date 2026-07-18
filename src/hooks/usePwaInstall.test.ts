import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePwaInstall } from "./usePwaInstall";
import { BeforeInstallPromptEvent } from "../lib/pwa/installPrompt";

// WHY: hook polega na window.addEventListener('beforeinstallprompt' / 'appinstalled').
// jsdom nie wywołuje tych eventów sam — symulujemy je przez dispatchEvent z fałszywym
// eventem, dokładnie tak jak prawdziwa przeglądarka Chrome.

function makeFakeBeforeInstallPrompt(
  outcome: "accepted" | "dismissed" = "accepted"
): BeforeInstallPromptEvent {
  // WHY: jsdom wymaga, żeby dispatchowany obiekt był prawdziwym instanceof Event
  // (sprawdza `[Symbol.toPrimitive]` / `instanceof Event` w konwersji). Tworzymy
  // bazowy Event i nakładamy pola specyfikacji BeforeInstallPromptEvent.
  const event = new Event("beforeinstallprompt");
  const prompt = vi.fn(() => Promise.resolve());
  const userChoice = Promise.resolve({ outcome, platform: "android" });
  Object.assign(event, {
    platforms: ["android"],
    userChoice,
    prompt,
  });
  return event as unknown as BeforeInstallPromptEvent;
}

function setStandaloneMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === "(display-mode: standalone)" ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

function setUserAgent(ua: string, platform = "Win32", touch = 0): void {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: ua,
  });
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    value: platform,
  });
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: touch,
  });
}

beforeEach(() => {
  // WHY: domyślnie desktop Windows, nie standalone — realistyczny start
  // dla większości testów w tej grupie.
  setStandaloneMatchMedia(false);
  setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePwaInstall — stan początkowy", () => {
  it("canShowButton = false zanim beforeinstallprompt odpali (desktop Chrome)", async () => {
    const { result } = renderHook(() => usePwaInstall());
    // Po hydratacji useEffect się odpala, ale bez eventu przycisku nie ma.
    expect(result.current.canShowButton).toBe(false);
    expect(result.current.canPrompt).toBe(false);
  });

  it("isStandalone = false w zwykłej przeglądarce", async () => {
    const { result } = renderHook(() => usePwaInstall());
    await waitFor(() => {
      expect(result.current.isStandalone).toBe(false);
    });
  });

  it("isStandalone = true gdy display-mode: standalone (zainstalowana PWA)", async () => {
    setStandaloneMatchMedia(true);
    const { result } = renderHook(() => usePwaInstall());
    await waitFor(() => {
      expect(result.current.isStandalone).toBe(true);
    });
  });
});

describe("usePwaInstall — beforeinstallprompt", () => {
  it("canShowButton = true po odpaleniu beforeinstallprompt na desktop", async () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canShowButton).toBe(false);

    act(() => {
      window.dispatchEvent(
        makeFakeBeforeInstallPrompt() as unknown as Event
      );
    });

    await waitFor(() => {
      expect(result.current.canShowButton).toBe(true);
      expect(result.current.canPrompt).toBe(true);
    });
  });

  it("promptInstall wywołuje event.prompt() i zwraca true przy akceptacji", async () => {
    const fakeEvent = makeFakeBeforeInstallPrompt("accepted");
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(fakeEvent as unknown as Event);
    });

    await waitFor(() => expect(result.current.canPrompt).toBe(true));

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(fakeEvent.prompt).toHaveBeenCalledTimes(1);
    expect(outcome).toBe(true);
  });

  it("promptInstall zwraca false i czyści stan przy odrzuceniu", async () => {
    const fakeEvent = makeFakeBeforeInstallPrompt("dismissed");
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(fakeEvent as unknown as Event);
    });

    await waitFor(() => expect(result.current.canPrompt).toBe(true));

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(outcome).toBe(false);
    expect(result.current.canPrompt).toBe(false);
    expect(result.current.canShowButton).toBe(false);
  });

  it("promptInstall zwraca false gdy nie ma deferred eventu", async () => {
    const { result } = renderHook(() => usePwaInstall());
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(outcome).toBe(false);
  });
});

describe("usePwaInstall — appinstalled", () => {
  it("ustawia hasInstalled = true po appinstalled", async () => {
    const fakeEvent = makeFakeBeforeInstallPrompt();
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(fakeEvent as unknown as Event);
    });
    await waitFor(() => expect(result.current.canPrompt).toBe(true));

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    await waitFor(() => {
      expect(result.current.hasInstalled).toBe(true);
      expect(result.current.canPrompt).toBe(false);
    });
  });
});

describe("usePwaInstall — iOS", () => {
  it("canShowButton = true na iOS Safari nawet bez beforeinstallprompt", async () => {
    setStandaloneMatchMedia(false);
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "iPhone",
      5
    );
    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => {
      expect(result.current.isIos).toBe(true);
      expect(result.current.canShowButton).toBe(true);
    });
  });

  it("canShowButton = false na iOS gdy już standalone (zainstalowana)", async () => {
    setStandaloneMatchMedia(true);
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "iPhone",
      5
    );
    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => {
      expect(result.current.isIos).toBe(true);
      expect(result.current.isStandalone).toBe(true);
      expect(result.current.canShowButton).toBe(false);
    });
  });
});

describe("usePwaInstall — Android", () => {
  it("canShowButton = false na Android bez beforeinstallprompt", async () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120",
      "Linux armv8l",
      0
    );
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canShowButton).toBe(false);
  });

  it("canShowButton = true na Android po beforeinstallprompt", async () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120",
      "Linux armv8l",
      0
    );
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(
        makeFakeBeforeInstallPrompt() as unknown as Event
      );
    });

    await waitFor(() => {
      expect(result.current.canShowButton).toBe(true);
    });
  });
});

describe("usePwaInstall — czyszczenie listenerów", () => {
  it("usuwa listenery przy unmount (nie wycieka)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => usePwaInstall());

    const beforeCount = addSpy.mock.calls.filter(
      (c) => c[0] === "beforeinstallprompt"
    ).length;
    const installedCount = addSpy.mock.calls.filter(
      (c) => c[0] === "appinstalled"
    ).length;

    unmount();

    const removedBefore = removeSpy.mock.calls.filter(
      (c) => c[0] === "beforeinstallprompt"
    ).length;
    const removedInstalled = removeSpy.mock.calls.filter(
      (c) => c[0] === "appinstalled"
    ).length;

    expect(beforeCount).toBe(1);
    expect(installedCount).toBe(1);
    expect(removedBefore).toBe(1);
    expect(removedInstalled).toBe(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
