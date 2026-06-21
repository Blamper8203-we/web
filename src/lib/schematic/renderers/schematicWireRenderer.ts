import type { PageInfo, SchematicNode } from "../schematicLayout";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  FRAME_MARGIN_BOTTOM,
  FRAME_MARGIN_RIGHT,
  MODULE_HEIGHT,
  MODULE_WIDTH,
  TITLEBLOCK_VISUAL_WIDTH,
  Y_GROUP_BUS,
  Y_GROUP_BUS_WITH_TOP,
  Y_LABEL_TOP,
  Y_LABEL_TOP_WITH_TOP,
  Y_MAIN_BUS,
  Y_MAIN_BUS_WITH_TOP,
  Y_N,
  Y_N_WITH_TOP,
  Y_PE,
  Y_PE_WITH_TOP,
  Y_TOP_BUS_WITH_TOP,
  Y_TOP_SWITCH_WITH_TOP,
  Y_WIRE_END,
  Y_WIRE_END_WITH_TOP,
} from "../schematicLayout";
import {
  COLORS,
  SCHEMATIC_BODY_Y_OFFSET,
  drawDot,
  drawWireLine,
  phaseMarks,
  strokeLine,
  text,
  textCentered,
  textCenteredBox,
  textRight,
  wireDot,
  y,
  roundRect,
} from "./schematicRenderUtils";
import {
  drawMcb,
  drawMainSwitch,
  symKf,
  symSpd,
  symRcd,
  symbolTopY,
  symbolBottomY,
  getCableTerminalLayout,
  isNetworkSwitchNode,
} from "./schematicDeviceRenderer";
import { displayNodes } from "./schematicTableRenderer";

const RCD_NEUTRAL_BUS_OFFSET_Y = -22;
const RCD_BUS_MARGIN = 12;

export function drawMainBus(ctx: CanvasRenderingContext2D, page: PageInfo, hasTopSwitch: boolean): void {
  const mainBusY = hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS;
  strokeLine(ctx, page.busX1, y(page, mainBusY), page.busX2, y(page, mainBusY), COLORS.bus, 3.5);
}

export function drawNpe(ctx: CanvasRenderingContext2D, page: PageInfo, hasTopSwitch: boolean): void {
  const nY = y(page, hasTopSwitch ? Y_N_WITH_TOP : Y_N);
  const peY = y(page, hasTopSwitch ? Y_PE_WITH_TOP : Y_PE);

  strokeLine(ctx, page.busX1, nY, page.busX2, nY, COLORS.n, 2);
  text(ctx, "N", page.busX2 + 8, nY + 3, 9, COLORS.n, true);

  ctx.save();
  ctx.setLineDash([8, 4]);
  strokeLine(ctx, page.busX1, peY, page.busX2, peY, COLORS.pe, 2);
  ctx.restore();
  text(ctx, "PE", page.busX2 + 8, peY + 3, 9, COLORS.pe, true);
}

export function drawTopBus(ctx: CanvasRenderingContext2D, page: PageInfo, pageDevices: SchematicNode[]): void {
  const topBusY = y(page, Y_TOP_BUS_WITH_TOP);
  let minX = Infinity;
  let maxX = -Infinity;

  for (const device of pageDevices) {
    if (device.topBusConnected) {
      const cx = device.x + MODULE_WIDTH / 2;
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      drawWireLine(ctx, cx, topBusY, symbolTopY(device.y), COLORS.wire, 1.2);
      drawDot(ctx, cx, topBusY, COLORS.wire, 2.2);
      phaseMarks(ctx, cx, topBusY + 15, device.phaseCount, device.phase);
    }
  }

  if (minX <= maxX) {
    strokeLine(ctx, minX - 10, topBusY, maxX + 10, topBusY, COLORS.wire, 2.2);
  }
}

export function drawDevice(ctx: CanvasRenderingContext2D, device: SchematicNode, page: PageInfo, hasTopSwitch = false): void {
  if (device.children.length > 0 && device.nodeType === "MainBreaker") {
    drawGroupedMainBreaker(ctx, device, page, hasTopSwitch);
    return;
  }
  if (device.nodeType === "RCD") {
    drawRcd(ctx, device, page, hasTopSwitch);
    return;
  }

  const cx = device.x + MODULE_WIDTH / 2;
  const mainBusY = hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS;

  const isMainBreaker = device.nodeType === "MainBreaker";

  if (!device.topBusConnected) {
    if (isMainBreaker) {
      const isTopDevice = hasTopSwitch && isNetworkSwitchNode(device) && Math.abs(device.y - y(page, Y_TOP_SWITCH_WITH_TOP)) < 5;
      
      if (isTopDevice) {
        const topBusY = y(page, Y_TOP_BUS_WITH_TOP);
        wireDot(ctx, cx, topBusY, symbolBottomY(device.y));
        phaseMarks(
          ctx,
          cx,
          (topBusY + symbolBottomY(device.y)) / 2,
          device.phaseCount,
          device.phase,
          false,
        );
      } else {
        wireDot(ctx, cx, y(page, mainBusY), symbolBottomY(device.y));
        phaseMarks(
          ctx,
          cx,
          (y(page, mainBusY) + symbolBottomY(device.y)) / 2,
          device.phaseCount,
          device.phase,
          false,
        );
      }
    } else {
      wireDot(ctx, cx, y(page, mainBusY), symbolTopY(device.y));
      phaseMarks(
        ctx,
        cx,
        (y(page, mainBusY) + symbolTopY(device.y)) / 2,
        device.phaseCount,
        device.phase,
        device.nodeType === "SPD",
      );
    }
  } else if (isMainBreaker) {
    wireDot(ctx, cx, y(page, mainBusY), symbolBottomY(device.y));
    phaseMarks(
      ctx,
      cx,
      (y(page, mainBusY) + symbolBottomY(device.y)) / 2,
      device.phaseCount,
      device.phase,
      false,
    );
  }

  switch (device.nodeType) {
    case "MainBreaker": {
      const isSwitch = isNetworkSwitchNode(device);
      const color = isSwitch ? COLORS.textDes : COLORS.fr;
      drawMainSwitch(ctx, cx, device.y + MODULE_HEIGHT / 2, color, device);
      text(ctx, device.designation, cx + 12, device.y + 25, 8.5, color, true);
      const supplyText = supplyLabel(device.phaseCount);
      textRight(ctx, supplyText, cx - 12, device.y - 12, 7.5, COLORS.textDim);
      return;
    }
    case "MCB":
      drawMcb(ctx, device, device.y, page, hasTopSwitch);
      return;
    case "SPD":
      symSpd(ctx, cx, device.y + MODULE_HEIGHT / 2);
      text(ctx, device.designation, cx + 12, device.y + 25, 8, COLORS.textDes, true);
      textCenteredBox(ctx, device.protection, cx - 35, device.y + MODULE_HEIGHT + 22, 70, 6.5, COLORS.textDim);
      
      ctx.save();
      ctx.setLineDash([4, 3]);
      strokeLine(ctx, cx, symbolBottomY(device.y), cx, y(page, hasTopSwitch ? Y_PE_WITH_TOP : Y_PE), COLORS.pe, 1);
      drawDot(ctx, cx, y(page, hasTopSwitch ? Y_PE_WITH_TOP : Y_PE), COLORS.pe, 2.2);
      ctx.restore();
      return;
    case "PhaseIndicator":
      symKf(ctx, cx, device.y + MODULE_HEIGHT / 2);
      text(ctx, device.designation, cx + 12, device.y + 25, 8, COLORS.textDes, true);
      textRight(ctx, device.protection, cx - 12, device.y + MODULE_HEIGHT / 2 + 5, 7, COLORS.textDim);
      
      strokeLine(ctx, cx, symbolBottomY(device.y), cx, y(page, hasTopSwitch ? Y_N_WITH_TOP : Y_N), COLORS.n, 1);
      drawDot(ctx, cx, y(page, hasTopSwitch ? Y_N_WITH_TOP : Y_N), COLORS.n, 2.2);
      return;
    case "Other":
      return;
  }
}

export function drawGroupedMainBreaker(ctx: CanvasRenderingContext2D, device: SchematicNode, page: PageInfo, hasTopSwitch = false): void {
  const cx = device.x + MODULE_WIDTH / 2;
  const isSwitch = isNetworkSwitchNode(device);
  const color = isSwitch ? COLORS.textDes : COLORS.fr;
  const mainBusY = hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS;

  wireDot(ctx, cx, y(page, mainBusY), symbolBottomY(device.y));
  phaseMarks(
    ctx,
    cx,
    (y(page, mainBusY) + symbolBottomY(device.y)) / 2,
    device.phaseCount,
    device.phase,
    false,
  );

  drawMainSwitch(ctx, cx, device.y + MODULE_HEIGHT / 2, color, device);
  text(ctx, device.designation, cx + 12, device.y + 25, 8.5, color, true);

  const supplyText = supplyLabel(device.phaseCount);
  textRight(ctx, supplyText, cx - 12, device.y - 12, 7.5, COLORS.textDim);

  if (device.children.length > 0) {
    const lastChild = device.children[device.children.length - 1];
    const busLeftX = cx;
    const busRightX = lastChild.x + MODULE_WIDTH / 2;
    const groupY = device.y + MODULE_HEIGHT + 35;

    drawWireLine(ctx, cx, symbolBottomY(device.y), groupY, COLORS.wire, 1.2);
    strokeLine(ctx, busLeftX, groupY, busRightX, groupY, COLORS.wire, 2.2);

    for (const child of device.children) {
      drawChildFromGroupBus(ctx, child, page, groupY, hasTopSwitch);
    }
  }
}

export function drawRcd(ctx: CanvasRenderingContext2D, rcd: SchematicNode, page: PageInfo, hasTopSwitch = false): void {
  const rcdCx = rcd.x + MODULE_WIDTH / 2;
  const mainBusY = hasTopSwitch ? Y_MAIN_BUS_WITH_TOP : Y_MAIN_BUS;

  if (!rcd.topBusConnected) {
    wireDot(ctx, rcdCx, y(page, mainBusY), symbolTopY(rcd.y));
    phaseMarks(
      ctx,
      rcdCx,
      y(page, mainBusY) + (symbolTopY(rcd.y) - y(page, mainBusY)) / 2,
      rcd.phaseCount,
      rcd.phase,
      true,
    );
  }

  symRcd(ctx, rcdCx, rcd.y + MODULE_HEIGHT / 2);
  text(ctx, rcd.designation, rcdCx + 12, rcd.y + 25, 8.5, COLORS.rcd, true);

  if (rcd.protection) {
    text(ctx, rcd.protection, rcdCx + 12, rcd.y + 38, 6.5, COLORS.textDim);
  }

  if (rcd.children.length === 0) {
    return;
  }

  const mcbChildren = rcd.children.filter((ch) => ch.nodeType === "MCB");

  const firstChild = rcd.children[0];
  const lastChild = rcd.children[rcd.children.length - 1];
  const phaseBusX1 = Math.min(rcdCx, firstChild.x + MODULE_WIDTH / 2 - RCD_BUS_MARGIN);
  const phaseBusX2 = Math.max(rcdCx, lastChild.x + MODULE_WIDTH / 2 + RCD_BUS_MARGIN);
  const groupBusYOffset = hasTopSwitch ? Y_GROUP_BUS_WITH_TOP : Y_GROUP_BUS;
  const phaseBusY = y(page, groupBusYOffset);

  drawWireLine(ctx, rcdCx, symbolBottomY(rcd.y), phaseBusY, COLORS.wire, 1.2);

  const nBusY = phaseBusY + RCD_NEUTRAL_BUS_OFFSET_Y;

  if (mcbChildren.length > 0) {
    const lastMcb = mcbChildren[mcbChildren.length - 1];
    const lastX = lastMcb.x + MODULE_WIDTH / 2;
    let verticalNX: number;
    let shortBusCenterX: number;
    
    const isRoomOnRight = lastX + 18 < phaseBusX2;

    if (isRoomOnRight) {
      verticalNX = lastX + 18;
      shortBusCenterX = verticalNX;
    } else {
      verticalNX = lastX + 18;
      shortBusCenterX = verticalNX;
    }

    const shortBusWidth = 24;
    const shortBusX1 = shortBusCenterX - shortBusWidth / 2;
    const shortBusX2 = shortBusCenterX + shortBusWidth / 2;
    strokeLine(ctx, shortBusX1, nBusY, shortBusX2, nBusY, COLORS.n, 2.2);

    const nLabel = rcd.neutralBarLabel || `X${rcd.designation}`;
    textCentered(ctx, nLabel, shortBusCenterX, nBusY - 12, 6.5, COLORS.textDim, true);

    if (mcbChildren.length > 0) {
      const wireEndYVal = hasTopSwitch ? Y_WIRE_END_WITH_TOP : Y_WIRE_END;
      const terminals = mcbChildren.map(c => 
        getCableTerminalLayout(c.x + MODULE_WIDTH / 2, y(page, wireEndYVal), c.phaseCount, c.phase)
      );
      
      const collectorY = terminals[0].blockY - 25;
      const firstN = terminals[0].nCenterX!;

      ctx.save();
      ctx.setLineDash([2, 2]);
      
      strokeLine(ctx, firstN, collectorY, verticalNX, collectorY, COLORS.n, 1.2);
      
      for (const term of terminals) {
        if (term.nCenterX !== undefined) {
          strokeLine(ctx, term.nCenterX, term.blockY, term.nCenterX, collectorY, COLORS.n, 1.2);
          drawDot(ctx, term.nCenterX, collectorY, COLORS.n, 2.0);
        }
      }
      
      strokeLine(ctx, verticalNX, collectorY, verticalNX, nBusY, COLORS.n, 1.2);
      drawDot(ctx, verticalNX, collectorY, COLORS.n, 2.0);
      drawDot(ctx, verticalNX, nBusY, COLORS.n, 2.0);
      ctx.restore();
    }
  }

  strokeLine(ctx, phaseBusX1, phaseBusY, phaseBusX2, phaseBusY, COLORS.wire, 2.2);

  for (const child of rcd.children) {
    drawChildFromGroupBus(ctx, child, page, phaseBusY, hasTopSwitch);
  }
}

export function drawChildFromGroupBus(
  ctx: CanvasRenderingContext2D,
  child: SchematicNode,
  page: PageInfo,
  groupY: number,
  hasTopSwitch = false,
): void {
  const childCx = child.x + MODULE_WIDTH / 2;

  wireDot(ctx, childCx, groupY, symbolTopY(child.y));
  phaseMarks(
    ctx,
    childCx,
    groupY + (symbolTopY(child.y) - groupY) / 2,
    child.phaseCount,
    child.phase,
    child.nodeType === "SPD",
  );

  switch (child.nodeType) {
    case "MCB":
      drawMcb(ctx, child, child.y, page, hasTopSwitch);
      return;
    case "SPD":
      symSpd(ctx, childCx, child.y + MODULE_HEIGHT / 2);
      text(ctx, child.designation, childCx + 12, child.y + 25, 8, COLORS.textDes, true);
      textCenteredBox(ctx, child.protection, childCx - 35, child.y + MODULE_HEIGHT + 22, 70, 6.5, COLORS.textDim);
      return;
    case "PhaseIndicator":
      symKf(ctx, childCx, child.y + MODULE_HEIGHT / 2);
      text(ctx, child.designation, childCx + 12, child.y + 25, 8, COLORS.textDes, true);
      textRight(ctx, child.protection, childCx - 12, child.y + MODULE_HEIGHT / 2 + 5, 7, COLORS.textDim);
      return;
    case "MainBreaker":
    case "RCD":
    case "Other":
      return;
  }
}

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
  const PATH_NUMBER_LABEL_Y = 10;
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

export function drawLegend(
  ctx: CanvasRenderingContext2D,
  page: PageInfo,
  pageDevices: SchematicNode[],
): void {
  const types = new Set<string>();
  for (const d of pageDevices) {
    types.add(d.nodeType);
    if (d.children && d.children.length > 0) {
      for (const ch of d.children) {
        types.add(ch.nodeType);
      }
    }
  }

  const items: Array<{ sym: string; desc: string; clr: string }> = [];
  if (types.has("MainBreaker")) {
    items.push({ sym: "FR", desc: "Wyłącznik główny", clr: COLORS.fr });
  }
  if (types.has("RCD")) {
    items.push({ sym: "RCD", desc: "Wyłącznik różnicowoprądowy", clr: COLORS.rcd });
  }
  if (types.has("MCB")) {
    items.push({ sym: "MCB", desc: "Wyłącznik nadprądowy", clr: COLORS.wire });
  }
  if (types.has("SPD")) {
    items.push({ sym: "SPD", desc: "Ogranicznik przepięć", clr: COLORS.spd });
  }
  if (types.has("PhaseIndicator")) {
    items.push({ sym: "KF", desc: "Kontrolka fazy", clr: COLORS.kf });
  }

  if (items.length === 0) {
    return;
  }

  const TITLEBLOCK_HEIGHT = 160;
  const legW = TITLEBLOCK_VISUAL_WIDTH;
  const legX = A4_WIDTH_PX - FRAME_MARGIN_RIGHT - legW;
  const tbBottom = (A4_HEIGHT_PX - FRAME_MARGIN_BOTTOM - TITLEBLOCK_HEIGHT) + page.yOffset;
  const rowHt = 17;
  const legH = items.length * rowHt + 20;
  const legY = tbBottom - legH - 6;

  ctx.fillStyle = COLORS.boxBg;
  ctx.fillRect(legX, legY, legW, legH);

  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(legX, legY, legW, legH);

  text(ctx, "LEGENDA", legX + 8, legY + 3, 6.2, COLORS.textLabel, true);

  for (let i = 0; i < items.length; i++) {
    const { sym, desc, clr } = items[i];
    const ry = legY + 16 + i * rowHt;

    ctx.fillStyle = clr;
    ctx.beginPath();
    ctx.arc(legX + 10, ry + 5, 3, 0, 2 * Math.PI);
    ctx.fill();

    text(ctx, sym, legX + 18, ry - 1, 6, COLORS.text, true);
    text(ctx, desc, legX + 48, ry - 1, 6, COLORS.textDim, false, legW - 56);
  }
}

export function supplyLabel(phaseCount: number): string {
  return phaseCount >= 3 ? "3~ 400V" : "1~ 230V";
}
