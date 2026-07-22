import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import type { SymbolItem } from "../../types/symbolItem";
import type { DinRailCanvasRail } from "../DinRailCanvas";
import { computeListwyZoneLayout } from "../../lib/dinRail/listwySnap";

export interface DinRailListwyPlaceholdersLayerProps {
  rail: DinRailCanvasRail;
  snappedSymbols: SymbolItem[];
  worldLayerBaseStyle: CSSProperties;
  onRequestLeftPanelTab?: (tabName: string) => void;
}

export function DinRailListwyPlaceholdersLayer({
  rail,
  snappedSymbols,
  worldLayerBaseStyle,
  onRequestLeftPanelTab,
}: DinRailListwyPlaceholdersLayerProps) {
  const { t } = useTranslation();
  if (!rail.isVisible) return null;

  const {
    topY,
    bottomY,
    rectWidth,
    rectHeight,
    leftRectX,
    rightRectX,
  } = computeListwyZoneLayout(rail.width, rail.config.rows);

  const baseStyle: CSSProperties = {
    position: "absolute",
    width: `${rectWidth}px`,
    height: `${rectHeight}px`,
    border: "12px dashed var(--panel-border-strong)",
    borderRadius: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    pointerEvents: "auto",
    backgroundColor: "var(--surface-elevated-soft)",
    boxSizing: "border-box",
    transition: "border-color 0.2s, background-color 0.2s",
  };

  const textStyle: CSSProperties = {
    fontSize: "80px",
    fontWeight: "bold",
    color: "var(--text-tertiary)",
    fontFamily: "system-ui, sans-serif",
    textTransform: "uppercase",
    letterSpacing: "4px",
    pointerEvents: "none",
  };

  const createPlaceholder = (x: number, y: number, key: string) => (
    <div
      key={key}
      style={{ ...baseStyle, left: `${x}px`, top: `${y}px` }}
      onClick={() => onRequestLeftPanelTab?.("Listwy do rozdzielnicy")}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-primary)";
        e.currentTarget.style.backgroundColor = "var(--state-info-soft)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--panel-border-strong)";
        e.currentTarget.style.backgroundColor = "var(--surface-elevated-soft)";
      }}
    >
      <span style={textStyle}>{t("auto.dodajlistwy_836", "DODAJ LISTWY")}</span>
    </div>
  );

  const isZoneOccupied = (zoneX: number, zoneY: number) =>
    snappedSymbols.some((s) => {
      // Match the original logic: a symbol counts as a listwa if its
      // moduleRef includes the listwy category name. The full palette
      // lookup is intentionally avoided here to keep the viewport
      // pure (it has no access to palette templates).
      if (!(s.moduleRef?.includes("Listwy do rozdzielnicy") || s.moduleRef?.includes("GSU/GSU"))) return false;
      const sCenterX = s.x + s.width / 2;
      const sCenterY = s.y + s.height / 2;
      const zoneCenterX = zoneX + rectWidth / 2;
      const zoneCenterY = zoneY + rectHeight / 2;
      return (
        Math.abs(sCenterX - zoneCenterX) < rectWidth * 0.8
        && Math.abs(sCenterY - zoneCenterY) < rectHeight * 0.8
      );
    });

  return (
    <div
      className="din-rail-listwy-placeholders"
      style={{ ...worldLayerBaseStyle, zIndex: 20 }}
    >
      {!isZoneOccupied(leftRectX, topY) && createPlaceholder(leftRectX, topY, "top-left")}
      {!isZoneOccupied(rightRectX, topY) && createPlaceholder(rightRectX, topY, "top-right")}
      {!isZoneOccupied(leftRectX, bottomY) && createPlaceholder(leftRectX, bottomY, "bottom-left")}
      {!isZoneOccupied(rightRectX, bottomY) && createPlaceholder(rightRectX, bottomY, "bottom-right")}
    </div>
  );
}
