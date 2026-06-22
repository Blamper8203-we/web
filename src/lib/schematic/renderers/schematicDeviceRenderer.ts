import type { PageInfo, SchematicNode } from "../schematicLayout";
import {
  MODULE_HEIGHT,
  MODULE_WIDTH,
  Y_WIRE_END,
  Y_WIRE_END_WITH_TOP,
  Y_PE,
  Y_PE_WITH_TOP,
} from "../schematicLayout";
import {
  COLORS,
  circle,
  drawP,
  px,
  py,
  strokeLine,
  sx,
  sy,
  text,
  textRight,
  drawWireLine,
  phaseMarks,
  y,
} from "./schematicRenderUtils";

const SYMBOL_TOP_LINE_START = 30;
const SYMBOL_BOTTOM_LINE_END = 300;
const FR_SYMBOL_Y_OFFSET = 0;
const CABLE_TERMINAL_CELL_WIDTH = 12;
const CABLE_TERMINAL_CELL_HEIGHT = 11;
const CABLE_TERMINAL_GAP = 1;

export function isNetworkSwitchNode(node: SchematicNode): boolean {
  const desig = (node.designation || "").toUpperCase();
  const label = (node.label || "").toLowerCase();
  const protection = (node.protection || "").toLowerCase();
  
  const isSwitchText = (text: string) => 
    (text.includes("przelacznik") || text.includes("przełącznik")) && 
    (text.includes("siec") || text.includes("sieć"));

  return (
    desig.startsWith("WS") ||
    isSwitchText(label) ||
    isSwitchText(protection)
  );
}

export function drawMainSwitch(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, node: SchematicNode): void {
  if (isNetworkSwitchNode(node)) {
    symNetworkSwitch(ctx, cx, cy, color);
  } else {
    symFr(ctx, cx, cy, color);
  }
}

export function symNetworkSwitch(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const x = sx(cx);
  const yy = sy(cy);
  
  strokeLine(ctx, x(130), yy(SYMBOL_TOP_LINE_START), x(130), yy(120), color, 0.85);
  strokeLine(ctx, x(170), yy(SYMBOL_TOP_LINE_START), x(170), yy(120), color, 0.85);
  
  circle(ctx, x(130), yy(126), px(6), color, false);
  circle(ctx, x(170), yy(126), px(6), color, false);
  
  strokeLine(ctx, x(150), yy(180), x(150), yy(SYMBOL_BOTTOM_LINE_END), color, 0.85);
  circle(ctx, x(150), yy(180), px(3), color, true);
  
  strokeLine(ctx, x(150), yy(180), x(135), yy(132), color, 0.85);
  
  ctx.save();
  ctx.fillStyle = COLORS.textDim;
  ctx.font = "700 7px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";
  
  ctx.textAlign = "right";
  ctx.fillText("SIEĆ", x(118), yy(75));
  
  ctx.textAlign = "left";
  ctx.fillText("AGREGAT", x(182), yy(75));
  
  ctx.restore();
}

export function symFr(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const x = sx(cx);
  const yy = sy(cy);
  const symbolY = (value: number) => yy(value) + FR_SYMBOL_Y_OFFSET;
  drawP(ctx, color, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), symbolY(120), x(144), symbolY(119), x(156), symbolY(119), x(150), symbolY(180), x(125), symbolY(125), x(150), symbolY(180), x(150), yy(SYMBOL_BOTTOM_LINE_END));
  circle(ctx, x(150), symbolY(126), px(6), color, false);
  circle(ctx, x(150), symbolY(180), px(3), color, true);
}

export function symMcb(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, color, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), yy(120), x(144), yy(120), x(156), yy(120), x(150), yy(180), x(125), yy(125), x(144), yy(102), x(156), yy(114), x(144), yy(114), x(156), yy(102), x(150), yy(180), x(150), yy(SYMBOL_BOTTOM_LINE_END));
  circle(ctx, x(150), yy(180), px(3), color, true);
}

export function symRcd(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, COLORS.rcd, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), yy(120), x(150), yy(180), x(125), yy(120), x(150), yy(180), x(150), yy(SYMBOL_BOTTOM_LINE_END));
  ctx.strokeStyle = COLORS.rcd;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.ellipse(x(150), yy(230), px(25), py(12), 0, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, x(150), yy(120), px(3), COLORS.rcd, true);
  circle(ctx, x(150), yy(180), px(3), COLORS.rcd, true);

  ctx.save();
  ctx.setLineDash([2, 2]);
  drawP(ctx, COLORS.rcd, 0.55, x(125), yy(230), x(100), yy(230), x(100), yy(230), x(100), yy(150), x(100), yy(150), x(135), yy(150));
  ctx.restore();
}

export function symSpd(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, COLORS.spd, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), yy(130), x(150), yy(130), x(150), yy(155), x(143), yy(148), x(150), yy(155), x(150), yy(155), x(157), yy(148), x(150), yy(190), x(150), yy(165), x(143), yy(172), x(150), yy(165), x(150), yy(165), x(157), yy(172), x(150), yy(190), x(150), yy(250), x(125), yy(250), x(175), yy(250), x(135), yy(260), x(165), yy(260), x(145), yy(270), x(155), yy(270));
  ctx.strokeStyle = COLORS.spd;
  ctx.lineWidth = 0.85;
  ctx.strokeRect(x(130), yy(130), px(40), py(60));
  circle(ctx, x(150), yy(60), px(3), COLORS.spd, true);
}

export function symKf(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const x = sx(cx);
  const yy = sy(cy);
  drawP(ctx, COLORS.kf, 0.85, x(150), yy(SYMBOL_TOP_LINE_START), x(150), yy(130), x(144), yy(154), x(156), yy(166), x(144), yy(166), x(156), yy(154), x(150), yy(190), x(150), yy(SYMBOL_BOTTOM_LINE_END));
  ctx.strokeStyle = COLORS.kf;
  ctx.lineWidth = 0.85;
  ctx.strokeRect(x(130), yy(130), px(40), py(60));
  circle(ctx, x(150), yy(160), px(8), COLORS.kf, false);
  circle(ctx, x(150), yy(60), px(3), COLORS.kf, true);
  circle(ctx, x(150), yy(250), px(3), COLORS.kf, true);
  text(ctx, "N", x(165), yy(350), 5, COLORS.kf, true);
}

export function symbolTopY(nodeY: number): number {
  return nodeY + py(SYMBOL_TOP_LINE_START);
}

export function symbolBottomY(nodeY: number): number {
  return nodeY + py(SYMBOL_BOTTOM_LINE_END);
}

export function phaseColorFor(phase: string): string {
  if (phase === "L2") return COLORS.l2;
  if (phase === "L3") return COLORS.l3;
  return COLORS.l1;
}

export interface CableTerminalLayout {
  labels: string[];
  blockX: number;
  blockY: number;
  nCenterX?: number;
  peCenterX?: number;
  phaseCenterX: number;
}

export function getCableTerminalLayout(cx: number, wireEndY: number, phaseCount: number, phaseStr?: string): CableTerminalLayout {
  let phaseLabels = ["L"];
  if (phaseStr && phaseStr !== "PENDING" && phaseStr !== "pending") {
    phaseLabels = phaseStr.split('+').filter(p => p !== 'N' && p !== 'PE');
  } else if (phaseCount >= 3) {
    phaseLabels = ["L1", "L2", "L3"];
  }

  let labels: string[];
  if (phaseLabels.length >= 3) {
    labels = ["N", "PE", ...phaseLabels];
  } else if (phaseLabels.length === 2) {
    labels = ["N", "PE", ...phaseLabels];
  } else {
    labels = ["N", "PE", phaseLabels[0] || "L", " "];
  }

  const phaseIndex = 2; // The wire drops down to the first phase cell
  const blockX = cx - phaseIndex * (CABLE_TERMINAL_CELL_WIDTH + CABLE_TERMINAL_GAP) - CABLE_TERMINAL_CELL_WIDTH / 2;
  const blockY = wireEndY - CABLE_TERMINAL_CELL_HEIGHT - 6;
  const centerOf = (label: string) => {
    const index = labels.indexOf(label);
    return index >= 0
      ? blockX + index * (CABLE_TERMINAL_CELL_WIDTH + CABLE_TERMINAL_GAP) + CABLE_TERMINAL_CELL_WIDTH / 2
      : undefined;
  };
  return {
    labels,
    blockX,
    blockY,
    nCenterX: centerOf("N"),
    peCenterX: centerOf("PE"),
    phaseCenterX: centerOf(phaseLabels[0] || "L")!,
  };
}

export function drawCableConnectionBlock(
  ctx: CanvasRenderingContext2D,
  layout: CableTerminalLayout,
  cableDesig?: string,
): void {
  const { labels, blockX, blockY } = layout;
  const colorMap: Record<string, string> = {
    L1: COLORS.l1,
    L2: COLORS.l2,
    L3: COLORS.l3,
    L: COLORS.l1,
    N: COLORS.n,
    PE: COLORS.pe,
  };

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const x = blockX + i * (CABLE_TERMINAL_CELL_WIDTH + CABLE_TERMINAL_GAP);

    ctx.fillStyle = COLORS.page;
    ctx.fillRect(x, blockY, CABLE_TERMINAL_CELL_WIDTH, CABLE_TERMINAL_CELL_HEIGHT);
    ctx.strokeStyle = COLORS.textDim;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, blockY, CABLE_TERMINAL_CELL_WIDTH, CABLE_TERMINAL_CELL_HEIGHT);

    if (label !== " ") {
      ctx.font = "600 5.5px Segoe UI, sans-serif";
      ctx.fillStyle = colorMap[label] || COLORS.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + CABLE_TERMINAL_CELL_WIDTH / 2, blockY + CABLE_TERMINAL_CELL_HEIGHT / 2);
    }
  }

  if (cableDesig) {
    const totalW = labels.length * CABLE_TERMINAL_CELL_WIDTH + (labels.length - 1) * CABLE_TERMINAL_GAP;
    const arrowY = blockY + CABLE_TERMINAL_CELL_HEIGHT + 4;
    text(ctx, `${labels.length === 5 ? "5" : "3"}x`, blockX + totalW / 2 - 6, arrowY - 2, 5.5, COLORS.textDim);
  }
}

export function drawMcb(ctx: CanvasRenderingContext2D, node: SchematicNode, nodeY: number, page: PageInfo, hasTopSwitch = false): void {
  const phaseColor = phaseColorFor(node.phase);
  const cx = node.x + MODULE_WIDTH / 2;
  const cy = nodeY + MODULE_HEIGHT / 2;

  ctx.save();
  ctx.setLineDash([5, 5]);
  strokeLine(ctx, cx - MODULE_WIDTH / 2 - 4, cy, cx + MODULE_WIDTH / 2 + 4, cy, COLORS.grid, 0.4);
  ctx.restore();

  symMcb(ctx, cx, cy, phaseColor);
  textRight(ctx, node.designation, cx - 12, nodeY + 29, 8.5, COLORS.textDes, true);
  const wireEndY = hasTopSwitch ? Y_WIRE_END_WITH_TOP : Y_WIRE_END;
  const terminal = getCableTerminalLayout(cx, y(page, wireEndY), node.phaseCount, node.phase);
  drawWireLine(ctx, cx, symbolBottomY(nodeY), terminal.blockY, COLORS.wire, 1.2);
  phaseMarks(ctx, cx, symbolBottomY(nodeY) + 15, node.phaseCount, node.phase);

  if (terminal.peCenterX !== undefined) {
    const peY = y(page, hasTopSwitch ? Y_PE_WITH_TOP : Y_PE);
    ctx.save();
    ctx.setLineDash([4, 3]);
    strokeLine(ctx, terminal.peCenterX, peY, terminal.peCenterX, terminal.blockY + CABLE_TERMINAL_CELL_HEIGHT, COLORS.pe, 1);
    ctx.restore();
  }

  drawCableConnectionBlock(ctx, terminal, node.cableDesig);
}
