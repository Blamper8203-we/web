import { useCallback, useEffect, useRef, useState } from "react";
import { clamp } from "../../lib/dinRailCanvas/geometry";
import { MAX_INITIAL_SCALE, MAX_SCALE, MIN_SCALE } from "../../lib/dinRailCanvas/constants";
import type { WorldPoint } from "../../lib/dinRailCanvas/types";
import type { DinRailCanvasRail } from "../../components/DinRailCanvas";

export function useDinRailViewport({
  rail,
  viewportSize,
  containerRef,
  viewportRef,
  onZoomChange,
}: {
  rail: DinRailCanvasRail;
  viewportSize: { width: number; height: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  onZoomChange?: (zoomPercent: number) => void;
}) {
  const panRef = useRef<WorldPoint>({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const viewportFrameRef = useRef<number | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<WorldPoint>({ x: 0, y: 0 });

  const flushViewportState = useCallback(() => {
    setPan((currentPan: WorldPoint) => (
      currentPan.x === panRef.current.x && currentPan.y === panRef.current.y
        ? currentPan
        : panRef.current
    ));
    setScale((currentScale) => (
      currentScale === scaleRef.current ? currentScale : scaleRef.current
    ));
  }, []);

  const scheduleViewportState = useCallback(() => {
    if (typeof window === "undefined") {
      flushViewportState();
      return;
    }

    if (viewportFrameRef.current !== null) {
      return;
    }

    viewportFrameRef.current = window.requestAnimationFrame(() => {
      viewportFrameRef.current = null;
      flushViewportState();
    });
  }, [flushViewportState]);

  const setPanSafe = useCallback((nextPan: WorldPoint) => {
    panRef.current = nextPan;
    scheduleViewportState();
  }, [scheduleViewportState]);

  const setScaleSafe = useCallback((nextScale: number) => {
    scaleRef.current = nextScale;
    scheduleViewportState();
  }, [scheduleViewportState]);

  const fitToViewport = useCallback(() => {
    if (
      viewportSize.width <= 0
      || viewportSize.height <= 0
      || rail.width <= 0
      || rail.height <= 0
    ) {
      return;
    }

    const availW = Math.max(viewportSize.width - 100, 120);
    const availH = Math.max(viewportSize.height - 100, 120);
    const nextScale = Math.min(availW / rail.width, availH / rail.height, MAX_INITIAL_SCALE);

    setScaleSafe(nextScale);
    setPanSafe({
      x: (viewportSize.width - rail.width * nextScale) / 2,
      y: (viewportSize.height - rail.height * nextScale) / 2,
    });
  }, [rail.height, rail.width, setPanSafe, setScaleSafe, viewportSize.height, viewportSize.width]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left - panRef.current.x) / scaleRef.current,
      y: (clientY - rect.top - panRef.current.y) / scaleRef.current,
    };
  }, [containerRef]);

  const zoomAroundViewportPoint = useCallback((viewportPoint: WorldPoint, nextScaleRaw: number) => {
    const currentScale = scaleRef.current;
    const currentPan = panRef.current;
    const nextScale = clamp(nextScaleRaw, MIN_SCALE, MAX_SCALE);
    const worldX = (viewportPoint.x - currentPan.x) / currentScale;
    const worldY = (viewportPoint.y - currentPan.y) / currentScale;

    setScaleSafe(nextScale);
    setPanSafe({
      x: viewportPoint.x - worldX * nextScale,
      y: viewportPoint.y - worldY * nextScale,
    });
  }, [setPanSafe, setScaleSafe]);

  const zoomIn = useCallback(() => {
    if (!rail.isVisible) {
      return;
    }

    zoomAroundViewportPoint(
      { x: viewportSize.width / 2, y: viewportSize.height / 2 },
      scaleRef.current * 1.1,
    );
  }, [rail.isVisible, viewportSize.height, viewportSize.width, zoomAroundViewportPoint]);

  const zoomOut = useCallback(() => {
    if (!rail.isVisible) {
      return;
    }

    zoomAroundViewportPoint(
      { x: viewportSize.width / 2, y: viewportSize.height / 2 },
      scaleRef.current / 1.1,
    );
  }, [rail.isVisible, viewportSize.height, viewportSize.width, zoomAroundViewportPoint]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!rail.isVisible) {
      return;
    }

    // WHY: preventDefault stops the browser's native page scroll on wheel.
    // stopPropagation prevents the event from bubbling to higher-level wheel
    // handlers in App.tsx / global keyboard panels — without it, a single
    // wheel gesture on the canvas can both zoom the rail AND trigger a
    // tab-switch or panel-open, depending on listener order in the DOM tree.
    event.preventDefault();
    event.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const viewportPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const normalizedDelta =
      event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * Math.max(viewportSize.height, 1)
          : event.deltaY;
    const factor = clamp(Math.exp(-normalizedDelta * 0.0015), 0.82, 1.22);
    zoomAroundViewportPoint(viewportPoint, scaleRef.current * factor);
  }, [containerRef, rail.isVisible, viewportSize.height, zoomAroundViewportPoint]);

  useEffect(() => {
    onZoomChange?.(Math.round(scale * 100));
  }, [onZoomChange, scale]);

  useEffect(() => {
    if (rail.isVisible && viewportSize.width > 0 && viewportSize.height > 0) {
      fitToViewport();
      return;
    }

    if (!rail.isVisible) {
      setScaleSafe(1);
      setPanSafe({ x: 0, y: 0 });
    }
  }, [fitToViewport, rail.isVisible, setPanSafe, setScaleSafe, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const onWheelNative = (event: WheelEvent) => {
      handleWheel(event);
    };

    viewport.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheelNative);
    };
  }, [handleWheel, viewportRef]);

  useEffect(() => {
    return () => {
      if (viewportFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportFrameRef.current);
        viewportFrameRef.current = null;
      }
    };
  }, []);

  return {
    scale,
    pan,
    panRef,
    scaleRef,
    setPanSafe,
    setScaleSafe,
    flushViewportState,
    fitToViewport,
    screenToWorld,
    zoomIn,
    zoomOut,
  };
}
