import type { PageInfo, SchematicLayout, SchematicNode } from "./schematicLayout";
import type { ProjectMetadata } from "../../types/projectMetadata";
import { MODULE_HEIGHT, MODULE_WIDTH } from "./schematicLayout";

import { COLORS, SCHEMATIC_BODY_Y_OFFSET, getRootNodes } from "./renderers/schematicRenderUtils";
import { drawPageTemplate } from "./renderers/schematicPageTemplateRenderer";
import { drawTitleBlock } from "./renderers/schematicTitleBlockRenderer";
import { drawCircuitTable } from "./renderers/schematicTableRenderer";
import {
  drawPathGuides,
  drawPathNumberLabels,
  drawCableLabels,
  drawContinuation,
} from "./renderers/schematicPageVectorsRenderer";
import {
  drawMainBus,
  drawTopBus,
  drawDevice,
  drawNpe,
  drawLegend,
} from "./renderers/schematicWireRenderer";

export interface SchematicRenderOptions {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panX: number;
  panY: number;
  activePageIndex: number;
  selectedNodeId?: string;
  selectedNodeIds?: string[];
  highlightNodeId?: string;
  metadata?: ProjectMetadata;
  /**
   * Kolor tła canvasu (obszar poza stronami A4). Domyślnie odczytywany z CSS
   * variable `--canvas-bg` — dzięki temu canvas dopasowuje się do motywu
   * (jasny → biały, ciemny → #0b0d10). Przy exportcie PDF przekazujemy "#ffffff"
   * jawnie, żeby druk zawsze miał białe tło niezależnie od motywu.
   */
  backgroundColor?: string;
}

export { SCHEMATIC_BODY_Y_OFFSET };

export function renderSchematic(
  ctx: CanvasRenderingContext2D,
  layout: SchematicLayout,
  options: SchematicRenderOptions,
): void {
  const { canvasWidth, canvasHeight, zoom, panX, panY, selectedNodeId, selectedNodeIds } = options;

  // WHY: domyślnie czytaj z CSS variable, żeby canvas reagował na motyw.
  // W środowisku bez DOM (testy) wpadamy na fallback #0b0d10.
  const cssVarBg = typeof document !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue("--canvas-bg").trim()
    : "";
  const backgroundColor = options.backgroundColor ?? (cssVarBg || "#0b0d10");
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  const rootNodes = getRootNodes(layout.nodes);

  for (const page of layout.pages) {
    drawPageTemplate(ctx, page, layout.pages.length);
    drawPageVectors(ctx, layout, page, rootNodes);
    drawCircuitTable(ctx, page, rootNodes);
    drawTitleBlock(ctx, page, layout.pages.length, options.metadata);
  }

  const selection = new Set<string>(selectedNodeIds ?? []);
  if (selectedNodeId) {
    selection.add(selectedNodeId);
  }

  for (const selectedId of selection) {
    const selected = layout.nodes.find((node) => node.id === selectedId);
    if (selected) {
      drawSelection(ctx, selected);
    }
  }

  ctx.restore();
}

function drawPageVectors(
  ctx: CanvasRenderingContext2D,
  layout: SchematicLayout,
  page: PageInfo,
  rootNodes: SchematicNode[],
): void {
  const pageDevices = rootNodes.filter((node) => node.pageIndex === page.pageIndex);
  if (pageDevices.length === 0) {
    return;
  }

  const hasTopSwitch = pageDevices.some((node) => node.topDevice || node.topBusConnected);

  drawPathGuides(ctx, pageDevices, page, hasTopSwitch);

  ctx.save();
  ctx.translate(0, SCHEMATIC_BODY_Y_OFFSET);

  drawMainBus(ctx, page, hasTopSwitch);
  drawTopBus(ctx, page, pageDevices);

  for (const device of pageDevices) {
    if (device.topDevice) {
      drawDevice(ctx, device.topDevice, page, hasTopSwitch);
    }
    drawDevice(ctx, device, page, hasTopSwitch);
  }

  drawNpe(ctx, page, hasTopSwitch);
  drawCableLabels(ctx, page, pageDevices, hasTopSwitch);

  if (page.pageIndex < layout.pages.length - 1) {
    drawContinuation(ctx, page, page.pageIndex + 2, true, hasTopSwitch);
  }
  if (page.pageIndex > 0) {
    drawContinuation(ctx, page, page.pageIndex, false, hasTopSwitch);
  }

  ctx.restore();

  drawPathNumberLabels(ctx, pageDevices, page);
  drawLegend(ctx, page, pageDevices);
}

function drawSelection(ctx: CanvasRenderingContext2D, node: SchematicNode): void {
  ctx.save();
  ctx.strokeStyle = COLORS.selected;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(node.x - 6, node.y + SCHEMATIC_BODY_Y_OFFSET - 6, MODULE_WIDTH + 12, MODULE_HEIGHT + 12);
  ctx.restore();
}
