import { type FerruleColor, type WireColor, type WireType, type RoutingMode } from "../../types/connectionItem";

export const WIRE_COLORS_MAP: Record<string, { hex: string; highlight: string; dark: string }> = {
  black: { hex: "#333333", highlight: "#666666", dark: "#000000" }, // L2
  brown: { hex: "#8B4513", highlight: "#c4763a", dark: "#4a2007" }, // L1
  grey: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" },  // L3
  gray: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" },  // L3
  blue: { hex: "#1565C0", highlight: "#4a9ed6", dark: "#0a2f6b" },  // N
  "green-yellow": { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" }, // PE
  pe: { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" }, // PE
  red: { hex: "#ef4444", highlight: "#f87171", dark: "#991b1b" },
  other: { hex: "#a855f7", highlight: "#c084fc", dark: "#6b21a8" },
};

export const FERRULE_COLORS_MAP: Record<string, { hex: string; highlight: string; dark: string }> = {
  white: { hex: "#dddddd", highlight: "#ffffff", dark: "#aaaaaa" },
  grey: { hex: "#666666", highlight: "#999999", dark: "#333333" },
  red: { hex: "#b91c1c", highlight: "#dc2626", dark: "#7f1d1d" },
  blue: { hex: "#1d4ed8", highlight: "#2563eb", dark: "#1e3a8a" },
  yellow: { hex: "#eab308", highlight: "#facc15", dark: "#a16207" },
  black: { hex: "#171717", highlight: "#404040", dark: "#000000" },
  brown: { hex: "#6b3410", highlight: "#8B4513", dark: "#401f0a" },
  none: { hex: "transparent", highlight: "transparent", dark: "transparent" },
};

export const WIRE_THICKNESS_MAP: Record<number, number> = {
  0.5: 25,
  0.75: 28,
  1.0: 30,
  1.5: 35,
  2.5: 40,
  4: 45,
  6: 50,
  10: 55,
  16: 60,
};

// WHY: Single source of truth for wire bend radius default. Any drift between view
// (Pixi canvas, editor) and export (snapshot raster, SVG render) becomes a visible
// inconsistency in the engineering deliverable the electrician ships to site — the
// PDF must look like what they edited. Keep all `customRadius ?? X` sites pointed
// here; do not reintroduce scattered literals.
export const DEFAULT_CUSTOM_RADIUS = 52;

export interface DefaultWireSettings {
  wireColor: WireColor;
  wireCrossSection: number;
  wireType: WireType;
  routingMode: RoutingMode;
  ferruleColor?: FerruleColor;
}

export function getAutoFerruleColor(crossSection: number): FerruleColor {
  if (crossSection === 0.5) return "white";
  if (crossSection === 0.75) return "grey";
  if (crossSection === 1.0) return "red";
  if (crossSection === 1.5) return "black";
  if (crossSection === 2.5) return "blue";
  if (crossSection === 4.0) return "grey";
  if (crossSection === 6.0) return "yellow";
  if (crossSection === 10.0) return "red";
  if (crossSection >= 16.0) return "blue";
  return "black";
}



// Helper to distinguish standard Złączki from Listwy do rozdzielnicy
export const isTerminalZlaczka = (moduleRef?: string | null): boolean => {
  if (!moduleRef) return false;
  const normalized = moduleRef.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (normalized.includes("zlacz") && !normalized.includes("rozlacz")) || normalized.includes("listwy zaciskowe");
};

export function getFerruleLength(deviceKind: string | undefined, moduleRef: string | null | undefined): number {
  if (isTerminalZlaczka(moduleRef)) {
    return 90; // now treated as short, just like other terminal blocks
  }
  
  const normalizedRef = (moduleRef || "").toLowerCase().replace(/\\/g, "/");
  if (normalizedRef.includes("listwy do rozdzielnicy")) {
    return 50;  // very short for horizontal terminal blocks
  }

  if (normalizedRef.includes("ampio mserv-4s")) {
    return 40;  // very short for this specific module
  }

  if (normalizedRef.includes("smart home") || normalizedRef.includes("przelacznik sieci") || normalizedRef.includes("przelacznik siec")) {
    return 80;  // half of regular length
  }

  if (deviceKind === "terminalBlock") {
    return 90;  // short: 80 collar + 10 offset
  }
  if (deviceKind === "phaseIndicator" || normalizedRef.includes("zabezpieczajacy") || normalizedRef.includes("zabezpieczenia")) {
    return 20;  // square
  }
  return 160;   // regular: 150 collar + 10 offset
}
