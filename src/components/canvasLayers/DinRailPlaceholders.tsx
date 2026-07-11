
import type { SymbolItem } from "../../types/symbolItem";
import type { DinRailCanvasRail } from "../DinRailCanvasPixi";
import { LISTWY_ROW_SPACING } from "../../lib/schematic/dinRailGenerator";

export interface DinRailPlaceholdersProps {
  rail: DinRailCanvasRail;
  symbols: SymbolItem[];
  onRequestLeftPanelTab?: (tabName: string) => void;
}

export function DinRailPlaceholders({
  rail,
  symbols,
  onRequestLeftPanelTab,
}: DinRailPlaceholdersProps) {
  if (!rail.isVisible) return null;
  const rectWidth = Math.min(2000, rail.width * 0.35);
  const rectHeight = 300;
  const gap = 300;
  const centerX = rail.width / 2;
  const leftRectX = centerX - rectWidth - gap / 2;
  const rightRectX = centerX + gap / 2;
  const topY = -1200;
  const bottomY = (rail.config.rows - 1) * LISTWY_ROW_SPACING + 2400;

  const isZoneOccupied = (zoneX: number, zoneY: number) => {
    return symbols.some((s) => {
      const pathLower = (s.visualPath || s.moduleRef || "").toLowerCase();
      const pathMatches = pathLower.includes("listwy do rozdzielnicy") || pathLower.includes("listwy%20do%20rozdzielnicy") || pathLower.includes("gsu/gsu");
      if (s.deviceKind !== "terminalBlock" || !pathMatches) return false;
      const sCenterX = s.x + s.width / 2;
      const sCenterY = s.y + s.height / 2;
      const zoneCenterX = zoneX + rectWidth / 2;
      const zoneCenterY = zoneY + rectHeight / 2;
      return Math.abs(sCenterX - zoneCenterX) < rectWidth * 0.8 && Math.abs(sCenterY - zoneCenterY) < rectHeight * 0.8;
    });
  };

  const createPlaceholder = (x: number, y: number, key: string, label: string = "DODAJ LISTWY", tabName: string = "Listwy do rozdzielnicy") => {
    if (isZoneOccupied(x, y)) return null;
    return (
      <g
        key={key}
        className="din-rail-listwy-placeholder-group"
        style={{ cursor: "pointer", pointerEvents: "all" }}
        transform={`translate(${x}, ${y})`}
        onClick={() => onRequestLeftPanelTab?.(tabName)}
        onPointerEnter={(e) => {
          const rect = e.currentTarget.querySelector("rect");
          if (rect) {
            rect.setAttribute("data-hover", "1");
          }
        }}
        onPointerLeave={(e) => {
          const rect = e.currentTarget.querySelector("rect");
          if (rect) {
            rect.removeAttribute("data-hover");
          }
        }}
      >
        <rect
          className="din-rail-listwy-placeholder-rect"
          width={rectWidth}
          height={rectHeight}
          rx={24}
          strokeWidth={12}
          strokeDasharray="24 24"
        />
        <line
          className="din-rail-listwy-placeholder-line"
          x1={0} y1={rectHeight / 2}
          x2={rectWidth} y2={rectHeight / 2}
          strokeWidth={4} strokeDasharray="16 16"
        />
        <line
          className="din-rail-listwy-placeholder-line"
          x1={rectWidth / 2} y1={rectHeight / 2 - 50}
          x2={rectWidth / 2} y2={rectHeight / 2 + 50}
          strokeWidth={4}
        />
        <text
          className="din-rail-listwy-placeholder-text"
          x={rectWidth / 2}
          y={rectHeight / 2 + 25}
          textAnchor="middle"
          fontSize={label.length > 15 ? 40 : 80}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          letterSpacing={label.length > 15 ? 2 : 4}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <g className="din-rail-listwy-placeholders" style={{ pointerEvents: "none" }}>
      {createPlaceholder(leftRectX, topY, "top-left", "DODAJ LISTWY", "Listwy do rozdzielnicy")}
      {createPlaceholder(rightRectX, topY, "top-right", "DODAJ LISTWY", "Listwy do rozdzielnicy")}
      {createPlaceholder(leftRectX, bottomY, "bottom-left", "DODAJ LISTWĘ LUB GSU", "Listwy do rozdzielnicy")}
      {createPlaceholder(rightRectX, bottomY, "bottom-right", "DODAJ LISTWĘ LUB GSU", "Listwy do rozdzielnicy")}
    </g>
  );
}
