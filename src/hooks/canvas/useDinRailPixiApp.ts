import { useEffect, useRef, useState } from "react";
import { Application, Container, Text, TextStyle } from "pixi.js";
import { PIXI_MAX_RESOLUTION } from "../../lib/dinRailCanvas/constants";
import { getSymbolDesignationLabel } from "../../lib/dinRailCanvas/geometry";
import type { SymbolItem } from "../../types/symbolItem";
import type { WorldPoint } from "../../lib/dinRailCanvas/types";

export function useDinRailPixiApp({
  pixiHostRef,
  viewportSize,
  shouldRenderPixiLabels,
  pan,
  scale,
  panRef,
  scaleRef,
  snappedSymbols,
  automaticDesignationBySymbolId,
}: {
  pixiHostRef: React.RefObject<HTMLDivElement | null>;
  viewportSize: { width: number; height: number };
  shouldRenderPixiLabels: boolean;
  pan: WorldPoint;
  scale: number;
  panRef: React.MutableRefObject<WorldPoint>;
  scaleRef: React.MutableRefObject<number>;
  snappedSymbols: SymbolItem[];
  automaticDesignationBySymbolId: Map<string, string>;
}) {
  const appRef = useRef<Application | null>(null);
  const pixiWorldRef = useRef<Container | null>(null);
  const [isPixiReady, setIsPixiReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function mountApp() {
      const host = pixiHostRef.current;
      if (!shouldRenderPixiLabels || !host || appRef.current) {
        return;
      }

      const app = new Application();
      await app.init({
        width: Math.max(host.clientWidth, 1),
        height: Math.max(host.clientHeight, 1),
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, PIXI_MAX_RESOLUTION),
      });

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      host.appendChild(app.canvas);
      appRef.current = app;
      setIsPixiReady(true);
    }

    void mountApp();

    return () => {
      cancelled = true;
    };
  }, [shouldRenderPixiLabels, pixiHostRef, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (shouldRenderPixiLabels) {
      return;
    }

    const app = appRef.current;
    if (!app) {
      return;
    }

    app.destroy(true, { children: true });
    appRef.current = null;
    pixiWorldRef.current = null;
    setIsPixiReady(false);
  }, [shouldRenderPixiLabels]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || viewportSize.width <= 0 || viewportSize.height <= 0) {
      return;
    }

    app.renderer.resize(viewportSize.width, viewportSize.height);
  }, [viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !isPixiReady || !shouldRenderPixiLabels) {
      return;
    }

    let world = pixiWorldRef.current;
    if (!world) {
      world = new Container();
      pixiWorldRef.current = world;
      app.stage.addChild(world);
    }

    world.position.set(pan.x, pan.y);
    world.scale.set(scale, scale);
  }, [isPixiReady, pan.x, pan.y, scale, shouldRenderPixiLabels]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !isPixiReady || !shouldRenderPixiLabels) {
      return;
    }

    let world = pixiWorldRef.current;
    if (!world) {
      world = new Container();
      pixiWorldRef.current = world;
      app.stage.addChild(world);
    }

    world.removeChildren();
    world.position.set(panRef.current.x, panRef.current.y);
    world.scale.set(scaleRef.current, scaleRef.current);

    for (const symbol of snappedSymbols) {
      const designationLabel = getSymbolDesignationLabel(
        symbol,
        automaticDesignationBySymbolId,
      );
      if (designationLabel) {
        const designation = new Text({
          text: designationLabel,
          style: new TextStyle({
            fill: "#f8fafc",
            fontFamily: "Segoe UI, Arial, sans-serif",
            fontSize: 14,
            fontWeight: "700",
            align: "center",
            stroke: { color: "#111827", width: 2, join: "round" },
          }),
        });
        designation.x = symbol.x + Math.max(symbol.width, 48) / 2 - designation.width / 2;
        designation.y = symbol.y + symbol.height + 5;
        designation.roundPixels = true;
        world.addChild(designation);
      }
    }
  }, [automaticDesignationBySymbolId, isPixiReady, shouldRenderPixiLabels, snappedSymbols, panRef, scaleRef]);

  useEffect(() => {
    return () => {
      const app = appRef.current;
      if (app) {
        app.destroy(true, { children: true });
        appRef.current = null;
        pixiWorldRef.current = null;
        setIsPixiReady(false);
      }
    };
  }, []);

  return { isPixiReady };
}
