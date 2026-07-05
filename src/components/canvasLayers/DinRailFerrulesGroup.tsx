import React from "react";
import { FerruleGraphic } from "./FerruleGraphic";
import { isDistributionBlockSymbol, type SymbolItem } from "../../types/symbolItem";
import { WIRE_THICKNESS_MAP } from "../../lib/dinRailCanvas/constants";
import { getSymbolTerminals } from "../../lib/modules/moduleTerminals";
import { getFerruleLength } from "../../lib/connections/connectionsLogic";
import type { DefaultWireSettings } from "../../lib/connections/connectionsLogic";
import type { DrawingState, HoveredHotspot } from "../../hooks/connections/useConnectionsDrawing";

export interface DinRailFerrulesGroupProps {
  groupedWiredPaths: any[]; // Or proper type
  symbols: SymbolItem[];
  drawingState: DrawingState | null;
  defaultWireSettings: DefaultWireSettings;
  actualDrawingFromDir?: string | null;
  actualDrawingToDir?: string | null;
  hoveredHotspot: HoveredHotspot | null;
}

function isShortFerrule(symbol?: SymbolItem): boolean {
  if (!symbol) return false;
  if (symbol.deviceKind === "terminalBlock") return true;
  const ref = (symbol.moduleRef || "").toLowerCase();
  const type = (symbol.type || "").toLowerCase();
  return type.includes("przełącznik sieci") || ref.includes("przelacznik sieci") || ref.includes("przelacznik siec");
}

export function DinRailFerrulesGroup({
  groupedWiredPaths,
  symbols,
  drawingState,
  defaultWireSettings,
  actualDrawingFromDir,
  actualDrawingToDir,
  hoveredHotspot,
}: DinRailFerrulesGroupProps) {
  const ferruleCounts = new Map<string, number>();
  groupedWiredPaths.forEach((w) => {
    if (!w || !w.connection.ferruleColor || w.connection.ferruleColor === "none") return;
    const fromKey = `${w.connection.fromSymbolId}:${w.connection.fromTerminal}:${w.fromHS.isTop ? 'T' : 'B'}:${w.actualFromDir}`;
    const toKey = `${w.connection.toSymbolId}:${w.connection.toTerminal}:${w.toHS.isTop ? 'T' : 'B'}:${w.actualToDir}`;
    ferruleCounts.set(fromKey, (ferruleCounts.get(fromKey) || 0) + 1);
    ferruleCounts.set(toKey, (ferruleCounts.get(toKey) || 0) + 1);
  });

  const renderedFerrules = new Set<string>();

  return (
    <>
      {groupedWiredPaths.map((w) => {
        if (!w || !w.connection.ferruleColor || w.connection.ferruleColor === "none") return null;
        const wireThickness = WIRE_THICKNESS_MAP[w.connection.wireCrossSection] || 4;
        const elements = [];

        const fromKey = `${w.connection.fromSymbolId}:${w.connection.fromTerminal}:${w.fromHS.isTop ? 'T' : 'B'}:${w.actualFromDir}`;
        const toKey = `${w.connection.toSymbolId}:${w.connection.toTerminal}:${w.toHS.isTop ? 'T' : 'B'}:${w.actualToDir}`;

        if (!renderedFerrules.has(fromKey)) {
          renderedFerrules.add(fromKey);
          const fromSymbolForFerrule = symbols.find(sym => sym.id === w.connection.fromSymbolId);
          const fromIsDist = !!fromSymbolForFerrule && isDistributionBlockSymbol(fromSymbolForFerrule);
          elements.push(
            <FerruleGraphic
              key={`ferrule-from-${fromKey}`}
              x={w.fromTerminalPt.x}
              y={w.fromTerminalPt.y}
              direction={w.actualFromDir as any}
              color={w.connection.ferruleColor}
              wireThickness={wireThickness}
              wireCrossSection={w.connection.wireCrossSection}
              isDouble={(ferruleCounts.get(fromKey) || 0) >= 2}
              isShort={isShortFerrule(fromSymbolForFerrule)}
              isExtraLong={fromIsDist}
              isSquare={(() => {
                const s = symbols.find(sym => sym.id === w.connection.fromSymbolId);
                return s?.deviceKind === "phaseIndicator" || (s?.moduleRef || "").toLowerCase().includes("zabezpieczajacy") || (s?.moduleRef || "").toLowerCase().includes("zabezpieczenia");
              })()}
              customOffset={fromIsDist ? 10 : w.fromHS.visualInset}
              customLength={getFerruleLength(fromSymbolForFerrule?.deviceKind, fromSymbolForFerrule?.moduleRef)}
            />
          );
        }

        if (!renderedFerrules.has(toKey)) {
          renderedFerrules.add(toKey);
          const toSymbolForFerrule = symbols.find(sym => sym.id === w.connection.toSymbolId);
          const toIsDist = !!toSymbolForFerrule && isDistributionBlockSymbol(toSymbolForFerrule);
          elements.push(
            <FerruleGraphic
              key={`ferrule-to-${toKey}`}
              x={w.toTerminalPt.x}
              y={w.toTerminalPt.y}
              direction={w.actualToDir as any}
              color={w.connection.ferruleColor}
              wireThickness={wireThickness}
              wireCrossSection={w.connection.wireCrossSection}
              isDouble={(ferruleCounts.get(toKey) || 0) >= 2}
              isShort={isShortFerrule(toSymbolForFerrule)}
              isExtraLong={toIsDist}
              isSquare={(() => {
                const s = symbols.find(sym => sym.id === w.connection.toSymbolId);
                return s?.deviceKind === "phaseIndicator" || (s?.moduleRef || "").toLowerCase().includes("zabezpieczajacy") || (s?.moduleRef || "").toLowerCase().includes("zabezpieczenia");
              })()}
              customOffset={toIsDist ? 10 : w.toHS.visualInset}
              customLength={getFerruleLength(toSymbolForFerrule?.deviceKind, toSymbolForFerrule?.moduleRef)}
            />
          );
        }

        return <React.Fragment key={`ferrule-group-${w.connection.id}`}>{elements}</React.Fragment>;
      })}

      {drawingState && defaultWireSettings.ferruleColor && defaultWireSettings.ferruleColor !== "none" && (
        <FerruleGraphic
          x={drawingState.startX}
          y={drawingState.startY}
          direction={(actualDrawingFromDir || drawingState.direction || (drawingState.isTop ? "top" : "bottom")) as any}
          color={defaultWireSettings.ferruleColor}
          wireThickness={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] || 4}
          wireCrossSection={defaultWireSettings.wireCrossSection}
          isShort={isShortFerrule(symbols.find(sym => sym.id === drawingState.startSymbolId))}
          isExtraLong={(() => {
            const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
            return !!s && isDistributionBlockSymbol(s);
          })()}
          isSquare={(() => {
            const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
            return s?.deviceKind === "phaseIndicator" || (s?.moduleRef || "").toLowerCase().includes("zabezpieczajacy") || (s?.moduleRef || "").toLowerCase().includes("zabezpieczenia");
          })()}
          customOffset={(() => {
            const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
            if (!s) return undefined;
            const hotspots = getSymbolTerminals(s);
            const hs = hotspots.find(h => h.name === drawingState.startTerminal);
            const isDist = isDistributionBlockSymbol(s);
            return isDist ? 10 : hs?.visualInset;
          })()}
          customLength={(() => {
            const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
            if (!s) return undefined;
            return getFerruleLength(s.deviceKind, s.moduleRef);
          })()}
        />
      )}
      {drawingState && hoveredHotspot && defaultWireSettings.ferruleColor && defaultWireSettings.ferruleColor !== "none" && (
        <FerruleGraphic
          x={hoveredHotspot.absX}
          y={hoveredHotspot.absY}
          direction={(actualDrawingToDir || hoveredHotspot.direction || (hoveredHotspot.isTop ? "top" : "bottom")) as any}
          color={defaultWireSettings.ferruleColor}
          wireThickness={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] || 4}
          wireCrossSection={defaultWireSettings.wireCrossSection}
          isShort={isShortFerrule(symbols.find(sym => sym.id === hoveredHotspot.symbolId))}
          isExtraLong={(() => {
            const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
            return !!s && isDistributionBlockSymbol(s);
          })()}
          isSquare={(() => {
            const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
            return s?.deviceKind === "phaseIndicator";
          })()}
          customOffset={(() => {
            const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
            if (!s) return undefined;
            const hotspots = getSymbolTerminals(s);
            const hs = hotspots.find(h => h.name === hoveredHotspot.terminalName);
            const isDist = isDistributionBlockSymbol(s);
            return isDist ? 10 : hs?.visualInset;
          })()}
          customLength={(() => {
            const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
            if (!s) return undefined;
            return getFerruleLength(s.deviceKind, s.moduleRef);
          })()}
        />
      )}
    </>
  );
}
