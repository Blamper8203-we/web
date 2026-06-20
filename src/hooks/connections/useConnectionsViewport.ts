import { useState, useRef, useEffect, useCallback, type RefObject } from "react";
import type { Point } from "../../lib/routing/wireRoutingEngine";

export interface UseConnectionsViewportProps {
  rail: { width?: number; height?: number };
  containerSize: { width: number; height: number };
  svgRef: RefObject<SVGSVGElement | null>;
  setWorkspaceZoomPercent: (zoom: number) => void;
}

export function useConnectionsViewport({
  rail,
  containerSize,
  svgRef,
  setWorkspaceZoomPercent,
}: UseConnectionsViewportProps) {
  const [viewport, setViewport] = useState({ zoom: 0.3, pan: { x: 100, y: 100 } });
  const { zoom, pan } = viewport;
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Sync zoom status bar
  useEffect(() => {
    setWorkspaceZoomPercent(Math.round(zoom * 100));
  }, [zoom, setWorkspaceZoomPercent]);

  // Center/Fit rail initially
  const hasInitializedFit = useRef(false);
  useEffect(() => {
    if (hasInitializedFit.current || !rail.width || !rail.height) return;
    if (containerSize.width > 0 && containerSize.height > 0) {
      const scaleX = (containerSize.width - 80) / rail.width;
      const scaleY = (containerSize.height - 80) / rail.height;
      const initialScale = Math.min(scaleX, scaleY, 0.45);
      
      const initialPanX = (containerSize.width - rail.width * initialScale) / 2;
      const initialPanY = (containerSize.height - rail.height * initialScale) / 2;
      
      setViewport({ zoom: initialScale, pan: { x: initialPanX, y: initialPanY } });
      hasInitializedFit.current = true;
    }
  }, [rail.width, rail.height, containerSize.width, containerSize.height]);

  const zoomAround = useCallback((clientX: number, clientY: number, factor: number) => {
    setViewport((prev) => {
      const nextZoom = Math.min(Math.max(prev.zoom * factor, 0.05), 4.0);
      const svg = svgRef.current;
      if (!svg) return prev;
      const rect = svg.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const nextPanX = mouseX - (mouseX - prev.pan.x) * (nextZoom / prev.zoom);
      const nextPanY = mouseY - (mouseY - prev.pan.y) * (nextZoom / prev.zoom);
      return {
        zoom: nextZoom,
        pan: { x: nextPanX, y: nextPanY },
      };
    });
  }, [svgRef]);

  const zoomIn = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    zoomAround(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
  }, [zoomAround, svgRef]);

  const zoomOut = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    zoomAround(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / 1.2);
  }, [zoomAround, svgRef]);

  // Helper to map screen to logical coordinates
  const getLogicalPoint = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  }, [pan, zoom, svgRef]);

  const resetZoom = useCallback(() => {
    hasInitializedFit.current = false;
    if (rail.width && rail.height && containerSize.width > 0 && containerSize.height > 0) {
      const scaleX = (containerSize.width - 80) / rail.width;
      const scaleY = (containerSize.height - 80) / rail.height;
      const initialScale = Math.min(scaleX, scaleY, 0.45);
      
      const initialPanX = (containerSize.width - rail.width * initialScale) / 2;
      const initialPanY = (containerSize.height - rail.height * initialScale) / 2;
      
      setViewport({ zoom: initialScale, pan: { x: initialPanX, y: initialPanY } });
      hasInitializedFit.current = true;
    }
  }, [rail.width, rail.height, containerSize.width, containerSize.height]);

  return {
    setViewport,
    zoom,
    pan,
    isPanning,
    setIsPanning,
    panStartRef,
    zoomAround,
    zoomIn,
    zoomOut,
    resetZoom,
    getLogicalPoint,
    isInitialized: hasInitializedFit.current,
  };
}
