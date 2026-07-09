// WHY: Zamiast traktować cały schemat z pliku SVG jako jeden nierozerwalny obraz,
// ładujemy go w tle, przetwarzamy zawartość i rozbijamy na logiczne bloki (części układu).
// Pozwala to użytkownikowi na swobodne przemieszczanie osobnych elementów
// tego samego modułu (np. zasilanie oddzielnie od interfejsów komunikacyjnych).

/** World-grid step (px). Musi matchować SmartHomeCanvas.GRID_STEP. */
const WORLD_GRID_STEP = 20;

/** Padding dodawany do bounding box bloku w source units, żeby SVG nie obcinał krawędzi. */
const RECT_PADDING = 4;

/**
 * Theme color replacements — mapujemy Dark AMPIO na Light CAD.
 * WHY: pliki SVG źródłowe mają ciemną paletę (tło #141414, akcent #22c55e).
 * Canvas ma jasne tło (beżowe), więc zamieniamy kolory na bieżąco.
 */
const THEME_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/#141414/gi, "#e6ddc5"], // tło → beżowe
  [/#22c55e/gi, "#111111"], // obwódki/piny → czarne
  [/#ffffff/gi, "#2067ad"], // tekst główny → niebieski
  [/#fff\b/gi, "#2067ad"],   // tekst główny (krótki hex)
  [/#8b9bb4/gi, "#333333"],  // podtytuły → ciemnoszary
];

export interface CadParsedTerminal {
  id: string;
  /** Pozycja X terminala w world (piksele względem block origin). */
  x: number;
  /** Pozycja Y terminala w world. */
  y: number;
  /** Promień wizualnego pinu w world (z source r × scale). */
  radius: number;
}

export interface CadParsedBlock {
  /** Unikalne ID wewnątrz tego modułu */
  internalId: string;
  /** Sugerowana etykieta (wycięta z pierwszego <text>, np. "-K1:A") */
  label: string;
  /** Pozycja X bloku w world (origin = bounding-box padded top-left) */
  originalX: number;
  /** Pozycja Y bloku w world */
  originalY: number;
  /** Szerokość bloku w world (po paddingu + scale) */
  width: number;
  /** Wysokość bloku w world */
  height: number;
  /** Pełny kod HTML pojedynczego tagu <svg>, gotowy do wstrzyknięcia do Reacta */
  svgContent: string;
  /** Wykryte terminale (na podstawie kółek <circle>) */
  terminals: CadParsedTerminal[];
}

interface MainRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MainRectData {
  rect: Element;
  rectData: MainRect;
}

interface RawTerminal {
  cx: number;
  cy: number;
  r: number;
  /** Czy oś X była rzutowana na krawędź recta (brak world-snap). */
  projectedX: boolean;
  /** Czy oś Y była rzutowana na krawędź recta (brak world-snap). */
  projectedY: boolean;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const CACHE = new Map<string, Promise<CadParsedBlock[]>>();

/**
 * Pobiera i parsuje plik SVG, dzieląc go na bloki z terminalami.
 *
 * @param svgPath - ścieżka do pliku SVG (z #cad-symbol-svg lub bez)
 * @param scale - mnożnik skali (1.25 dla AMPIO MSERV-4S żeby grid 32→40px world)
 * @returns Promise z listą bloków. Cache'owane po (svgPath, scale).
 */
export function fetchAndParseCadSymbol(
  svgPath: string,
  scale: number = 1,
): Promise<CadParsedBlock[]> {
  const cacheKey = `${svgPath}_${scale}`;
  const cached = CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = fetch(svgPath)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${svgPath}: ${res.status}`);
      return res.text();
    })
    .then((text) => parseSvgText(text, scale))
    .catch((err) => {
      // WHY: odrzucamy cache dla failed promise — następna próba może mieć poprawiony plik
      CACHE.delete(cacheKey);
      throw err;
    });

  CACHE.set(cacheKey, promise);
  return promise;
}

/** Parsuje tekst SVG do listy bloków. Wydzielone dla testowalności bez fetch(). */
function parseSvgText(text: string, scale: number): CadParsedBlock[] {
  // Theme replacement (Dark AMPIO → Light CAD)
  let themedText = text;
  for (const [pattern, replacement] of THEME_REPLACEMENTS) {
    themedText = themedText.replace(pattern, replacement);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(themedText, "image/svg+xml");

  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    throw new Error("Błąd parsowania SVG: " + errorNode.textContent);
  }

  const rootSvg = doc.querySelector("svg");
  if (!rootSvg) throw new Error("Brak korzenia <svg> w pliku");

  // Specjalny wrapper naszego formatu: <g id="cad-symbol-svg">
  const cadGroup = doc.querySelector("#cad-symbol-svg") || rootSvg;

  // Zbieramy grupy z pierwszego poziomu pod cadGroup.
  const blockGroups = Array.from(cadGroup.children).filter(
    (child) => child.tagName.toLowerCase() === "g",
  );

  if (blockGroups.length === 0) {
    return [];
  }

  return blockGroups.map((g, index) => parseBlock(g, index, scale));
}

/**
 * Szuka głównego <rect> w grupie (największego po powierzchni).
 * To ciało bloku — wszystkie terminale będą rzutowane na jego krawędzie.
 *
 * Zwraca też referencję do elementu DOM, żeby parseBlock mógł mutate jego x/y.
 */
function findMainRect(group: Element): MainRectData | null {
  let blockRectData: MainRectData | null = null;
  let maxArea = 0;
  group.querySelectorAll("rect").forEach((rectEl) => {
    const x = parseFloat(rectEl.getAttribute("x") || "0");
    const y = parseFloat(rectEl.getAttribute("y") || "0");
    const w = parseFloat(rectEl.getAttribute("width") || "0");
    const h = parseFloat(rectEl.getAttribute("height") || "0");
    const area = w * h;
    if (area > maxArea) {
      maxArea = area;
      blockRectData = { rect: rectEl, rectData: { x, y, w, h } };
    }
  });
  return blockRectData;
}

/** Czy dany element jest żółtym pinem relay (wizualizacja styków, nie terminal)?
 *  WHY: Historia. Najpierw myślano, że żółte circles to wizualizacja styków, ale
 *  w AMPIO MSERV-4S -K1:D żółte koła to PUNKTY STYKÓW RELAY (= realne terminale
 *  wyjściowe, gdzie użytkownik łączy kable do wyjść RL X : C / NO). W 2026-07-09
 *  user potwierdził: żółte circles powinny być hotspotami.
 *
 *  Po audycie: jedyne żółte elements w SVG to wyjścia styków -K1:D (żółte horizontal
 *  linie + żółte circles na końcach). Żaden inny blok ich nie ma. Filtr niepotrzebny.
 */
function isYellowRelayPin(_el: Element): boolean {
  // Disabled: wszystkie żółte circles to terminals.
  return false;
}

/**
 * Rzutuje (cx, cy) na najbliższą krawędź głównego recta.
 * Jeśli punkt jest poza prostokątem na OBU osiach (corner case),
 * wybiera oś bliższą krawędzi (tie → preferuj Y).
 *
 * @returns edgeCx, edgeCy (rzutowane współrzędne) + flagi projection per oś.
 */
function projectToRectEdge(
  cx: number,
  cy: number,
  rect: MainRect,
): { edgeCx: number; edgeCy: number; projectedX: boolean; projectedY: boolean } {
  const rectLeft = rect.x;
  const rectRight = rect.x + rect.w;
  const rectTop = rect.y;
  const rectBottom = rect.y + rect.h;

  const cxOutside = cx < rectLeft || cx > rectRight;
  const cyOutside = cy < rectTop || cy > rectBottom;

  let edgeCx = cx;
  let edgeCy = cy;

  if (cxOutside && cyOutside) {
    const dx = Math.min(Math.abs(cx - rectLeft), Math.abs(cx - rectRight));
    const dy = Math.min(Math.abs(cy - rectTop), Math.abs(cy - rectBottom));
    if (dx < dy) {
      edgeCx = cx < rectLeft ? rectLeft : rectRight;
    } else {
      edgeCy = cy < rectTop ? rectTop : rectBottom;
    }
  } else if (cxOutside) {
    edgeCx = cx < rectLeft ? rectLeft : rectRight;
  } else if (cyOutside) {
    edgeCy = cy < rectTop ? rectTop : rectBottom;
  }

  return {
    edgeCx,
    edgeCy,
    projectedX: edgeCx !== cx,
    projectedY: edgeCy !== cy,
  };
}

/**
 * Oblicza bounding box grupy (rects, images, lines, texts) w source units.
 * Pomija circles (terminale) — ich bounds dojdą po zrzutowaniu na krawędź.
 * Terminale dodawane osobno przez `includeTerminals`, żeby uwzględnić po-rzutową pozycję.
 */
function calculateGroupBounds(
  g: Element,
  includeTerminals: ReadonlyArray<{ x: number; y: number; r: number }>,
): Bounds {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const update = (px: number, py: number): void => {
    if (!isNaN(px)) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
    }
    if (!isNaN(py)) {
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  };

  // WHY: heurystyka — typowy label CAD ma 4–8 znaków × ~7px; bez intrinsic bbox
  // dla text potrzebne przybliżenie żeby nie obciąć etykiety.
  const TEXT_WIDTH_ESTIMATE = 50;
  const TEXT_HEIGHT_ESTIMATE = 10;

  g.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "rect" || tag === "image") {
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const w = parseFloat(el.getAttribute("width") || "0");
      const h = parseFloat(el.getAttribute("height") || "0");
      update(x, y);
      update(x + w, y + h);
    } else if (tag === "line") {
      update(parseFloat(el.getAttribute("x1") || "0"), parseFloat(el.getAttribute("y1") || "0"));
      update(parseFloat(el.getAttribute("x2") || "0"), parseFloat(el.getAttribute("y2") || "0"));
    } else if (tag === "text") {
      const transform = el.getAttribute("transform");
      if (transform && transform.includes("translate(")) {
        const match = transform.match(/translate\(([^, ]+)[, ]+([^)]+)\)/);
        if (match) {
          const tx = parseFloat(match[1]);
          const ty = parseFloat(match[2]);
          update(tx, ty);
          update(tx + TEXT_WIDTH_ESTIMATE, ty + TEXT_HEIGHT_ESTIMATE);
        }
      } else {
        const x = parseFloat(el.getAttribute("x") || "0");
        const y = parseFloat(el.getAttribute("y") || "0");
        update(x, y);
        update(x + TEXT_WIDTH_ESTIMATE, y + TEXT_HEIGHT_ESTIMATE);
      }
    }
  });

  // Dodaj bounds dla terminali (po zrzutowaniu na krawędź)
  for (const t of includeTerminals) {
    update(t.x - t.r, t.y - t.r);
    update(t.x + t.r, t.y + t.r);
  }

  return { minX, minY, maxX, maxY };
}

/** Wyciąga pierwszy tekst z grupy jako sugerowaną etykietę bloku. */
function extractBlockLabel(g: Element, fallback: string): string {
  const firstText = g.querySelector("text");
  if (!firstText) return fallback;
  const text = (firstText.textContent || "").trim();
  return text || fallback;
}

/** Wrapper SVG dla bloku, gotowy do dangerouslySetInnerHTML. */
function buildBlockSvg(
  group: Element,
  scale: number,
  viewBox: { x: number; y: number; w: number; h: number },
): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}" width="100%" height="100%">
      <g transform="scale(${scale})">
        ${group.outerHTML}
      </g>
    </svg>
  `.trim();
}

/**
 * Parsuje pojedynczy blok (top-level <g>) na CadParsedBlock:
 * - wykrywa główny rect (do rzutowania terminali)
 * - oblicza bounding box (z paddingiem)
 * - ekstrahuje terminale (z rzutowaniem na krawędź i snap)
 * - skraca linie łączące (żeby nie było tick-marków)
 */
function parseBlock(g: Element, index: number, scale: number): CadParsedBlock {
  const blockRectData = findMainRect(g);
  const gridPitch = WORLD_GRID_STEP / scale;

  // Refactor: używamy `blockRect` (= MainRect) jako kopii roboczej po mutacji w JS.
  // `blockRectEl` to referencja do DOM elementu (do setAttribute na nim).
  const blockRectEl = blockRectData?.rect ?? null;
  const blockRect: MainRect | null = blockRectData?.rectData ? { ...blockRectData.rectData } : null;

  // ── Krok 1: Snap rect.x/y do source-grid ─────────────────────────────────────
  // WHY: Po mutacji rect.x/y jest na source-grid (= WORLD_GRID_STEP / scale).
  // - Projected terminale (rzutowane na krawędź recta) lądują automatycznie na grid.
  // - Rect edges (rect.x, rect.x+w, rect.y, rect.y+h) też lądują na world 20-grid.
  // - Wszystkie snap operacje w dalszej części kodu (terminal snap, bounds snap)
  //   działają na source-grid → wynik w world jest automatycznie 20-grid.
  // Trade-off: rect przesuwa się o delta. Inne elementy (text labele, linie poza rect)
  //   NIE przesuwają się razem — względny offset rect-vs-text zmienia się o kilka px.
  // Magnitude: typowo 1–10 source px = 1–12 world px (subtelna zmiana wizualna).
  if (blockRect && blockRectEl) {
    const snappedX = Math.round(blockRect.x / gridPitch) * gridPitch;
    const snappedY = Math.round(blockRect.y / gridPitch) * gridPitch;
    if (snappedX !== blockRect.x || snappedY !== blockRect.y) {
      blockRectEl.setAttribute("x", snappedX.toString());
      blockRectEl.setAttribute("y", snappedY.toString());
      blockRect.x = snappedX;
      blockRect.y = snappedY;
    }
  }

  // ── Krok 2: Zbierz WSZYSTKIE circles (recursive) + sparuj ze stub-lines ─────────
  // WHY: Struktura SVG różni się między blokami:
  //   - -K1/A, -K1/B, -K1/C: terminals są bezpośrednio pod blockiem (level 1)
  //   - -K1/D: terminals są w nesting (channel wrapper → terminal subgroup), level 2+
  //   Poprzedni `querySelectorAll(":scope > g")`+`sub.querySelector("circle")` brał
  //   tylko PIERWSZE kółko per channel → -K1/D pokazywał 10/40 terminali.
  // Nowa strategia: recursive scan wszystkich <circle> + per-circle szukamy "stub line"
  // (linia czysto pozioma/pionowa dotykająca oryginalnej pozycji koła). Takie stuby
  // shrinkujemy do 0-length żeby usunąć tick-marki wystające z krawędzi. Linie
  // diagonal (przełączniki relay, rezystory symbol) zostawiamy nietknięte.
  interface PendingTerminal {
    circle: Element;
    cx: number;
    cy: number;
    r: number;
    stubLine: Element | null;
  }
  const pending: PendingTerminal[] = [];
  for (const circle of Array.from(g.querySelectorAll("circle"))) {
    if (isYellowRelayPin(circle)) continue; // disabled — żółte circles to real terminale
    const cx = parseFloat(circle.getAttribute("cx") || "0");
    const cy = parseFloat(circle.getAttribute("cy") || "0");
    const r = parseFloat(circle.getAttribute("r") || "0");

    // Szukaj stub-line w tym samym parent (siblings), pozioma albo pionowa linia,
    // dotykająca kółka na jednym z endpointów.
    let stubLine: Element | null = null;
    const parent = circle.parentElement;
    if (parent) {
      for (const line of Array.from(parent.querySelectorAll(":scope > line"))) {
        const lx1 = parseFloat(line.getAttribute("x1") || "0");
        const ly1 = parseFloat(line.getAttribute("y1") || "0");
        const lx2 = parseFloat(line.getAttribute("x2") || "0");
        const ly2 = parseFloat(line.getAttribute("y2") || "0");

        const touchesAt1 = Math.abs(lx1 - cx) < 0.01 && Math.abs(ly1 - cy) < 0.01;
        const touchesAt2 = Math.abs(lx2 - cx) < 0.01 && Math.abs(ly2 - cy) < 0.01;
        if (!touchesAt1 && !touchesAt2) continue;

        // Stub = purely horizontal OR purely vertical (line prostopadła do krawędzi recta).
        // Linie diagonalne są częścią symboliki (przełącznik relay, rezystor) — zostawiamy.
        const isHorizontal = Math.abs(ly1 - ly2) < 0.01;
        const isVertical = Math.abs(lx1 - lx2) < 0.01;
        if (isHorizontal || isVertical) {
          stubLine = line;
          break;
        }
      }
    }

    pending.push({ circle, cx, cy, r, stubLine });
  }

  // ── Krok 3: Project + snap + mutate ─────────────────────────────────────────
  const rawTerminals: RawTerminal[] = [];
  for (const { circle, cx, cy, r, stubLine } of pending) {
    // Rzutuj na krawędź recta (jeśli jest).
    let edgeCx = cx;
    let edgeCy = cy;
    let projectedX = false;
    let projectedY = false;
    if (blockRect) {
      const proj = projectToRectEdge(cx, cy, blockRect);
      edgeCx = proj.edgeCx;
      edgeCy = proj.edgeCy;
      projectedX = proj.projectedX;
      projectedY = proj.projectedY;
    }

    // Source-snap non-projected. Rect jest na grid (Krok 1) → projected są na grid.
    let snappedCx = Math.round(edgeCx / gridPitch) * gridPitch;
    let snappedCy = Math.round(edgeCy / gridPitch) * gridPitch;
    if (projectedX) snappedCx = edgeCx;
    if (projectedY) snappedCy = edgeCy;

    // Mutuj DOM
    circle.setAttribute("cx", snappedCx.toString());
    circle.setAttribute("cy", snappedCy.toString());

    if (stubLine) {
      // Skróć stub-line do 0-length na pozycji snapped koła (usuwa tick-marks).
      // Inne linie (schematic) zostawiamy nietknięte.
      stubLine.setAttribute("x1", snappedCx.toString());
      stubLine.setAttribute("y1", snappedCy.toString());
      stubLine.setAttribute("x2", snappedCx.toString());
      stubLine.setAttribute("y2", snappedCy.toString());
    }

    rawTerminals.push({ cx: snappedCx, cy: snappedCy, r, projectedX, projectedY });
  }

  // Bounding box (z paddingiem) — terminals już na swoich pozycjach po rzucie
  const bounds = calculateGroupBounds(
    g,
    rawTerminals.map((t) => ({ x: t.cx, y: t.cy, r: t.r })),
  );
  let { minX, minY, maxX, maxY } = bounds;
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    // Bez-elementów fallback: 200×200 w origin (0,0). Lepiej coś niż nic.
    minX = 0;
    minY = 0;
    maxX = 200;
    maxY = 200;
  }
  minX -= RECT_PADDING;
  minY -= RECT_PADDING;
  maxX += RECT_PADDING;
  maxY += RECT_PADDING;

  // WHY: Wyrównaj minX/minY do source-grid (= WORLD_GRID_STEP / scale), żeby:
  //   1) viewBox offset = minX * scale był wielokrotnością WORLD_GRID_STEP (= 20) w world.
  //      Bez tego renderowanie SVG byłoby przesunięte o viewBox offset, a światowe snap
  //      hotspoty nie trafiałyby w tę samą pozycję co SVG circle.
  //   2) OBIE source-grid — snappedCx (Pass 2 dla projected i non-projected) i minX.
  //      Dzięki temu (snappedCx - minX) * scale = automatycznie world 20-grid.
  //      Hotspot i SVG circle lądują w TEJ SAMEJ pozycji (oba na world-grid).
  // Konsekwencja: lekko zwiększony "padding" jeśli rounded min > bounds min (typowo 0–5 source units).
  const sourceGrid = WORLD_GRID_STEP / scale;
  minX = Math.round(minX / sourceGrid) * sourceGrid;
  minY = Math.round(minY / sourceGrid) * sourceGrid;

  const width = maxX - minX;
  const height = maxY - minY;
  const scaledX = minX * scale;
  const scaledY = minY * scale;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  // World coords terminali — relative do block origin (minX, minY).
  // WHY: snappedCx (source-grid, hop efektu Pass 2) i minX (source-grid, hop efektu bounds rounding)
  // są obie na wielokrotności sourceGrid. (snappedCx - minX) * scale = (k1-k2) * sourceGrid * scale
  // = (k1-k2) * WORLD_GRID_STEP = automatycznie wielokrotność world 20-grid.
  // Dlatego NIE potrzeba osobnego world-snap — aligned z canvas grid ZA DARMO.
  // Trade-off: projected terminale wędrują z krawędzi recta do najbliższej source-grid
  // wielokrotności WEWNĄTRZ rect (= do 1 gridPitch wewnątrz) — dla spójności z grid kropkami.
  const terminals: CadParsedTerminal[] = rawTerminals.map((rt, tIndex) => {
    const worldX = (rt.cx - minX) * scale;
    const worldY = (rt.cy - minY) * scale;
    return {
      id: `term-${index}-${tIndex}`,
      x: worldX,
      y: worldY,
      radius: rt.r * scale,
    };
  });

  return {
    internalId: `block-${index}`,
    label: extractBlockLabel(g, `Blok ${index + 1}`),
    originalX: scaledX,
    originalY: scaledY,
    width: scaledWidth,
    height: scaledHeight,
    svgContent: buildBlockSvg(g, scale, {
      x: scaledX,
      y: scaledY,
      w: scaledWidth,
      h: scaledHeight,
    }),
    terminals,
  };
}