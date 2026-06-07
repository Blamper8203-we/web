import type { SymbolItem } from "../../types/symbolItem";

export interface TerminalHotspot {
  name: string; // np. "1", "2", "3", "N", "PE"
  x: number;    // Relatywne X w pikselach
  y: number;    // Relatywne Y w pikselach
  type: "phase" | "neutral" | "pe";
  isTop: boolean;
}

function normalizePathText(text: string): string {
  try {
    text = decodeURIComponent(text);
  } catch {
    // Ignore decoding errors
  }
  return text
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getSymbolPoles(symbol: SymbolItem): number {
  const value = `${normalizePathText(symbol.moduleRef || symbol.visualPath || "")} ${symbol.type} ${symbol.label}`.toLowerCase();
  
  // Check for explicit poles in path or type (e.g. "3P", "4P", "1P")
  const poleMatch = value.match(/(\d)\s*-?\s*p/);
  if (poleMatch) {
    const poles = parseInt(poleMatch[1], 10);
    if (poles >= 1 && poles <= 4) return poles;
  }

  // Fallbacks based on device category
  if (symbol.deviceKind === "rcd") {
    return symbol.phase.includes("L1+L2+L3") || symbol.phase.includes("3F") ? 4 : 2;
  }
  
  if (symbol.deviceKind === "spd") {
    return symbol.phase.includes("L1+L2+L3") || symbol.phase.includes("3F") ? 4 : 2;
  }
  
  if (symbol.deviceKind === "fr") {
    return symbol.phase.includes("L1+L2+L3") || symbol.phase.includes("3F") ? 4 : 3;
  }

  // Fallback based on width-to-height ratio (assuming standard height around 1100)
  if (symbol.height > 0) {
    const ratio = symbol.width / symbol.height;
    if (ratio < 0.15) return 1; // Bardzo wąski (np. terminal block 0.5 modułu)
    if (ratio < 0.3) return 1;  // 1 moduł
    if (ratio < 0.55) return 2; // 2 moduły
    if (ratio < 0.75) return 3; // 3 moduły
    return 4;                   // 4 moduły
  }
  return 1;
}

export function getSymbolTerminals(symbol: SymbolItem): TerminalHotspot[] {
  const poles = getSymbolPoles(symbol);
  const width = symbol.width;
  const height = symbol.height || 1103;

  // Proporcje oparte o dokładne pomiary z wbudowanych plików SVG
  const topY = height * 0.102;
  const bottomY = height * 0.898;

  const hotspots: TerminalHotspot[] = [];

  // Helper do równomiernego rozmieszczania zacisków
  const getXForIndex = (index: number, count: number): number => {
    const sectionWidth = width / count;
    return sectionWidth * (index + 0.5);
  };

  const kind = symbol.deviceKind;

  if (kind === "mcb" || kind === "rcbo") {
    if (poles === 1) {
      hotspots.push({ name: "1", x: getXForIndex(0, 1), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "2", x: getXForIndex(0, 1), y: bottomY, type: "phase", isTop: false });
    } else if (poles === 2) {
      hotspots.push({ name: "1", x: getXForIndex(0, 2), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "N", x: getXForIndex(1, 2), y: topY, type: "neutral", isTop: true });
      hotspots.push({ name: "2", x: getXForIndex(0, 2), y: bottomY, type: "phase", isTop: false });
      hotspots.push({ name: "N", x: getXForIndex(1, 2), y: bottomY, type: "neutral", isTop: false });
    } else if (poles === 3) {
      hotspots.push({ name: "1", x: getXForIndex(0, 3), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "3", x: getXForIndex(1, 3), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "5", x: getXForIndex(2, 3), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "2", x: getXForIndex(0, 3), y: bottomY, type: "phase", isTop: false });
      hotspots.push({ name: "4", x: getXForIndex(1, 3), y: bottomY, type: "phase", isTop: false });
      hotspots.push({ name: "6", x: getXForIndex(2, 3), y: bottomY, type: "phase", isTop: false });
    } else {
      // 4P
      hotspots.push({ name: "1", x: getXForIndex(0, 4), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "3", x: getXForIndex(1, 4), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "5", x: getXForIndex(2, 4), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "N", x: getXForIndex(3, 4), y: topY, type: "neutral", isTop: true });
      hotspots.push({ name: "2", x: getXForIndex(0, 4), y: bottomY, type: "phase", isTop: false });
      hotspots.push({ name: "4", x: getXForIndex(1, 4), y: bottomY, type: "phase", isTop: false });
      hotspots.push({ name: "6", x: getXForIndex(2, 4), y: bottomY, type: "phase", isTop: false });
      hotspots.push({ name: "N", x: getXForIndex(3, 4), y: bottomY, type: "neutral", isTop: false });
    }
  } else if (kind === "rcd") {
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
  } else if (kind === "spd") {
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
  } else if (kind === "fr") {
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
  } else if (kind === "phaseIndicator") {
    const phaseRef = normalizePathText(symbol.moduleRef || symbol.visualPath || "");
    if (phaseRef.includes("lampka kontrolna")) {
      // Lampka Kontrolna 3 Fazowa – 8 śrub zmierzonych z SVG (viewBox 0 0 209 983)
      // Góra rząd 1 (y≈6.5%, śruby 1 i 3): L1 (lewy), L1 (prawy)
      hotspots.push({ name: "L1", x: width * 0.253, y: height * 0.065, type: "phase",   isTop: true });
      hotspots.push({ name: "L1'", x: width * 0.747, y: height * 0.065, type: "phase",   isTop: true });
      // Góra rząd 2 (y≈17.3%, śruby 4 i 6): N (lewy), N (prawy)
      hotspots.push({ name: "N",  x: width * 0.261, y: height * 0.173, type: "neutral", isTop: true });
      hotspots.push({ name: "N'", x: width * 0.755, y: height * 0.173, type: "neutral", isTop: true });
      // Dół rząd 1 (y≈81.4%, śruby 7 i 9): L3 (lewy), L3 (prawy)
      hotspots.push({ name: "L3", x: width * 0.253, y: height * 0.814, type: "phase",   isTop: false });
      hotspots.push({ name: "L3'", x: width * 0.747, y: height * 0.814, type: "phase",   isTop: false });
      // Dół rząd 2 (y≈93.2%, śruby 10 i 12): L2 (lewy), L2 (prawy)
      hotspots.push({ name: "L2", x: width * 0.252, y: height * 0.932, type: "phase",   isTop: false });
      hotspots.push({ name: "L2'", x: width * 0.745, y: height * 0.932, type: "phase",   isTop: false });
    } else {
      // Stare "Kontrolki faz.svg" – 4 terminale (oryginalne współrzędne)
      hotspots.push({ name: "L1", x: width * 0.7726, y: height * 0.0517, type: "phase",   isTop: true });
      hotspots.push({ name: "N",  x: width * 0.5171, y: height * 0.1630, type: "neutral", isTop: true });
      hotspots.push({ name: "L2", x: width * 0.4955, y: height * 0.8359, type: "phase",   isTop: false });
      hotspots.push({ name: "L3", x: width * 0.7727, y: height * 0.9524, type: "phase",   isTop: false });
    }
  } else if (kind === "terminalBlock") {
    // Listwa zaciskowa: zwykle jeden zacisk na górze, jeden na dole
    const label = (symbol.label || "").toUpperCase();
    const type = label.includes("PE") ? "pe" : label.includes("N") ? "neutral" : "phase";

    let pins = 1;
    const pinMatch = label.match(/(\d+)\s*PIN/) || (symbol.moduleRef || "").toUpperCase().match(/(\d+)\s*PIN/);
    const zaciskMatch = label.match(/(\d+)-ZACISKOW/i) || (symbol.moduleRef || "").match(/(\d+)-ZACISKOW/i);
    const torMatch = label.match(/(\d+)-TOROW/i) || (symbol.moduleRef || "").match(/(\d+)-TOROW/i);
    
    if (pinMatch) {
      pins = parseInt(pinMatch[1], 10);
    } else if (zaciskMatch) {
      pins = parseInt(zaciskMatch[1], 10);
    } else if (torMatch) {
      pins = parseInt(torMatch[1], 10);
    } else {
      pins = poles; 
    }

    if (pins > 2 && height > width * 1.5) {
      // Pionowa listwa zbiorcza (np. Listwa 12 PIN, 7 PIN, 15 PIN)
      let explicitPercentages: number[] | null = null;
      const ref = (symbol.moduleRef || "").toUpperCase();
      if (label.includes("12 PIN") || label.includes("12PIN") || ref.includes("12PIN")) {
        explicitPercentages = [0.046, 0.119, 0.245, 0.319, 0.392, 0.465, 0.538, 0.611, 0.684, 0.807, 0.880, 0.953];
        pins = 12;
      } else if (label.includes("15 PIN") || label.includes("15PIN") || ref.includes("15PIN")) {
        explicitPercentages = [0.0386, 0.0982, 0.1581, 0.2179, 0.3210, 0.3812, 0.4409, 0.5007, 0.5607, 0.6204, 0.6805, 0.7815, 0.8412, 0.9010, 0.9607];
        pins = 15;
      } else if (label.includes("7 PIN") || label.includes("7PIN") || ref.includes("7PIN")) {
        explicitPercentages = [0.1392, 0.2606, 0.3809, 0.5015, 0.6222, 0.7425, 0.8636];
        pins = 7;
      }

      const padding = 0.08;
      for (let i = 0; i < pins; i++) {
        let yPos = height * (padding + (1 - 2 * padding) * (i / Math.max(1, pins - 1)));
        if (explicitPercentages && i < explicitPercentages.length) {
          yPos = height * explicitPercentages[i];
        }
        hotspots.push({ name: `${i + 1}`, x: width / 2, y: yPos, type, isTop: i < pins / 2 });
      }
    } else if (normalizePathText(symbol.moduleRef || "").includes("gsu/gsu.svg")) {
      // Szyna wyrównawcza GSU (6 zacisków)
      const explicitPercentages = [58/600, 155/600, 251/600, 348/600, 445/600, 542/600];
      for (let i = 0; i < 6; i++) {
        hotspots.push({ name: `${i + 1}`, x: width * explicitPercentages[i], y: height / 2, type: "pe", isTop: false });
      }
    } else if ((normalizePathText(symbol.moduleRef || "").includes("listwy do rozdzielnicy") || normalizePathText(symbol.visualPath || "").includes("listwy do rozdzielnicy")) && pins > 2) {
      // Nowe poziome listwy do rozdzielnicy (np. 15 pin)
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
        // Wszystkie terminale dajemy na środku wysokości
        hotspots.push({ name: `${i + 1}`, x: xPos, y: height / 2, type, isTop: i < pins / 2 });
      }
    } else if (pins > 1 && width >= height * 0.5) {
      // Pozioma listwa (np. Listwa zaciskowa 5pin 3P+N+PE)
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
        hotspots.push({ name: `${i + 1}`, x: xPos, y: zlTopY, type, isTop: true });
        hotspots.push({ name: `${i + 1}'`, x: xPos, y: zlBotY, type, isTop: false });
      }
    } else if (normalizePathText(symbol.moduleRef || "").includes("zlacze-3xpen")) {
        // Specjalny przypadek dla Złącze 3xPEN
        const tTopY = height * 0.301;
        const tBottomY = height * 0.699;
        hotspots.push({ name: "in1", x: width * 0.25, y: tTopY, type: "pe", isTop: true });
        hotspots.push({ name: "in2", x: width * 0.5, y: tTopY, type: "pe", isTop: true });
        hotspots.push({ name: "in3", x: width * 0.75, y: tTopY, type: "pe", isTop: true });
        hotspots.push({ name: "out1", x: width * 0.25, y: tBottomY, type: "pe", isTop: false });
        hotspots.push({ name: "out2", x: width * 0.5, y: tBottomY, type: "pe", isTop: false });
        hotspots.push({ name: "out3", x: width * 0.75, y: tBottomY, type: "pe", isTop: false });
    } else {
      // Domyślna 1-torowa listwa (np. 1-zaciskowa)
      let zlTopY = height * 0.301;
      let zlBotY = height * 0.699;
      let xPos = width / 2;

      const pathLower = normalizePathText(symbol.moduleRef || symbol.visualPath || "");
      if (pathLower.includes("pe 1-zaciskowa")) { zlTopY = height * 0.328; zlBotY = height * 0.717; xPos = width * 0.504; }
      else if (pathLower.includes("n 1-zaciskowa")) { xPos = width * 0.498; }

      hotspots.push({ name: "in", x: xPos, y: zlTopY, type, isTop: true });
      hotspots.push({ name: "out", x: xPos, y: zlBotY, type, isTop: false });
    }
  } else if (normalizePathText(symbol.moduleRef || "").includes("zabezpieczajacy") || normalizePathText(symbol.moduleRef || "").includes("zabezpieczenia")) {
    // Moduł zabezpieczający 3P – 6 śrub zmierzonych z SVG (viewBox 0 0 209 983)
    // Góra (y≈6.5%, śruby 1 i 3): L1 (lewy), L1 (prawy)
    hotspots.push({ name: "L1", x: width * 0.253, y: height * 0.065, type: "phase", isTop: true });
    hotspots.push({ name: "L1'", x: width * 0.747, y: height * 0.065, type: "phase", isTop: true });
    // Dół rząd 1 (y≈81.4%, śruby 7 i 9): L3 (lewy), L3 (prawy)
    hotspots.push({ name: "L3",  x: width * 0.253, y: height * 0.814, type: "phase", isTop: false });
    hotspots.push({ name: "L3'", x: width * 0.747, y: height * 0.814, type: "phase", isTop: false });
    // Dół rząd 2 (y≈93.2%, śruby 10 i 12): L2 (lewy), L2 (prawy)
    hotspots.push({ name: "L2",  x: width * 0.252, y: height * 0.932, type: "phase", isTop: false });
    hotspots.push({ name: "L2'", x: width * 0.745, y: height * 0.932, type: "phase", isTop: false });
  } else if (symbol.type.toLowerCase().includes("blok") || normalizePathText(symbol.moduleRef || "").includes("7pin") || normalizePathText(symbol.moduleRef || "").includes("7 pin")) {
    const pathLower = normalizePathText(symbol.moduleRef || symbol.visualPath || "");
    if (pathLower.includes("7 pin") || pathLower.includes("7pin")) {
      const yCoords = [420, 615, 810, 1005];
      const xCoords = [180, 280, 380, 480, 580, 680, 780];
      
      // Row 1: L1
      for (let i = 0; i < 7; i++) {
        hotspots.push({ name: `L1-${i+1}`, x: xCoords[i], y: yCoords[0], type: "phase", isTop: true });
      }
      // Row 2: L2
      for (let i = 0; i < 7; i++) {
        hotspots.push({ name: `L2-${i+1}`, x: xCoords[i], y: yCoords[1], type: "phase", isTop: true });
      }
      // Row 3: L3
      for (let i = 0; i < 7; i++) {
        hotspots.push({ name: `L3-${i+1}`, x: xCoords[i], y: yCoords[2], type: "phase", isTop: false });
      }
      // Row 4: N
      for (let i = 0; i < 7; i++) {
        hotspots.push({ name: `N-${i+1}`, x: xCoords[i], y: yCoords[3], type: "neutral", isTop: false });
      }
    } else {
      // Bloki rozdzielcze: eksponujemy np. 2 wejścia na górze i 4 wyjścia na dole
      hotspots.push({ name: "L1", x: getXForIndex(0, 2), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "L2", x: getXForIndex(1, 2), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "L3", x: getXForIndex(0, 4), y: bottomY, type: "phase", isTop: false });
      hotspots.push({ name: "N", x: getXForIndex(1, 4), y: bottomY, type: "neutral", isTop: false });
      hotspots.push({ name: "PE", x: getXForIndex(2, 4), y: bottomY, type: "pe", isTop: false });
      hotspots.push({ name: "PE2", x: getXForIndex(3, 4), y: bottomY, type: "pe", isTop: false });
    }
  } else {
    // Domyślny aparat inny (1-biegunowy)
    hotspots.push({ name: "1", x: width / 2, y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "2", x: width / 2, y: bottomY, type: "phase", isTop: false });
  }

  return hotspots;
}
