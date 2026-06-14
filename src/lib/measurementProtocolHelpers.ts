/**
 * Helpery dla renderowania protokołów pomiarowych.
 *
 * Wcześniej były zdefiniowane lokalnie w `MeasurementProtocolsWorkspacePage.tsx`
 * (HTML preview). Wydzielone tutaj, żeby:
 * - reużywać je z PDF renderingu (PdfUnifiedTablePage, PdfRcdTablePage)
 * - mieć dla nich dedykowane testy jednostkowe
 *
 * Zobacz też: `src/lib/export/pdfPages/pdfHelpers.ts` dla `formatProtocolNumberLabel`,
 * która jest unifikowana z lokalną wersją w MeasurementProtocolsWorkspacePage.
 */

/**
 * Dzieli tablicę wierszy na strony po `size` elementów.
 * Pusta tablica zwraca tablicę z jedną pustą stroną (konsystentne zachowanie
 * dla rendererów — zawsze przynajmniej jedna strona do wyświetlenia).
 */
export function chunkRows<T>(rows: T[], size: number): T[][] {
  if (rows.length === 0) {
    return [[]];
  }

  const results: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    results.push(rows.slice(i, i + size));
  }

  return results;
}

/**
 * Buduje tytuł strony protokołu w formacie "Protokół Nr 03/12".
 * Numer strony i łączna liczba są zawsze 2-cyfrowe (zero-padded).
 */
export function buildSheetTitle(pageIndex: number, totalPages: number): string {
  const current = String(pageIndex + 1).padStart(2, "0");
  const total = String(totalPages).padStart(2, "0");
  return `Protokół Nr ${current}/${total}`;
}

/**
 * Tworzy kopię headera protokołu z ustawionym `headerTitle` na aktualny tytuł strony.
 * Używane przy paginacji — każda strona ma swój nagłówek z numerem.
 */
export function createHeaderForPage<T extends { headerTitle?: string }>(
  header: T,
  pageIndex: number,
  totalPages: number,
): T {
  return {
    ...header,
    headerTitle: buildSheetTitle(pageIndex, totalPages),
  };
}
