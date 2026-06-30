import { useEffect, useRef, useState } from "react";
import {
  downsampleCanvas,
  drawContainedImage,
  getRasterSupersample,
  shouldUseProgressiveDownsample,
} from "../lib/modules/rasterPreview";
import { loadPreparedSvgDataUri, shouldRenderRawModuleAsset } from "../lib/modules/svgAsset";
import { setWithLruEviction, touchLruEntry } from "../lib/lruCache";

interface ModuleAssetPreviewProps {
  alt: string;
  className?: string;
  parameters?: Record<string, string>;
  rasterDprCap?: number;
  renderHeight?: number;
  renderMode?: "svg" | "raster";
  renderWidth?: number;
  src: string;
}

// WHY: Poprzednio te 3 globalne Map rosly bez limitu. Przy dlugiej sesji z
// wieloma unikalnymi modułami/previewami to mogło zjeść RAM nieograniczenie
// (set + get, nigdy delete). LRU eviction: `setWithLruEviction` wyrzuca
// najstarszy wpis po przekroczeniu MAX_PREVIEW_CACHE_SIZE; `touchLruEntry`
// przy get przesuwa wpis na koniec insertion order, dając true LRU
// (zachowuje ostatnio oglądane previews). MAX=100 to ok. ~25 MB worst case
// (100 SVG data URI × ~20 KB + 100 raster canvas × ~200 KB + 100 image refs).
const MAX_PREVIEW_CACHE_SIZE = 100;
const svgCache = new Map<string, string>();
const rasterCanvasCache = new Map<string, HTMLCanvasElement>();
const svgImageCache = new Map<string, Promise<HTMLImageElement>>();
const PREVIEW_CACHE_VERSION = "v2";

function buildCacheKey(src: string, parameters: Record<string, string>): string {
  const serializedParameters = Object.entries(parameters)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `${PREVIEW_CACHE_VERSION}::${src}::${serializedParameters}`;
}

function getSvgImage(dataUri: string): Promise<HTMLImageElement> {
  const cached = touchLruEntry(svgImageCache, dataUri);
  if (cached) {
    return cached;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG image load failed"));
    image.src = dataUri;
  });

  setWithLruEviction(svgImageCache, dataUri, promise, MAX_PREVIEW_CACHE_SIZE);
  return promise;
}


export function ModuleAssetPreview({
  alt,
  className,
  parameters = {},
  rasterDprCap = 2,
  renderHeight,
  renderMode = "svg",
  renderWidth,
  src,
}: ModuleAssetPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderRawAsset = shouldRenderRawModuleAsset(src);
  const cacheKey = buildCacheKey(src, parameters);
  const [preparedSvgUri, setPreparedSvgUri] = useState<string | null>(() => touchLruEntry(svgCache, cacheKey) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (renderRawAsset) {
      setPreparedSvgUri(null);
      setFailed(false);
      return;
    }

    let cancelled = false;

    loadPreparedSvgDataUri(src, parameters)
      .then((dataUri) => {
        if (cancelled) {
          return;
        }

        setWithLruEviction(svgCache, cacheKey, dataUri, MAX_PREVIEW_CACHE_SIZE);
        setPreparedSvgUri(dataUri);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, parameters, renderRawAsset, src]);

  useEffect(() => {
    if (
      renderRawAsset ||
      renderMode !== "raster" ||
      !preparedSvgUri ||
      !canvasRef.current ||
      !renderWidth ||
      !renderHeight ||
      renderWidth <= 0 ||
      renderHeight <= 0
    ) {
      return;
    }

    let cancelled = false;
    const visibleCanvas = canvasRef.current;
    const cssWidth = Math.max(1, renderWidth);
    const cssHeight = Math.max(1, renderHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, rasterDprCap);
    const visiblePixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const visiblePixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    const supersample = getRasterSupersample(src);
    const sourcePixelWidth = Math.max(1, Math.round(visiblePixelWidth * supersample));
    const sourcePixelHeight = Math.max(1, Math.round(visiblePixelHeight * supersample));
    const rasterKey = `${preparedSvgUri}|${visiblePixelWidth}x${visiblePixelHeight}|ss${supersample}`;

    const paintToVisibleCanvas = (sourceCanvas: HTMLCanvasElement) => {
      if (cancelled) {
        return;
      }

      visibleCanvas.width = visiblePixelWidth;
      visibleCanvas.height = visiblePixelHeight;
      visibleCanvas.style.width = `${cssWidth}px`;
      visibleCanvas.style.height = `${cssHeight}px`;

      const context = visibleCanvas.getContext("2d");
      if (!context) {
        return;
      }

      context.clearRect(0, 0, visiblePixelWidth, visiblePixelHeight);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(sourceCanvas, 0, 0, visiblePixelWidth, visiblePixelHeight);
    };

    const cachedRaster = touchLruEntry(rasterCanvasCache, rasterKey);
    if (cachedRaster) {
      paintToVisibleCanvas(cachedRaster);
      return;
    }

    getSvgImage(preparedSvgUri)
      .then((image) => {
        if (cancelled) {
          return;
        }

        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = sourcePixelWidth;
        offscreenCanvas.height = sourcePixelHeight;

        const offscreenContext = offscreenCanvas.getContext("2d");
        if (!offscreenContext) {
          return;
        }

        offscreenContext.clearRect(0, 0, sourcePixelWidth, sourcePixelHeight);
        offscreenContext.imageSmoothingEnabled = true;
        offscreenContext.imageSmoothingQuality = "high";
        drawContainedImage(
          offscreenContext,
          image,
          image.naturalWidth || image.width,
          image.naturalHeight || image.height,
          sourcePixelWidth,
          sourcePixelHeight,
        );

        const normalizedCanvas =
          supersample > 1 && shouldUseProgressiveDownsample(src)
            ? downsampleCanvas(offscreenCanvas, visiblePixelWidth, visiblePixelHeight)
            : offscreenCanvas;

        setWithLruEviction(rasterCanvasCache, rasterKey, normalizedCanvas, MAX_PREVIEW_CACHE_SIZE);
        paintToVisibleCanvas(normalizedCanvas);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [preparedSvgUri, rasterDprCap, renderHeight, renderMode, renderRawAsset, renderWidth, src]);

  if (renderRawAsset) {
    return <img alt={alt} className={className} src={src} />;
  }

  if (failed || !preparedSvgUri) {
    return <img alt={alt} className={className} src={src} />;
  }

  if (renderMode === "raster") {
    return <canvas aria-label={alt} className={className} ref={canvasRef} role="img" />;
  }

  return <img alt={alt} className={className} src={preparedSvgUri} />;
}
