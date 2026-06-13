import { useEffect } from "react";
import { safeSetItem } from "../lib/storageService";
import { reportRuntimeError } from "../lib/runtimeDiagnostics";

/**
 * Hook ujednolicający zapis do storage'a z debouncingiem.
 * Pozwala na redukcję zduplikowanych useEffectów w App.tsx.
 * 
 * @param key Klucz w storage'u
 * @param value Wartość do zapisania (będzie zserializowana do JSON)
 * @param debounceMs Czas opóźnienia w milisekundach (domyślnie 250)
 */
export function useDebouncedPersist<T>(key: string, value: T, debounceMs: number = 250) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      safeSetItem(key, JSON.stringify(value)).catch((error) =>
        reportRuntimeError(error, { source: "unhandled-error" })
      );
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [key, value, debounceMs]);
}
