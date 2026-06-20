import type { TerminalHotspot } from "./terminalTypes";

export function getSwitchDisconnectorFallbackTerminals(
  poles: number,
  topY: number,
  bottomY: number,
  getXForIndex: (index: number, count: number) => number
): TerminalHotspot[] {
  const hotspots: TerminalHotspot[] = [];

  if (poles === 1) {
    hotspots.push({ name: "1", x: getXForIndex(0, 1), y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "2", x: getXForIndex(0, 1), y: bottomY, type: "phase", isTop: false });
  } else if (poles === 3) {
    hotspots.push({ name: "1", x: getXForIndex(0, 3), y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "3", x: getXForIndex(1, 3), y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "5", x: getXForIndex(2, 3), y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "2", x: getXForIndex(0, 3), y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "4", x: getXForIndex(1, 3), y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "6", x: getXForIndex(2, 3), y: bottomY, type: "phase", isTop: false });
  } else {
    // 4P FR
    hotspots.push({ name: "1", x: getXForIndex(0, 4), y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "3", x: getXForIndex(1, 4), y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "5", x: getXForIndex(2, 4), y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "N", x: getXForIndex(3, 4), y: topY, type: "neutral", isTop: true });
    hotspots.push({ name: "2", x: getXForIndex(0, 4), y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "4", x: getXForIndex(1, 4), y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "6", x: getXForIndex(2, 4), y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "N", x: getXForIndex(3, 4), y: bottomY, type: "neutral", isTop: false });
  }

  return hotspots;
}
