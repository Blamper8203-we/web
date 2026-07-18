import { useCallback, useEffect, useRef, useState } from "react";
import {
  BeforeInstallPromptEvent,
  detectInstallPlatform,
  isProbablyIos,
  isStandaloneMode,
} from "../lib/pwa/installPrompt";

// WHY: `beforeinstallprompt` odpala się tylko RAZ, chwilę po załadowaniu strony.
// Jeśli użytkownik wejdzie na landing page, potem przejdzie do aplikacji (SPA),
// a potem wróci na landing page, hook `usePwaInstall` zammountuje się ponownie.
// Bez globalnego cache'u hook nie złapałby już eventu i przycisk by zniknął.
let globalDeferredEvent: BeforeInstallPromptEvent | null = null;
let globalHasInstalled = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    globalDeferredEvent = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("pwa-prompt-ready"));
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredEvent = null;
    globalHasInstalled = true;
    window.dispatchEvent(new Event("pwa-installed"));
  });
}

/**
 * Stan instalacji PWA zwracany przez hook.
 */
export interface PwaInstallState {
  canPrompt: boolean;
  isStandalone: boolean;
  hasInstalled: boolean;
  isIos: boolean;
  canShowButton: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePwaInstall(): PwaInstallState {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(globalDeferredEvent);
  const [hasInstalled, setHasInstalled] = useState(globalHasInstalled);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(globalDeferredEvent);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsStandalone(isStandaloneMode());
    setIsIos(isProbablyIos());

    // Upewniamy się, że mamy aktualny event z globalnego cache przy montowaniu
    if (globalDeferredEvent && !deferredRef.current) {
      deferredRef.current = globalDeferredEvent;
      setDeferredEvent(globalDeferredEvent);
    }

    const handleReady = () => {
      deferredRef.current = globalDeferredEvent;
      setDeferredEvent(globalDeferredEvent);
    };

    const handleInstall = () => {
      deferredRef.current = null;
      setDeferredEvent(null);
      setHasInstalled(true);
    };

    window.addEventListener("pwa-prompt-ready", handleReady);
    window.addEventListener("pwa-installed", handleInstall);

    return () => {
      window.removeEventListener("pwa-prompt-ready", handleReady);
      window.removeEventListener("pwa-installed", handleInstall);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const event = deferredRef.current;
    if (!event) return false;
    
    try {
      await event.prompt();
      const choice = await event.userChoice;
      globalDeferredEvent = null;
      deferredRef.current = null;
      setDeferredEvent(null);
      return choice.outcome === "accepted";
    } catch {
      globalDeferredEvent = null;
      deferredRef.current = null;
      setDeferredEvent(null);
      return false;
    }
  }, []);

  const platform = isIos ? "ios" : detectInstallPlatform();
  let canShowButton = false;
  if (!isStandalone) {
    if (platform === "ios") {
      canShowButton = true;
    } else if (platform === "android" || platform === "desktop") {
      canShowButton = deferredEvent !== null;
    }
  }

  return {
    canPrompt: deferredEvent !== null,
    isStandalone,
    hasInstalled,
    isIos,
    canShowButton,
    promptInstall,
  };
}
