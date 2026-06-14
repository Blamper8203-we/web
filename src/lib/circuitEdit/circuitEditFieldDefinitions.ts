import { devLog } from "../../lib/runtimeDiagnostics";
import { createDefaultSymbolItem, type PhaseAssignment, type SymbolItem } from "../../types/symbolItem";
import { detectPoleCount as getPoleCount } from "../../lib/poleCount";

export type CircuitEditFieldKind = "text" | "number" | "combo" | "checkbox";

export interface CircuitEditFieldDefinition {
  key: string;
  label: string;
  kind: CircuitEditFieldKind;
  value: string | number | boolean;
  options?: string[];
  placeholder?: string;
}

type ModuleType =
  | "unknown"
  | "rcd"
  | "mcb"
  | "spd"
  | "switch"
  | "phaseIndicator"
  | "distributionBlock"
  | "terminalBlock"
  | "socket"
  | "networkSwitch"
  | "other";

type ModulePoleCount = 0 | 1 | 2 | 3 | 4;

const PROTECTION_PRESETS = [
  "B6", "B10", "B13", "B16", "B20", "B25", "B32", "B40", "B50", "B63",
  "C6", "C10", "C13", "C16", "C20", "C25", "C32", "C40", "C50", "C63",
  "D6", "D10", "D13", "D16", "D20", "D25", "D32", "D40", "D50", "D63",
];

const RCD_PRESETS = [
  "40A/30mA Typ A",
  "25A/30mA Typ A",
  "40A/30mA Typ AC",
  "63A/30mA Typ A",
  "63A/30mA Typ AC",
  "40A/100mA Typ A",
  "63A/100mA Typ A",
  "40A/300mA Typ S",
  "63A/300mA Typ S",
  "40A/30mA Typ B",
  "25A/30mA Typ F",
];

const SPD_PRESETS = [
  "T1+T2 275V 25kA",
  "T1+T2 275V 12.5kA",
  "T1 320V 25kA",
  "T1 320V 50kA",
  "T2 275V 20kA",
  "T2 275V 40kA",
  "T2+T3 275V 10kA",
  "T1+T2 385V 25kA",
  "T1+T2 385V 50kA",
];

const FR_PRESETS = ["32", "40", "63", "100"];
const NETWORK_SWITCH_PRESETS = ["40A", "63A", "80A", "100A", "125A"];

const PHASE_INDICATOR_MODEL_PRESETS = [
  "3 lampki z bezpiecznikiem",
  "3 lampki bez bezpiecznika",
  "Lampka pojedyncza L1",
  "Lampka pojedyncza L2",
  "Lampka pojedyncza L3",
];

const PHASE_INDICATOR_FUSE_PRESETS = ["2A gG", "4A gG", "6A gG", "10A gG"];
const CIRCUIT_TYPE_PRESETS = ["Oswietlenie", "Gniazdo", "Sila", "Inne"];
const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";

function textField(
  key: string,
  label: string,
  value: string,
  placeholder = "",
  options?: string[],
): CircuitEditFieldDefinition {
  return { key, label, kind: "text", value, placeholder, options };
}

function getManualReferenceDesignation(symbol: SymbolItem): string {
  if (symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY] === "true") {
    return symbol.referenceDesignation;
  }
  return "";
}

function numberField(
  key: string,
  label: string,
  value: number,
  placeholder = "",
): CircuitEditFieldDefinition {
  return { key, label, kind: "number", value, placeholder };
}

function comboField(
  key: string,
  label: string,
  value: string,
  options: string[],
): CircuitEditFieldDefinition {
  return { key, label, kind: "combo", value, options };
}

function checkboxField(
  key: string,
  label: string,
  value: boolean,
): CircuitEditFieldDefinition {
  return { key, label, kind: "checkbox", value };
}

export function getCircuitEditFields(symbol: SymbolItem, symbols?: SymbolItem[]): CircuitEditFieldDefinition[] {
  const moduleType = getModuleType(symbol);
  
  const locationOptions = symbols
    ? Array.from(new Set(symbols.map((s) => s.location).filter((loc) => loc.trim().length > 0))).sort()
    : [];

  switch (moduleType) {
    case "switch":
      return createFrFields(symbol);
    case "networkSwitch":
      return createNetworkSwitchFields(symbol);
    case "phaseIndicator":
      return createPhaseIndicatorFields(symbol);
    case "rcd":
      return createRcdFields(symbol);
    case "spd":
      return createSpdFields(symbol);
    case "terminalBlock":
      return createTerminalBlockFields(symbol);
    case "distributionBlock":
      return createDistributionBlockFields(symbol);
    case "socket":
      return createSocketFields(symbol, getPoleCount(symbol), locationOptions);
    default:
      return createMcbFields(symbol, getPoleCount(symbol), locationOptions);
  }
}

export function getCircuitEditHeader(symbol: SymbolItem): {
  title: string;
  subtitle: string;
  tone: "blue" | "green" | "orange" | "red";
} {
  const moduleType = getModuleType(symbol);

  switch (moduleType) {
    case "networkSwitch":
      return {
        title: symbol.referenceDesignation
          ? `${symbol.referenceDesignation} - ${symbol.label || "Przełącznik sieci"}`
          : symbol.label || "Przełącznik sieci",
        subtitle: "Przełącznik zasilania (I-0-II)",
        tone: "blue",
      };
    case "switch":
      return {
        title: symbol.label || "Rozłącznik główny",
        subtitle: "Rozłącznik główny (FR)",
        tone: "red",
      };
    case "phaseIndicator":
      return {
        title: symbol.label || "Kontrolki faz",
        subtitle: "Kontrolki faz",
        tone: "orange",
      };
    case "rcd":
      return {
        title: symbol.circuitName || symbol.label || "RCD",
        subtitle: "Wyłącznik różnicowoprądowy",
        tone: "green",
      };
    case "spd":
      return {
        title: symbol.referenceDesignation
          ? `${symbol.referenceDesignation} - ${symbol.label || "SPD"}`
          : symbol.label || "SPD",
        subtitle: "Ogranicznik przepiec (SPD)",
        tone: "orange",
      };
    case "terminalBlock":
      return {
        title: symbol.referenceDesignation
          ? `${symbol.referenceDesignation} - ${symbol.label || "Listwa zaciskowa"}`
          : symbol.label || "Listwa zaciskowa",
        subtitle: "Listwa zaciskowa / terminal",
        tone: "blue",
      };
    case "distributionBlock":
      return {
        title: symbol.referenceDesignation
          ? `${symbol.referenceDesignation} - ${symbol.label || "Blok rozdzielczy"}`
          : symbol.label || "Blok rozdzielczy",
        subtitle: "Blok rozdzielczy / złącze",
        tone: "blue",
      };
    default:
      return {
        title: symbol.referenceDesignation
          ? `${symbol.referenceDesignation} - ${symbol.circuitName || symbol.label || "Obwód"}`
          : symbol.circuitName || symbol.label || "Obwód",
        subtitle: "Wyłącznik nadprądowy / odbiór",
        tone: "blue",
      };
  }
}

export function applyCircuitEditValue(
  symbol: SymbolItem,
  key: string,
  rawValue: string | number | boolean,
): SymbolItem {
  const next = createDefaultSymbolItem({
    ...symbol,
    parameters: { ...symbol.parameters },
  });
  const value = String(rawValue);

  switch (key) {
    case "CircuitName":
      next.circuitName = value;
      break;
    case "Location":
      next.location = value;
      break;
    case "CircuitType":
      next.circuitType = normalizeCircuitType(value);
      break;
    case "ProtectionType":
      devLog("🔵 [applyCircuitEditValue] ProtectionType BEFORE:", { symbolId: symbol.id, currentValue: symbol.protectionType, newValue: value });
      next.protectionType = value;
      devLog("🔵 [applyCircuitEditValue] ProtectionType AFTER:", { symbolId: next.id, protectionType: next.protectionType, parametersCURRENT: next.parameters.CURRENT });
      syncVisibleModuleParameters(next);
      devLog("🔵 [applyCircuitEditValue] After syncVisibleModuleParameters:", { protectionType: next.protectionType, parametersCURRENT: next.parameters.CURRENT });
      break;
    case "PowerW":
      applyNumber(value, (numberValue) => {
        next.powerW = numberValue;
      });
      syncVisibleModuleParameters(next);
      break;
    case "Phase":
      next.phase = normalizePhase(value);
      next.parameters.ManualPhase = "true";
      break;
    case "IsPhaseLocked":
      next.isPhaseLocked = rawValue === true || value.toLocaleLowerCase("pl-PL") === "true";
      break;
    case "CableLength":
      applyNumber(value, (numberValue) => {
        next.cableLength = numberValue;
      });
      break;
    case "CableCrossSection":
      applyNumber(value, (numberValue) => {
        next.cableCrossSection = numberValue;
      });
      break;
    case "RcdPreset":
      applyRcdPreset(next, value);
      syncVisibleModuleParameters(next);
      break;
    case "SpdPreset":
      applySpdPreset(next, value);
      syncVisibleModuleParameters(next);
      break;
    case "Label":
      next.label = value;
      syncVisibleModuleParameters(next);
      break;
    case "FrType":
      next.frType = value;
      next.frRatedCurrent = `${value}A`;
      syncVisibleModuleParameters(next);
      break;
    case "FrRatedCurrent":
      next.frRatedCurrent = value;
      syncVisibleModuleParameters(next);
      break;
    case "PhaseIndicatorModel":
      next.phaseIndicatorModel = value;
      syncVisibleModuleParameters(next);
      break;
    case "PhaseIndicatorFuseRating":
      next.phaseIndicatorFuseRating = value;
      syncVisibleModuleParameters(next);
      break;
    case "ReferenceDesignation":
      applyReferenceDesignation(next, value);
      break;
    case "CableDesig":
    case "CableType":
      next.parameters[key] = value;
      break;
    case "RemoveCover":
      next.parameters.BLUE_COVER_VISIBILITY = rawValue ? "hidden" : "visible";
      break;
  }

  return createDefaultSymbolItem(next);
}

export function applyCircuitEditValues(
  symbol: SymbolItem,
  values: Record<string, string | number | boolean>,
): SymbolItem {
  return Object.entries(values).reduce(
    (current, [key, value]) => applyCircuitEditValue(current, key, value),
    symbol,
  );
}

function createTerminalBlockFields(symbol: SymbolItem): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    textField("Label", "Etykieta", symbol.label),
  ];
}

function createDistributionBlockFields(symbol: SymbolItem): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    textField("Label", "Etykieta", symbol.label),
    checkboxField("RemoveCover", "Zdejmij osłonę", symbol.parameters.BLUE_COVER_VISIBILITY === "hidden" || symbol.parameters.BLUE_COVER_VISIBILITY === "none"),
  ];
}

function createFrFields(symbol: SymbolItem): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    textField("Label", "Etykieta", symbol.label),
    comboField("FrType", "Typ FR", symbol.frType || "63", FR_PRESETS),
    comboField("FrRatedCurrent", "Prąd znamionowy", symbol.frRatedCurrent || "63A", FR_PRESETS.map((p) => `${p}A`)),
    comboField("Phase", "Faza", getDisplayPhase(symbol.phase), getPhaseOptions(getPoleCount(symbol))),
  ];
}

function createNetworkSwitchFields(symbol: SymbolItem): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    textField("Label", "Etykieta", symbol.label),
    comboField("FrRatedCurrent", "Prąd znamionowy", symbol.frRatedCurrent || "40A", NETWORK_SWITCH_PRESETS),
    comboField("Phase", "Faza", getDisplayPhase(symbol.phase), getPhaseOptions(getPoleCount(symbol))),
  ];
}

function createPhaseIndicatorFields(symbol: SymbolItem): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    textField("Label", "Etykieta", symbol.label),
    comboField(
      "PhaseIndicatorModel",
      "Model",
      symbol.phaseIndicatorModel || "3 lampki z bezpiecznikiem",
      PHASE_INDICATOR_MODEL_PRESETS,
    ),
    comboField(
      "PhaseIndicatorFuseRating",
      "Bezpiecznik",
      symbol.phaseIndicatorFuseRating || "2A gG",
      PHASE_INDICATOR_FUSE_PRESETS,
    ),
  ];
}

function createRcdFields(symbol: SymbolItem): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    comboField(
      "RcdPreset",
      "Typ RCD",
      `${symbol.rcdRatedCurrent}A/${symbol.rcdResidualCurrent}mA Typ ${symbol.rcdType}`,
      RCD_PRESETS,
    ),
  ];
}

function createSpdFields(symbol: SymbolItem): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    comboField(
      "SpdPreset",
      "Typ SPD",
      `${symbol.spdType} ${symbol.spdVoltage}V ${symbol.spdDischargeCurrent}kA`,
      SPD_PRESETS,
    ),
  ];
}

function createSocketFields(
  symbol: SymbolItem,
  poleCount: ModulePoleCount,
  locationOptions: string[],
): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    textField("CircuitName", "Nazwa obwodu", symbol.circuitName, "np. Gniazdo serwisowe"),
    textField("Location", "Lokalizacja", symbol.location, "np. Rozdzielnica", locationOptions),
    comboField("Phase", "Faza", getDisplayPhase(symbol.phase), getPhaseOptions(poleCount)),
    numberField("CableCrossSection", "Przekrój (mm2)", symbol.cableCrossSection, "np. 2.5"),
  ];
}

function createMcbFields(symbol: SymbolItem, poleCount: ModulePoleCount, locationOptions: string[]): CircuitEditFieldDefinition[] {
  return [
    textField("ReferenceDesignation", "Oznaczenie", getManualReferenceDesignation(symbol)),
    textField("CircuitName", "Nazwa obwodu", symbol.circuitName, "np. Oświetlenie salon"),
    textField("Location", "Lokalizacja", symbol.location, "np. Piętro 1, Kuchnia", locationOptions),
    comboField("CircuitType", "Typ obwodu", symbol.circuitType || "Gniazdo", CIRCUIT_TYPE_PRESETS),
    comboField("ProtectionType", "Zabezpieczenie", symbol.protectionType || "B16", PROTECTION_PRESETS),
    numberField("PowerW", "Moc (W)", symbol.powerW, "np. 2000"),
    comboField("Phase", "Faza", getDisplayPhase(symbol.phase), getPhaseOptions(poleCount)),
    checkboxField("IsPhaseLocked", "Zablokuj fazę", symbol.isPhaseLocked),
    textField("CableDesig", "Oznaczenie kabla", symbol.parameters.CableDesig ?? ""),
    textField("CableType", "Typ kabla", symbol.parameters.CableType ?? ""),
    numberField("CableLength", "Długość kabla (m)", symbol.cableLength, "np. 15"),
    numberField("CableCrossSection", "Przekrój (mm2)", symbol.cableCrossSection, "np. 2.5"),
  ];
}

function getModuleType(symbol: SymbolItem): ModuleType {
  // Terminal block / listwa ma pierwszeństwo – nie może być wykryta jako RCD.
  // Sprawdzamy przez `deviceKind` (bez `symbol.isTerminalBlock` w tym samym
  // warunku) — TS inaczej zawęża discriminated union po `isTerminalBlock`
  // i odrzuca `"terminalBlock"` jako niemożliwe.
  if (symbol.deviceKind === "terminalBlock") return "terminalBlock";
  if (symbol.isTerminalBlock) return "terminalBlock";
  if (symbol.deviceKind === "rcd") return "rcd";
  if (symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo") return "mcb";
  if (symbol.deviceKind === "spd") return "spd";
  if (symbol.deviceKind === "fr") return "switch";
  if (symbol.deviceKind === "phaseIndicator") return "phaseIndicator";

  const value = `${symbol.type} ${symbol.label} ${symbol.visualPath}`.toLocaleLowerCase("pl-PL");
  const isListwa = value.includes("listwa") || value.includes("listwy");

  if (value.includes("rcd")) return "rcd";
  if (value.includes("mcb") || /s\s*-?\s*30\d/.test(value)) return "mcb";
  if (value.includes("spd")) return "spd";
  if (/\bfr\b/.test(value) || value.includes("switch") || value.includes("rozlacznik")) return "switch";
  if (
    value.includes("kontrolk") ||
    value.includes("indicator") ||
    value.includes("lampka") ||
    value.includes("sygnalizat")
  ) {
    return "phaseIndicator";
  }
  if (
    value.includes("złączk") ||
    value.includes("zlacze") ||
    value.includes("terminal") ||
    value.includes("listwa zacisk") ||
    isListwa
  ) {
    return "terminalBlock";
  }
  if (value.includes("blok") || value.includes("block") || value.includes("rozdz")) {
    return "distributionBlock";
  }
  if (value.includes("gniazdo") || value.includes("socket")) return "socket";
  if (value.includes("przelacznik") && value.includes("siec")) return "networkSwitch";
  return symbol.type ? "other" : "unknown";
}

// getPoleCount imported from ../poleCount (detectPoleCount)

function getDisplayPhase(phase: string): string {
  return !phase || phase.toLocaleLowerCase("pl-PL") === "pending" ? "L1" : phase;
}

function getPhaseOptions(poleCount: ModulePoleCount): string[] {
  switch (poleCount) {
    case 3:
    case 4:
      return ["L1+L2+L3", "L1", "L2", "L3", "L1+L2", "L2+L3", "L3+L1"];
    case 2:
      return ["L1+L2", "L2+L3", "L3+L1", "L1", "L2", "L3", "L1+L2+L3"];
    default:
      return ["L1", "L2", "L3", "L1+L2", "L2+L3", "L3+L1", "L1+L2+L3"];
  }
}

function normalizePhase(value: string): PhaseAssignment {
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "L1" ||
    normalized === "L2" ||
    normalized === "L3" ||
    normalized === "L1+L2" ||
    normalized === "L2+L3" ||
    normalized === "L1+L3" ||
    normalized === "L3+L1" ||
    normalized === "L1+L2+L3" ||
    normalized === "3F"
  ) {
    return normalized;
  }

  return "L1";
}

function normalizeCircuitType(value: string): SymbolItem["circuitType"] {
  if (value === "Oswietlenie" || value === "Gniazdo" || value === "Sila" || value === "Inne") {
    return value;
  }

  return "Inne";
}

function applyNumber(value: string, setter: (value: number) => void): void {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (Number.isFinite(parsed)) {
    setter(parsed);
  }
}

function applyReferenceDesignation(symbol: SymbolItem, value: string): void {
  const normalized = value.trim();
  symbol.referenceDesignation = normalized;

  if (!normalized) {
    delete symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY];
    return;
  }

  symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY] = "true";
}

function applyRcdPreset(symbol: SymbolItem, preset: string): void {
  if (!preset.trim()) {
    symbol.rcdRatedCurrent = 40;
    symbol.rcdResidualCurrent = 30;
    symbol.rcdType = "A";
    return;
  }

  const match = preset.match(/(\d+)A\/(\d+)mA\s+Typ\s+(.+)/i);
  if (!match) {
    return;
  }

  symbol.rcdRatedCurrent = Number.parseInt(match[1], 10);
  symbol.rcdResidualCurrent = Number.parseInt(match[2], 10);
  symbol.rcdType = match[3].trim();
}

function applySpdPreset(symbol: SymbolItem, preset: string): void {
  if (!preset.trim()) {
    symbol.spdType = "T1+T2";
    symbol.spdVoltage = 275;
    symbol.spdDischargeCurrent = 25;
    return;
  }

  const match = preset.match(/^(\S+)\s+(\d+)V\s+([\d.]+)kA$/i);
  if (!match) {
    return;
  }

  symbol.spdType = match[1];
  symbol.spdVoltage = Number.parseInt(match[2], 10);
  symbol.spdDischargeCurrent = Number.parseFloat(match[3]);
}

function syncVisibleModuleParameters(symbol: SymbolItem): void {
  const moduleType = getModuleType(symbol);
  const label =
    moduleType === "switch" || moduleType === "networkSwitch"
      ? symbol.frType || symbol.label
      : moduleType === "phaseIndicator"
        ? symbol.phaseIndicatorModel || symbol.label
        : symbol.protectionType || symbol.label;

  symbol.parameters.LABEL = label;
  symbol.parameters.CURRENT =
    moduleType === "rcd"
      ? `${symbol.rcdRatedCurrent}A`
      : moduleType === "switch" || moduleType === "networkSwitch"
        ? symbol.frRatedCurrent
        : moduleType === "phaseIndicator"
          ? symbol.phaseIndicatorFuseRating
          : symbol.protectionType || "";
  symbol.parameters.POWER = String(symbol.powerW);
}
