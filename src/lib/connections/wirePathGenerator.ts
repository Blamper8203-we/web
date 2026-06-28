import type { ConnectionItem } from "../../types/connectionItem";
import { type SymbolItem, isDistributionBlockSymbol } from "../../types/symbolItem";
import { getSymbolTerminals, findTerminalByName, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "../modules/moduleTerminals";
import { calculateWirePath, calculateWirePoints, type Point } from "../routing/wireRoutingEngine";
import { getFerruleLength, WIRE_THICKNESS_MAP, DEFAULT_CUSTOM_RADIUS } from "./connectionsLogic";

export function computeGroupedWiredPaths(
  symbols: SymbolItem[],
  connections: ConnectionItem[]
) {
  const keyCounts: Record<string, number> = {};
  const keyIndices: Record<string, number> = {};

  const resolvedConnections = connections.map((conn) => {
    const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
    const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
    
    if (!fromSymbol || !toSymbol) return null;

    const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal, conn.isFromTop);
    const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);

    if (!fromHS || !toHS) return null;

    return { conn, fromSymbol, toSymbol, fromHS, toHS };
  }).filter(Boolean);

  const terminalWires: Record<string, { connId: string, sortVal: number }[]> = {};

  const getSortWeight = (orderedPts: Point[], terminalX: number, terminalY: number, destX: number, destY: number, dir: string) => {
    let weight: number;
    if (dir === "top" || dir === "bottom") {
      let targetX = destX;
      let targetY = destY;
      const p = orderedPts.find(p => Math.abs(p.x - terminalX) > 1);
      if (p) {
        targetX = p.x;
        targetY = p.y;
      } else if (orderedPts.length > 0) {
        targetX = orderedPts[0].x;
        targetY = orderedPts[0].y;
      }
      const dx = targetX - terminalX;
      const D = Math.abs(targetY - terminalY);
      if (dx < -1) {
        weight = -1000000 + D;
      } else if (dx > 1) {
        weight = 1000000 - D;
      } else {
        weight = D;
      }
    } else {
      let targetX = destX;
      let targetY = destY;
      const p = orderedPts.find(p => Math.abs(p.y - terminalY) > 1);
      if (p) {
        targetX = p.x;
        targetY = p.y;
      } else if (orderedPts.length > 0) {
        targetX = orderedPts[0].x;
        targetY = orderedPts[0].y;
      }
      const dy = targetY - terminalY;
      const D = Math.abs(targetX - terminalX);
      if (dy < -1) {
        weight = -1000000 + D;
      } else if (dy > 1) {
        weight = 1000000 - D;
      } else {
        weight = D;
      }
    }
    return weight;
  };

  resolvedConnections.forEach((res) => {
    if (!res) return;
    const { conn, fromSymbol, toSymbol, fromHS, toHS } = res;
    const fromKey = `${conn.fromSymbolId}:${conn.fromTerminal}:${fromHS.isTop ? 'T' : 'B'}`;
    const toKey = `${conn.toSymbolId}:${conn.toTerminal}:${toHS.isTop ? 'T' : 'B'}`;

    const startDir = conn.fromDirection || (fromHS.isTop ? "top" : "bottom");
    const endDir = conn.toDirection || (toHS.isTop ? "top" : "bottom");

    const fromTerminalX = fromSymbol.x + fromHS.x;
    const fromTerminalY = fromSymbol.y + fromHS.y;
    const fromDestX = toSymbol.x + toHS.x;
    const fromDestY = toSymbol.y + toHS.y;
    const fromSortVal = getSortWeight(conn.points || [], fromTerminalX, fromTerminalY, fromDestX, fromDestY, startDir);

    if (!terminalWires[fromKey]) terminalWires[fromKey] = [];
    terminalWires[fromKey].push({ connId: conn.id, sortVal: fromSortVal });

    const toTerminalX = toSymbol.x + toHS.x;
    const toTerminalY = toSymbol.y + toHS.y;
    const toDestX = fromSymbol.x + fromHS.x;
    const toDestY = fromSymbol.y + fromHS.y;
    const orderedPtsTo = conn.points ? [...conn.points].reverse() : [];
    const toSortVal = getSortWeight(orderedPtsTo, toTerminalX, toTerminalY, toDestX, toDestY, endDir);

    if (!terminalWires[toKey]) terminalWires[toKey] = [];
    terminalWires[toKey].push({ connId: conn.id, sortVal: toSortVal });
  });

  Object.values(terminalWires).forEach(wires => {
    wires.sort((a, b) => a.sortVal - b.sortVal);
  });

  return resolvedConnections.map((res) => {
    if (!res) return null;
    const { conn, fromSymbol, toSymbol, fromHS, toHS } = res;

    const fromTerminalKey = `${conn.fromSymbolId}:${conn.fromTerminal}:${fromHS.isTop ? 'T' : 'B'}`;
    const toTerminalKey = `${conn.toSymbolId}:${conn.toTerminal}:${toHS.isTop ? 'T' : 'B'}`;
    
    const fromCount = terminalWires[fromTerminalKey].length;
    const toCount = terminalWires[toTerminalKey].length;
    
    const fromIndex = terminalWires[fromTerminalKey].findIndex(w => w.connId === conn.id);
    const toIndex = terminalWires[toTerminalKey].findIndex(w => w.connId === conn.id);

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
      fromSymbol,
      toSymbol,
      fromDeviceKind: fromSymbol.deviceKind,
      fromModuleRef: fromSymbol.moduleRef,
      toDeviceKind: toSymbol.deviceKind,
      toModuleRef: toSymbol.moduleRef,
      key,
    };
  }).filter(Boolean).map((d) => {
    if (!d) return null;
    const index = keyIndices[d.key] || 0;
    keyIndices[d.key] = index + 1;

    const hasFerrule = d.connection.ferruleColor && d.connection.ferruleColor !== "none";
    const customRadius = d.connection.customRadius ?? DEFAULT_CUSTOM_RADIUS;
    
    const fromFerruleLen = getFerruleLength(d.fromDeviceKind, d.fromModuleRef);
    const toFerruleLen = getFerruleLength(d.toDeviceKind, d.toModuleRef);

    const fromExitOffsetVal = hasFerrule ? Math.max(d.fromHS.exitOffset ?? 40, fromFerruleLen) : (d.fromHS.exitOffset ?? 40);
    const toExitOffsetVal = hasFerrule ? Math.max(d.toHS.exitOffset ?? 40, toFerruleLen) : (d.toHS.exitOffset ?? 40);

    const routingOpts = {
      isFromTop: resolveConnectionIsFromTop(d.fromSymbol, d.connection.isFromTop, d.fromHS),
      isToTop: resolveConnectionIsToTop(d.toSymbol, d.connection.isToTop, d.toHS),
      points: d.connection.points,
      customOffset: d.connection.customOffset,
      customOffsetX: d.connection.customOffsetX,
      customOffsetY1: d.connection.customOffsetY1,
      customOffsetY2: d.connection.customOffsetY2,
      customRadius,
      fromDirection: d.fromHS.direction,
      toDirection: d.toHS.direction,
      fromVisualInset: isDistributionBlockSymbol(d.fromSymbol) ? 0 : d.fromHS.visualInset,
      toVisualInset: isDistributionBlockSymbol(d.toSymbol) ? 0 : d.toHS.visualInset,
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
  }).filter(Boolean);
}
