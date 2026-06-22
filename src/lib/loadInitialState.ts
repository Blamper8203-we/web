// WHY: Inicjalizacja stanu aplikacji czyta nieufne dane z localStorage (mogą byc
// uszkodzone, niekompletne lub ze starszej wersji). Wcześniej ta logika żyła inline
// w App.tsx jako surowe JSON.parse w blokach `try { } catch { /* ignore */ }`, co:
//   1. omijało warstwę lib/ i normalizery typów (niespójne z resztą kodu),
//   2. połykało błędy w ciszy (brak diagnostyki dla developera),
//   3. powtarzało magiczne stringi-klucze w komponencie.
//
// Te funkcje są czyste (storage wstrzykiwany), więc testowalne bez DOM i bez mocków
// globalnego localStorage. App.tsx woła je z domyślnym `safeGetItemSync`.

import {
  SYMBOLS_STORAGE_KEY,
  LEGACY_SYMBOLS_STORAGE_KEY,
  CONNECTIONS_STORAGE_KEY,
  DEFAULT_WIRE_SETTINGS_STORAGE_KEY,
} from "./appHelpers";
import { normalizeSymbolItems, type SymbolItem } from "../types/symbolItem";
import {
  normalizeConnectionItems,
  type ConnectionItem,
  type WireColor,
  type WireType,
  type RoutingMode,
  type FerruleColor,
} from "../types/connectionItem";

export type WireSettings = {
  wireColor: WireColor;
  wireCrossSection: number;
  wireType: WireType;
  routingMode: RoutingMode;
  ferruleColor?: FerruleColor;
};

export const DEFAULT_WIRE_SETTINGS: WireSettings = {
  wireColor: "black",
  wireCrossSection: 2.5,
  wireType: "LgY",
  routingMode: "manhattan",
  ferruleColor: "white",
};

/** Sygnatura kompatybilna z safeGetItemSync z storageService. */
export type ReadStorage = (key: string) => string | null | undefined;

// WHY: jedno miejsce na logowanie błędu parsowania. Nie rzucamy do UI (to inicjalizacja
// stanu, crash tutaj = biały ekran), ale też nie połykamy w ciszy — console.warn zostaje
// jako diagnostyka dla developera (dozwolone w eslant config: no-console allow warn/error).
function warnCorruptState(label: string, error: unknown): void {
  console.warn(`[loadInitialState] Nie udało się odczytać "${label}" ze storage, używam wartości domyślnej.`, error);
}

export function loadInitialSymbols(read: ReadStorage): SymbolItem[] {
  try {
    const rawValue = read(SYMBOLS_STORAGE_KEY) ?? read(LEGACY_SYMBOLS_STORAGE_KEY);
    if (rawValue) {
      const normalized = normalizeSymbolItems(JSON.parse(rawValue) as Partial<SymbolItem>[]);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  } catch (error) {
    warnCorruptState(SYMBOLS_STORAGE_KEY, error);
  }
  return [];
}

export function loadInitialConnections(read: ReadStorage): ConnectionItem[] {
  try {
    const rawValue = read(CONNECTIONS_STORAGE_KEY);
    if (rawValue) {
      return normalizeConnectionItems(JSON.parse(rawValue));
    }
  } catch (error) {
    warnCorruptState(CONNECTIONS_STORAGE_KEY, error);
  }
  return [];
}

export function loadInitialWireSettings(read: ReadStorage): WireSettings {
  try {
    const rawValue = read(DEFAULT_WIRE_SETTINGS_STORAGE_KEY);
    if (rawValue) {
      const parsed = JSON.parse(rawValue) as Partial<WireSettings>;
      if (parsed && typeof parsed === "object") {
        // Merge na domyślne — brakujące/uszkodzone pola nie wywalą reszty stanu.
        return { ...DEFAULT_WIRE_SETTINGS, ...parsed };
      }
    }
  } catch (error) {
    warnCorruptState(DEFAULT_WIRE_SETTINGS_STORAGE_KEY, error);
  }
  return { ...DEFAULT_WIRE_SETTINGS };
}
