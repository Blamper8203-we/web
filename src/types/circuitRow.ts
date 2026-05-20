export type CircuitDeviceKind =
  | "mcb"
  | "rcbo"
  | "fr"
  | "spd"
  | "rcd"
  | "phase-indicator"
  | "terminal-block"
  | "aux";

export interface CircuitRow {
  id: string;
  type: string;
  deviceKind: CircuitDeviceKind;
  x: number;
  y: number;
  label: string;
  referenceDesignation: string;
  phase: string;
  protectionType: string;
  displayProtection: string;
  circuitName: string;
  powerW: number;
  cableLength: number;
  cableCrossSection: number;
  location: string;
  displayLocation: string;
  circuitType: string;
  isTerminalBlock: boolean;
  visualPath: string;
  rcdSymbolId?: string;
}
