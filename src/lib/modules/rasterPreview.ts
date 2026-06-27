export const DEFAULT_RASTER_CACHE_STEP = 24;

export function isRcdAsset(src: string): boolean {
  return src.includes("/RCD/");
}

export function isImportedAsset(src: string): boolean {
  const normalized = src.toLowerCase();
  return normalized.includes("/imported/")
    || normalized.includes("%2fimported%2f")
    || normalized.includes("imported/");
}

export function getRasterSupersample(src: string): number {
  if (isRcdAsset(src)) {
    return 6;
  }

  if (isImportedAsset(src)) {
    return 3;
  }

  return 2;
}

export function shouldUseProgressiveDownsample(src: string): boolean {
  return isRcdAsset(src) || isImportedAsset(src);
}

export function serializeParameters(parameters: Record<string, string>): string {
  return Object.entries(parameters)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

export function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return;
  }

  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

export function downsampleCanvas(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  if (sourceCanvas.width === targetWidth && sourceCanvas.height === targetHeight) {
    return sourceCanvas;
  }

  let currentCanvas = sourceCanvas;

  while (
    currentCanvas.width / 2 >= targetWidth
    && currentCanvas.height / 2 >= targetHeight
  ) {
    const nextCanvas = document.createElement("canvas");
    nextCanvas.width = Math.max(targetWidth, Math.round(currentCanvas.width / 2));
    nextCanvas.height = Math.max(targetHeight, Math.round(currentCanvas.height / 2));

    const nextContext = nextCanvas.getContext("2d");
    if (!nextContext) {
      return currentCanvas;
    }

    nextContext.imageSmoothingEnabled = true;
    nextContext.imageSmoothingQuality = "high";
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextContext.drawImage(currentCanvas, 0, 0, nextCanvas.width, nextCanvas.height);
    currentCanvas = nextCanvas;
  }

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalContext = finalCanvas.getContext("2d");
  if (!finalContext) {
    return currentCanvas;
  }

  finalContext.imageSmoothingEnabled = true;
  finalContext.imageSmoothingQuality = "high";
  finalContext.clearRect(0, 0, targetWidth, targetHeight);
  finalContext.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);
  return finalCanvas;
}
