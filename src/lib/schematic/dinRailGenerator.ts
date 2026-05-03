// ================================================================
// DIN Rail procedural generator - ported from C# DinRailGeneratorProcedural.cs
// Generates SVG string for DIN rail visual representation
// ================================================================

const UNIT_PER_MODULE = 250.0;
const RAIL_HEIGHT = 1642.0;
const PADDING_X = 55.0;
const ROW_SPACING = 50.0;

const VERTICAL_GUIDE_WIDTH = 177.167;
const VERTICAL_GUIDE_Y = 5.449;

const RAIL_BODY_Y = 614.306;
const RAIL_BODY_HEIGHT = 413.387;

const LIP_TOP_Y = 614.75;
const LIP_BOTTOM_Y = 952.25;

const HOLE_SPACING = 738.19;
const HOLE_VISUAL_WIDTH = 403.562;
const HOLE_PATH_DATA = "m 0,0 l -403.562,0 c -10.866,0 -19.675,-8.808 -19.675,-19.674 l 0,-73.15 c 0,-10.867 8.809,-19.675 19.675,-19.675 l 403.562,0 c 10.866,0 19.675,8.808 19.675,19.675 l 0,73.15 c 0,10.866 -8.809,19.674 -19.675,19.674 z";
const LEFT_SCREW_PATH = "M181.452,822.032c0,-20.697 -16.803,-37.5 -37.5,-37.5c-20.697,0 -37.5,16.803 -37.5,37.5c0,20.696 16.803,37.499 37.5,37.499c20.697,0 37.5,-16.803 37.5,-37.499Z";

export interface DinRailDimensions {
  width: number;
  height: number;
  rowCenters: number[];
}

export interface DinRailConfig {
  rows: number;
  modulesPerRow: number;
}

export function generateDinRailSvg(config: DinRailConfig): string {
  const { rows, modulesPerRow } = config;
  if (rows < 1 || modulesPerRow < 1) {
    return generateErrorSvg("Invalid dimensions");
  }

  const railWidth = modulesPerRow * UNIT_PER_MODULE;
  const totalWidth = railWidth + (PADDING_X * 2) + 10.0;
  const totalHeight = (rows * RAIL_HEIGHT) + ((rows - 1) * ROW_SPACING);

  let svg = "";
  svg += `<svg width="100%" height="100%" viewBox="0 0 ${fmt(totalWidth)} ${fmt(totalHeight)}" version="1.1" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs><style>.rail-stroke { fill:#fff; stroke:#1e1e1c; stroke-width:5.55px; }</style></defs>`;

  // Vertical guides
  const guideTotalHeight = totalHeight - (VERTICAL_GUIDE_Y * 2);
  svg += `<rect x="${fmt(PADDING_X)}" y="${fmt(VERTICAL_GUIDE_Y)}" width="${fmt(VERTICAL_GUIDE_WIDTH)}" height="${fmt(guideTotalHeight)}" class="rail-stroke" />`;
  const rightGuideX = PADDING_X + railWidth - VERTICAL_GUIDE_WIDTH;
  svg += `<rect x="${fmt(rightGuideX)}" y="${fmt(VERTICAL_GUIDE_Y)}" width="${fmt(VERTICAL_GUIDE_WIDTH)}" height="${fmt(guideTotalHeight)}" class="rail-stroke" />`;

  // Horizontal elements per row
  for (let row = 0; row < rows; row++) {
    const currentY = row * (RAIL_HEIGHT + ROW_SPACING);
    svg += `<g transform="translate(0, ${fmt(currentY)})">`;
    svg += generateHorizontalElements(railWidth);
    svg += `</g>`;
  }

  svg += `</svg>`;
  return svg;
}

function generateHorizontalElements(width: number): string {
  let out = "";

  // Main rail body
  out += `<rect x="${fmt(PADDING_X)}" y="${fmt(RAIL_BODY_Y)}" width="${fmt(width)}" height="${fmt(RAIL_BODY_HEIGHT)}" class="rail-stroke" />`;

  // Lips
  const lipX = 19.332;
  const lipWidth = width + 72.0;
  out += `<rect x="${fmt(lipX)}" y="${fmt(LIP_TOP_Y)}" width="${fmt(lipWidth)}" height="${fmt(75)}" class="rail-stroke" />`;
  out += `<rect x="${fmt(lipX)}" y="${fmt(LIP_BOTTOM_Y)}" width="${fmt(lipWidth)}" height="${fmt(75)}" class="rail-stroke" />`;

  // Holes (centered)
  const safeMargin = 280.0;
  const availableForHoles = width - (2 * safeMargin);

  if (availableForHoles > HOLE_VISUAL_WIDTH) {
    const holeCount = Math.floor((availableForHoles - HOLE_VISUAL_WIDTH) / HOLE_SPACING) + 1;
    if (holeCount > 0) {
      const totalHolesGroupWidth = ((holeCount - 1) * HOLE_SPACING) + HOLE_VISUAL_WIDTH;
      const centerX = width / 2.0;
      const visualStartX = centerX - (totalHolesGroupWidth / 2.0);
      const insertionStartX = visualStartX + HOLE_VISUAL_WIDTH;

      for (let i = 0; i < holeCount; i++) {
        const xPos = insertionStartX + (i * HOLE_SPACING);
        out += `<path d="${HOLE_PATH_DATA}" transform="translate(${fmt(PADDING_X + xPos)}, 877.25)" class="rail-stroke" />`;
      }
    }
  }

  // Mounting screws
  out += `<path d="${LEFT_SCREW_PATH}" class="rail-stroke" />`;
  const rightScrewTransX = width - 177.0;
  out += `<g transform="translate(${fmt(rightScrewTransX)}, 0)">`;
  out += `<path d="${LEFT_SCREW_PATH}" class="rail-stroke" />`;
  out += `</g>`;

  return out;
}

export function getDinRailDimensions(rows: number, modulesPerRow: number): DinRailDimensions {
  const railWidth = modulesPerRow * UNIT_PER_MODULE;
  const totalWidth = railWidth + (PADDING_X * 2) + 10.0;
  const totalHeight = (rows * RAIL_HEIGHT) + ((rows - 1) * ROW_SPACING);

  const rowCenters: number[] = [];
  for (let r = 0; r < rows; r++) {
    const currentY = r * (RAIL_HEIGHT + ROW_SPACING);
    rowCenters.push(currentY + RAIL_HEIGHT / 2.0);
  }

  return { width: totalWidth, height: totalHeight, rowCenters };
}

function generateErrorSvg(message: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='50'><text x='10' y='30' fill='red'>${message}</text></svg>`;
}

function fmt(val: number): string {
  return val.toFixed(3).replace(/\.?0+$/, '');
}
