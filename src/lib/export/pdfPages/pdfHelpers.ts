import type { SymbolItem } from "../../../types/symbolItem";

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
