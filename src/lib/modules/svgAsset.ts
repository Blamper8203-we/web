import { normalizeSvgMarkup } from "./svgNormalization";

const rawSvgCache = new Map<string, string>();
const rawSvgPromiseCache = new Map<string, Promise<string>>();
const preparedSvgMarkupCache = new Map<string, string>();
const preparedSvgDataUriCache = new Map<string, string>();
const PREPARED_SVG_CACHE_VERSION = "v2";

function buildParametersKey(parameters: Record<string, string>): string {
  return Object.entries(parameters)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function applyParameters(svgContent: string, parameters: Record<string, string>): string {
  return svgContent.replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    (_match, key: string) => parameters[key] ?? "",
  );
}

function isSvgDataUri(src: string): boolean {
  return src.startsWith("data:image/svg+xml");
}

function shouldNormalizeSvgSource(src: string): boolean {
  return !isSvgDataUri(src);
}

function isImportedSvgSource(src: string): boolean {
  const normalized = src.toLowerCase();
  return normalized.includes("/imported/")
    || normalized.includes("%2fimported%2f")
    || normalized.includes("imported/");
}

function isRcdSvgSource(src: string): boolean {
  const normalized = src.toLowerCase();
  return normalized.includes("/rcd/")
    || normalized.includes("%2frcd%2f")
    || normalized.includes("rcd");
}

function decodeSvgDataUri(src: string): string {
  const commaIndex = src.indexOf(",");
  if (commaIndex < 0) {
    return src;
  }

  const payload = src.slice(commaIndex + 1);
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

export async function loadRawSvg(src: string): Promise<string> {
  const cached = rawSvgCache.get(src);
  if (cached) {
    return cached;
  }

  const existingPromise = rawSvgPromiseCache.get(src);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = fetch(src)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.text();
    })
    .then((content) => {
      rawSvgCache.set(src, content);
      rawSvgPromiseCache.delete(src);
      return content;
    })
    .catch((error) => {
      rawSvgPromiseCache.delete(src);
      throw error;
    });

  rawSvgPromiseCache.set(src, promise);
  return promise;
}

export async function loadPreparedSvgDataUri(
  src: string,
  parameters: Record<string, string> = {},
): Promise<string> {
  const cacheKey = `${PREPARED_SVG_CACHE_VERSION}::${src}::${buildParametersKey(parameters)}`;
  const cached = preparedSvgDataUriCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const preparedSvg = await loadPreparedSvgMarkup(src, parameters);
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(preparedSvg)}`;
  preparedSvgDataUriCache.set(cacheKey, dataUri);
  return dataUri;
}

export async function loadPreparedSvgMarkup(
  src: string,
  parameters: Record<string, string> = {},
): Promise<string> {
  const cacheKey = `${PREPARED_SVG_CACHE_VERSION}::${src}::${buildParametersKey(parameters)}`;
  const cached = preparedSvgMarkupCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rawSvg = isSvgDataUri(src)
    ? decodeSvgDataUri(src)
    : await loadRawSvg(src);
  const parameterizedSvg = applyParameters(rawSvg, parameters);
  const preparedSvg = shouldNormalizeSvgSource(src)
    ? normalizeSvgMarkup(parameterizedSvg, {
        normalizeStrokeWidths: isImportedSvgSource(src) || isRcdSvgSource(src),
      })
    : parameterizedSvg;
  preparedSvgMarkupCache.set(cacheKey, preparedSvg);
  if (!preparedSvgDataUriCache.has(cacheKey)) {
    preparedSvgDataUriCache.set(
      cacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(preparedSvg)}`,
    );
  }
  return preparedSvg;
}
