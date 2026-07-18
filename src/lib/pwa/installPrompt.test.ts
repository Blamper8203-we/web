import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BeforeInstallPromptEvent,
  canShowInstallButton,
  detectInstallPlatform,
  isProbablyIos,
  isStandaloneMode,
} from "./installPrompt";

// WHY: jsdom nie implementuje `navigator.standalone` ani domyślnie
// `display-mode: standalone`. Każdy test modyfikuje te wartości explicite,
// żeby wynik był deterministyczny i niezależny od środowiska CI.

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
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

function setUserAgent(ua: string): void {
  // WHY: userAgent jest read-only w jsdom — defineProperty omija to.
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: ua,
  });
}

function setNavigatorStandalone(value: boolean | undefined): void {
  Object.defineProperty(navigator, "standalone", {
    configurable: true,
    value,
  });
}

function setPlatform(platform: string): void {
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    value: platform,
  });
}

function setMaxTouchPoints(value: number): void {
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  // WHY: przywracamy realistyczne wartości desktop, żeby nie przenieść mocka
  // do testu w innej grupie. Vitest nie resetuje defineProperty automatycznie.
  setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0"
  );
  setNavigatorStandalone(undefined);
  setPlatform("Win32");
  setMaxTouchPoints(0);
  setStandaloneMatchMedia(false);
});

describe("isStandaloneMode", () => {
  it("zwraca false gdy display-mode: standalone nie pasuje (przeglądarka)", () => {
    setStandaloneMatchMedia(false);
    expect(isStandaloneMode()).toBe(false);
  });

  it("zwraca true gdy display-mode: standalone pasuje (zainstalowana PWA)", () => {
    setStandaloneMatchMedia(true);
    expect(isStandaloneMode()).toBe(true);
  });

  it("zwraca true gdy navigator.standalone = true (iOS Safari zainstalowana)", () => {
    setStandaloneMatchMedia(false);
    setNavigatorStandalone(true);
    expect(isStandaloneMode()).toBe(true);
  });

  it("zwraca false gdy navigator.standalone = false (iOS Safari w przeglądarce)", () => {
    setStandaloneMatchMedia(false);
    setNavigatorStandalone(false);
    expect(isStandaloneMode()).toBe(false);
  });

  it("nie crashuje gdy window.matchMedia rzuca wyjątek", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: () => {
        throw new Error("not supported");
      },
    });
    setNavigatorStandalone(undefined);
    expect(isStandaloneMode()).toBe(false);
  });
});

describe("isProbablyIos", () => {
  it("rozpoznaje iPhone z UA", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    expect(isProbablyIos()).toBe(true);
  });

  it("rozpoznaje iPoda z UA", () => {
    setUserAgent("Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X)");
    expect(isProbablyIos()).toBe(true);
  });

  it("rozpoznaje iPada ze starym UA (przed iPadOS 13)", () => {
    setUserAgent("Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X)");
    expect(isProbablyIos()).toBe(true);
  });

  it("rozpoznaje iPada z iPadOS 13+ (UA udaje macOS, ale maxTouchPoints > 1)", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15"
    );
    setPlatform("MacIntel");
    setMaxTouchPoints(5);
    expect(isProbablyIos()).toBe(true);
  });

  it("nie myli desktop Maca z iPadem (maxTouchPoints = 0)", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15"
    );
    setPlatform("MacIntel");
    setMaxTouchPoints(0);
    expect(isProbablyIos()).toBe(false);
  });

  it("zwraca false dla Androida", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120"
    );
    expect(isProbablyIos()).toBe(false);
  });

  it("zwraca false dla Windows desktop", () => {
    setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
    );
    expect(isProbablyIos()).toBe(false);
  });
});

describe("detectInstallPlatform", () => {
  it("zwraca 'ios' dla iPhone", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    expect(detectInstallPlatform()).toBe("ios");
  });

  it("zwraca 'android' dla Android Chrome", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120"
    );
    expect(detectInstallPlatform()).toBe("android");
  });

  it("zwraca 'desktop' dla Windows", () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120");
    expect(detectInstallPlatform()).toBe("desktop");
  });

  it("zwraca 'desktop' dla macOS (bez dotyku)", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1");
    setPlatform("MacIntel");
    setMaxTouchPoints(0);
    expect(detectInstallPlatform()).toBe("desktop");
  });

  it("zwraca 'desktop' dla Linux x86", () => {
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0");
    expect(detectInstallPlatform()).toBe("desktop");
  });

  it("zwraca 'other' dla nieznanego UA", () => {
    setUserAgent("Mozilla/5.0 (KaiOS; Nokia 8110) Gecko/48.0");
    setPlatform("Linux armv8l");
    expect(detectInstallPlatform()).toBe("other");
  });
});

describe("canShowInstallButton", () => {
  beforeEach(() => {
    setStandaloneMatchMedia(false);
    setNavigatorStandalone(undefined);
  });

  it("zwraca true dla 'android'", () => {
    expect(canShowInstallButton("android")).toBe(true);
  });

  it("zwraca true dla 'ios'", () => {
    expect(canShowInstallButton("ios")).toBe(true);
  });

  it("zwraca true dla 'desktop'", () => {
    expect(canShowInstallButton("desktop")).toBe(true);
  });

  it("zwraca false dla 'other' (niewspierana platforma)", () => {
    expect(canShowInstallButton("other")).toBe(false);
  });

  it("zwraca false gdy już standalone (PWA zainstalowana na Android)", () => {
    setStandaloneMatchMedia(true);
    expect(canShowInstallButton("android")).toBe(false);
  });

  it("zwraca false gdy iOS zainstalowane (navigator.standalone)", () => {
    setNavigatorStandalone(true);
    expect(canShowInstallButton("ios")).toBe(false);
  });
});

describe("BeforeInstallPromptEvent (typ)", () => {
  it("jest to tylko interfejs typów — sprawdzamy że się importuje", () => {
    // WHY: test smoke — potwierdza, że typ jest eksportowany i dostępny
    // dla hooka bez runtime error. Nie ma logiki runtime do przetestowania.
    const sample = {
      platforms: ["android"],
      userChoice: Promise.resolve({ outcome: "accepted", platform: "android" }),
      prompt: () => Promise.resolve(),
    } as unknown as BeforeInstallPromptEvent;
    expect(sample.platforms).toEqual(["android"]);
  });
});
