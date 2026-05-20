import { useEffect, useRef, useState } from "react";
import {
  downsampleCanvas,
  drawContainedImage,
  getRasterSupersample,
  shouldUseProgressiveDownsample,
} from "../lib/modules/rasterPreview";
import { loadPreparedSvgDataUri } from "../lib/modules/svgAsset";

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
  const cached = svgImageCache.get(dataUri);
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

  svgImageCache.set(dataUri, promise);
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
  const cacheKey = buildCacheKey(src, parameters);
  const [preparedSvgUri, setPreparedSvgUri] = useState<string | null>(() => svgCache.get(cacheKey) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadPreparedSvgDataUri(src, parameters)
      .then((dataUri) => {
        if (cancelled) {
          return;
        }

        svgCache.set(cacheKey, dataUri);
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
  }, [cacheKey, parameters, src]);

  useEffect(() => {
    if (
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

    const cachedRaster = rasterCanvasCache.get(rasterKey);
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

        rasterCanvasCache.set(rasterKey, normalizedCanvas);
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
  }, [preparedSvgUri, rasterDprCap, renderHeight, renderMode, renderWidth]);

  if (failed || !preparedSvgUri) {
    return <img alt={alt} className={className} src={src} />;
  }

  if (renderMode === "raster") {
    return <canvas aria-label={alt} className={className} ref={canvasRef} role="img" />;
  }

  return <img alt={alt} className={className} src={preparedSvgUri} />;
}
