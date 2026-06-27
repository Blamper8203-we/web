import {
  DRAW_TOP,
  MODULE_HEIGHT,
  MODULE_WIDTH,
  ROW_HEIGHT,
  type PageInfo,
} from "../schematicLayout";

export const COLORS = {
  page: "#FAF9F6",
  frame: "#6c727c",
  grid: "#d2d7df",
  gridText: "#90959f",
  text: "#161a22",
  textDim: "#484e58",
  textLabel: "#60656f",
  textDes: "#1c1e26",
  textNum: "#424852",
  boxBg: "#fafbfe",
  bus: "#181c24",
  wire: "#4a505c",
  fr: "#5b3fd6",
  spd: "#d28200",
  rcd: "#007c89",
  kf: "#aa8214",
  l1: "#8b4513",
  l2: "#1e1e1e",
  l3: "#787878",
  n: "#0066cc",
  pe: "#b0c424",
  tableHeader: "#f3f6fb",
  tableMuted: "#475569",
  tableDim: "#667085",
  selected: "#0D79F2",
};

export const SCHEMATIC_BODY_Y_OFFSET = 12;

export function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  textY: number,
  size: number,
  color: string,
  bold = false,
  maxWidth?: number,
): void {
  if (!value) {
    return;
  }

  ctx.font = `${bold ? "700 " : ""}${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const lines = value.split("\n");
  lines.forEach((line, index) => {
    const printable = maxWidth ? truncateToWidth(ctx, line, maxWidth) : line;
    ctx.fillText(printable, x, textY + size + index * (size + 1.5));
  });
}

export function textRight(
  ctx: CanvasRenderingContext2D,
  value: string,
  rightX: number,
  centerY: number,
  size: number,
  color: string,
  bold = false,
  maxWidth = 88,
): void {
  if (!value) {
    return;
  }

  ctx.font = `${bold ? "700 " : ""}${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const lines = value.split("\n").map((line) => truncateToWidth(ctx, line, maxWidth));
  const lineGap = 1.5;
  const totalHeight = lines.length * size + (lines.length - 1) * lineGap;
  const firstY = centerY - totalHeight / 2 + size / 2;
  lines.forEach((line, index) => ctx.fillText(line, rightX, firstY + index * (size + lineGap)));
}

export function textCentered(
  ctx: CanvasRenderingContext2D,
  value: string,
  centerX: number,
  topY: number,
  size: number,
  color: string,
  bold = false,
): void {
  if (!value) {
    return;
  }

  ctx.font = `${bold ? "700 " : ""}${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, centerX, topY + size);
}

export function textCenteredBox(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  boxY: number,
  width: number,
  size: number,
  color: string,
): void {
  if (!value) {
    return;
  }

  const lines = value.split("\n").map((line) => truncateToWidth(ctx, line, width - 4));
  const lineGap = 1.5;
  const totalHeight = lines.length * size + (lines.length - 1) * lineGap;
  const firstY = boxY + (ROW_HEIGHT - totalHeight) / 2 + size - size * 0.1;

  ctx.font = `${size}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  lines.forEach((line, index) => ctx.fillText(line, x + width / 2, firstY + index * (size + lineGap)));
}

export function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const manualLines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const manualLine of manualLines) {
    const words = manualLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      continue;
    }

    let current = words[0];
    for (const word of words.slice(1)) {
      const test = `${current} ${word}`;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines.map((line) => truncateToWidth(ctx, line, maxWidth));
}

export function truncateToWidth(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) {
    return value;
  }

  let next = value;
  while (next.length > 2 && ctx.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}...`;
}

export function drawDot(ctx: CanvasRenderingContext2D, x: number, dotY: number, color: string, radius: number): void {
  circle(ctx, x, dotY, radius, color, true);
}

export function wireDot(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number): void {
  drawDot(ctx, x, y1, COLORS.wire, 2.2);
  drawWireLine(ctx, x, y1, y2, COLORS.wire, 1.5);
}

export function drawWireLine(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, color: string, width: number): void {
  strokeLine(ctx, x, y1, x, y2, color, width);
}

export function circle(ctx: CanvasRenderingContext2D, x: number, circleY: number, radius: number, color: string, fill: boolean): void {
  ctx.beginPath();
  ctx.arc(x, circleY, radius, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.85;
    ctx.stroke();
  }
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke: boolean,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) {
    ctx.fill();
  }

  if (stroke) {
    ctx.stroke();
  }
}

export function drawP(ctx: CanvasRenderingContext2D, color: string, width: number, ...points: number[]): void {
  for (let index = 0; index < points.length; index += 4) {
    strokeLine(ctx, points[index], points[index + 1], points[index + 2], points[index + 3], color, width);
  }
}

export function y(page: PageInfo, relativeY: number): number {
  return page.yOffset + DRAW_TOP + relativeY;
}

export function px(value: number): number {
  return (value / 300) * MODULE_WIDTH;
}

export function py(value: number): number {
  return (value / 350) * MODULE_HEIGHT;
}

export function sx(cx: number): (value: number) => number {
  return (value: number) => cx - MODULE_WIDTH / 2 + px(value);
}

export function sy(cy: number): (value: number) => number {
  return (value: number) => cy - MODULE_HEIGHT / 2 + py(value);
}

export function phaseMarks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  count: number,
  phaseText?: string,
  _hasNeutral = false,
  textOffsetX = 8,
): void {
  const totalMarks = Math.min(3, Math.max(1, count));
  const markHeight = 4;
  const gap = 2.5;
  const offset = -((totalMarks - 1) * gap) / 2;

  for (let index = 0; index < totalMarks; index++) {
    const delta = offset + index * gap;
    strokeLine(ctx, cx - markHeight + delta, cy + markHeight, cx + markHeight + delta, cy - markHeight, COLORS.text, 1.15);
  }

  if (_hasNeutral && phaseText && phaseText !== "PENDING" && phaseText !== "pending" && phaseText !== "3P") {
    if (textOffsetX < 0) {
      textRight(ctx, phaseText, cx + textOffsetX, cy + 2, 6, COLORS.textDim);
    } else {
      text(ctx, phaseText, cx + textOffsetX, cy - 1, 6, COLORS.textDim);
    }
  }
}

export function getRootNodes(nodes: any[]): any[] {
  const childIds = new Set(nodes.flatMap((node) => node.children ? node.children.map((child: any) => child.id) : []));
  const topDeviceIds = new Set(nodes.map(node => node.topDevice?.id).filter(Boolean));
  return nodes.filter((node) => !childIds.has(node.id) && !topDeviceIds.has(node.id));
}
