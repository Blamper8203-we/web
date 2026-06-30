import {
  computeDisplayLocation,
  computeDisplayModuleNumber,
  computeDisplayProtection,
  computeIsTerminalBlock,
  computeRcdInfo,
  computeSpdInfo,
} from "../lib/domain/displayFields";

export type DeviceKind =
  | "mcb"
  | "rcd"
  | "rcbo"
  | "spd"
  | "fr"
  | "phaseIndicator"
  | "terminalBlock"
  | "other";

export type TerminalBlockCategory = 
  | "Blok rozdzielczy"
  | "Listwy zaciskowe"
  | "Złącza"
  | "Inne"
  | string; // Keep string to be safe for user-defined or imported modules that aren't strict yet


export type PhaseAssignment =
  | "L1"
  | "L2"
  | "L3"
  | "L1+L2"
  | "L2+L3"
  | "L1+L3"
  | "L1+L2+L3"
  | "3F"
  | "PE"
  | "N";

export type CircuitTypeValue = "Oswietlenie" | "Gniazdo" | "Sila" | "Inne";

export const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";

export interface SymbolBase {
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

export interface McbSymbol extends SymbolBase {
  deviceKind: "mcb";
}

export interface RcdSymbol extends SymbolBase {
  deviceKind: "rcd";
  rcdType: "A" | "AC" | "B" | "F" | "";
}

export interface RcboSymbol extends SymbolBase {
  deviceKind: "rcbo";
  rcdType: "A" | "AC" | "B" | "F" | "";
}

export interface SpdSymbol extends SymbolBase {
  deviceKind: "spd";
  spdType: "T1" | "T2" | "T1+T2" | "T2+T3" | "";
}

export interface FrSymbol extends SymbolBase {
  deviceKind: "fr";
}

export interface PhaseIndicatorSymbol extends SymbolBase {
  deviceKind: "phaseIndicator";
}

export interface TerminalBlockSymbol extends SymbolBase {
  deviceKind: "terminalBlock";
  isTerminalBlock: true;
}

export interface OtherSymbol extends SymbolBase {
  deviceKind: "other";
}

export type SymbolItem =
  | McbSymbol
  | RcdSymbol
  | RcboSymbol
  | SpdSymbol
  | FrSymbol
  | PhaseIndicatorSymbol
  | TerminalBlockSymbol
  | OtherSymbol;

export function createDefaultSymbolItem(overrides?: Partial<SymbolBase>): SymbolItem {
  const base: SymbolBase = {
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

  return base as SymbolItem;
}


function normalizeSymbolIdentityText(...values: Array<string | undefined>): string {
  return values
    .join(" ")
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isKnownCircuitDeviceKind(symbol: Partial<SymbolBase>): boolean {
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

export function isTerminalOrConnectorSymbol(symbol: Partial<SymbolBase>): boolean {
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

export function isDistributionBlockSymbol(symbol: Partial<SymbolBase>): boolean {
  const value = normalizeSymbolIdentityText(
    symbol.type,
    symbol.label,
    symbol.visualPath,
    symbol.moduleRef,
  );

  // WHY: M-1 audit fix. Poprzednie substringi ("blok", "block", "rozdzielcz",
  // "distribution") byly zbyt ogolne - matchowaly "blokada", "obwod
  // dystrybucyjny", "szyna rozdzielcza" itp. Zawężone do konkretnych fraz
  // dla distribution block. Wykluczenie "rozlacznik" na wstepie bo
  // "rozlac" + "roz" moglo wchodzic w podobne frazy (defensywa, chociaz
  // poza "rozlacznik" brak w value - in case normalize dodaje cos z
  // visualPath/moduleRef).
  if (value.includes("rozlacznik")) {
    return false;
  }
  return (
    value.includes("blok rozdzielczy") ||
    value.includes("blok rozgalezny") ||
    value.includes("distribution block")
  );
}

export function isAuxiliaryNonCircuitSymbol(symbol: Partial<SymbolBase>): boolean {
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
  raw: Partial<SymbolBase>[] | null | undefined,
): SymbolItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Partial<SymbolBase> => typeof item === "object" && item !== null)
    .map((item) => {
      const symbol = createDefaultSymbolItem({
        ...item,
        id:
          typeof item.id === "string" && item.id.trim().length > 0
            ? item.id
            : crypto.randomUUID(),
      });

      // Migration: fix labels for PE and distribution blocks that incorrectly got "Listwa 15 pin N"
      if (symbol.moduleRef.includes("Listwa 15 pin PE")) {
        if (symbol.label === "Listwa 15 pin N" || symbol.label === "Listwa 15 pin PE") {
          symbol.label = "PE";
        }
      } else if (symbol.moduleRef.includes("blok rozdzielczy") || symbol.moduleRef.includes("Blok rozdzielczy")) {
        if (symbol.label === "Listwa 15 pin N" || symbol.label === "Blok rozdzielczy 7 pin") {
          symbol.label = "Blok rozdzielczy";
        }
      }

      return symbol;
    });
}

export function getTerminalBlockCategory(symbol: Partial<SymbolBase>): TerminalBlockCategory | null {
  const value = normalizeSymbolIdentityText(
    symbol.type,
    symbol.label,
    symbol.visualPath,
    symbol.moduleRef,
  );

  if (value.includes("blok") || value.includes("block") || value.includes("rozdzielcz") || value.includes("distribution")) {
    return "Blok rozdzielczy";
  }
  if (value.includes("listwa") || value.includes("listwy")) {
    return "Listwy zaciskowe";
  }
  if ((value.includes("zlacz") && !value.includes("rozlacznik")) || value.includes("zacisk")) {
    return "Złącza";
  }
  return "Inne";
}
