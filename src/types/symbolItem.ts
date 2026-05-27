export type DeviceKind =
  | "mcb"
  | "rcd"
  | "rcbo"
  | "spd"
  | "fr"
  | "phaseIndicator"
  | "terminalBlock"
  | "other";

export type PhaseAssignment =
  | "L1"
  | "L2"
  | "L3"
  | "L1+L2"
  | "L2+L3"
  | "L1+L3"
  | "L3+L1"
  | "L1+L2+L3"
  | "3F";

export type CircuitTypeValue = "Oswietlenie" | "Gniazdo" | "Sila" | "Inne";

export interface SymbolItem {
  id: string;
  type: string;
  deviceKind: DeviceKind;

  // Position & layout
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;

  // Display
  label: string;
  referenceDesignation: string;
  moduleNumber: number;
  displayModuleNumber: string;
  isSelected: boolean;
  isSnappedToRail: boolean;

  // Circuit data
  circuitId: string;
  circuitName: string;
  circuitType: CircuitTypeValue;
  circuitDescription: string;
  location: string;
  displayLocation: string;

  // Protection
  protection: string;
  protectionType: string; // B10, B16, C10, etc.
  displayProtection: string;

  // Power & phase
  powerW: number;
  phase: PhaseAssignment;
  isPhaseLocked: boolean;

  // Grouping
  group: string;
  groupName: string;
  rcdSymbolId: string;

  // RCD properties
  rcdRatedCurrent: number;
  rcdResidualCurrent: number;
  rcdType: string; // A, AC, B, F
  rcdInfo: string;

  // SPD properties
  spdType: string; // T1, T2, T1+T2, T2+T3
  spdVoltage: number;
  spdDischargeCurrent: number;
  spdInfo: string;

  // FR (main switch) properties
  frRatedCurrent: string;
  frType: string;

  // Phase indicator properties
  phaseIndicatorModel: string;
  phaseIndicatorFuseRating: string;

  // Cable
  cableLength: number;
  cableCrossSection: number;
  voltageDrop: number;

  // Module source
  moduleSourceType: string;
  moduleRef: string;
  visualPath: string;

  // Terminal block
  isTerminalBlock: boolean;

  // Extra metadata migrated from Avalonia SymbolItem.Parameters
  parameters: Record<string, string>;
}

export function createDefaultSymbolItem(overrides?: Partial<SymbolItem>): SymbolItem {
  const base: SymbolItem = {
    id: crypto.randomUUID(),
    type: "",
    deviceKind: "other",
    x: 0,
    y: 0,
    rotation: 0,
    width: 232.58,
    height: 1103,
    label: "",
    referenceDesignation: "",
    moduleNumber: 0,
    displayModuleNumber: "#0",
    isSelected: false,
    isSnappedToRail: false,
    circuitId: "",
    circuitName: "",
    circuitType: "Gniazdo",
    circuitDescription: "",
    location: "",
    displayLocation: "Brak lokalizacji",
    protection: "",
    protectionType: "",
    displayProtection: "",
    powerW: 0,
    phase: "L1",
    isPhaseLocked: false,
    group: "",
    groupName: "",
    rcdSymbolId: "",
    rcdRatedCurrent: 0,
    rcdResidualCurrent: 30,
    rcdType: "A",
    rcdInfo: "",
    spdType: "T1+T2",
    spdVoltage: 275,
    spdDischargeCurrent: 25,
    spdInfo: "",
    frRatedCurrent: "63A",
    frType: "63",
    phaseIndicatorModel: "3 lampki z bezpiecznikiem",
    phaseIndicatorFuseRating: "2A gG",
    cableLength: 10.0,
    cableCrossSection: 1.5,
    voltageDrop: 0.0,
    moduleSourceType: "",
    moduleRef: "",
    visualPath: "",
    isTerminalBlock: false,
    parameters: {},
  };

  if (overrides) {
    Object.assign(base, overrides);
  }

  base.type = typeof base.type === "string" ? base.type : "";
  base.label = typeof base.label === "string" ? base.label : "";
  base.referenceDesignation = typeof base.referenceDesignation === "string" ? base.referenceDesignation : "";
  base.visualPath = typeof base.visualPath === "string" ? base.visualPath : "";
  base.moduleRef = typeof base.moduleRef === "string" ? base.moduleRef : "";
  base.moduleSourceType = typeof base.moduleSourceType === "string" ? base.moduleSourceType : "";
  base.location = typeof base.location === "string" ? base.location : "";
  base.circuitName = typeof base.circuitName === "string" ? base.circuitName : "";
  base.circuitDescription = typeof base.circuitDescription === "string" ? base.circuitDescription : "";
  base.protectionType = typeof base.protectionType === "string" ? base.protectionType : "";
  base.group = typeof base.group === "string" ? base.group : "";
  base.groupName = typeof base.groupName === "string" ? base.groupName : "";
  base.rcdSymbolId = typeof base.rcdSymbolId === "string" ? base.rcdSymbolId : "";
  base.phase = typeof base.phase === "string" ? base.phase : "L1";

  base.parameters = { ...(overrides?.parameters ?? base.parameters) };

  // Recompute derived fields (order matters to match Avalonia semantics).
  base.isTerminalBlock = computeIsTerminalBlock(base);
  base.rcdInfo = computeRcdInfo(base);
  base.spdInfo = computeSpdInfo(base);
  base.displayProtection = computeDisplayProtection(base);
  base.displayLocation = computeDisplayLocation(base);
  base.displayModuleNumber = computeDisplayModuleNumber(base);

  return base;
}

function computeDisplayProtection(symbol: SymbolItem): string {
  const typeUpper = symbol.type.toUpperCase();
  if (typeUpper.includes("SPD")) return symbol.spdInfo;
  if (typeUpper.includes("RCD")) return symbol.rcdInfo;
  if (typeUpper.includes("FR") || typeUpper.includes("SWITCH") || typeUpper.includes("ROZLACZNIK")) {
    return `${symbol.frRatedCurrent} (FR)`;
  }
  if (typeUpper.includes("KONTROLKI")) return symbol.phaseIndicatorFuseRating;
  return symbol.protectionType && symbol.protectionType.trim().length > 0
    ? symbol.protectionType
    : "Brak";
}

function computeDisplayLocation(symbol: SymbolItem): string {
  return symbol.location && symbol.location.trim().length > 0 ? symbol.location : "Brak lokalizacji";
}

function computeDisplayModuleNumber(symbol: SymbolItem): string {
  if (isTerminalOrConnectorSymbol(symbol)) return `X${symbol.moduleNumber}`;
  if (symbol.type.toUpperCase().includes("RCD")) return "#0";
  return `#${symbol.moduleNumber}`;
}

function computeRcdInfo(symbol: SymbolItem): string {
  if (symbol.rcdRatedCurrent > 0 && symbol.rcdResidualCurrent > 0) {
    return `RCD ${symbol.rcdRatedCurrent}A/${symbol.rcdResidualCurrent}mA Typ ${symbol.rcdType}`;
  }
  return "";
}

function computeSpdInfo(symbol: SymbolItem): string {
  if (symbol.spdType && symbol.spdVoltage > 0) {
    return `SPD ${symbol.spdType} ${symbol.spdVoltage}V ${symbol.spdDischargeCurrent}kA`;
  }
  return "";
}

function computeIsTerminalBlock(symbol: SymbolItem): boolean {
  return isTerminalOrConnectorSymbol(symbol);
}

function normalizeSymbolIdentityText(...values: Array<string | undefined>): string {
  return values
    .join(" ")
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isKnownCircuitDeviceKind(symbol: Partial<SymbolItem>): boolean {
  return (
    symbol.deviceKind === "mcb" ||
    symbol.deviceKind === "rcd" ||
    symbol.deviceKind === "rcbo" ||
    symbol.deviceKind === "spd" ||
    symbol.deviceKind === "fr" ||
    symbol.deviceKind === "phaseIndicator"
  );
}

function hasKnownCircuitDeviceIdentity(value: string): boolean {
  return (
    value.includes("rcd") ||
    value.includes("rccb") ||
    value.includes("roznic") ||
    value.includes("rcbo") ||
    value.includes("mcb") ||
    value.includes("spd") ||
    value.includes("kontrolk") ||
    value.includes("indicator") ||
    value.includes("lampka") ||
    value.includes("sygnalizat") ||
    value.includes("rozlacznik") ||
    value.includes("switch") ||
    value.includes("isolator") ||
    /(^|[^a-z0-9])fr([^a-z0-9]|$)/.test(value)
  );
}

export function isTerminalOrConnectorSymbol(symbol: Partial<SymbolItem>): boolean {
  const value = normalizeSymbolIdentityText(
    symbol.type,
    symbol.label,
    symbol.visualPath,
    symbol.moduleRef,
  );

  return (
    symbol.deviceKind === "terminalBlock" ||
    symbol.isTerminalBlock === true ||
    value.includes("terminalblock") ||
    value.includes("terminal") ||
    value.includes("listwa") ||
    value.includes("listwy") ||
    (value.includes("zlacz") && !value.includes("rozlacznik")) ||
    value.includes("zacisk")
  );
}

export function isDistributionBlockSymbol(symbol: Partial<SymbolItem>): boolean {
  const value = normalizeSymbolIdentityText(
    symbol.type,
    symbol.label,
    symbol.visualPath,
    symbol.moduleRef,
  );

  return (
    value.includes("blok") ||
    value.includes("block") ||
    value.includes("rozdzielcz") ||
    value.includes("distribution")
  );
}

export function isAuxiliaryNonCircuitSymbol(symbol: Partial<SymbolItem>): boolean {
  const value = normalizeSymbolIdentityText(
    symbol.type,
    symbol.label,
    symbol.visualPath,
    symbol.moduleRef,
  );

  if (isKnownCircuitDeviceKind(symbol) || hasKnownCircuitDeviceIdentity(value)) {
    return false;
  }

  return (
    isTerminalOrConnectorSymbol(symbol) ||
    isDistributionBlockSymbol(symbol) ||
    value.includes("busbar") ||
    value.includes("szyna laczeniowa") ||
    value.includes("szyna zbiorcza")
  );
}

export function cloneSymbol(symbol: SymbolItem): SymbolItem {
  return createDefaultSymbolItem({
    ...symbol,
    id: crypto.randomUUID(),
  });
}

export function normalizeSymbolItems(
  raw: Partial<SymbolItem>[] | null | undefined,
): SymbolItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Partial<SymbolItem> => typeof item === "object" && item !== null)
    .map((item) =>
      createDefaultSymbolItem({
        ...item,
        id:
          typeof item.id === "string" && item.id.trim().length > 0
            ? item.id
            : crypto.randomUUID(),
      }),
    );
}
