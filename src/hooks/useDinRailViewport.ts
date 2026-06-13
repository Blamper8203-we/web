import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { WorldPoint } from "../components/canvasLayers/canvasTypes";
import { useElementSize } from "./useElementSize";

const MAX_INITIAL_SCALE = 0.25;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

export function useDinRailViewport({
  containerRef,
  viewportRef,
  railWidth,
  railHeight,
  isRailVisible,
}: {
  containerRef: RefObject<HTMLElement | null>;
  viewportRef: RefObject<HTMLElement | SVGElement | null>;
  railWidth: number;
  railHeight: number;
  isRailVisible: boolean;
}) {
  const viewportSize = useElementSize(containerRef);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<WorldPoint>({ x: 0, y: 0 });

  const panRef = useRef<WorldPoint>({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const viewportFrameRef = useRef<number | null>(null);

  const pinchRef = useRef<{
    initialDistance: number;
    initialScale: number;
    midpointViewport: WorldPoint;
  } | null>(null);

  const flushViewportState = useCallback(() => {
    setPan((currentPan) =>
      currentPan.x === panRef.current.x && currentPan.y === panRef.current.y
        ? currentPan
        : panRef.current,
    );
    setScale((currentScale) =>
      currentScale === scaleRef.current ? currentScale : scaleRef.current,
    );
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

  const setPanSafe = useCallback(
    (nextPan: WorldPoint) => {
      panRef.current = nextPan;
      scheduleViewportState();
    },
    [scheduleViewportState],
  );

  const setScaleSafe = useCallback(
    (nextScale: number) => {
      scaleRef.current = nextScale;
      scheduleViewportState();
    },
    [scheduleViewportState],
  );

  const fitToViewport = useCallback(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0 || railWidth <= 0 || railHeight <= 0) {
      return;
    }

    const availW = Math.max(viewportSize.width - 100, 120);
    const availH = Math.max(viewportSize.height - 100, 120);
    const nextScale = Math.min(availW / railWidth, availH / railHeight, MAX_INITIAL_SCALE);

    setScaleSafe(nextScale);
    setPanSafe({
      x: (viewportSize.width - railWidth * nextScale) / 2,
      y: (viewportSize.height - railHeight * nextScale) / 2,
    });
  }, [railHeight, railWidth, setPanSafe, setScaleSafe, viewportSize.height, viewportSize.width]);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: 0, y: 0 };
      }

      return {
        x: (clientX - rect.left - panRef.current.x) / scaleRef.current,
        y: (clientY - rect.top - panRef.current.y) / scaleRef.current,
      };
    },
    [containerRef],
  );

  const zoomAroundViewportPoint = useCallback(
    (viewportPoint: WorldPoint, nextScaleRaw: number) => {
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
    },
    [setPanSafe, setScaleSafe],
  );

  const zoomIn = useCallback(() => {
    if (!isRailVisible) return;
    zoomAroundViewportPoint(
      { x: viewportSize.width / 2, y: viewportSize.height / 2 },
      scaleRef.current * 1.1,
    );
  }, [isRailVisible, viewportSize.height, viewportSize.width, zoomAroundViewportPoint]);

  const zoomOut = useCallback(() => {
    if (!isRailVisible) return;
    zoomAroundViewportPoint(
      { x: viewportSize.width / 2, y: viewportSize.height / 2 },
      scaleRef.current / 1.1,
    );
  }, [isRailVisible, viewportSize.height, viewportSize.width, zoomAroundViewportPoint]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!isRailVisible) return;
      event.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

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
    },
    [containerRef, isRailVisible, viewportSize.height, zoomAroundViewportPoint],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheelNative = (event: WheelEvent) => {
      handleWheel(event);
    };

    const onTouchStartNative = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const t1 = event.touches[0];
      const t2 = event.touches[1];
      if (!t1 || !t2) return;

      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const initialDistance = Math.sqrt(dx * dx + dy * dy);

      pinchRef.current = {
        initialDistance,
        initialScale: scaleRef.current,
        midpointViewport: {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        },
      };
    };

    const onTouchMoveNative = (event: TouchEvent) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();

      const t1 = event.touches[0];
      const t2 = event.touches[1];
      if (!t1 || !t2) return;

      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);

      const scaleFactor = currentDistance / pinch.initialDistance;
      const nextScale = clamp(pinch.initialScale * scaleFactor, MIN_SCALE, MAX_SCALE);

      zoomAroundViewportPoint(pinch.midpointViewport, nextScale);
    };

    const onTouchEndNative = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        pinchRef.current = null;
      }
    };

    viewport.addEventListener("wheel", onWheelNative as EventListener, { passive: false });
    viewport.addEventListener("touchstart", onTouchStartNative as EventListener, { passive: false });
    viewport.addEventListener("touchmove", onTouchMoveNative as EventListener, { passive: false });
    viewport.addEventListener("touchend", onTouchEndNative as EventListener);
    viewport.addEventListener("touchcancel", onTouchEndNative as EventListener);

    return () => {
      viewport.removeEventListener("wheel", onWheelNative as EventListener);
      viewport.removeEventListener("touchstart", onTouchStartNative as EventListener);
      viewport.removeEventListener("touchmove", onTouchMoveNative as EventListener);
      viewport.removeEventListener("touchend", onTouchEndNative as EventListener);
      viewport.removeEventListener("touchcancel", onTouchEndNative as EventListener);
    };
  }, [containerRef, handleWheel, viewportRef, zoomAroundViewportPoint]);

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
    scaleRef,
    panRef,
    viewportSize,
    setPanSafe,
    setScaleSafe,
    fitToViewport,
    zoomIn,
    zoomOut,
    screenToWorld,
    flushViewportState,
  };
}
