// WHY: Zamiast traktować cały schemat z pliku SVG jako jeden nierozerwalny obraz,
// ładujemy go w tle, przetwarzamy zawartość i rozbijamy na logiczne bloki (części układu).
// Pozwala to użytkownikowi na swobodne przemieszczanie osobnych elementów
// tego samego modułu (np. zasilanie oddzielnie od interfejsów komunikacyjnych).

export interface CadParsedTerminal {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface CadParsedBlock {
  /** Unikalne ID wewnątrz tego modułu */
  internalId: string;
  /** Sugerowana etykieta (wyciągnięta z tekstu, np. "-K1:A") */
  label: string;
  /** Relatywna pozycja X (z oryginalnego dokumentu SVG) */
  originalX: number;
  /** Relatywna pozycja Y (z oryginalnego dokumentu SVG) */
  originalY: number;
  /** Szerokość bloku */
  width: number;
  /** Wysokość bloku */
  height: number;
  /** Pełny kod HTML pojedynczego tagu <svg>, gotowy do wstrzyknięcia do Reacta */
  svgContent: string;
  /** Wykryte terminale (na podstawie kółek <circle>) */
  terminals: CadParsedTerminal[];
}

const CACHE = new Map<string, Promise<CadParsedBlock[]>>();

export function fetchAndParseCadSymbol(svgPath: string): Promise<CadParsedBlock[]> {
  if (CACHE.has(svgPath)) {
    return CACHE.get(svgPath)!;
  }

  const promise = fetch(svgPath)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${svgPath}: ${res.status}`);
      return res.text();
    })
    .then((text) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");

      const errorNode = doc.querySelector("parsererror");
      if (errorNode) {
        throw new Error("Błąd parsowania SVG: " + errorNode.textContent);
      }

      const rootSvg = doc.querySelector("svg");
      if (!rootSvg) throw new Error("Brak korzenia <svg> w pliku");

      // Sprawdzamy strukturę. Może być to nasz specjalny format z <g id="cad-symbol-svg">
      const cadGroup = doc.querySelector("#cad-symbol-svg") || rootSvg;
      
      // Zbieramy grupy z pierwszego poziomu pod cadGroup.
      const blockGroups = Array.from(cadGroup.children).filter(
        (child) => child.tagName.toLowerCase() === "g"
      );

      if (blockGroups.length === 0) {
        return [];
      }

      const parsedBlocks: CadParsedBlock[] = [];

      blockGroups.forEach((g, index) => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const updateBounds = (px: number, py: number) => {
          if (!isNaN(px) && px < minX) minX = px;
          if (!isNaN(py) && py < minY) minY = py;
          if (!isNaN(px) && px > maxX) maxX = px;
          if (!isNaN(py) && py > maxY) maxY = py;
        };

        const rawTerminals: { cx: number; cy: number; r: number }[] = [];

        const elements = g.querySelectorAll("*");
        elements.forEach((el) => {
          const tagName = el.tagName.toLowerCase();
          if (tagName === "rect" || tagName === "image") {
            const x = parseFloat(el.getAttribute("x") || "0");
            const y = parseFloat(el.getAttribute("y") || "0");
            const w = parseFloat(el.getAttribute("width") || "0");
            const h = parseFloat(el.getAttribute("height") || "0");
            updateBounds(x, y);
            updateBounds(x + w, y + h);
          } else if (tagName === "line") {
            updateBounds(parseFloat(el.getAttribute("x1") || "0"), parseFloat(el.getAttribute("y1") || "0"));
            updateBounds(parseFloat(el.getAttribute("x2") || "0"), parseFloat(el.getAttribute("y2") || "0"));
          } else if (tagName === "circle") {
            const cx = parseFloat(el.getAttribute("cx") || "0");
            const cy = parseFloat(el.getAttribute("cy") || "0");
            const r = parseFloat(el.getAttribute("r") || "0");
            updateBounds(cx - r, cy - r);
            updateBounds(cx + r, cy + r);
            
            const style = el.getAttribute("style") || "";
            const fill = el.getAttribute("fill") || "";
            const isYellowRelayPin = style.includes("#eab308") || fill.includes("#eab308");
            
            if (!isYellowRelayPin) {
              rawTerminals.push({ cx, cy, r });
            }
          } else if (tagName === "text") {
            const transform = el.getAttribute("transform");
            if (transform && transform.includes("translate(")) {
              const match = transform.match(/translate\(([^, ]+)[, ]+([^)]+)\)/);
              if (match) {
                updateBounds(parseFloat(match[1]), parseFloat(match[2]));
                updateBounds(parseFloat(match[1]) + 50, parseFloat(match[2]) + 10);
              }
            } else {
              const x = parseFloat(el.getAttribute("x") || "0");
              const y = parseFloat(el.getAttribute("y") || "0");
              updateBounds(x, y);
              updateBounds(x + 50, y + 10);
            }
          }
        });

        if (minX === Infinity) {
          minX = 0; minY = 0; maxX = 200; maxY = 200;
        }

        minX -= 4;
        minY -= 4;
        maxX += 4;
        maxY += 4;

        const x = minX;
        const y = minY;
        const width = maxX - minX;
        const height = maxY - minY;

        let label = `Blok ${index + 1}`;
        const texts = Array.from(g.querySelectorAll("text"));
        if (texts.length > 0) {
          label = texts[0].textContent || label;
        }

        const blockSvgString = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" width="100%" height="100%">
            ${g.outerHTML}
          </svg>
        `.trim();

        const terminals: CadParsedTerminal[] = rawTerminals.map((rt, tIndex) => ({
          id: `term-${index}-${tIndex}`,
          x: rt.cx - x,
          y: rt.cy - y,
          radius: rt.r,
        }));

        parsedBlocks.push({
          internalId: `block-${index}`,
          label,
          originalX: x,
          originalY: y,
          width,
          height,
          svgContent: blockSvgString,
          terminals,
        });
      });

      return parsedBlocks;
    });

  CACHE.set(svgPath, promise);
  return promise;
}
