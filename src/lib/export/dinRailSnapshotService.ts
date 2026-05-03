import type { SymbolItem } from "../../types/symbolItem";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import { buildDinRailGroupFrames } from "../dinRailSelection";
import { loadPreparedSvgDataUri } from "../modules/svgAsset";

// Pomocnicza funkcja do ładowania obrazów na podstawie URI
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportDinRailToDataURL(symbols: SymbolItem[], rail: DinRailCanvasRail): Promise<string[]> {
  if (!rail.isVisible || rail.width <= 0 || rail.height <= 0) {
    return [];
  }

  const dataUrls: string[] = [];
  const scale = 2; // Wysoka rozdzielczość na potrzeby eksportu
  const canvas = document.createElement("canvas");
  canvas.width = rail.width * scale;
  canvas.height = rail.height * scale;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return [];
  }

  // Ustawienie tła
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.scale(scale, scale);

  // 1. Rysowanie szyny DIN (tło)
  if (rail.svg) {
    const svgDataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(rail.svg);
    try {
      const railImg = await loadImage(svgDataUri);
      ctx.drawImage(railImg, 0, 0, rail.width, rail.height);
    } catch (err) {
      console.warn("Nie udało się narysować tła szyny DIN:", err);
    }
  }

  // 2. Rysowanie ramek grup
  const snappedSymbols = symbols.filter(s => s.isSnappedToRail);
  const GROUP_FRAME_PADDING = 6;
  const groupFrames = buildDinRailGroupFrames(snappedSymbols, GROUP_FRAME_PADDING);

  for (const group of groupFrames) {
    // Tło ramki (niebieskie półprzezroczyste)
    ctx.fillStyle = "rgba(59, 130, 246, 0.05)";
    ctx.strokeStyle = "rgba(59, 130, 246, 0.53)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(group.x, group.y, group.width, group.height, 4);
    ctx.fill();
    ctx.stroke();

    // Etykieta grupy (odwzorowanie z Pixi)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(group.label, group.x + 4, group.y - 3); // Odsunięcie Y delikatnie skorygowane do góry
  }

  // 3. Rysowanie modułów (SVG)
  const drawPromises = snappedSymbols.map(async (symbol) => {
    if (!symbol.visualPath) return;
    try {
      const dataUri = await loadPreparedSvgDataUri(symbol.visualPath, symbol.parameters);
      const img = await loadImage(dataUri);
      return { img, symbol };
    } catch (err) {
      console.warn(`Nie udało się załadować grafiki dla modułu ${symbol.id}:`, err);
      return null;
    }
  });

  const loadedImages = (await Promise.all(drawPromises)).filter(Boolean) as { img: HTMLImageElement; symbol: SymbolItem }[];

  // Sortujemy po osi Y i X, by zachować odpowiednią kolejność rysowania nakładających się elementów (np. szyny)
  loadedImages.sort((a, b) => {
    if (Math.abs(a.symbol.y - b.symbol.y) > 5) return a.symbol.y - b.symbol.y;
    return a.symbol.x - b.symbol.x;
  });

  for (const { img, symbol } of loadedImages) {
    ctx.drawImage(img, symbol.x, symbol.y, symbol.width, symbol.height);
  }

  // 4. Rysowanie oznaczeń tekstowych
  ctx.fillStyle = "#111827";
  ctx.font = "bold 10px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";

  for (const symbol of snappedSymbols) {
    if (symbol.referenceDesignation) {
      const cx = symbol.x + Math.max(symbol.width, 48) / 2;
      const cy = symbol.y + symbol.height + 12; // Przesunięto nieco niżej niż w PIXI, z uwagi na baseline
      ctx.fillText(symbol.referenceDesignation, cx, cy);
    }
  }

  dataUrls.push(canvas.toDataURL("image/png", 1.0));
  return dataUrls;
}
