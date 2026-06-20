export interface SvgDimensions {
  height: number;
  width: number;
}

export function parseSvgDimensions(svgMarkup: string): SvgDimensions | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") {
      return null;
    }

    const viewBox = root.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox
        .split(/[\s,]+/)
        .map((part) => Number.parseFloat(part))
        .filter((part) => Number.isFinite(part));
      if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
        return { width: parts[2], height: parts[3] };
      }
    }

    const width = Number.parseFloat((root.getAttribute("width") ?? "").replace(/px$/i, ""));
    const height = Number.parseFloat((root.getAttribute("height") ?? "").replace(/px$/i, ""));
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  } catch {
    return null;
  }

  return null;
}

export function createSvgDataUri(svgMarkup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

export function parseSvgLengthToMm(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.endsWith("%")) {
    return null;
  }

  const match = trimmed.match(/^(-?\d*\.?\d+)(mm|cm|in|pt|pc|q|px)?$/);
  if (!match) {
    return null;
  }

  const numericValue = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  const unit = match[2] ?? "px";
  switch (unit) {
    case "mm":
      return numericValue;
    case "cm":
      return numericValue * 10;
    case "in":
      return numericValue * 25.4;
    case "pt":
      return numericValue * (25.4 / 72);
    case "pc":
      return numericValue * (25.4 / 6);
    case "q":
      return numericValue * 0.25;
    case "px":
      return numericValue * (25.4 / 96);
    default:
      return null;
  }
}

export function isPercentSvgLength(value: string | null): boolean {
  return typeof value === "string" && value.trim().endsWith("%");
}

export function parseSvgDocument(svgMarkup: string): Document | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;
    const hasParserError = doc.querySelector("parsererror") !== null;
    if (hasParserError || !root || root.tagName.toLowerCase() !== "svg") {
      return null;
    }

    return doc;
  } catch {
    return null;
  }
}

export function isLikelySvgMarkup(svgMarkup: string): boolean {
  let remaining = svgMarkup.replace(/^\uFEFF/, "").trimStart();
  remaining = remaining.replace(/^<\?xml[^>]*>\s*/i, "");

  while (true) {
    const trimmed = remaining.trimStart();
    if (trimmed.startsWith("<!--")) {
      const commentEnd = trimmed.indexOf("-->");
      if (commentEnd < 0) {
        return false;
      }
      remaining = trimmed.slice(commentEnd + 3);
      continue;
    }

    if (/^<!doctype/i.test(trimmed)) {
      const doctypeEnd = trimmed.indexOf(">");
      if (doctypeEnd < 0) {
        return false;
      }
      remaining = trimmed.slice(doctypeEnd + 1);
      continue;
    }

    return /^<svg(?:\s|>)/i.test(trimmed);
  }
}

export function isValidSvgMarkup(svgMarkup: string): boolean {
  if (!isLikelySvgMarkup(svgMarkup)) {
    return false;
  }

  if (typeof DOMParser === "undefined") {
    return true;
  }

  return parseSvgDocument(svgMarkup) !== null;
}

export function sanitizeSvg(svgMarkup: string): string {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return svgMarkup;
  }

  try {
    const doc = parseSvgDocument(svgMarkup);
    if (!doc) {
      return "";
    }

    for (const node of Array.from(doc.querySelectorAll("script, foreignObject"))) {
      node.remove();
    }

    for (const element of Array.from(doc.querySelectorAll("*"))) {
      for (const attribute of Array.from(element.attributes)) {
        if (/^on/i.test(attribute.name)) {
          element.removeAttribute(attribute.name);
          continue;
        }

        if (attribute.name === "href" || attribute.name === "xlink:href") {
          const value = attribute.value.trim();
          const safeReference =
            value.startsWith("#")
            || value.startsWith("data:image/")
            || value.startsWith("data:application/octet-stream");
          if (!safeReference) {
            element.removeAttribute(attribute.name);
          }
        }
      }
    }

    return new XMLSerializer().serializeToString(doc.documentElement);
  } catch {
    return svgMarkup;
  }
}

export function parseExplicitMmDimensions(
  svgMarkup: string,
  svgDimensions: SvgDimensions | null,
): { heightMm: number; source: "svg-300dpi" | "svg-ratio" | "svg-units"; widthMm: number } | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") {
      return null;
    }

    const widthMm = parseSvgLengthToMm(root.getAttribute("width"));
    const heightMm = parseSvgLengthToMm(root.getAttribute("height"));
    if (widthMm && heightMm) {
      return { widthMm, heightMm, source: "svg-units" };
    }

    if (svgDimensions && svgDimensions.width > 0 && svgDimensions.height > 0) {
      if (widthMm && !heightMm) {
        return {
          widthMm,
          heightMm: Math.round(((widthMm * svgDimensions.height) / svgDimensions.width) * 100) / 100,
          source: "svg-ratio",
        };
      }

      if (!widthMm && heightMm) {
        return {
          widthMm: Math.round(((heightMm * svgDimensions.width) / svgDimensions.height) * 100) / 100,
          heightMm,
          source: "svg-ratio",
        };
      }
    }

    const hasPercentDimensions =
      isPercentSvgLength(root.getAttribute("width")) || isPercentSvgLength(root.getAttribute("height"));
    const looksLikeSerifExport = root.hasAttribute("xmlns:serif");
    if (svgDimensions && svgDimensions.width > 0 && svgDimensions.height > 0 && (hasPercentDimensions || looksLikeSerifExport)) {
      const mmPerPxAt300Dpi = 25.4 / 300;
      return {
        widthMm: Math.round(svgDimensions.width * mmPerPxAt300Dpi * 100) / 100,
        heightMm: Math.round(svgDimensions.height * mmPerPxAt300Dpi * 100) / 100,
        source: "svg-300dpi",
      };
    }
  } catch {
    return null;
  }

  return null;
}
