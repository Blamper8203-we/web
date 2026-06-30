// WHY: Plain JavaScript Maps nie maja limitu rozmiaru. Dlugie sesje z
// wieloma modulami/previewami (np. ModuleAssetPreview z jego 3 globalnymi
// Map dla SVG/raster/image) moga nieograniczenie zjadac RAM. Te helpery
// wymuszaja konfigurowalny max rozmiar przez wyrzucanie najstarszego
// wpisu przy przepelnieniu (LRU eviction).
//
// Polityka LRU = eviction najstarszego + touch-on-get (move-to-end).
// Sam `setWithLruEviction` gwarantuje tylko brak unbounded growth
// (FIFO-like). `touchLruEntry` przy `get` przesuwa wpis na koniec
// insertion order, dajac true LRU. Oba razem = pelna polityka LRU.

export function setWithLruEviction<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxSize: number,
): void {
  if (maxSize <= 0) {
    return;
  }

  // Map.set na istniejacym kluczu AKTUALIZUJE wartosc, ale NIE przesuwa
  // klucza na koniec insertion order. Zeby set zachowywal sie jak LRU
  // (najnowszy = koniec), musimy najpierw usunac stary wpis, potem set.
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, value);

  // `while` (nie `if`) bo set moze zwiekszyc rozmiar o wiecej niz 1
  // (np. update istniejacego klucza + dodanie nowego).
  while (map.size > maxSize) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    map.delete(oldestKey);
  }
}

export function touchLruEntry<K, V>(map: Map<K, V>, key: K): V | undefined {
  const value = map.get(key);
  if (value === undefined) {
    return undefined;
  }

  // Map.preserve insertion order. delete + set przesuwa klucz na koniec.
  map.delete(key);
  map.set(key, value);
  return value;
}
