// Schematic layout constants ported from Avalonia SchematicLayoutEngine.
export const A4_WIDTH_PX = 1122;
export const A4_HEIGHT_PX = 794;

export const FRAME_MARGIN_LEFT = 24;
export const FRAME_MARGIN_TOP = 24;
export const FRAME_MARGIN_RIGHT = 24;
export const FRAME_MARGIN_BOTTOM = 24;

export const TITLEBLOCK_WIDTH = 52;
export const TITLEBLOCK_HEIGHT = 360;
export const TITLEBLOCK_VISUAL_WIDTH = 190;

export const DRAW_LEFT = FRAME_MARGIN_LEFT + 6;
export const DRAW_RIGHT = A4_WIDTH_PX - FRAME_MARGIN_RIGHT - TITLEBLOCK_WIDTH - 6;
export const DRAW_TOP = FRAME_MARGIN_TOP + 6;
export const DRAW_BOTTOM = A4_HEIGHT_PX - FRAME_MARGIN_BOTTOM - 6;
export const DRAW_WIDTH = DRAW_RIGHT - DRAW_LEFT;
export const DRAW_HEIGHT = DRAW_BOTTOM - DRAW_TOP;

export const COLUMN_MARGIN_LEFT = 72;
export const COLUMN_MARGIN_RIGHT = 24;
export const COLUMN_WIDTH = 142;
export const COLUMN_GAP = 12;
export const COLUMN_STEP = COLUMN_WIDTH + COLUMN_GAP;
export const MAX_COLUMNS_PER_PAGE = 5;
export const MAX_MODULES_PER_CARD = 9;
export const MAX_MODULES_PER_ROW = MAX_MODULES_PER_CARD;

export const Y_PATH_NUMBERS = 10;
export const Y_SUPPLY = 10;
export const Y_FR = 25;
export const Y_MAIN_BUS = 135;
export const Y_MAIN_DEVICE = 150;
export const Y_GROUP_BUS = 255;
export const Y_MCB = 315;
export const Y_WIRE_END = 415;
export const Y_LABEL_TOP = 417;
export const Y_N = 425;
export const Y_PE = 440;

export const ROW_HEIGHT = 25;
export const Y_ROW_DESIGNATION = 490;
export const Y_ROW_PROTECTION = 515;
export const Y_ROW_CIRCUIT = 540;
export const Y_ROW_LOCATION = 565;
export const Y_ROW_SEPARATOR = 590;
export const Y_ROW_CABLE = 590;
export const Y_ROW_CABLE_TYPE = 615;
export const Y_ROW_CABLE_SPEC = 640;
export const Y_ROW_CABLE_LENGTH = 665;
export const Y_ROW_POWER = 690;
export const Y_TABLE_END = 715;

export const CELL_FONT_SIZE = 10.5;
export const HEADER_FONT_SIZE = 8.5;

export const MODULE_WIDTH = 82;
export const MODULE_HEIGHT = 90;
export const MODULE_GAP = 4;
export const DIN_RAIL_HEIGHT = 36;
export const DIN_RAIL_AXIS_Y = 18;

export const PAGE_GAP = 40;

export const getContentArea = () => ({
  x: DRAW_LEFT,
  y: DRAW_TOP,
  width: DRAW_WIDTH,
  height: DRAW_HEIGHT,
});

export interface PageInfo {
  pageIndex: number;
  pageLabel: string;
  offsetX: number;
  offsetY: number;
  yOffset: number;
  minCol: number;
  busX1: number;
  busX2: number;
  busbarX: number;
  busbarY: number;
  dinRails: DinRailInfo[];
}

export interface DinRailInfo {
  railIndex: number;
  y: number;
  startX: number;
  endX: number;
  modulePositions: ModulePosition[];
}

export interface ModulePosition {
  positionIndex: number;
  x: number;
  y: number;
  width: number;
  occupied: boolean;
}

export interface SchematicNode {
  id: string;
  nodeType: "MainBreaker" | "SPD" | "RCD" | "MCB" | "PhaseIndicator" | "Other";
  designation: string; // Q1, F0.1, etc.
  label: string;
  protection: string;
  distributionBlockLabel: string;
  circuitName: string;
  phase: string;
  phaseCount: number;
  location: string;
  cableDesig: string;
  cableType: string;
  cableSpec: string;
  cableLength: string;
  powerInfo: string;
  isPhaseManual: boolean;
  fixedScenarioPhase: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  cellWidth: number;
  parentRcdId: string;
  children: SchematicNode[];
}

export interface SchematicLayout {
  pages: PageInfo[];
  nodes: SchematicNode[];
  totalWidth: number;
  totalHeight: number;
  frReference: string;
}

export function createEmptyLayout(): SchematicLayout {
  return {
    pages: [],
    nodes: [],
    totalWidth: 0,
    totalHeight: 0,
    frReference: "",
  };
}
