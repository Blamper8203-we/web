import type { SymbolItem } from "../../../types/symbolItem";
import type { TerminalHotspot } from "./terminalTypes";
import { normalizePathText } from "./terminalHelpers";

export function getTerminalBlockFallbackTerminals(
  symbol: SymbolItem,
  poles: number,
  width: number,
  height: number,
  getXForIndex: (index: number, count: number) => number
): TerminalHotspot[] {
  const hotspots: TerminalHotspot[] = [];

  const label = (symbol.label || "").toUpperCase();
  const type = label.includes("PE") ? "pe" : label.includes("N") ? "neutral" : "phase";

  const pinMatch = label.match(/(\d+)\s*PIN/i) || (symbol.moduleRef || "").toUpperCase().match(/(\d+)\s*PIN/i);
  const zaciskMatch = label.match(/(\d+)-ZACISKOW/i) || (symbol.moduleRef || "").match(/(\d+)-ZACISKOW/i);
  const torMatch = label.match(/(\d+)-TOROW/i) || (symbol.moduleRef || "").match(/(\d+)-TOROW/i);

  let pins = pinMatch
    ? parseInt(pinMatch[1], 10)
    : zaciskMatch
      ? parseInt(zaciskMatch[1], 10)
      : torMatch
        ? parseInt(torMatch[1], 10)
        : poles;

  if (pins > 2 && height > width * 1.5) {
    // Pionowa listwa zbiorcza (np. Listwa 12 PIN, 7 PIN, 15 PIN)
    let explicitPercentages: number[] | null = null;
    const ref = (symbol.moduleRef || "").toUpperCase();
    const labelUpper = label.toUpperCase();
    const refUpper = ref.toUpperCase();
    if (labelUpper.includes("12 PIN") || labelUpper.includes("12PIN") || refUpper.includes("12PIN")) {
      explicitPercentages = [0.046, 0.119, 0.245, 0.319, 0.392, 0.465, 0.538, 0.611, 0.684, 0.807, 0.880, 0.953];
      pins = 12;
    } else if (labelUpper.includes("15 PIN") || labelUpper.includes("15PIN") || refUpper.includes("15PIN")) {
      explicitPercentages = [0.0386, 0.0982, 0.1581, 0.2179, 0.3210, 0.3812, 0.4409, 0.5007, 0.5607, 0.6204, 0.6805, 0.7815, 0.8412, 0.9010, 0.9607];
      pins = 15;
    } else if (labelUpper.includes("7 PIN") || labelUpper.includes("7PIN") || refUpper.includes("7PIN")) {
      explicitPercentages = [0.1392, 0.2606, 0.3809, 0.5015, 0.6222, 0.7425, 0.8636];
      pins = 7;
    }

    const padding = 0.08;
    for (let i = 0; i < pins; i++) {
      let yPos = height * (padding + (1 - 2 * padding) * (i / Math.max(1, pins - 1)));
      if (explicitPercentages && i < explicitPercentages.length) {
        yPos = height * explicitPercentages[i];
      }
      hotspots.push({ name: `${i + 1}`, x: width / 2, y: yPos, type, isTop: i < pins / 2, direction: "auto-horizontal", exitOffset: width / 2 + 20, visualInset: 0 });
    }
  } else if (normalizePathText(symbol.moduleRef || "").includes("gsu/gsu.svg")) {
    // Szyna wyrównawcza GSU (8 zacisków: 1 hex + 7 krzyżakowych, na środku szyny)
    const explicitPercentages = [0.804, 0.709, 0.654, 0.599, 0.545, 0.490, 0.436, 0.381];
    const names = ["Terminal 1", "1", "2", "3", "4", "5", "6", "7"];
    for (let i = 0; i < 8; i++) {
      hotspots.push({ name: names[i], x: width * explicitPercentages[i], y: height * 0.5, type: "pe", isTop: true, direction: "auto-vertical", visualInset: 0, radius: width * (31.3 / 1361) });
    }
  } else if (symbol.type === "Blok rozdzielczy" || normalizePathText(symbol.moduleRef || "").includes("blok rozdzielczy")) {
    // Blok rozdzielczy (np. 4x7 pin, 4x15 pin)
    const labelLower = (symbol.label || "").toLowerCase();
    const pathLower = normalizePathText(symbol.moduleRef || symbol.visualPath || "");
    
    let cols = 7; // Domyślnie 7 pinów
    if (labelLower.includes("15")) cols = 15;
    else if (labelLower.includes("12")) cols = 12;
    else if (labelLower.includes("7")) cols = 7;
    else if (poles > 0) cols = poles; // Fallback to poles if no number in label

    const is4_7 = pathLower.includes("4-7") || pathLower.includes("4_7") || pathLower.includes("4x7") || labelLower.includes("4-7") || labelLower.includes("4x7");

    const yRatios = [0.38, 0.56, 0.73, 0.91]; // Domyślne dla innych bloków 4x
    const paddingX = 0.08;
    
    const is7Pin = cols === 7 && (pathLower.includes("7 pin") || pathLower.includes("7pin"));

    const types: ("phase" | "neutral")[] = ["phase", "phase", "phase", "neutral"];
    const prefixes = ["L1", "L2", "L3", "N"];
    
    const exactYCoords = [420, 615, 810, 1005];
    const exactXCoords = [180, 280, 380, 480, 580, 680, 780];

    const yRatios4_7 = [58.280 / 276, 106.079 / 276, 160.320 / 276, 208.599 / 276];
    const xRatios4_7 = [
      41.283 / 202,
      61.150 / 202,
      81.007 / 202,
      100.866 / 202,
      120.733 / 202,
      140.590 / 202,
      160.557 / 202,
    ];
    const rRatio4_7 = 5.669 / 202;

    const vbWidth = 202;
    const vbHeight = 276;

    const scaleX = width / vbWidth;
    const scaleY = height / vbHeight;
    const dx = 0;
    const dy = 0;

    const BASE_MARGIN = 40;   
    const ROW_STAGGER = 35;   

    for (let r = 0; r < 4; r++) {
      const type = types[r];
      const prefix = prefixes[r];
      
      for (let c = 0; c < cols; c++) {
        let xPos, yPos, radius;
        if (is4_7) {
          xPos = dx + vbWidth * xRatios4_7[c] * scaleX;
          yPos = dy + vbHeight * yRatios4_7[r] * scaleY;
          radius = vbWidth * rRatio4_7 * Math.min(scaleX, scaleY);
        } else {
          yPos = is7Pin ? exactYCoords[r] : height * yRatios[r];
          xPos = is7Pin ? exactXCoords[c] : width * (paddingX + (1 - 2 * paddingX) * (c / Math.max(1, cols - 1)));
          radius = undefined;
        }
        
        const rowExitOffset = (height - yPos) + BASE_MARGIN + (3 - r) * ROW_STAGGER;

        hotspots.push({
          name: `${prefix}-${c + 1}`,
          x: xPos,
          y: yPos,
          type: type,
          isTop: false,
          direction: "bottom",
          visualInset: height - yPos,
          radius: radius,
          exitOffset: rowExitOffset
        });
      }
    }
  } else if ((normalizePathText(symbol.moduleRef || "").includes("listwy do rozdzielnicy") || normalizePathText(symbol.visualPath || "").includes("listwy do rozdzielnicy")) && pins > 2) {
    let explicitPercentages: number[] | null = null;
    if (pins === 15) {
      explicitPercentages = [0.0386, 0.0982, 0.1581, 0.2179, 0.3210, 0.3812, 0.4409, 0.5007, 0.5607, 0.6204, 0.6805, 0.7815, 0.8412, 0.9010, 0.9607];
    } else if (pins === 12) {
      explicitPercentages = [0.046, 0.119, 0.245, 0.319, 0.392, 0.465, 0.538, 0.611, 0.684, 0.807, 0.880, 0.953];
    } else if (pins === 7) {
      explicitPercentages = [0.1392, 0.2606, 0.3809, 0.5015, 0.6222, 0.7425, 0.8636];
    }

    const padding = 0.08;
    for (let i = 0; i < pins; i++) {
      let xPos = width * (padding + (1 - 2 * padding) * (i / Math.max(1, pins - 1)));
      if (explicitPercentages && i < explicitPercentages.length) {
        xPos = width * explicitPercentages[i];
      }
      hotspots.push({ name: `${i + 1}`, x: xPos, y: height / 2, type, isTop: false, direction: "bottom", visualInset: height / 2 });
    }
  } else if (pins > 1 && width >= height * 0.5) {
    let zlTopY = height * 0.301;
    let zlBotY = height * 0.699;
    let zlXRatios: number[] | null = null;
    
    const pathLower = normalizePathText(symbol.moduleRef || symbol.visualPath || "");
    
    if (pathLower.includes("pe 3-zaciskowa")) { zlTopY = height * 0.329; zlBotY = height * 0.717; zlXRatios = [0.178, 0.500, 0.823]; }
    else if (pathLower.includes("pe 2-zaciskowa")) { zlTopY = height * 0.328; zlBotY = height * 0.717; zlXRatios = [0.262, 0.738]; }
    else if (pathLower.includes("pe 1-zaciskowa")) { zlTopY = height * 0.328; zlBotY = height * 0.717; zlXRatios = [0.504]; }
    else if (pathLower.includes("n 3-zaciskowa") || pathLower.includes("rozdzielcza 1p, 3-zaciskowa")) { zlXRatios = [0.170, 0.500, 0.829]; }
    else if (pathLower.includes("n 2-zaciskowa") || pathLower.includes("rozdzielcza 1p, 2-zaciskowa")) { zlXRatios = [0.257, 0.743]; }
    else if (pathLower.includes("n 1-zaciskowa")) { zlXRatios = [0.498]; }
    else if (pathLower.includes("5-torowa")) { zlXRatios = [0.102, 0.301, 0.501, 0.700, 0.899]; }

    for (let i = 0; i < pins; i++) {
      const xPos = zlXRatios && i < zlXRatios.length ? width * zlXRatios[i] : getXForIndex(i, pins);
      
      let terminalType: "phase" | "neutral" | "pe" = type;
      if (pathLower.includes("5-torowa") && pins === 5) {
        if (i < 3) terminalType = "phase";
        else if (i === 3) terminalType = "neutral";
        else if (i === 4) terminalType = "pe";
      }
      
      hotspots.push({ name: `${i + 1}`, x: xPos, y: zlTopY, type: terminalType, isTop: true, direction: "top", visualInset: zlTopY - height * 0.05 });
      hotspots.push({ name: `${i + 1}'`, x: xPos, y: zlBotY, type: terminalType, isTop: false, direction: "bottom", visualInset: height - zlBotY - height * 0.05 });
    }
  } else if (normalizePathText(symbol.moduleRef || "").includes("zlacze-3xpen")) {
      const tTopY = height * 0.301;
      const tBottomY = height * 0.699;
      hotspots.push({ name: "in1", x: width * 0.25, y: tTopY, type: "pe", isTop: true, direction: "top", visualInset: tTopY - height * 0.05 });
      hotspots.push({ name: "in2", x: width * 0.5, y: tTopY, type: "pe", isTop: true, direction: "top", visualInset: tTopY - height * 0.05 });
      hotspots.push({ name: "in3", x: width * 0.75, y: tTopY, type: "pe", isTop: true, direction: "top", visualInset: tTopY - height * 0.05 });
      hotspots.push({ name: "out1", x: width * 0.25, y: tBottomY, type: "pe", isTop: false, direction: "bottom", visualInset: height - tBottomY - height * 0.05 });
      hotspots.push({ name: "out2", x: width * 0.5, y: tBottomY, type: "pe", isTop: false, direction: "bottom", visualInset: height - tBottomY - height * 0.05 });
      hotspots.push({ name: "out3", x: width * 0.75, y: tBottomY, type: "pe", isTop: false, direction: "bottom", visualInset: height - tBottomY - height * 0.05 });
  } else {
    let zlTopY = height * 0.301;
    let zlBotY = height * 0.699;
    let xPos = width / 2;

    const pathLower = normalizePathText(symbol.moduleRef || symbol.visualPath || "");
    if (pathLower.includes("pe 1-zaciskowa")) { zlTopY = height * 0.328; zlBotY = height * 0.717; xPos = width * 0.504; }
    else if (pathLower.includes("n 1-zaciskowa")) { xPos = width * 0.498; }

    hotspots.push({ name: "in", x: xPos, y: zlTopY, type, isTop: true, direction: "top", visualInset: zlTopY - height * 0.05 });
    hotspots.push({ name: "out", x: xPos, y: zlBotY, type, isTop: false, direction: "bottom", visualInset: height - zlBotY - height * 0.05 });
  }

  return hotspots;
}
