import type { TerminalHotspot } from "./terminalTypes";

export function getSurgeProtectorFallbackTerminals(
  poles: number,
  width: number,
  height: number,
  topY: number,
  bottomY: number,
  getXForIndex: (index: number, count: number) => number
): TerminalHotspot[] {
  const hotspots: TerminalHotspot[] = [];

  if (poles <= 2) {
    hotspots.push({ name: "L/N", x: getXForIndex(0, 1), y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "PE", x: getXForIndex(0, 1), y: bottomY, type: "pe", isTop: false });
  } else {
    // 4P SPD
    const spdTopY = height * (103.8 / 1065);
    const spdBottomY = height * (961.2 / 1065);
    const x1 = width * (105.3 / 829);
    const x2 = width * (313.7 / 829);
    const x3 = width * (522.2 / 829);
    const x4 = width * (730.6 / 829);
    hotspots.push({ name: "L1", x: x1, y: spdTopY, type: "phase", isTop: true });
    hotspots.push({ name: "L2", x: x2, y: spdTopY, type: "phase", isTop: true });
    hotspots.push({ name: "L3", x: x3, y: spdTopY, type: "phase", isTop: true });
    hotspots.push({ name: "N", x: x4, y: spdTopY, type: "neutral", isTop: true });
    hotspots.push({ name: "PE", x: x3, y: spdBottomY, type: "pe", isTop: false });
  }

  return hotspots;
}
