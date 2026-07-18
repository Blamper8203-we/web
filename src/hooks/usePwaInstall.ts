import { useCallback, useEffect, useRef, useState } from "react";
import {
  BeforeInstallPromptEvent,
  detectInstallPlatform,
  isProbablyIos,
  isStandaloneMode,
} from "../lib/pwa/installPrompt";

/**
 * Stan instalacji PWA zwracany przez hook.
 */
export interface PwaInstallState {
  /** true gdy przeglądarka już odpaliła `beforeinstallprompt` i mamy deferred event. */
  canPrompt: boolean;
  /** true gdy aplikacja działa już jako zainstalowana PWA (display-mode: standalone). */
  isStandalone: boolean;
  /** true gdy użytkownik już raz kliknął instaluj i zaakceptował (w tej sesji). */
  hasInstalled: boolean;
  /** true gdy to iOS — tam instalacja odbywa się przez Share → Dodaj do ekranu. */
  isIos: boolean;
  /** true gdy w ogóle warto pokazać przycisk (czyli nie standalone + wspierana platforma). */
  canShowButton: boolean;
  /** Wywołuje natywny prompt. Zwraca true jeśli zaakceptowano, false jeśli odrzucono/brak event. */
  promptInstall: () => Promise<boolean>;
}

/**
 * Nasłuchuje `beforeinstallprompt` / `appinstalled` i udostępnia kontrolę
 * nad instalacją PWA.
 *
 * Architektura:
 * - `beforeinstallprompt` ląduje w `ref` (nie w stanie) — React nie musi
 *   re-renderować przy zmianie ref. Stan `canPrompt` jest booleanskim
 *   odbiciem "czy ref jest niepusty", który re-renderuje UI.
 * - `appinstalled` czyści ref + ustawia `hasInstalled = true` (do ewentualnego
 *   toastu / analityki).
 *
 * SSR-safe: na serwerze wszystkie listenery są skipowane, hook zwraca
 * bezpieczne wartości domyślne (canPrompt=false, isStandalone=false).
 *
 * Dlaczego nie `getInstalledRelatedApps()`: API eksperymentalne, słabo
 * wspierane (Chrome Android tylko), a `isStandaloneMode()` przez matchMedia
 * daje nam sygnał "już zainstalowane" bez listowania zewnętrznych app-ów.
 */
export function usePwaInstall(): PwaInstallState {
  const [deferredEvent, setDeferredEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [hasInstalled, setHasInstalled] = useState(false);
  // WHY: ref zapobiega race'owi — jeśli użytkownik kliknie "Instaluj" dwukrotnie
  // szybko, drugie kliknięcie widzi ten sam ref i nie próbuje wywołać prompt()
  // na już skonsumowanym evencie (Chrome rzuca TypeError po pierwszym .prompt()).
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // SSR guard — na serwerze `window` nie istnieje, wszystkie listenery skip.
    if (typeof window === "undefined") return;

    // Inicjalizacja wartości detekcji w efekcie (po hydratacji), żeby uniknąć
    // hydration mismatch między serwerem (false) a klientem.
    setIsStandalone(isStandaloneMode());
    setIsIos(isProbablyIos());

    const handleBeforeInstallPrompt = (event: Event) => {
      // WHY: preventDefault() blokuje Chrome przed pokazaniem własnego,
      // nie-stylizowanego prompta — chcemy własny przycisk z brandingiem.
      event.preventDefault();
      const biEvent = event as BeforeInstallPromptEvent;
      deferredRef.current = biEvent;
      setDeferredEvent(biEvent);
    };

    const handleAppInstalled = () => {
      // WHY: po instalacji Chrome czyści event — my czyścimy też nasz ref i stan,
      // żeby przycisk znikał natychmiast (nie trzeba przeładować strony).
      deferredRef.current = null;
      setDeferredEvent(null);
      setHasInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const event = deferredRef.current;
    if (!event) {
      // WHY: returns false zamiast rzucać — UI może to zignorować albo pokazać
      // fallback (np. na iOS, gdzie nie ma beforeinstallprompt, używamy overlay).
      return false;
    }
    try {
      await event.prompt();
      const choice = await event.userChoice;
      // WHY: konsumpcja eventu — Chrome wymaga tego; po odczytaniu userChoice
      // event jest "used" i nie można go ponownie .prompt(). Czyścimy ref.
      deferredRef.current = null;
      setDeferredEvent(null);
      return choice.outcome === "accepted";
    } catch {
      // WHY: niektóre przeglądarki (Edge z experimentami) mogą rzucić, gdy prompt
      // już był pokazany albo user szybko zamknął. Nie crashujemy UI.
      deferredRef.current = null;
      setDeferredEvent(null);
      return false;
    }
  }, []);

  // canShowButton: nie pokazujemy gdy już standalone, nie pokazujemy gdy
  // platforma całkowicie niewspierana. Na iOS pokazujemy zawsze (instrukcja
  // nie wymaga beforeinstallprompt), na Android/desktop tylko gdy mamy event.
  const platform = isIos ? "ios" : detectInstallPlatform();
  let canShowButton = false;
  if (!isStandalone) {
    if (platform === "ios") {
      canShowButton = true; // instrukcja Share → Dodaj do ekranu
    } else if (platform === "android" || platform === "desktop") {
      // WHY: na tych platformach wymagamy faktycznego eventu — bez niego
      // przeglądarka może nie być instalowalna (np. Firefox desktop bez flagi),
      // więc lepiej ukryć guzik niż pokazywać niedziałający.
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
