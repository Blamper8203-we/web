import { useState, useRef, useCallback, useEffect } from "react";
import {
  createDefaultViewport,
  resetViewport,
  constrainPan,
  zoomAtPoint,
  type ViewportState,
} from "../lib/schematic/schematicViewportController";
import type { SchematicLayout } from "../lib/schematic/schematicLayout";

export function useSchematicViewport(
  layout: SchematicLayout | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  resetRequest: number,
  scrollToPageRequest: { pageIndex: number; timestamp: number } | null,
  onZoomChange?: (zoomPercent: number) => void,
) {
  const [viewport, setViewport] = useState<ViewportState>(createDefaultViewport());
  const viewportRef = useRef(viewport);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    onZoomChange?.(Math.round(viewport.zoom * 100));
  }, [onZoomChange, viewport.zoom]);

  const animateViewport = useCallback((targetVp: ViewportState, durationMs = 250) => {
    if (animFrameId.current !== null) {
      cancelAnimationFrame(animFrameId.current);
    }
    
    const startVp = viewportRef.current;
    const startTime = performance.now();
    
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      
      setViewport({
        panX: startVp.panX + (targetVp.panX - startVp.panX) * ease,
        panY: startVp.panY + (targetVp.panY - startVp.panY) * ease,
        zoom: startVp.zoom + (targetVp.zoom - startVp.zoom) * ease,
      });
      
      if (progress < 1) {
        animFrameId.current = requestAnimationFrame(tick);
      } else {
        animFrameId.current = null;
      }
    };
    
    animFrameId.current = requestAnimationFrame(tick);
  }, []);

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const target = resetViewport(canvas.width, canvas.height, layout.totalWidth, layout.totalHeight);
    animateViewport(target);
  }, [layout, animateViewport, canvasRef]);

  useEffect(() => {
    if (resetRequest > 0) {
      resetView();
    }
  }, [resetRequest, resetView]);

  useEffect(() => {
    if (scrollToPageRequest && layout) {
      const page = layout.pages.find((p) => p.pageIndex === scrollToPageRequest.pageIndex);
      if (page && canvasRef.current) {
        const targetPanY = -page.offsetY * viewport.zoom + 30; // 30px padding
        animateViewport({ panX: viewport.panX, panY: targetPanY, zoom: viewport.zoom }, 400);
      }
    }
  }, [scrollToPageRequest, layout, animateViewport, viewport.panX, viewport.zoom, canvasRef]);

  // Constrain viewport when layout/zoom changes
  useEffect(() => {
    if (!layout || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    setViewport(vp =>
      constrainPan(vp, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight)
    );
  }, [layout, viewport.zoom, canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        if (animFrameId.current !== null) {
          cancelAnimationFrame(animFrameId.current);
          animFrameId.current = null;
        }
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        setViewport((vp) => {
          const zoomed = zoomAtPoint(vp, canvasX, canvasY, factor);
          return layout ? constrainPan(zoomed, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight) : zoomed;
        });
      } else {
        if (animFrameId.current !== null) {
          cancelAnimationFrame(animFrameId.current);
          animFrameId.current = null;
        }
        setViewport((vp) => {
          const dx = e.shiftKey ? e.deltaY : e.deltaX;
          const dy = e.shiftKey ? 0 : e.deltaY;
          const panned = { ...vp, panX: vp.panX - dx, panY: vp.panY - dy };
          return layout
            ? constrainPan(panned, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight)
            : panned;
        });
      }
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleNativeWheel);
  }, [layout, canvasRef]);

  const zoomAroundCanvasCenter = useCallback((factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const zoomed = zoomAtPoint(viewportRef.current, centerX, centerY, factor);
    const target = layout
      ? constrainPan(zoomed, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight)
      : zoomed;
      
    animateViewport(target);
  }, [layout, animateViewport, canvasRef]);

  const stopAnimation = useCallback(() => {
    if (animFrameId.current !== null) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
  }, []);

  return {
    viewport,
    setViewport,
    resetView,
    zoomAroundCanvasCenter,
    stopAnimation,
  };
}
