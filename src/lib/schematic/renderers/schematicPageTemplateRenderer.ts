import type { PageInfo } from "../schematicLayout";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  FRAME_MARGIN_BOTTOM,
  FRAME_MARGIN_LEFT,
  FRAME_MARGIN_RIGHT,
  FRAME_MARGIN_TOP,
} from "../schematicLayout";
import { COLORS } from "./schematicRenderUtils";

export function drawPageTemplate(ctx: CanvasRenderingContext2D, page: PageInfo, totalPages: number): void {
  const y = page.yOffset;
  ctx.fillStyle = COLORS.page;
  ctx.fillRect(0, y, A4_WIDTH_PX, A4_HEIGHT_PX);

  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 1.1;
  ctx.strokeRect(
    FRAME_MARGIN_LEFT,
    y + FRAME_MARGIN_TOP,
    A4_WIDTH_PX - FRAME_MARGIN_LEFT - FRAME_MARGIN_RIGHT,
    A4_HEIGHT_PX - FRAME_MARGIN_TOP - FRAME_MARGIN_BOTTOM,
  );

  ctx.fillStyle = COLORS.gridText;
  ctx.font = "9px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Arkusz ${page.pageIndex + 1}/${totalPages}`, FRAME_MARGIN_LEFT + 8, y + FRAME_MARGIN_TOP + 14);
}
