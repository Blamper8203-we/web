import type { TerminalHotspot } from "./terminalTypes";

export function getRcdFallbackTerminals(
  poles: number,
  width: number,
  topY: number,
  bottomY: number
): TerminalHotspot[] {
  const hotspots: TerminalHotspot[] = [];

  if (poles <= 2) {
    const x1 = width * (85.82 / 416);
    const x2 = width * (330.31 / 416);
    hotspots.push({ name: "1", x: x1, y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "N", x: x2, y: topY, type: "neutral", isTop: true });
    hotspots.push({ name: "2", x: x1, y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "N", x: x2, y: bottomY, type: "neutral", isTop: false });
  } else {
    // 4P RCD
    const x1 = width * (85.69 / 853);
    const x2 = width * (313.18 / 853);
    const x3 = width * (540.27 / 853);
    const x4 = width * (768.00 / 853);
    hotspots.push({ name: "1", x: x1, y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "3", x: x2, y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "5", x: x3, y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "N", x: x4, y: topY, type: "neutral", isTop: true });
    hotspots.push({ name: "2", x: x1, y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "4", x: x2, y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "6", x: x3, y: bottomY, type: "phase", isTop: false });
    hotspots.push({ name: "N", x: x4, y: bottomY, type: "neutral", isTop: false });
  }

  return hotspots;
}
