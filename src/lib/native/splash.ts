/**
 * Wrapper dla @capacitor/splash-screen — ukrywanie natywnego splash screena
 * gdy React/webview jest gotowy.
 *
 * Dlaczego wrapper zamiast bezpośredniego importu:
 * - Web build nie ma pluginu Capacitora (runtime rzuca "Not implemented"
 *   na platformie web). Wrapper vyłapuje wyjątek i nic nie robi na web.
 * - Dynamiczny import opóźnia ładowanie — web build nie pobiera w ogóle
 *   chunka splash-screen, więc bundle jest mniejszy.
 * - Testowalność: można zamockować `Capacitor.isNativePlatform()`
 *   i sprawdzać że hideNativeSplash nie crashuje w trybie web.
 *
 * High-risk wg AGENTS.md: natywny splash to Project I/O (capacitor.config.ts).
 * Ten plik nie zmienia konfiguracji — tylko woła plugin API z try/catch.
 */

import { Capacitor } from "@capacitor/core";

/**
 * Ukrywa natywny splash screen Capacitora.
 *
 * Zachowanie:
 * - Na platformie natywnej (iOS/Android): woła SplashScreen.hide().
 *   Jeśli plugin nie jest zainstalowany albo rzuca — nic nie robi.
 * - Na web: nie woła nic (Capacitor.isNativePlatform() zwraca false).
 *
 * Wywoływana z main.tsx po hydratacji React, żeby zapobiec "zawieszeniu"
 * splash na ekranie gdy webview już załadował aplikację webową.
 *
 * Zwraca Promise<void> — resolution nie oznacza że splash faktycznie zniknął
 * (Android/iOS może mieć własną animację fade-out), tylko że wywołanie się
 * powiodło. Błędy są logowane do reportRuntimeError ale nie rzucone dalej.
 */
export async function hideNativeSplash(): Promise<void> {
  // SSR guard — na serwerze nie ma window ani Capacitora.
  if (typeof window === "undefined") return;

  let isNative;
  try {
    isNative = Capacitor.isNativePlatform();
  } catch {
    // WHY: Capacitor może rzucić gdy plugin nie jest zarejestrowany
    // (np. w testach jednostkowych bez mocka). Wtedy traktujemy jako web.
    return;
  }
  if (!isNative) return;

  try {
    // WHY: dynamiczny import — web build nie pobiera chunka splash-screen.
    // Statyczny import @capacitor/splash-screen na górze pliku spowodowałby,
    // że kod pluginu (i jego zależności) trafią do głównego bundla web.
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({
      fadeOutDuration: 300,
    });
  } catch (error) {
    // WHY: nie rzucaj — splash i tak zostanie ukryty przez launchAutoHide
    // (domyślnie po launchShowDuration). Błąd logujemy żeby developer widział
    // że coś jest nie tak z instalacją pluginu.
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[hideNativeSplash] nie udało się ukryć splash:", error);
    }
  }
}
