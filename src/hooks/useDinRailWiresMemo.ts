import { useMemo } from 'react';
import type { ConnectionItem } from '../types/connectionItem';
import type { SymbolItem } from '../types/symbolItem';
import { findTerminalByName, getSymbolTerminals } from '../lib/modules/moduleTerminals';
import { calculateWirePath, calculateWirePoints } from '../lib/routing/wireRoutingEngine';
import { WIRE_THICKNESS_MAP, getFerruleLength } from '../lib/connections/connectionsLogic';

export function useDinRailWiresMemo(connections: ConnectionItem[], symbols: SymbolItem[]) {
  return useMemo(() => {
    const keyCounts: Record<string, number> = {};
    const keyIndices: Record<string, number> = {};
    
    // First pass: resolve terminals to correctly count wires per physical terminal (including isTop)
    const resolvedConnections = connections.map((conn) => {
      const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
      const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
      
      if (!fromSymbol || !toSymbol) return null;

      const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal, conn.isFromTop);
      const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);

      if (!fromHS || !toHS) return null;

      return { conn, fromSymbol, toSymbol, fromHS, toHS };
    }).filter(Boolean);

    // Count how many wires connect to each specific terminal
    const terminalWireCounts: Record<string, number> = {};
    const terminalWireIndices: Record<string, number> = {};

    resolvedConnections.forEach((res) => {
      if (!res) return;
      const fromKey = `${res.conn.fromSymbolId}:${res.conn.fromTerminal}:${res.fromHS.isTop ? 'T' : 'B'}`;
      const toKey = `${res.conn.toSymbolId}:${res.conn.toTerminal}:${res.toHS.isTop ? 'T' : 'B'}`;
      terminalWireCounts[fromKey] = (terminalWireCounts[fromKey] || 0) + 1;
      terminalWireCounts[toKey] = (terminalWireCounts[toKey] || 0) + 1;
    });

    return resolvedConnections.map((res) => {
      if (!res) return null;
      const { conn, fromSymbol, toSymbol, fromHS, toHS } = res;

      const fromTerminalKey = `${conn.fromSymbolId}:${conn.fromTerminal}:${fromHS.isTop ? 'T' : 'B'}`;
      const toTerminalKey = `${conn.toSymbolId}:${conn.toTerminal}:${toHS.isTop ? 'T' : 'B'}`;
      
      const fromCount = terminalWireCounts[fromTerminalKey];
      const toCount = terminalWireCounts[toTerminalKey];
      
      const fromIndex = terminalWireIndices[fromTerminalKey] || 0;
      terminalWireIndices[fromTerminalKey] = fromIndex + 1;
      
      const toIndex = terminalWireIndices[toTerminalKey] || 0;
      terminalWireIndices[toTerminalKey] = toIndex + 1;

      let fromShiftX = 0, fromShiftY = 0;
      let toShiftX = 0, toShiftY = 0;
      
      const wireThickness = WIRE_THICKNESS_MAP[conn.wireCrossSection] || 4.5;
      const shiftAmount = wireThickness + 2; // Offset dla przewodów w tym samym zacisku

      if (fromCount > 1) {
        const startDir = conn.fromDirection || (fromHS.isTop ? "top" : "bottom");
        const offset = (fromIndex - (fromCount - 1) / 2) * shiftAmount;
        if (startDir === "top" || startDir === "bottom") {
          fromShiftX = offset;
        } else {
          fromShiftY = offset;
        }
      }

      if (toCount > 1) {
        const endDir = conn.toDirection || (toHS.isTop ? "top" : "bottom");
        const offset = (toIndex - (toCount - 1) / 2) * shiftAmount;
        if (endDir === "top" || endDir === "bottom") {
          toShiftX = offset;
        } else {
          toShiftY = offset;
        }
      }

      const fromTerminalPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
      const toTerminalPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

      const fromPt = { x: fromTerminalPt.x + fromShiftX, y: fromTerminalPt.y + fromShiftY };
      const toPt = { x: toTerminalPt.x + toShiftX, y: toTerminalPt.y + toShiftY };


      // Compute sorting key for parallel offsets
      const key = [conn.fromSymbolId, conn.toSymbolId].sort().join(":");
      const totalCount = keyCounts[key] || 0;
      keyCounts[key] = totalCount + 1;

        return {
          connection: conn,
          fromPt,
          toPt,
          fromTerminalPt,
          toTerminalPt,
          fromWireCount: fromCount,
          toWireCount: toCount,
          fromHS,
          toHS,
          fromDeviceKind: fromSymbol.deviceKind,
          fromModuleRef: fromSymbol.moduleRef,
          toDeviceKind: toSymbol.deviceKind,
          toModuleRef: toSymbol.moduleRef,
          key,
        };
      })
      .filter(Boolean)
      .map((d) => {
        if (!d) return null;
        const index = keyIndices[d.key] || 0;
        keyIndices[d.key] = index + 1;

        const hasFerrule = d.connection.ferruleColor && d.connection.ferruleColor !== "none";
        const customRadius = d.connection.customRadius ?? 52;
        
        const fromFerruleLen = getFerruleLength(d.fromDeviceKind, d.fromModuleRef);
        const toFerruleLen = getFerruleLength(d.toDeviceKind, d.toModuleRef);

        const fromExitOffsetVal = hasFerrule ? Math.max(d.fromHS.exitOffset ?? 40, fromFerruleLen) + customRadius : (d.fromHS.exitOffset ?? 40) + customRadius;
        const toExitOffsetVal = hasFerrule ? Math.max(d.toHS.exitOffset ?? 40, toFerruleLen) + customRadius : (d.toHS.exitOffset ?? 40) + customRadius;

        const routingOpts = {
          isFromTop: d.connection.isFromTop ?? d.fromHS.isTop,
          isToTop: d.connection.isToTop ?? d.toHS.isTop,
          points: d.connection.points,
          customOffset: d.connection.customOffset,
          customOffsetX: d.connection.customOffsetX,
          customOffsetY1: d.connection.customOffsetY1,
          customOffsetY2: d.connection.customOffsetY2,
          customRadius,
          fromDirection: d.fromHS.direction,
          toDirection: d.toHS.direction,
          fromExitOffset: fromExitOffsetVal,
          toExitOffset: toExitOffsetVal,
        };

        const pointsArr = calculateWirePoints(d.fromPt, d.toPt, routingOpts);
        const path = calculateWirePath(d.fromPt, d.toPt, routingOpts);

        let actualFromDir = d.connection.fromDirection || d.fromHS.direction || (d.fromHS.isTop ? "top" : "bottom");
        if (pointsArr && pointsArr.length >= 2) {
          let p1 = pointsArr[1];
          for (let i = 1; i < pointsArr.length; i++) {
            if (Math.abs(pointsArr[i].x - pointsArr[0].x) > 1 || Math.abs(pointsArr[i].y - pointsArr[0].y) > 1) {
              p1 = pointsArr[i];
              break;
            }
          }
          const dx = p1.x - pointsArr[0].x;
          const dy = p1.y - pointsArr[0].y;
          if (Math.abs(dx) > Math.abs(dy)) {
            actualFromDir = dx > 0 ? "right" : "left";
          } else if (Math.abs(dy) > 0) {
            actualFromDir = dy > 0 ? "bottom" : "top";
          }
        }

        let actualToDir = d.connection.toDirection || d.toHS.direction || (d.toHS.isTop ? "top" : "bottom");
        if (pointsArr && pointsArr.length >= 2) {
          let p1 = pointsArr[pointsArr.length - 2];
          const pEnd = pointsArr[pointsArr.length - 1];
          for (let i = pointsArr.length - 2; i >= 0; i--) {
            if (Math.abs(pointsArr[i].x - pEnd.x) > 1 || Math.abs(pointsArr[i].y - pEnd.y) > 1) {
              p1 = pointsArr[i];
              break;
            }
          }
          const vX = p1.x - pEnd.x;
          const vY = p1.y - pEnd.y;
          if (Math.abs(vX) > Math.abs(vY)) {
            actualToDir = vX > 0 ? "right" : "left";
          } else if (Math.abs(vY) > 0) {
            actualToDir = vY > 0 ? "bottom" : "top";
          }
        }

        return {
          ...d,
          pointsArr,
          pathData: path,
          actualFromDir,
          actualToDir,
          parallelIndex: index,
          parallelCount: keyCounts[d.key],
          fromExitOffset: fromExitOffsetVal,
          toExitOffset: toExitOffsetVal,
        };
      });
  }, [connections, symbols]);
}
