const SVG_NS = "http://www.w3.org/2000/svg";

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

  for (const rect of Array.from(svgRoot.querySelectorAll("rect"))) {
    const id = rect.getAttribute("id") ?? "";
    if (id.startsWith("Page")) {
      continue;
    }

    const style = rect.getAttribute("style");
    const fill = rect.getAttribute("fill");
    if (hasFillNone(style, fill)) {
      continue;
    }

    const width = parseNumber(rect.getAttribute("width"));
    const height = parseNumber(rect.getAttribute("height"));
    if (width == null || height == null || width <= 10 || height <= 10) {
      continue;
    }

    const x = parseNumber(rect.getAttribute("x")) ?? 0;
    const y = parseNumber(rect.getAttribute("y")) ?? 0;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
    found = true;
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

export function normalizeSvgMarkup(svgMarkup: string): string {
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

    svgRoot.removeAttribute("width");
    svgRoot.removeAttribute("height");

    return new XMLSerializer().serializeToString(svgRoot);
  } catch {
    return svgMarkup;
  }
}
