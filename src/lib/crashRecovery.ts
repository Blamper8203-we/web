// WHY: Ścieżka odzyskiwania po crashu, którego źródłem jest uszkodzony stan roboczy
// w localStorage. Sam "Odśwież" nie pomaga — reload wczyta ten sam wadliwy stan i
// aplikacja znowu się wywali (pętla crashu). Elektryk w terenie utknąłby z białym
// ekranem. Ta funkcja ARCHIWIZUJE bieżący stan (nigdy nie kasuje danych klienta —
// AGENTS.md) pod kluczem backupu ze znacznikiem czasu, a potem czyści klucze stanu
// roboczego, dzięki czemu kolejny reload startuje od pustego, sprawnego projektu.
//
// Czysta względem wstrzykiwanego storage → testowalna bez globalnego localStorage.

import {
  SYMBOLS_STORAGE_KEY,
  LEGACY_SYMBOLS_STORAGE_KEY,
  CONNECTIONS_STORAGE_KEY,
} from "./appHelpers";

// Prefiks kluczy backupu. Backupy nie są nigdy kasowane automatycznie — zostają
// w localStorage jako siatka bezpieczeństwa, skąd można ręcznie odzyskać dane.
export const RECOVERY_BACKUP_KEY_PREFIX = "dinboard.recovery-backup.";

// Klucze stanu roboczego czyszczone przy odzyskiwaniu. PEŁNA lista źródeł, które
// inicjalizują stan aplikacji. Wire settings NIE są czyszczone — to preferencja
// użytkownika, nie projekt, i raczej nie powoduje crashu.
const WORKING_STATE_KEYS = [
  SYMBOLS_STORAGE_KEY,
  LEGACY_SYMBOLS_STORAGE_KEY,
  CONNECTIONS_STORAGE_KEY,
] as const;

// Minimalny kontrakt storage, jakiego potrzebujemy (kompatybilny z window.localStorage).
export interface RecoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RecoveryResult {
  /** true jeśli cokolwiek zostało zarchiwizowane lub wyczyszczone. */
  recovered: boolean;
  /** Klucz backupu, jeśli powstał. */
  backupKey: string | null;
}

/**
 * Archiwizuje bieżący stan roboczy i czyści go, by kolejny reload wystartował czysto.
 * Nigdy nie rzuca — to ostatnia deska ratunku w error boundary, więc sama nie może
 * dodać kolejnego crashu.
 *
 * @param storage źródło storage (domyślnie window.localStorage przez wołającego)
 * @param now wstrzykiwany czas (dla determinizmu w testach)
 */
export function safeArchiveAndResetWorkingState(
  storage: RecoveryStorage,
  now: () => number = Date.now,
): RecoveryResult {
  try {
    const snapshot: Record<string, string> = {};
    for (const key of WORKING_STATE_KEYS) {
      const value = storage.getItem(key);
      if (value !== null) {
        snapshot[key] = value;
      }
    }

    const hasAnything = Object.keys(snapshot).length > 0;
    let backupKey: string | null = null;

    if (hasAnything) {
      backupKey = `${RECOVERY_BACKUP_KEY_PREFIX}${now()}`;
      try {
        storage.setItem(backupKey, JSON.stringify(snapshot));
      } catch {
        // Brak miejsca na backup nie może zablokować odzyskiwania — czyścimy mimo to,
        // żeby przerwać pętlę crashu. Dane i tak byłyby nieczytelne dla aplikacji.
        backupKey = null;
      }
    }

    for (const key of WORKING_STATE_KEYS) {
      storage.removeItem(key);
    }

    return { recovered: hasAnything, backupKey };
  } catch {
    // Storage niedostępny (np. tryb prywatny / Capacitor sync) — no-op, nie crashujemy.
    return { recovered: false, backupKey: null };
  }
}
