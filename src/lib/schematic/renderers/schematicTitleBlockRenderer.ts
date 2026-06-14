import type { PageInfo } from "../schematicLayout";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  FRAME_MARGIN_BOTTOM,
  FRAME_MARGIN_RIGHT,
  TITLEBLOCK_HEIGHT,
  TITLEBLOCK_VISUAL_WIDTH,
} from "../schematicLayout";
import { COLORS, strokeLine, text } from "./schematicRenderUtils";

export function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  page: PageInfo,
  totalPages: number,
  metadata?: ProjectMetadata,
): void {
  const width = TITLEBLOCK_VISUAL_WIDTH;
  const height = TITLEBLOCK_HEIGHT;
  const x = A4_WIDTH_PX - FRAME_MARGIN_RIGHT - width;
  const blockY = A4_HEIGHT_PX - FRAME_MARGIN_BOTTOM - height + page.yOffset;

  ctx.fillStyle = COLORS.page;
  ctx.fillRect(x, blockY, width, height);
  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, blockY, width, height);

  const relativeRows = [1.12, 1, 1, 1.35, 1, 1, 1, 1, 1.08];
  const total = relativeRows.reduce((sum, value) => sum + value, 0);
  const rowHeights = relativeRows.map((value) => (height * value) / total);
  const rowTops = [blockY];
  for (const rowHeight of rowHeights) {
    rowTops.push(rowTops[rowTops.length - 1] + rowHeight);
  }

  for (let i = 1; i < rowTops.length - 1; i++) {
    strokeLine(ctx, x, rowTops[i], x + width, rowTops[i], COLORS.frame, 0.5);
  }

  const splitX = x + width * 0.5;
  for (const [from, to] of [
    [3, 4],
    [4, 5],
    [5, 6],
    [8, 9],
  ] as const) {
    strokeLine(ctx, splitX, rowTops[from], splitX, rowTops[to], COLORS.frame, 0.5);
  }

  const colW = width * 0.5;

  const title = truncateText(getProjectObjectName(metadata), 60);
  const investor = truncateText(metadata?.investor, 60);
  const address = truncateText(metadata?.address, 60);
  const contractor = truncateText(getContractorName(metadata), 30);
  const designer = truncateText(getDesignerName(metadata), 30);
  const designerLicense = truncateText(getDesignerLicense(metadata), 30);
  const drawNum = truncateText(metadata?.projectNumber ?? "PW-01/2026", 28);
  const scale = truncateText(getDrawingScale(metadata), 28);
  const date = truncateText(getDrawingDate(metadata), 28);
  const sheet = truncateText(getSheetLabel(metadata, page.pageIndex, totalPages), 28);
  const revision = truncateText(metadata?.revision ?? "wyd. 1", 60);
  const standards = truncateText(getStandardsText(metadata), 60);
  const designerSig = truncateText(getDesignerSignature(metadata), 30);
  const contractorSig = truncateText(getContractorSignature(metadata), 30);

  drawTitleCell(ctx, x, rowTops[0], width, rowHeights[0], "Zakres / dokumentacja:", title, 6.5, 8.5);
  drawTitleCell(ctx, x, rowTops[1], width, rowHeights[1], "Inwestor:", investor, 6.0, 7.5);
  drawTitleCell(ctx, x, rowTops[2], width, rowHeights[2], "Adres obiektu:", address, 6.0, 7.5);
  drawTitleCell(ctx, x, rowTops[3], colW, rowHeights[3], "Wykonawca:", contractor, 5.5, 7.0);
  drawTitleCell(ctx, splitX, rowTops[3], colW, rowHeights[3], "Elektryk / SEP:", `${designer}\n${designerLicense}`, 5.5, 6.5);
  drawTitleCell(ctx, x, rowTops[4], colW, rowHeights[4], "Nr dokumentacji:", drawNum, 5.5, 7.5);
  drawTitleCell(ctx, splitX, rowTops[4], colW, rowHeights[4], "Skala:", scale, 5.5, 7.5);
  drawTitleCell(ctx, x, rowTops[5], colW, rowHeights[5], "Data wykonania:", date, 5.5, 7.5);
  drawTitleCell(ctx, splitX, rowTops[5], colW, rowHeights[5], "Arkusz:", sheet, 5.5, 7.5);
  drawTitleCell(ctx, x, rowTops[6], width, rowHeights[6], "Rewizja / zmiana:", revision, 6.0, 7.5);
  drawTitleCell(ctx, x, rowTops[7], width, rowHeights[7], "Normy:", standards, 6.0, 7.5);
  drawTitleCell(ctx, x, rowTops[8], colW, rowHeights[8], "Podpis elektryka:", designerSig, 5.5, 7.0);
  drawTitleCell(ctx, splitX, rowTops[8], colW, rowHeights[8], "Podpis wykonawcy:", contractorSig, 5.5, 7.0);
}

function drawTitleCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  cellY: number,
  width: number,
  _height: number,
  label: string,
  value: string,
  labelSize: number,
  valueSize: number,
): void {
  text(ctx, label, x + 4, cellY + 4, labelSize, COLORS.textLabel);
  
  ctx.font = `700 ${valueSize}px Segoe UI, sans-serif`;
  // We can wrap text here simply
  const words = value.split(" ");
  let line = "";
  const currentY = cellY + Math.max(13, labelSize + 9);
  
  const lines = [];
  for (const word of words) {
    if (line === "") {
      line = word;
    } else {
      const testLine = line + " " + word;
      if (ctx.measureText(testLine).width > width - 8) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
  }
  if (line !== "") lines.push(line);
  text(ctx, lines.join("\n"), x + 4, currentY, valueSize, COLORS.text, true);
}

function getProjectObjectName(metadata?: ProjectMetadata): string {
  if (metadata?.company?.trim()) {
    return metadata.company.trim();
  }
  return "Dokumentacja powykonawcza instalacji elektrycznej";
}

function getContractorName(metadata?: ProjectMetadata): string {
  if (metadata?.contractor?.trim()) {
    return metadata.contractor.trim();
  }
  return "---";
}

function getDesignerName(metadata?: ProjectMetadata): string {
  if (metadata?.author?.trim()) {
    return metadata.author.trim();
  }
  return "---";
}

function getDesignerLicense(metadata?: ProjectMetadata): string {
  if (metadata?.designerId?.trim()) {
    return metadata.designerId.trim();
  }
  if (metadata?.authorLicense?.trim()) {
    return metadata.authorLicense.trim();
  }
  return "---";
}

function getDrawingScale(metadata?: ProjectMetadata): string {
  if (metadata?.drawingScale?.trim()) {
    return metadata.drawingScale.trim();
  }
  return "bez skali";
}

function getDrawingDate(metadata?: ProjectMetadata): string {
  if (metadata?.drawingDate?.trim()) {
    return metadata.drawingDate.trim();
  }
  if (metadata?.dateModified) {
    return metadata.dateModified.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function getSheetLabel(metadata: ProjectMetadata | undefined, pageIndex: number, totalPages: number): string {
  if (metadata?.sheetNumber?.trim()) {
    return metadata.sheetNumber.trim();
  }
  return `${pageIndex + 1}/${totalPages}`;
}

function getStandardsText(metadata?: ProjectMetadata): string {
  if (metadata?.standards) {
    const values = metadata.standards
      .filter((val) => val && val.trim().length > 0)
      .map((val) => val.trim());
    if (values.length > 0) {
      return values.join("; ");
    }
  }
  return "PN-HD 60364; PN-EN 60617";
}

function getDesignerSignature(metadata?: ProjectMetadata): string {
  if (metadata && !metadata.isFormalDocumentationMode) {
    return "nie dotyczy";
  }
  if (metadata?.designerSignature?.trim()) {
    return metadata.designerSignature.trim();
  }
  return ".........................";
}

function getContractorSignature(metadata?: ProjectMetadata): string {
  if (metadata && !metadata.isFormalDocumentationMode) {
    return "nie dotyczy";
  }
  if (metadata?.contractorSignature?.trim()) {
    return metadata.contractorSignature.trim();
  }
  return ".........................";
}

function truncateText(value: string | undefined, maxLen: number): string {
  if (!value || !value.trim()) {
    return "---";
  }
  const normalized = value.trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return normalized.slice(0, maxLen - 3) + "...";
}
