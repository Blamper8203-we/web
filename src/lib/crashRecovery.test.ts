import { describe, it, expect } from "vitest";
import {
  safeArchiveAndResetWorkingState,
  RECOVERY_BACKUP_KEY_PREFIX,
  type RecoveryStorage,
} from "./crashRecovery";
import {
  SYMBOLS_STORAGE_KEY,
  CONNECTIONS_STORAGE_KEY,
} from "./appHelpers";

// WHY: crashRecovery to ostatnia deska ratunku w error boundary. Testy pinują
// kontrakt: archiwizuje (nie kasuje danych), czyści stan roboczy, nigdy nie rzuca.
function makeStorage(initial: Record<string, string> = {}): RecoveryStorage & {
  dump: () => Record<string, string>;
} {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    dump: () => ({ ...store }),
  };
}

describe("safeArchiveAndResetWorkingState", () => {
  it("archiwizuje istniejący stan pod kluczem backupu i czyści stan roboczy", () => {
    const storage = makeStorage({
      [SYMBOLS_STORAGE_KEY]: '[{"id":"s1"}]',
      [CONNECTIONS_STORAGE_KEY]: '[{"id":"c1"}]',
    });

    const result = safeArchiveAndResetWorkingState(storage, () => 1000);

    expect(result.recovered).toBe(true);
    expect(result.backupKey).toBe(`${RECOVERY_BACKUP_KEY_PREFIX}1000`);

    const dump = storage.dump();
    // Stan roboczy wyczyszczony:
    expect(dump[SYMBOLS_STORAGE_KEY]).toBeUndefined();
    expect(dump[CONNECTIONS_STORAGE_KEY]).toBeUndefined();
    // Backup zawiera oryginalne dane (nie zgubione):
    const backup = JSON.parse(dump[result.backupKey as string]);
    expect(backup[SYMBOLS_STORAGE_KEY]).toBe('[{"id":"s1"}]');
    expect(backup[CONNECTIONS_STORAGE_KEY]).toBe('[{"id":"c1"}]');
  });

  it("jest no-op gdy nie ma stanu roboczego (recovered=false, brak backupu)", () => {
    const storage = makeStorage({});
    const result = safeArchiveAndResetWorkingState(storage, () => 1000);
    expect(result.recovered).toBe(false);
    expect(result.backupKey).toBeNull();
    expect(Object.keys(storage.dump())).toHaveLength(0);
  });

  it("czyści stan nawet gdy zapis backupu zawiedzie (przerwanie pętli crashu)", () => {
    const storage = makeStorage({ [SYMBOLS_STORAGE_KEY]: '[{"id":"s1"}]' });
    // setItem rzuca (np. brak miejsca):
    storage.setItem = () => {
      throw new Error("QuotaExceeded");
    };

    const result = safeArchiveAndResetWorkingState(storage, () => 1000);

    expect(result.backupKey).toBeNull();
    // mimo nieudanego backupu stan roboczy wyczyszczony:
    expect(storage.dump()[SYMBOLS_STORAGE_KEY]).toBeUndefined();
  });

  it("nie rzuca gdy storage jest niedostępny", () => {
    const throwingStorage: RecoveryStorage = {
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(() => safeArchiveAndResetWorkingState(throwingStorage)).not.toThrow();
    expect(safeArchiveAndResetWorkingState(throwingStorage).recovered).toBe(false);
  });
});
