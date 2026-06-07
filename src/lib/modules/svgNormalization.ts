const SVG_NS = "http://www.w3.org/2000/svg";

interface SvgNormalizationOptions {
  normalizeStrokeWidths?: boolean;
  dynamicRatingText?: string;
}

interface RectBounds {
  found: boolean;
  height: number;
  width: number;
  x: number;
  y: number;
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/px$/i, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function parseViewBox(viewBox: string | null): RectBounds {
  if (!viewBox) {
    return { found: false, height: 0, width: 0, x: 0, y: 0 };
  }

  const parts = viewBox
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));

  if (parts.length < 4) {
    return { found: false, height: 0, width: 0, x: 0, y: 0 };
  }

  return {
    found: true,
    height: parts[3],
    width: parts[2],
    x: parts[0],
    y: parts[1],
  };
}

function hasFillNone(style: string | null, fill: string | null): boolean {
  if (fill?.trim().toLowerCase() === "none") {
    return true;
  }

  return style?.replace(/\s+/g, "").toLowerCase().includes("fill:none") ?? false;
}

function findLargestVisibleRect(svgRoot: SVGSVGElement): RectBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let found = false;

  const selectors = ["rect", "path", "ellipse", "circle", "polygon"];
  for (const selector of selectors) {
    for (const element of Array.from(svgRoot.querySelectorAll(selector))) {
      const id = element.getAttribute("id") ?? "";
      if (id.startsWith("Page")) {
        continue;
      }

      const style = element.getAttribute("style");
      const fill = element.getAttribute("fill");
      if (hasFillNone(style, fill)) {
        // Paths might have no fill but have a stroke
        const stroke = element.getAttribute("stroke") || style?.includes("stroke:");
        if (!stroke) {
          continue;
        }
      }

      // getBBox() provides the most accurate bounds for any SVG element
      try {
        const bbox = (element as unknown as SVGGraphicsElement).getBBox();
        if (bbox.width <= 0 && bbox.height <= 0) {
          continue;
        }

        // Filter out very small elements that might be noise/artifacts
        // (unless it's a small path that might be important)
        if (selector === "rect" && (bbox.width <= 10 || bbox.height <= 10)) {
          continue;
        }

        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
        found = true;
      } catch {
        // Fallback for rect if getBBox fails in some environments
        if (selector === "rect") {
          const width = parseNumber(element.getAttribute("width"));
          const height = parseNumber(element.getAttribute("height"));
          if (width != null && height != null && width > 10 && height > 10) {
            const x = parseNumber(element.getAttribute("x")) ?? 0;
            const y = parseNumber(element.getAttribute("y")) ?? 0;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
            found = true;
          }
        }
      }
    }
  }

  if (!found) {
    return { found: false, height: 0, width: 0, x: 0, y: 0 };
  }

  return {
    found: true,
    height: maxY - minY,
    width: maxX - minX,
    x: minX,
    y: minY,
  };
}

function removeFirstGroupTransform(svgRoot: SVGSVGElement) {
  const firstGroup = Array.from(svgRoot.children).find(
    (child) => child.namespaceURI === SVG_NS && child.tagName.toLowerCase() === "g",
  );

  if (firstGroup) {
    firstGroup.removeAttribute("transform");
  }
}

function parseStrokeWidthValue(value: string): { numeric: number; unit: string } | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^([+-]?\d*\.?\d+)([a-z%]*)$/i);
  if (!match) {
    return null;
  }

  const numeric = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return {
    numeric,
    unit: (match[2] ?? "").trim(),
  };
}

function normalizeStrokeWidths(svgRoot: SVGSVGElement): void {
  const MIN_STROKE = 0.18;
  const MAX_STROKE = 1.2;
  const STROKE_SCALE = 0.52;
  const strokeWidthPattern = /stroke-width\s*:\s*([+-]?\d*\.?\d+)([a-z%]*)/gi;

  const applyStrokeWidth = (element: Element) => {
    const rawStrokeWidth = element.getAttribute("stroke-width");
    if (!rawStrokeWidth) {
      return;
    }

    const parsed = parseStrokeWidthValue(rawStrokeWidth);
    if (!parsed) {
      return;
    }

    const normalized = Math.max(MIN_STROKE, Math.min(MAX_STROKE, parsed.numeric * STROKE_SCALE));
    element.setAttribute("stroke-width", `${formatNumber(normalized)}${parsed.unit}`);
  };

  const normalizeStyleText = (styleText: string): string => {
    return styleText.replace(strokeWidthPattern, (_full, numericRaw: string, unitRaw: string) => {
      const numeric = Number.parseFloat(numericRaw);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return _full;
      }

      const unit = typeof unitRaw === "string" ? unitRaw : "";
      const normalized = Math.max(MIN_STROKE, Math.min(MAX_STROKE, numeric * STROKE_SCALE));
      return `stroke-width:${formatNumber(normalized)}${unit}`;
    });
  };

  applyStrokeWidth(svgRoot);
  for (const element of Array.from(svgRoot.querySelectorAll("[stroke-width]"))) {
    applyStrokeWidth(element);
  }

  for (const element of Array.from(svgRoot.querySelectorAll("[style]"))) {
    const rawStyle = element.getAttribute("style");
    if (!rawStyle || !rawStyle.toLowerCase().includes("stroke-width")) {
      continue;
    }

    element.setAttribute("style", normalizeStyleText(rawStyle));
  }

  for (const styleElement of Array.from(svgRoot.querySelectorAll("style"))) {
    const rawText = styleElement.textContent;
    if (!rawText || !rawText.toLowerCase().includes("stroke-width")) {
      continue;
    }

    styleElement.textContent = normalizeStyleText(rawText);
  }
}

function applyDynamicRatingText(svgRoot: SVGSVGElement, newText: string): void {
  if (!newText || !newText.trim()) return;

  const RATING_REGEX = /^(([BCD]\s*\d+)|(\d+\s*A(\/\d+,\d+\s*A)?)|(\d+\s*A))$/i;

  for (const textElement of Array.from(svgRoot.querySelectorAll("text"))) {
    const content = textElement.textContent?.trim();
    if (content && RATING_REGEX.test(content)) {
      textElement.textContent = newText;
      return; 
    }
  }
}

export function normalizeSvgMarkup(
  svgMarkup: string,
  options: SvgNormalizationOptions = {},
): string {
  const shouldNormalizeStrokes = options.normalizeStrokeWidths ?? true;
  const dynamicRatingText = options.dynamicRatingText;
  
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return svgMarkup;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const svgRootElement = doc.documentElement;

    if (!svgRootElement || svgRootElement.tagName.toLowerCase() !== "svg") {
      return svgMarkup;
    }

    const svgRoot = svgRootElement as unknown as SVGSVGElement;

    const bodyRect = findLargestVisibleRect(svgRoot);
    if (bodyRect.found && bodyRect.width > 10 && bodyRect.height > 10) {
      const originalViewBox = parseViewBox(svgRoot.getAttribute("viewBox"));
      let useOriginalViewBox = false;

      if (originalViewBox.found) {
        const bodyArea = bodyRect.width * bodyRect.height;
        const originalArea = originalViewBox.width * originalViewBox.height;
        if (bodyArea < originalArea * 0.7) {
          useOriginalViewBox = true;
        }
      }

      if (!useOriginalViewBox) {
        svgRoot.setAttribute(
          "viewBox",
          `${formatNumber(bodyRect.x)} ${formatNumber(bodyRect.y)} ${formatNumber(bodyRect.width)} ${formatNumber(bodyRect.height)}`,
        );
      }

      removeFirstGroupTransform(svgRoot);
    }

    if (shouldNormalizeStrokes) {
      normalizeStrokeWidths(svgRoot);
    }

    if (dynamicRatingText) {
      applyDynamicRatingText(svgRoot, dynamicRatingText);
    }

    svgRoot.removeAttribute("width");
    svgRoot.removeAttribute("height");

    return new XMLSerializer().serializeToString(svgRoot);
  } catch {
    return svgMarkup;
  }
}
