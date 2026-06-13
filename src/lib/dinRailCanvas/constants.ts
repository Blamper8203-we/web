import type { DinRailConfig } from "../schematic/dinRailGenerator";

export const DEFAULT_CONFIG: DinRailConfig = { rows: 1, modulesPerRow: 24 };
export const MAX_INITIAL_SCALE = 0.25;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 5;
export const PIXI_MAX_RESOLUTION = 2;
export const PIXI_LABEL_SYMBOL_LIMIT = 64;
export const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";

export const DIN_RAIL_PREVIEW_CANVAS_WIDTH = 360;
export const DIN_RAIL_PREVIEW_CANVAS_HEIGHT = 280;
export const DIN_RAIL_PREVIEW_MARGIN_X = 40;
export const DIN_RAIL_PREVIEW_MARGIN_Y = 28;

export const WIRE_COLORS_MAP: Record<string, { hex: string; highlight: string; dark: string }> = {
  black: { hex: "#333333", highlight: "#666666", dark: "#000000" }, // L2
  brown: { hex: "#8B4513", highlight: "#c4763a", dark: "#4a2007" }, // L1
  grey: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" }, // L3
  gray: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" }, // L3
  blue: { hex: "#1565C0", highlight: "#4a9ed6", dark: "#0a2f6b" }, // N
  "green-yellow": { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" }, // PE
  pe: { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" }, // PE
  red: { hex: "#ef4444", highlight: "#f87171", dark: "#991b1b" },
  other: { hex: "#a855f7", highlight: "#c084fc", dark: "#6b21a8" },
};

export const WIRE_THICKNESS_MAP: Record<number, number> = {
  1.5: 24.0,
  2.5: 30.0,
  4.0: 36.0,
  6.0: 42.0,
  10.0: 50.0,
  16.0: 60.0,
};
