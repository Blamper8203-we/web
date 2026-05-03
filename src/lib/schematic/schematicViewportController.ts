export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 5.0;
const DEFAULT_ZOOM = 1.0;
const ZOOM_FACTOR = 1.15;

export function createDefaultViewport(): ViewportState {
  return { zoom: DEFAULT_ZOOM, panX: 0, panY: 0 };
}

export function zoomAtPoint(
  viewport: ViewportState,
  mouseX: number,
  mouseY: number,
  factor: number,
): ViewportState {
  const newZoom = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const scale = newZoom / viewport.zoom;

  return {
    zoom: newZoom,
    panX: mouseX - (mouseX - viewport.panX) * scale,
    panY: mouseY - (mouseY - viewport.panY) * scale,
  };
}

export function zoomIn(viewport: ViewportState, centerX: number, centerY: number): ViewportState {
  return zoomAtPoint(viewport, centerX, centerY, ZOOM_FACTOR);
}

export function zoomOut(viewport: ViewportState, centerX: number, centerY: number): ViewportState {
  return zoomAtPoint(viewport, centerX, centerY, 1 / ZOOM_FACTOR);
}

export function panBy(viewport: ViewportState, dx: number, dy: number): ViewportState {
  return {
    ...viewport,
    panX: viewport.panX + dx,
    panY: viewport.panY + dy,
  };
}

export function resetViewport(canvasWidth: number, canvasHeight: number, contentWidth: number, contentHeight: number): ViewportState {
  const scaleX = canvasWidth / contentWidth;
  const scaleY = canvasHeight / contentHeight;
  const fitZoom = Math.min(scaleX, scaleY, 1.0);

  const centeredX = (canvasWidth - contentWidth * fitZoom) / 2;
  const centeredY = (canvasHeight - contentHeight * fitZoom) / 2;

  return {
    zoom: fitZoom,
    panX: centeredX,
    panY: centeredY,
  };
}

export function screenToWorld(viewport: ViewportState, screenX: number, screenY: number): [number, number] {
  return [
    (screenX - viewport.panX) / viewport.zoom,
    (screenY - viewport.panY) / viewport.zoom,
  ];
}

export function worldToScreen(viewport: ViewportState, worldX: number, worldY: number): [number, number] {
  return [
    worldX * viewport.zoom + viewport.panX,
    worldY * viewport.zoom + viewport.panY,
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
