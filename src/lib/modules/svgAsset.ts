import { Capacitor } from "@capacitor/core";
import { normalizeSvgMarkup } from "./svgNormalization";

const rawSvgCache = new Map<string, string>();
const rawSvgPromiseCache = new Map<string, Promise<string>>();
const preparedSvgMarkupCache = new Map<string, string>();
const preparedSvgDataUriCache = new Map<string, string>();
const PREPARED_SVG_CACHE_VERSION = "v4";

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
  return !isSvgDataUri(src) && !isImportedSvgSource(src);
}

function isImportedSvgSource(src: string): boolean {
  const normalized = src.toLowerCase();
  return normalized.includes("/imported/")
    || normalized.includes("%2fimported%2f")
    || normalized.includes("imported/")
    || normalized.includes("dinboardsource=importedsvg");
}

export function shouldRenderRawModuleAsset(src: string): boolean {
  return src.toLowerCase().includes("dinboardsource=importedsvg");
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

  const performFetch = async (targetUrl: string): Promise<string> => {
    // Na Capacitor (Android/iOS) asset URL-e moga wymagac specjalnego traktowania.
    // Niektore serwery lokalne nie obsluguja poprawnie znakow diakrytycznych w URL.
    if (Capacitor.isNativePlatform()) {
      // Na natywnej platformie proba fetch moze nie dzialac dla lokalnych assetow.
      // Uzywamy XMLHttpRequest zamiast fetch dla lepszej kompatybilnosci.
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", targetUrl, true);
        xhr.overrideMimeType("image/svg+xml");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`XHR ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("XHR network error"));
        xhr.send();
      });
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    // If the response is HTML, it means the server served the SPA index.html fallback
    if (contentType.includes("text/html")) {
      throw new Error("Received HTML fallback instead of SVG");
    }
    return response.text();
  };

  const promise = (async () => {
    try {
      return await performFetch(src);
    } catch (error) {
      // Self-healing: If the fetch failed or got HTML fallback, and the URL has %2B,
      // retry with literal '+' which Vite dev server requires on some systems.
      if (src.includes("%2B") || src.includes("%2b")) {
        try {
          const fallbackUrl = src.replace(/%2B/gi, "+");
          return await performFetch(fallbackUrl);
        } catch {
          // If fallback fails, throw the original error
        }
      }

      // Self-healing: Conversely, if the URL had a literal '+' and failed,
      // try retrying with encoded '%2B' just in case.
      if (src.includes("+")) {
        try {
          const fallbackUrl = src.replace(/\+/g, "%2B");
          return await performFetch(fallbackUrl);
        } catch {
          // If fallback fails, throw the original error
        }
      }

      throw error;
    }
  })()
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
  
  const dynamicRatingText = parameters["_DYNAMIC_RATING_"];
  
  const preparedSvg = (shouldNormalizeSvgSource(src) || dynamicRatingText)
    ? normalizeSvgMarkup(parameterizedSvg, {
        normalizeStrokeWidths: false,
        dynamicRatingText: dynamicRatingText,
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
