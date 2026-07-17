// WHY: Odróżnienie "tap" od "scroll/swipe" na liście elementów dotykowej.
//
// Problem: nasłuch na `touchstart` z `preventDefault()` (stara implementacja
// AppLeftPanel) blokował scroll listy — `preventDefault` na touchstart anuluje
// rozpoznawanie gestu scrolla dla całej sekwencji dotyku. Zamiast tego
// rejestrujemy pozycję startu w touchstart (bez preventDefault) i decydujemy
// w touchend: jeśli palec przejechał < TAP_THRESHOLD → tap, jeśli >= → scroll.
//
// Próg 10px to standard UI: iOS używa ~10px do odróżnienia tap od pan, Android
// 8-10px. Mniej niż 10px = ludzki palek przy podniesieniu nie drga bardziej.
export const TAP_THRESHOLD_PX = 10;

export type TouchPoint = { x: number; y: number };

/**
 * Euclidean distance między startową a końcową pozycją palca.
 * Czysta funkcja — łatwa do testowania bez DOM.
 */
export function touchDistance(start: TouchPoint, end: TouchPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Zwraca true jeśli sekwencja dotyku (start → end) wygląda jak TAP,
 * false jeśli wygląda jak scroll/swipe (ruch > TAP_THRESHOLD_PX).
 *
 * Brak startu (null) → false (sekwencja nie została poprawnie rozpoczęta,
 * np. touchend bez poprzedzającego touchstart — bezpiecznie nie traktujemy
 * jako tap, żeby uniknąć przypadkowego dodania modułu).
 */
export function isTap(start: TouchPoint | null, end: TouchPoint): boolean {
  if (!start) return false;
  return touchDistance(start, end) < TAP_THRESHOLD_PX;
}
