import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SchematicZoomDock } from "../SchematicZoomDock";

/**
 * Pinch-to-zoom (2 palce) dla zakładek HTML w PDF workspace
 * (strona tytułowa, lista obwodów, protokoły zjednoczone, RCD).
 *
 * Czym się różni od PinchZoomImage:
 *  - PinchZoomImage opiera się na jednym `<img>` — łatwe pan + zoom transformem.
 *  - PinchZoomStage opakowuje ŻYWY HTML z edytowalnymi polami
 *    (input.mp-editable, contenteditable). Pan jednym palcem musimy zostawić
 *    przeglądarce — inaczej zablokujemy focus/edycję i natywny scroll.
 *
 * Decyzje UX:
 *  - Zoom: TYLKO 2 palce (pinch). Granice 1..4.
 *  - Pan: natywny vertical scroll kontenera (`.mp-stage` overflow: auto).
 *    Przy scale > 1 content jest większy niż viewport → scroll działa.
 *  - `touch-action: pan-y` na kontenerze — pozwala vertical scroll,
 *    ALE blokuje przeglądarce native pinch-zoom strony, więc nasz
 *    2-palcowy pinch ma pierwszeństwo.
 *
 * Reset button (jak PinchZoomImage): widoczny gdy scale > 1.
 *
 * Wzorzec matematyczny pinch zaczerpnięty z PinchZoomImage.tsx (prosty
 * ratio-distance + clamp). Te zakładki nie wymagają anchor-preserving
 * zoomu — wystarczy zoom around top-center (transform-origin: top center).
 *
 * WHY: Touch i wheel handlery są rejestrowane natywnie (addEventListener)
 * z { passive: false }, bo React od v17+ rejestruje onTouchStart/onTouchMove
 * jako passive event listenery. Passive listener ignoruje preventDefault()
 * — przeglądarka po cichu go pomija i równocześnie wykonuje native
 * pinch-zoom/scroll. Na smartfonach powodowało to "walkę" między naszym
 * custom pinch a natywnym zoomem strony → erratyczny zoom/pan.
 */
const MAX_SCALE = 4;

interface PinchZoomStageProps {
  children: ReactNode;
  className?: string;
}

export function PinchZoomStage({ children, className }: PinchZoomStageProps) {
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);

  // Stan gestu w ref — aktualizacja scale przez useState (tylko gdy się
  // zmieni wartość co do integera procenta, by nie re-renderować co px).
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialScale: number;
    logicalX: number;
    logicalY: number;
  } | null>(null);

  const [unscaledHeight, setUnscaledHeight] = useState(0);
  const [unscaledWidth, setUnscaledWidth] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const unscaledSizeRef = useRef({ width: 0, height: 0 });

  // WHY: Ref trzymający aktualny scale — natywne event listenery
  // (addEventListener) łapią closure z momentu rejestracji i nie "widzą"
  // nowych wartości state. Bez tego ref handler operowałby na stale=1.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = (entry.target as HTMLElement).offsetHeight;
        const w = (entry.target as HTMLElement).offsetWidth;
        setUnscaledHeight(h);
        setUnscaledWidth(w);
        unscaledSizeRef.current = { width: w, height: h };
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const targetScrollRef = useRef<{ left: number; top: number } | null>(null);

  // useLayoutEffect runs immediately after the DOM is updated (wrapper size changed)
  // but before the browser paints, making the scroll adjustment seamless.
  useLayoutEffect(() => {
    if (targetScrollRef.current && stageRef.current) {
      stageRef.current.scrollLeft = targetScrollRef.current.left;
      stageRef.current.scrollTop = targetScrollRef.current.top;
      targetScrollRef.current = null;
    }
  }, [scale]);

  // WHY: natywne event listenery z { passive: false } — jedyny sposób żeby
  // preventDefault() faktycznie blokował native zoom/scroll na smartfonach.
  // React synthetic events (onTouchStart, onTouchMove) od v17+ są passive,
  // więc preventDefault() w nich jest no-op.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 2) return;
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      if (!t1 || !t2) return;
      // Nie preventDefault(), bo zablokujemy scroll/click na inputach na starcie!
      // preventDefault robi się zwykle na onTouchMove w pinch.
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;

      const rect = el!.getBoundingClientRect();
      const stageX = rect.left + el!.clientLeft;
      const stageY = rect.top + el!.clientTop;

      const currentScale = scaleRef.current;
      const w = unscaledSizeRef.current.width * currentScale;
      const offsetX = Math.max(0, (el!.clientWidth - w) / 2);

      const pointerX_wrapper = (centerX - stageX) + el!.scrollLeft - offsetX;
      const pointerY_wrapper = (centerY - stageY) + el!.scrollTop;

      pinchStateRef.current = {
        initialDistance: Math.hypot(dx, dy),
        initialScale: currentScale,
        logicalX: pointerX_wrapper / currentScale,
        logicalY: pointerY_wrapper / currentScale,
      };
    }

    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length !== 2 || !pinchStateRef.current) return;
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      if (!t1 || !t2) return;
      // Block native scroll ONLY during 2-finger pinch
      event.preventDefault();
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const distance = Math.hypot(dx, dy);

      const {
        initialDistance,
        initialScale,
        logicalX,
        logicalY,
      } = pinchStateRef.current;

      const ratio = distance / initialDistance;
      const nextScale = Math.max(1, Math.min(MAX_SCALE, initialScale * ratio));

      const rect = el!.getBoundingClientRect();
      const stageX = rect.left + el!.clientLeft;
      const stageY = rect.top + el!.clientTop;
      
      const wNext = unscaledSizeRef.current.width * nextScale;
      const nextOffsetX = Math.max(0, (el!.clientWidth - wNext) / 2);

      const currentCenterX = (t1.clientX + t2.clientX) / 2;
      const currentCenterY = (t1.clientY + t2.clientY) / 2;

      const targetScrollLeft = stageX + nextOffsetX + logicalX * nextScale - currentCenterX;
      const targetScrollTop = stageY + logicalY * nextScale - currentCenterY;

      if (nextScale !== scaleRef.current) {
        targetScrollRef.current = {
          left: targetScrollLeft,
          top: targetScrollTop,
        };
        setScale(nextScale);
      } else {
        // Skala się nie zmieniła, render nie zostanie wykonany, ręcznie panujemy!
        el!.scrollLeft = targetScrollLeft;
        el!.scrollTop = targetScrollTop;
      }
    }

    function handleTouchEnd(event: TouchEvent) {
      if (event.touches.length === 0) {
        pinchStateRef.current = null;
      }
    }

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      // Block native browser zoom (entire page zoom)
      event.preventDefault();
      const delta = -event.deltaY * 0.005;
      const currentScale = scaleRef.current;
      const nextScale = Math.max(1, Math.min(MAX_SCALE, currentScale + delta));

      if (nextScale !== currentScale) {
        const rect = el!.getBoundingClientRect();
        const stageX = rect.left + el!.clientLeft;
        const stageY = rect.top + el!.clientTop;

        const w = unscaledSizeRef.current.width * currentScale;
        const offsetX = Math.max(0, (el!.clientWidth - w) / 2);

        const pointerX_wrapper = (event.clientX - stageX) + el!.scrollLeft - offsetX;
        const pointerY_wrapper = (event.clientY - stageY) + el!.scrollTop;

        const logicalX = pointerX_wrapper / currentScale;
        const logicalY = pointerY_wrapper / currentScale;

        const wNext = unscaledSizeRef.current.width * nextScale;
        const nextOffsetX = Math.max(0, (el!.clientWidth - wNext) / 2);

        targetScrollRef.current = {
          left: stageX + nextOffsetX + logicalX * nextScale - event.clientX,
          top: stageY + logicalY * nextScale - event.clientY,
        };
        setScale(nextScale);
      }
    }

    // WHY: { passive: false } — kluczowe! Bez tego preventDefault() jest no-op.
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    // WHY: reset scrolla do góry — po powrocie do scale=1 user widzi początek
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    if (typeof stage.scrollTo === "function") {
      stage.scrollTo({ top: 0, left: 0 });
    } else {
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
    }
  }, []);

  const zoomAtCenter = useCallback((factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const stageX = rect.left + stage.clientLeft;
    const stageY = rect.top + stage.clientTop;

    const pointerX = stageX + stage.clientWidth / 2;
    const pointerY = stageY + stage.clientHeight / 2;

    const currentScale = scaleRef.current;
    const w = unscaledSizeRef.current.width * currentScale;
    const offsetX = Math.max(0, (stage.clientWidth - w) / 2);

    const logicalX = ((pointerX - stageX) + stage.scrollLeft - offsetX) / currentScale;
    const logicalY = ((pointerY - stageY) + stage.scrollTop) / currentScale;

    const nextScale = Math.max(1, Math.min(MAX_SCALE, currentScale * factor));

    if (nextScale !== currentScale) {
      const wNext = unscaledSizeRef.current.width * nextScale;
      const nextOffsetX = Math.max(0, (stage.clientWidth - wNext) / 2);

      targetScrollRef.current = {
        left: stageX + nextOffsetX + logicalX * nextScale - pointerX,
        top: stageY + logicalY * nextScale - pointerY,
      };
      setScale(nextScale);
    }
  }, []);

  return (
    <div
      ref={stageRef}
      className={`mp-stage pinch-zoom-stage ${className ?? ""}`}
      style={{ 
        touchAction: "pan-x pan-y", 
        position: "relative",
        display: "block",
        textAlign: "center"
      }}
    >
      <div
        className="pinch-zoom-stage__wrapper"
        style={{
          width: unscaledWidth > 0 ? unscaledWidth * scale : `${scale * 100}%`,
          height: unscaledHeight > 0 ? unscaledHeight * scale : "auto",
          margin: "0 auto",
          transformOrigin: "top left",
          textAlign: "left"
        }}
      >
        <div
          ref={contentRef}
          className="pinch-zoom-stage__content"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
      <SchematicZoomDock
        zoomPercent={Math.round(scale * 100)}
        onZoomIn={() => zoomAtCenter(1.2)}
        onZoomOut={() => zoomAtCenter(1 / 1.2)}
        onZoomFit={handleReset}
      />
    </div>
  );
}

