import type { PageInfo, SchematicNode } from "../schematicLayout";
import {
  MODULE_WIDTH,
  Y_LABEL_TOP,
  Y_LABEL_TOP_WITH_TOP,
  Y_MAIN_BUS,
  Y_MAIN_BUS_WITH_TOP,
  Y_WIRE_END,
  Y_WIRE_END_WITH_TOP,
} from "../schematicLayout";
import {
  COLORS,
  SCHEMATIC_BODY_Y_OFFSET,
  roundRect,
  strokeLine,
  text,
  textCentered,
  y,
} from "./schematicRenderUtils";
import { displayNodes } from "./schematicTableRenderer";

const PATH_NUMBER_LABEL_Y = 10;

export function drawPathGuides(ctx: CanvasRenderingContext2D, pageDevices: SchematicNode[], page: PageInfo, hasTopSwitch = false): void {
  const display = pageDevices.flatMap((node) => displayNodes(node));
  for (const node of display) {
    const cx = node.x + MODULE_WIDTH / 2;
    ctx.save();
    ctx.strokeStyle = COLORS.gridText;
    ctx.lineWidth = 0.4;
    ctx.setLineDash([2, 2]);
    const labelTopY = hasTopSwitch ? Y_LABEL_TOP_WITH_TOP : Y_LABEL_TOP;
    strokeLine(ctx, cx, y(page, 18), cx, y(page, labelTopY + SCHEMATIC_BODY_Y_OFFSET), COLORS.grid, 0.4);
    ctx.restore();
  }
}

export function drawPathNumberLabels(ctx: CanvasRenderingContext2D, pageDevices: SchematicNode[], page: PageInfo): void {
  const display = pageDevices.flatMap((node) => displayNodes(node));
  display.forEach((node, index) => {
    const cx = node.x + MODULE_WIDTH / 2;
    const labelY = PATH_NUMBER_LABEL_Y;
    const label = String(index + 1);
    ctx.font = "700 9.5px Segoe UI, sans-serif";
    const textWidth = ctx.measureText(label).width;
    const rectWidth = textWidth + 8;
    const rectHeight = 13;
    const rectX = cx - rectWidth / 2;
    const rectY = y(page, labelY) - 1.5;

    ctx.fillStyle = COLORS.page;
    ctx.strokeStyle = COLORS.gridText;
    ctx.lineWidth = 0.6;
    roundRect(ctx, rectX, rectY, rectWidth, rectHeight, 2, true, true);
    textCentered(ctx, label, cx, y(page, labelY), 9.5, COLORS.textDes, true);
  });
}

export function drawCableLabels(ctx: CanvasRenderingContext2D, page: PageInfo, pageDevices: SchematicNode[], hasTopSwitch = false): void {
  const display = pageDevices.flatMap((node) => displayNodes(node));
  for (const node of display) {
    if (!node.cableDesig) {
      continue;
    }
    if (node.nodeType === "MCB") {
      continue;
    }
    const wireEndY = hasTopSwitch ? Y_WIRE_END_WITH_TOP : Y_WIRE_END;
    textCentered(ctx, node.cableDesig, node.x + MODULE_WIDTH / 2, y(page, wireEndY) + 11, 8, COLORS.textDim, true);
  }
}

export function drawContinuation(ctx: CanvasRenderingContext2D, page: PageInfo, target: number, right: boolean, hasTopSwitch = false): void {
  const mainBusY = hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS;
  const busY = y(page, mainBusY);
  if (right) {
    const x = page.busX2 + 4;
    strokeLine(ctx, x, busY, x + 16, busY, "#b48c1e", 1.2);
    strokeLine(ctx, x + 12, busY - 3, x + 16, busY, "#b48c1e", 1.2);
    strokeLine(ctx, x + 12, busY + 3, x + 16, busY, "#b48c1e", 1.2);
    text(ctx, `→ ark. ${target}`, x, busY - 20, 8, "#b48c1e", true);
  } else {
    const x = page.busX1 - 4;
    strokeLine(ctx, x - 16, busY, x, busY, "#b48c1e", 1.2);
    strokeLine(ctx, x - 12, busY - 3, x - 16, busY, "#b48c1e", 1.2);
    strokeLine(ctx, x - 12, busY + 3, x - 16, busY, "#b48c1e", 1.2);
    text(ctx, `← z ark. ${target}`, x - 48, busY - 20, 8, "#b48c1e", true);
  }
}
