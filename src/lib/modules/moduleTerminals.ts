import type { SymbolItem } from "../../types/symbolItem";
import { svgTerminalCache } from "./svgTerminalCache";

export interface TerminalHotspot {
  name: string; // np. "1", "2", "3", "N", "PE"
  x: number;    // Relatywne X w pikselach
  y: number;    // Relatywne Y w pikselach
  type: "phase" | "neutral" | "pe";
  isTop: boolean;
  direction?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  radius?: number;
  visualInset?: number;
  exitOffset?: number;
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
  const cachedGroups = svgTerminalCache.get(symbol.moduleRef || symbol.visualPath || "");
  if (cachedGroups && cachedGroups.length > 0) {
    const hotspots: TerminalHotspot[] = [];
    const width = symbol.width;
    const height = symbol.height || 1103;

    // Check if we should use uniform scaling ("meet") or stretching ("none")
    // Listwy and GSU use "none". Everything else (including Blok rozdzielczy) uses "meet"
    const useMeet = !(
      (symbol.moduleRef || "").toLowerCase().includes("listwy do rozdzielnicy") ||
      (symbol.moduleRef || "").toLowerCase().includes("gsu")
    );

    let vbWidth = 0;
    let vbHeight = 0;
    for (const group of cachedGroups) {
      if (group.viewBoxWidth && group.viewBoxHeight) {
        vbWidth = group.viewBoxWidth;
        vbHeight = group.viewBoxHeight;
        break;
      }
    }

    let scale = 1;
    let dx = 0;
    let dy = 0;
    if (useMeet && vbWidth > 0 && vbHeight > 0) {
      scale = Math.min(width / vbWidth, height / vbHeight);
      dx = (width - vbWidth * scale) / 2;
      dy = (height - vbHeight * scale) / 2;
    }

    for (const group of cachedGroups) {
      const type = group.prefix === "PE" ? "pe" : group.prefix === "N" ? "neutral" : "phase";
      
      for (const t of group.terminals) {
        let xPos, yPos, radius;
        if (useMeet && vbWidth > 0 && vbHeight > 0) {
          // Uniform scaling calculation (xMidYMid meet)
          const cx = t.xRatio * vbWidth;
          const cy = t.yRatio * vbHeight;
          xPos = dx + cx * scale;
          yPos = dy + cy * scale;
          // Radius is proportional to uniform scale
          radius = t.rRatio ? (t.rRatio * vbWidth) * scale : undefined;
        } else {
          // Stretched ("none") calculation
          xPos = width * t.xRatio;
          yPos = height * t.yRatio;
          radius = t.rRatio ? width * t.rRatio : undefined;
        }

        const isTop = t.yRatio < 0.5;
        hotspots.push({
          name: t.name,
          x: xPos,
          y: yPos,
          type: type,
          isTop: isTop,
          direction: isTop ? "top" : "bottom",
          visualInset: isTop ? yPos : height - yPos,
          radius: radius
        });
      }
    }
    return hotspots;
  }

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
      // Lampka Kontrolna 3 Fazowa – 8 śrub (lewa i prawa kolumna)
      // Zaciski są umieszczone dokładnie na śrubach (y), a `visualInset` odpowiada
      // odległości w pikselach od śruby do krawędzi bloku plastiku.
      // Kierunki wyjścia przewodów: góra → "top", dół → "bottom"
      
      // Góra rząd 1 – śruby cy=64.041 (rel_y=0.0651), krawędź SVG=0.000
      // visualInset = 0.0651*h → przewód wychodzi z samej góry SVG
      hotspots.push({ name: "1",   x: width * 0.2528, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
      hotspots.push({ name: "3",   x: width * 0.7474, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
      hotspots.push({ name: "L1",  x: width * 0.2528, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
      hotspots.push({ name: "L1'", x: width * 0.7474, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });

      // Góra rząd 2 – śruby cy=170.363 (rel_y=0.1733), krawędź górna plastiku=0.1120
      // visualInset = (0.1733-0.1120)*h = 0.0613*h
      hotspots.push({ name: "4",   x: width * 0.2606, y: height * 0.1733, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0613 });
      hotspots.push({ name: "6",   x: width * 0.7394, y: height * 0.1733, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0613 });
      hotspots.push({ name: "N",   x: width * 0.2606, y: height * 0.1733, type: "neutral", isTop: true,  direction: "top",    visualInset: height * 0.0613 });
      hotspots.push({ name: "N'",  x: width * 0.7394, y: height * 0.1733, type: "neutral", isTop: true,  direction: "top",    visualInset: height * 0.0613 });

      // Dół rząd 1 – śruby cy=800.578 (rel_y=0.8144), krawędź dolna plastiku=0.8755
      // visualInset = (0.8755-0.8144)*h = 0.0611*h
      hotspots.push({ name: "7",   x: width * 0.2528, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
      hotspots.push({ name: "9",   x: width * 0.7474, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
      hotspots.push({ name: "L3",  x: width * 0.2528, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
      hotspots.push({ name: "L3'", x: width * 0.7474, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });

      // Dół rząd 2 – zielony blok od rel_y=0.9277, śruby szacunkowo ≈0.9349
      // visualInset = (1.0-0.9277)*h = 0.0723*h
      hotspots.push({ name: "10",  x: width * 0.2528, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
      hotspots.push({ name: "12",  x: width * 0.7474, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
      hotspots.push({ name: "L2",  x: width * 0.2528, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
      hotspots.push({ name: "L2'", x: width * 0.7474, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
    } else {
      // Stare "Kontrolki faz.svg" – 4 terminale (oryginalne współrzędne)
      // visualInset = odległość od śruby do krawędzi plastiku DANEGO PIĘTRA.
      // L1 (top) y = 50.9 -> wyjście na górnej krawędzi (y=0) -> inset = 50.9/983 = 0.0517
      // N (top) y = 160.3 -> wyjście na linii y=102.2 -> inset = (160.3 - 102.2)/983 = 0.0590
      // L2 (bottom) y = 821.7 -> wyjście na linii y=880.2 -> inset = (880.2 - 821.7)/983 = 0.0595
      // L3 (bottom) y = 936.3 -> wyjście na dolnej krawędzi (y=983) -> inset = (983 - 936.3)/983 = 0.0476
      hotspots.push({ name: "L1", x: width * 0.7726, y: height * 0.0517, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0517 });
      hotspots.push({ name: "N",  x: width * 0.5171, y: height * 0.1630, type: "neutral", isTop: true,  direction: "top",    visualInset: height * 0.0590 });
      hotspots.push({ name: "L2", x: width * 0.4955, y: height * 0.8359, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0595 });
      hotspots.push({ name: "L3", x: width * 0.7727, y: height * 0.9524, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0476 });
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
        hotspots.push({ name: `${i + 1}`, x: width / 2, y: yPos, type, isTop: i < pins / 2, direction: "auto-horizontal", exitOffset: 150 });
      }
    } else if (normalizePathText(symbol.moduleRef || "").includes("gsu/gsu.svg")) {
      // Szyna wyrównawcza GSU (6 zacisków)
      const explicitPercentages = [58/600, 155/600, 251/600, 348/600, 445/600, 542/600];
      for (let i = 0; i < 6; i++) {
        hotspots.push({ name: `${i + 1}`, x: width * explicitPercentages[i], y: height / 2, type: "pe", isTop: false });
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

      // Zawsze umieszczamy zaciski w 4 rzędach: L1, L2, L3, N
      // Wszystkie przewody wychodzą od spodu bloku i układają się
      // obok siebie z minimalnym odstępem. Rzędy bliżej góry bloku
      // (L1, L2) mają większy exitOffset, żeby przewody z różnych
      // rzędów nie kolidowały i tworzyły estetyczny pęk pod blokiem.
      let yRatios = [0.38, 0.56, 0.73, 0.91]; // Domyślne dla innych bloków 4x
      let paddingX = 0.08;
      
      const is7Pin = cols === 7 && (pathLower.includes("7 pin") || pathLower.includes("7pin"));

      const types: ("phase" | "neutral")[] = ["phase", "phase", "phase", "neutral"];
      const prefixes = ["L1", "L2", "L3", "N"];
      
      const exactYCoords = [420, 615, 810, 1005];
      const exactXCoords = [180, 280, 380, 480, 580, 680, 780];

      // Ratios for 4-7 custom block
      const yRatios4_7 = [242.834 / 1148, 443.996 / 1148, 668.001 / 1148, 869.163 / 1148];
      const xRatios4_7 = [
        172.025 / 841,
        254.805 / 841,
        337.546 / 841,
        420.287 / 841,
        503.066 / 841,
        585.807 / 841,
        669.001 / 841
      ];
      const rRatio4_7 = 23.622 / 841;

      // We use meet scaling for Blok rozdzielczy even in fallback if it matches 4-7 dimensions
      // standard viewBox width = 841, height = 1148
      const vbWidth = 841;
      const vbHeight = 1148;
      const scale = Math.min(width / vbWidth, height / vbHeight);
      const dx = (width - vbWidth * scale) / 2;
      const dy = (height - vbHeight * scale) / 2;

      // Marginesy dla exitOffset poniżej dolnej krawędzi bloku.
      // exitOffset musi być >= (height - yPos), żeby punkt wyjścia trasy
      // wypadł poniżej dolnej krawędzi bloku. Następnie dodajemy:
      //   BASE_MARGIN – minimalny dystans pod krawędzią
      //   (3 - r) * STAGGER – rozstaggerowanie rzędów (L1 najdalej, N najbliżej)
      const BASE_MARGIN = 40;   // px poniżej dolnej krawędzi bloku
      const ROW_STAGGER = 35;   // px odstępu między rzędami pod blokiem

      for (let r = 0; r < 4; r++) {
        const type = types[r];
        const prefix = prefixes[r];
        
        for (let c = 0; c < cols; c++) {
          let xPos, yPos, radius;
          if (is4_7) {
            // Perfect scale for 4-7
            xPos = dx + xRatios4_7[c] * vbWidth * scale;
            yPos = dy + yRatios4_7[r] * vbHeight * scale;
            radius = rRatio4_7 * vbWidth * scale;
          } else {
            // standard fallback
            yPos = is7Pin ? exactYCoords[r] : height * yRatios[r];
            xPos = is7Pin ? exactXCoords[c] : width * (paddingX + (1 - 2 * paddingX) * (c / Math.max(1, cols - 1)));
            radius = undefined;
          }
          
          // exitOffset = odległość od zacisku do dolnej krawędzi (height - yPos)
          //            + BASE_MARGIN (żeby wyjść poza blok)
          //            + stagger (L1 schodzi najdalej, N najbliżej)
          // Gwarantuje, że punkt wyjścia trasy jest ZAWSZE poniżej bloku.
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
            // Każdy rząd wychodzi na inną głębokość pod blokiem:
            // L1 (r=0) najdalej, N (r=3) najbliżej dolnej krawędzi.
            exitOffset: rowExitOffset
          });
        }
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

export function findTerminalByName(terminals: TerminalHotspot[], terminalName: string, isTop?: boolean): TerminalHotspot | undefined {
  return terminals.find(t => t.name === terminalName && (isTop === undefined || t.isTop === isTop)) || terminals.find(t => t.name === terminalName);
}

