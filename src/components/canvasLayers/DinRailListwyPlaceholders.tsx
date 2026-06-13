import React from "react";
import type { SymbolItem } from "../../types/symbolItem";

interface DinRailListwyPlaceholdersProps {
  isVisible: boolean;
  width: number;
  rows: number;
  snappedSymbols: SymbolItem[];
  worldTransform: string;
  onRequestLeftPanelTab?: (tab: string) => void;
  getPaletteTemplate?: (templateId: string) => { category?: string } | undefined;
}

export function DinRailListwyPlaceholders({
  isVisible,
  width,
  rows,
  snappedSymbols,
  worldTransform,
  onRequestLeftPanelTab,
  getPaletteTemplate,
}: DinRailListwyPlaceholdersProps) {
  if (!isVisible) {
    return null;
  }

  const rectWidth = Math.min(2000, width * 0.35);
  const rectHeight = 300;
  const gap = 300;

  const centerX = width / 2;
  const leftRectX = centerX - rectWidth - gap / 2;
  const rightRectX = centerX + gap / 2;

  const topY = -1200;
  const bottomY = (rows - 1) * (1642.0 + 50.0) + 2400;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    width: `${rectWidth}px`,
    height: `${rectHeight}px`,
    border: "12px dashed #475569", // slate-600
    borderRadius: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    pointerEvents: "auto",
    backgroundColor: "rgba(15, 23, 42, 0.4)", // slate-900 with opacity
    boxSizing: "border-box",
    transition: "border-color 0.2s, background-color 0.2s",
  };

  const textStyle: React.CSSProperties = {
    fontSize: "80px",
    fontWeight: "bold",
    color: "#94a3b8", // slate-400
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
        e.currentTarget.style.borderColor = "#94a3b8";
        e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.6)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#475569";
        e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.4)";
      }}
    >
      <span style={textStyle}>DODAJ LISTWY</span>
    </div>
  );

  const isZoneOccupied = (zoneX: number, zoneY: number) => {
    return snappedSymbols.some((s) => {
      const template = getPaletteTemplate?.(s.moduleRef);
      const isListwa =
        template?.category === "Listwy do rozdzielnicy" ||
        s.moduleRef?.includes("Listwy do rozdzielnicy");
      if (!isListwa) return false;
      const sCenterX = s.x + s.width / 2;
      const sCenterY = s.y + s.height / 2;
      const zoneCenterX = zoneX + rectWidth / 2;
      const zoneCenterY = zoneY + rectHeight / 2;
      return (
        Math.abs(sCenterX - zoneCenterX) < rectWidth * 0.8 &&
        Math.abs(sCenterY - zoneCenterY) < rectHeight * 0.8
      );
    });
  };

  return (
    <div
      className="din-rail-listwy-placeholders"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: `${width}px`,
        height: `${rows * 1692}px`, // approximate bounds to satisfy types, but mostly rely on worldTransform
        transform: worldTransform,
        transformOrigin: "top left",
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      {!isZoneOccupied(leftRectX, topY) && createPlaceholder(leftRectX, topY, "top-left")}
      {!isZoneOccupied(rightRectX, topY) && createPlaceholder(rightRectX, topY, "top-right")}
      {!isZoneOccupied(leftRectX, bottomY) && createPlaceholder(leftRectX, bottomY, "bottom-left")}
      {!isZoneOccupied(rightRectX, bottomY) && createPlaceholder(rightRectX, bottomY, "bottom-right")}
    </div>
  );
}
