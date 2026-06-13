/**
 * storageService.ts
 *
 * Jednolity interfejs do przechowywania danych w przegladarce (localStorage)
 * i na platformach natywnych Capacitor (Preferences).
 *
 * Na iOS/Android localStorage ma limit ~5-6MB i moze byc czyszczone przez system.
 * Capacitor Preferences przechowuje dane w natywnym magazynie klucz-wartosc,
 * ktory jest trwalszy i nie ma surowych limitow localStorage.
 */

import { Capacitor } from "@capacitor/core";

type PreferencesPlugin = {
  get: (options: { key: string }) => Promise<{ value: string | null }>;
  set: (options: { key: string; value: string }) => Promise<void>;
  remove: (options: { key: string }) => Promise<void>;
};

let preferencesPlugin: PreferencesPlugin | null = null;
let isNative = false;

try {
  isNative = Capacitor.isNativePlatform();
} catch {
  isNative = false;
}

/**
 * Inicjalizuje storage. Wywolanie asynchroniczne, ale nie jest wymagane
 * przed pierwszym uzyciem – storageService dziala rowniez bez inicjalizacji
 * (fallback do localStorage).
 */
export async function initStorageService(): Promise<void> {
  if (!isNative) {
    return;
  }

  try {
    const { Preferences } = await import("@capacitor/preferences");
    preferencesPlugin = Preferences;
  } catch {
    preferencesPlugin = null;
  }
}

/**
 * Pobiera wartosc dla podanego klucza.
 * Na platformie natywnej uzywa Capacitor Preferences, w przegladarce localStorage.
 */
export async function safeGetItem(key: string): Promise<string | null> {
  try {
    if (isNative && preferencesPlugin) {
      const { value } = await preferencesPlugin.get({ key });
      return value ?? null;
    }

    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Zapisuje wartosc dla podanego klucza.
 * Na platformie natywnej uzywa Capacitor Preferences, w przegladarce localStorage.
 */
export async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    if (isNative && preferencesPlugin) {
      await preferencesPlugin.set({ key, value });
      return;
    }

    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[storageService] Failed to set item "${key}":`, error);
  }
}

/**
 * Usuwa wartosc dla podanego klucza.
 * Na platformie natywnej uzywa Capacitor Preferences, w przegladarce localStorage.
 */
export async function safeRemoveItem(key: string): Promise<void> {
  try {
    if (isNative && preferencesPlugin) {
      await preferencesPlugin.remove({ key });
      return;
    }

    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storageService] Failed to remove item "${key}":`, error);
  }
}

/**
 * Synchroniczna wersja safeGetItem do uzycia w inicjalizacji useState.
 * Uzywa localStorage (dostepny synchronicznie).
 * Na Capacitor zwraca null przy pierwszym renderze – dane zaladuja sie asynchronicznie.
 */
export function safeGetItemSync(key: string): string | null {
  try {
    if (isNative) {
      // Na platformie natywnej nie mamy synchronicznego dostepu – zwracamy null,
      // a dane laduja sie przez useEffect/asynchronicznie.
      return null;
    }

    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
