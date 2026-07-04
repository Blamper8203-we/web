import type { SymbolItem } from "../../../types/symbolItem";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { buildCircuitListTableRows, buildCircuitRowsFromSymbols } from "../../circuitRows";
import { chunkRows } from "../../measurementProtocolHelpers";
import { hasDocumentationContent } from "./PdfDocumentationContentPage";

export const UNIFIED_ROWS_PER_PAGE = 7;
export const CIRCUIT_LIST_ROWS_PER_PAGE = 10;
export const TITLE_WORK_SCOPE_MAX_ITEMS = 12;
export const TITLE_WORK_SCOPE_COLUMN_SIZE = 6;
export const EMPTY_FIELD_PLACEHOLDER = "---";

export interface PdfCircuitGroup {
  groupKey: string;
  groupName: string;
  mcbs: SymbolItem[];
  rcd: SymbolItem | null;
}

export function protocolValue(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export function getPdfCircuitGroupKey(symbol: SymbolItem): string {
  if (symbol.rcdSymbolId) return `rcd:${symbol.rcdSymbolId}`;
  if (symbol.group) return `group:${symbol.group}`;
  return "standalone";
}

export function buildPdfCircuitGroups(symbols: SymbolItem[]): PdfCircuitGroup[] {
  const mcbSymbols = symbols.filter((symbol) => symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo");
  const rcdSymbols = symbols.filter((symbol) => symbol.deviceKind === "rcd");

  const groupedCircuits = mcbSymbols.reduce((acc, mcb) => {
    const groupKey = getPdfCircuitGroupKey(mcb);
    const groupName = mcb.groupName || mcb.group || "standalone";
    if (!acc[groupKey]) acc[groupKey] = { groupKey, groupName, mcbs: [], rcd: null };
    acc[groupKey].mcbs.push(mcb);
    return acc;
  }, {} as Record<string, PdfCircuitGroup>);

  rcdSymbols.forEach((rcd) => {
    const rcdKey = `rcd:${rcd.id}`;
    if (groupedCircuits[rcdKey]) {
      groupedCircuits[rcdKey].rcd = rcd;
      groupedCircuits[rcdKey].groupName = rcd.groupName || rcd.group || groupedCircuits[rcdKey].groupName;
      return;
    }
    if (rcd.group) {
      const fallbackKey = `group:${rcd.group}`;
      if (groupedCircuits[fallbackKey]) {
        groupedCircuits[fallbackKey].rcd = rcd;
        groupedCircuits[fallbackKey].groupName = rcd.groupName || rcd.group || groupedCircuits[fallbackKey].groupName;
      }
    }
  });

  return Object.values(groupedCircuits);
}


export function getSuffix(total: number, index: number): string {
  if (total <= 1) return "";
  return String.fromCharCode(65 + index);
}

export function formatProtocolTitle(originalTitle: string, suffix: string): string {
  if (!suffix) return originalTitle;
  const match = originalTitle.match(/(Protokół\s+Nr\s+\d+)/i);
  if (match) return originalTitle.replace(match[1], `${match[1]}${suffix}`);
  const numMatch = originalTitle.match(/(\d+)/);
  if (numMatch) return originalTitle.replace(numMatch[1], `${numMatch[1]}${suffix}`);
  return `${originalTitle} ${suffix}`;
}

/**
 * Usuwa prefix "Protokół Nr" / "Protokół pomiarów Nr" z tytułu strony, zostawiając
 * sam numer. Akceptuje `undefined`/`""`/`"  "` (whitespace) — zwraca pusty string.
 *
 * Unifikacja: wcześniej istniały dwie kopie — defensywna (akceptowała undefined,
 * używana w MeasurementProtocolsWorkspacePage) i prosta (wymagała string,
 * używana w PDF renderingu). Ta wersja łączy oba przypadki.
 */
export function formatProtocolNumberLabel(headerTitle: string | undefined): string {
  const normalized = headerTitle?.trim();
  if (!normalized) {
    return "";
  }
  return normalized.replace(/^protokół\s+(pomiarów\s+)?nr\s+/i, "").trim();
}

/**
 * Canonical display date for PDF headers, preview headers, and any user-visible
 * rendering of `metadata.drawingDate`. Format: `DD.MM.YYYY` (Polish engineering
 * convention — matches `pl-PL` locale, identical to what the UI preview already
 * showed for empty `drawingDate`).
 *
 * WHY: drift here broke UI↔PDF consistency. Previously, preview fell back to
 * `new Date().toLocaleDateString("pl-PL")` → `21.06.2026`, while PDF fell back
 * to `formatDateForField(new Date().toISOString())` → `2026-06-21`. Same input,
 * same fallback, two different strings — same page rendered different dates.
 * This helper is the single source of truth for display; `formatDateForField`
 * remains for ISO `<input type="date">`/storage contexts (different audience).
 *
 * Behaviour:
 * - Empty/invalid `drawingDate` → today's date in `DD.MM.YYYY`.
 * - Valid ISO or pl-PL-shaped date → re-rendered in `DD.MM.YYYY`.
 * - Unparseable input → today's date (matches `formatDateForField` fallback
 *   behaviour, never returns an empty string the user can see).
 */
export function formatDisplayDate(metadata: ProjectMetadata): string {
  const raw = metadata?.drawingDate?.trim();
  const reference = raw && !Number.isNaN(new Date(raw).getTime())
    ? new Date(raw)
    : new Date();
  const day = String(reference.getDate()).padStart(2, "0");
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const year = reference.getFullYear();
  return `${day}.${month}.${year}`;
}

export interface PdfPageCountOptions {
  previewOnly?: string;
  schematicImages?: string[];
  dinRailImages?: string[];
  dinRailWithoutWiresImages?: string[];
}

/**
 * Single source of truth for "how many A4 pages does `PdfProtocolDocument`
 * render for this input?". Both the PDF renderer and the UI footer /
 * preview tab page-index calculations must call this — drift between
 * the two renders a footer like "Strona 8 z 7" on an 8-page document.
 *
 * WHY: PdfProtocolDocument's `previewOnly` branch is conditional; the
 * workspace preview is always editing the full document, so the
 * `previewOnly: undefined` branch is what the UI footer must mirror.
 * Circuit-list and unified tables chunk by rows-per-page; empty sections
 * contribute one chunk (the section heading still occupies a page) — but
 * only when *some* row would render. Otherwise the section is omitted
 * entirely, matching the `&& circuitListRows.length > 0` / `&& unifiedRows.length > 0`
 * guards inside `PdfProtocolDocument`.
 */
export function countPdfPages(
  metadata: ProjectMetadata,
  symbols: SymbolItem[],
  options: PdfPageCountOptions = {},
): number {
  const {
    previewOnly,
    schematicImages = [],
    dinRailImages = [],
    dinRailWithoutWiresImages = [],
  } = options;

  const circuitListRows = symbols.length > 0
    ? buildCircuitListTableRows(buildCircuitRowsFromSymbols(symbols))
    : [];
  const unifiedRows = metadata.measurementProtocols?.unifiedRows ?? [];

  const circuitListChunks = circuitListRows.length > 0
    ? chunkRows(circuitListRows, CIRCUIT_LIST_ROWS_PER_PAGE).length
    : 0;
  const unifiedChunks = unifiedRows.length > 0
    ? chunkRows(unifiedRows, UNIFIED_ROWS_PER_PAGE).length
    : 0;

  let pages = 0;
  if (!previewOnly || previewOnly === "title-page") pages += 2;
  if (!previewOnly || previewOnly === "toc") pages += 1;
  if (!previewOnly || previewOnly === "summary") pages += 1;
  if (!previewOnly || previewOnly === "documentation") {
    if (hasDocumentationContent(metadata)) pages += 1;
  }
  if (!previewOnly || previewOnly === "circuit-list") pages += circuitListChunks;
  if (!previewOnly || previewOnly === "unified") pages += unifiedChunks;
  if (!previewOnly || previewOnly === "rcd-ground") {
    if ((metadata.measurementProtocols?.rcdRows?.length ?? 0) > 0) pages += 1;
  }
  if (!previewOnly || previewOnly === "schematic") pages += schematicImages.length;
  if (!previewOnly || previewOnly === "din-rail" || previewOnly === "din-rail-connections") {
    pages += dinRailWithoutWiresImages.length + dinRailImages.length;
  }
  return pages;
}
