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
export const TAP_THRESHOLD_PX = 15;

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

// WHY: okno czasowe na drugi tap w sekwencji "double-tap → dodaj moduł".
// 500ms to standardowy, najbardziej tolerancyjny kompromis: na tyle krótkie, 
// że przypadkowe dwa tapy z rzędu (np. użytkownik zmienia zdanie) nie dodadzą modułu; 
// na tyle długie, że naturalne podwójne stuknięcie palcem zdąży (szczególnie, gdy 
// mierzymy czas od touchend do touchend, a nie touchstart do touchstart).
export const TAP_DOUBLE_MS = 500;

/**
 * Zwraca true jeśli dwa tapy nastąpiły w oknie TAP_DOUBLE_MS.
 * Czysta funkcja — `prevTapTime` to timestamp z Date.now() poprzedniego tapa,
 * `now` to timestamp bieżącego. Brak poprzednika (null) → false (pierwszy
 * tap w sekwencji nigdy nie jest "podwójny").
 *
 * Używane razem z isTap(): moduł dodaje się tylko gdy oba tapy są "tapami"
 * (geometria < TAP_THRESHOLD_PX) i nastąpiły w oknie czasowym.
 */
export function isDoubleTap(prevTapTime: number | null, now: number): boolean {
  if (prevTapTime === null) return false;
  return now - prevTapTime <= TAP_DOUBLE_MS;
}
