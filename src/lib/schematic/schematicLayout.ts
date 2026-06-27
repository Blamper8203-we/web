// Schematic layout constants ported from Avalonia SchematicLayoutEngine.
export const A4_WIDTH_PX = 1122;
export const A4_HEIGHT_PX = 794;

export const FRAME_MARGIN_LEFT = 24;
export const FRAME_MARGIN_TOP = 24;
export const FRAME_MARGIN_RIGHT = 24;
export const FRAME_MARGIN_BOTTOM = 24;

export const TITLEBLOCK_WIDTH = 190;
export const TITLEBLOCK_HEIGHT = 360;
export const TITLEBLOCK_VISUAL_WIDTH = 190;

export const DRAW_LEFT = FRAME_MARGIN_LEFT + 6;
export const DRAW_RIGHT = A4_WIDTH_PX - FRAME_MARGIN_RIGHT - TITLEBLOCK_WIDTH - 6;
export const DRAW_TOP = FRAME_MARGIN_TOP + 6;
export const DRAW_BOTTOM = A4_HEIGHT_PX - FRAME_MARGIN_BOTTOM - 6;
export const DRAW_WIDTH = DRAW_RIGHT - DRAW_LEFT;
export const DRAW_HEIGHT = DRAW_BOTTOM - DRAW_TOP;

export const COLUMN_MARGIN_LEFT = 150;
export const COLUMN_MARGIN_RIGHT = 24;
export const COLUMN_WIDTH = 142;
export const COLUMN_GAP = 12;
export const MAX_MODULES_PER_CARD = 10;

export const Y_FR = 25;
export const Y_TOP_SWITCH = 45;
export const Y_MAIN_BUS = 145;
export const Y_MAIN_DEVICE = 160;
export const Y_GROUP_BUS = 285;
export const Y_MCB = 360;
export const Y_WIRE_END = 440;
export const Y_LABEL_TOP = 442;
export const Y_N = 455;
export const Y_PE = 475;

// Shifted Y-coordinates when a top switch (WS1) is present
export const Y_TOP_SWITCH_WITH_TOP = 25;
export const Y_TOP_BUS_WITH_TOP = 120;
export const Y_FR_WITH_TOP = 130;
export const Y_MAIN_BUS_WITH_TOP = 225;
export const Y_MAIN_DEVICE_WITH_TOP = 230;
export const Y_GROUP_BUS_WITH_TOP = 335;
export const Y_MCB_WITH_TOP = 360;
export const Y_WIRE_END_WITH_TOP = 440;
export const Y_LABEL_TOP_WITH_TOP = 442;
export const Y_N_WITH_TOP = 455;
export const Y_PE_WITH_TOP = 475;

export const ROW_HEIGHT = 25;
export const Y_ROW_DESIGNATION = 510;
export const Y_ROW_CIRCUIT = 535;
export const Y_ROW_LOCATION = 560;
export const Y_ROW_SEPARATOR = 585;
export const Y_ROW_CABLE = 585;
export const Y_ROW_CABLE_TYPE = 610;
export const Y_ROW_CABLE_SPEC = 635;
export const Y_ROW_CABLE_LENGTH = 660;
export const Y_ROW_POWER = 685;
export const Y_TABLE_END = 710;

export const CELL_FONT_SIZE = 10.5;

export const MODULE_WIDTH = 82;
export const MODULE_HEIGHT = 90;
export const MODULE_GAP = 4;

export const PAGE_GAP = 40;

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
  topDevice?: SchematicNode;
  topBusConnected?: boolean;
  hasNeutralBar?: boolean;
  neutralBarLabel?: string;
  children: SchematicNode[];
}

export interface SchematicLayout {
  pages: PageInfo[];
  nodes: SchematicNode[];
  totalWidth: number;
  totalHeight: number;
  frReference: string;
}
