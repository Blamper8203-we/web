import type { SymbolItem } from "../../types/symbolItem";
import type { ValidationMessage, ValidationResult, ValidationSeverity } from "./electricalValidationService";

export interface ValidationDisplayGroup {
  id: string;
  title: string;
  technicalId?: string;
  subtitle: string;
  severity: ValidationSeverity;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  messages: ValidationMessage[];
}

export type ValidationReadiness = "emptyProject" | "noCircuitDevices" | "ready";

const SEVERITY_WEIGHT: Record<ValidationSeverity, number> = {
  Error: 0,
  Warning: 1,
  Info: 2,
};

export function buildValidationDisplayGroups(result: ValidationResult): ValidationDisplayGroup[] {
  return buildValidationDisplayGroupsForSymbols(result, []);
}

export function buildValidationDisplayGroupsForSymbols(
  result: ValidationResult,
  symbols: Pick<
    SymbolItem,
    "id" | "referenceDesignation" | "circuitName" | "label" | "type" | "displayModuleNumber" | "moduleNumber"
  >[],
): ValidationDisplayGroup[] {
  const groups = new Map<string, ValidationMessage[]>();
  const symbolMap = new Map(symbols.map((symbol) => [symbol.id, symbol]));

  for (const message of [...result.errors, ...result.warnings, ...result.info]) {
    const key = message.symbolId ? `symbol:${message.symbolId}` : "project";
    const group = groups.get(key) ?? [];
    group.push(message);
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .map(([key, messages]) => {
      const sortedMessages = [...messages].sort(compareValidationMessages);
      const severity = sortedMessages[0]?.severity ?? "Info";
      const symbolId = key.startsWith("symbol:") ? key.slice("symbol:".length) : "";
      const symbol = symbolId ? symbolMap.get(symbolId) : undefined;

      return {
        id: key,
        title: symbol ? buildSymbolGroupTitle(symbol) : symbolId ? "Obwód / aparat bez oznaczenia" : "Projekt",
        technicalId: symbolId || undefined,
        subtitle: buildGroupSubtitle(sortedMessages),
        severity,
        errors: sortedMessages.filter((message) => message.severity === "Error"),
        warnings: sortedMessages.filter((message) => message.severity === "Warning"),
        info: sortedMessages.filter((message) => message.severity === "Info"),
        messages: sortedMessages,
      };
    })
    .sort(compareValidationGroups);
}

export function getValidationReadiness(symbols: Pick<SymbolItem, "deviceKind">[]): ValidationReadiness {
  if (symbols.length === 0) {
    return "emptyProject";
  }

  const hasCircuitDevice = symbols.some(
    (symbol) => symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo",
  );

  return hasCircuitDevice ? "ready" : "noCircuitDevices";
}

function compareValidationGroups(a: ValidationDisplayGroup, b: ValidationDisplayGroup): number {
  const severityDiff = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity];
  if (severityDiff !== 0) return severityDiff;

  const countDiff = b.messages.length - a.messages.length;
  if (countDiff !== 0) return countDiff;

  return a.title.localeCompare(b.title, "pl");
}

function compareValidationMessages(a: ValidationMessage, b: ValidationMessage): number {
  const severityDiff = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity];
  if (severityDiff !== 0) return severityDiff;

  return getValidationCodeNumber(a.code) - getValidationCodeNumber(b.code);
}

function getValidationCodeNumber(code: string): number {
  const match = code.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function buildGroupSubtitle(messages: ValidationMessage[]): string {
  const errors = messages.filter((message) => message.severity === "Error").length;
  const warnings = messages.filter((message) => message.severity === "Warning").length;
  const info = messages.filter((message) => message.severity === "Info").length;
  const parts: string[] = [];

  if (errors > 0) parts.push(`${errors} bł.`);
  if (warnings > 0) parts.push(`${warnings} ostrz.`);
  if (info > 0) parts.push(`${info} info`);

  return parts.join(" · ");
}

function buildSymbolGroupTitle(symbol: Pick<
  SymbolItem,
  "referenceDesignation" | "circuitName" | "label" | "type" | "displayModuleNumber" | "moduleNumber"
>): string {
  const designation = firstText(symbol.referenceDesignation, symbol.displayModuleNumber, buildModuleFallback(symbol.moduleNumber));
  const name = firstText(symbol.circuitName, symbol.label, symbol.type);

  if (designation && name) return `${designation} · ${name}`;
  if (designation) return designation;
  if (name) return name;
  return "Obwód / aparat bez oznaczenia";
}

function buildModuleFallback(moduleNumber: number): string {
  return moduleNumber > 0 ? `#${moduleNumber}` : "";
}

function firstText(...values: Array<string | undefined | null>): string {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}
