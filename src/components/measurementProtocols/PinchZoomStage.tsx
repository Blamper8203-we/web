import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

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
    initialPointerX: number;
    initialPointerY: number;
    initialScrollLeft: number;
    initialScrollTop: number;
  } | null>(null);

  const [unscaledHeight, setUnscaledHeight] = useState(0);
  const [unscaledWidth, setUnscaledWidth] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setUnscaledHeight((entry.target as HTMLElement).offsetHeight);
        setUnscaledWidth((entry.target as HTMLElement).offsetWidth);
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

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) {
      return;
    }
    const t1 = event.touches[0];
    const t2 = event.touches[1];
    if (!t1 || !t2) {
      return;
    }
    // Nie preventDefault(), bo zablokujemy scroll/click na inputach na starcie!
    // preventDefault robi się zwykle na onTouchMove w pinch.
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    const centerX = (t1.clientX + t2.clientX) / 2;
    const centerY = (t1.clientY + t2.clientY) / 2;
    
    let pointerX = 0;
    let pointerY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    const stage = stageRef.current;
    if (stage) {
      const rect = stage.getBoundingClientRect();
      pointerX = centerX - rect.left;
      pointerY = centerY - rect.top;
      scrollLeft = stage.scrollLeft;
      scrollTop = stage.scrollTop;
    }

    pinchStateRef.current = {
      initialDistance: Math.hypot(dx, dy),
      initialScale: scale,
      initialPointerX: pointerX,
      initialPointerY: pointerY,
      initialScrollLeft: scrollLeft,
      initialScrollTop: scrollTop,
    };
  }, [scale]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchStateRef.current) {
      return;
    }
    const t1 = event.touches[0];
    const t2 = event.touches[1];
    if (!t1 || !t2) {
      return;
    }
    // Block native scroll ONLY during 2-finger pinch
    event.preventDefault();
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    const distance = Math.hypot(dx, dy);
    
    const {
      initialDistance,
      initialScale,
      initialPointerX,
      initialPointerY,
      initialScrollLeft,
      initialScrollTop,
    } = pinchStateRef.current;

    const ratio = distance / initialDistance;
    const nextScale = Math.max(1, Math.min(MAX_SCALE, initialScale * ratio));
    
    const stage = stageRef.current;
    if (stage) {
      const rect = stage.getBoundingClientRect();
      const currentCenterX = (t1.clientX + t2.clientX) / 2;
      const currentCenterY = (t1.clientY + t2.clientY) / 2;
      const currentPointerX = currentCenterX - rect.left;
      const currentPointerY = currentCenterY - rect.top;

      // Punkt dokumentu, który na początku gestu znajdował się pod palcami
      const contentX = (initialScrollLeft + initialPointerX) / initialScale;
      const contentY = (initialScrollTop + initialPointerY) / initialScale;

      // Nowy scroll, który ustawi ten sam punkt pod obecnym położeniem palców
      const targetScrollLeft = contentX * nextScale - currentPointerX;
      const targetScrollTop = contentY * nextScale - currentPointerY;

      if (nextScale !== scale) {
        targetScrollRef.current = {
          left: targetScrollLeft,
          top: targetScrollTop,
        };
        setScale(nextScale);
      } else {
        // Skala się nie zmieniła, render nie zostanie wykonany, ręcznie panujemy!
        stage.scrollLeft = targetScrollLeft;
        stage.scrollTop = targetScrollTop;
      }
    }
  }, [scale]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 0) {
      pinchStateRef.current = null;
    }
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    // Block native browser zoom (entire page zoom)
    event.preventDefault();
    const delta = -event.deltaY * 0.005;
    const nextScale = Math.max(1, Math.min(MAX_SCALE, scale + delta));
    
    if (nextScale !== scale) {
      const stage = stageRef.current;
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;

        const contentX = (stage.scrollLeft + pointerX) / scale;
        const contentY = (stage.scrollTop + pointerY) / scale;

        targetScrollRef.current = {
          left: contentX * nextScale - pointerX,
          top: contentY * nextScale - pointerY,
        };
      }
      setScale(nextScale);
    }
  }, [scale]);

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

  return (
    <div
      ref={stageRef}
      className={`mp-stage pinch-zoom-stage ${className ?? ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      style={{ touchAction: "pan-x pan-y" }}
    >
      <div
        className="pinch-zoom-stage__wrapper"
        style={{
          width: unscaledWidth > 0 ? unscaledWidth * scale : `${scale * 100}%`,
          height: unscaledHeight > 0 ? unscaledHeight * scale : "auto",
          transformOrigin: "top left",
        }}
      >
        <div
          ref={contentRef}
          className="pinch-zoom-stage__content"
          style={{
            width: `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            transition: pinchStateRef.current ? "none" : "transform 0.15s ease-out, width 0.15s ease-out",
          }}
        >
          {children}
        </div>
      </div>
      {scale > 1 && (
        <button
          type="button"
          className="pinch-zoom-reset"
          onClick={handleReset}
          aria-label={`Reset zoom (${Math.round(scale * 100)}%)`}
          title={`Reset zoom (${Math.round(scale * 100)}%)`}
        >
          <span className="pinch-zoom-reset__icon" aria-hidden="true">×</span>
          <span className="pinch-zoom-reset__label">{Math.round(scale * 100)}%</span>
        </button>
      )}
    </div>
  );
}
