import { useCallback, useEffect, useRef, useState } from "react";

interface PinchZoomImageProps {
  src: string;
  alt: string;
  /**
   * Maksymalny zoom (np. 4 = do 400%). Domyślnie 4 — wystarczający do
   * odczytania oznaczeń z DIN/schematu, ale nie przesadny żeby nie
   * pikselizować SVG/PNG.
   */
  maxScale?: number;
  /**
   * Klasy dodatkowe na wrapperze (np. żeby dopasować do layoutu A4 page).
   */
  className?: string;
}

/**
 * Prosty pinch-to-zoom + pan + double-tap-to-zoom dla PNG/SVG podglądów
 * (schemat obwodów, widok rozdzielnicy) w PDF workspace.
 *
 * Bez zewnętrznej biblioteki — wystarczą 4 touch handlery i CSS transform.
 * Wcześniej PNG na telefonie było skalowane tylko do szerokości A4 page
 * (np. 344px na 360px viewport), przez co oznaczenia były nieczytelne.
 * Teraz user może pinch-zoom do 4x i panem przesuwać widok.
 *
 * Obsługiwane gesty:
 * - pinch (2 palce): zoom + pan
 * - pan (1 palec, gdy scale > 1): przesuwanie
 * - double tap: toggle 1x ↔ 2.5x
 * - button resetu (widoczny gdy scale > 1)
 *
 * Granice:
 * - scale: 1..maxScale
 * - pan: nie pozwalam wyjść poza obraz (clamp)
 *
 * WHY: Touch handlery są rejestrowane natywnie (addEventListener) z
 * { passive: false }, bo React od v17+ rejestruje onTouchStart/onTouchMove
 * jako passive event listenery. Passive listener ignoruje preventDefault()
 * — przeglądarka po cichu go pomija i równocześnie wykonuje native
 * pinch-zoom/scroll. Na smartfonach powodowało to "walkę" między naszym
 * custom pinch a natywnym zoomem strony → erratyczny zoom/pan.
 */
export function PinchZoomImage({ src, alt, maxScale = 4, className }: PinchZoomImageProps) {
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // WHY: śledzenie aktywnego pinch gestu przez referencje zamiast state —
  // useState powodowałby re-render przy każdym ruchu palca, a my chcemy
  // tylko aktualizować transform CSS (bez rerenderu React).
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialScale: number;
    initialPanX: number;
    initialPanY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const panStateRef = useRef<{
    initialX: number;
    initialY: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);

  const lastTapRef = useRef<number>(0);

  // WHY: Refs trzymające aktualny stan (scale, panX, panY, maxScale) —
  // natywne event listenery (addEventListener) łapią closure z momentu
  // rejestracji i nie "widzą" nowych wartości state. Bez tych refów
  // handler touchstart/touchmove operowałby na stale=1, panX=0, panY=0.
  const scaleRef = useRef(scale);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const maxScaleRef = useRef(maxScale);
  scaleRef.current = scale;
  panXRef.current = panX;
  panYRef.current = panY;
  maxScaleRef.current = maxScale;

  // WHY: clamp pozycji obrazu w granicach widoku po zmianie skali/panelu.
  // Bez tego użytkownik mógłby "zgubić" obraz przesuwając za daleko.
  const clampPan = useCallback((nextPanX: number, nextPanY: number, nextScale: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return { panX: nextPanX, panY: nextPanY };
    }
    const { clientWidth, clientHeight } = wrapper;
    // Ile px obraz "wystaje" poza wrapper przy danym scale.
    // img ma objectFit: contain — dla uproszczenia zakładamy że
    // naturalnie wypełnia wrapper, więc dodatkowy obszar = (scale - 1) * dim.
    const overflowX = ((nextScale - 1) * clientWidth) / 2;
    const overflowY = ((nextScale - 1) * clientHeight) / 2;
    return {
      panX: Math.max(-overflowX, Math.min(overflowX, nextPanX)),
      panY: Math.max(-overflowY, Math.min(overflowY, nextPanY)),
    };
  }, []);

  // WHY: natywne event listenery z { passive: false } — jedyny sposób żeby
  // preventDefault() faktycznie blokował native zoom/scroll na smartfonach.
  // React synthetic events (onTouchStart, onTouchMove) od v17+ są passive,
  // więc preventDefault() w nich jest no-op.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function handleTouchStart(event: TouchEvent) {
      const touches = event.touches;
      if (touches.length === 2) {
        // pinch start
        event.preventDefault();
        const t1 = touches[0];
        const t2 = touches[1];
        if (!t1 || !t2) return;
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const distance = Math.hypot(dx, dy);
        const wrapperRect = el!.getBoundingClientRect();
        pinchStateRef.current = {
          initialDistance: distance,
          initialScale: scaleRef.current,
          initialPanX: panXRef.current,
          initialPanY: panYRef.current,
          centerX: (t1.clientX + t2.clientX) / 2 - wrapperRect.left,
          centerY: (t1.clientY + t2.clientY) / 2 - wrapperRect.top,
        };
        panStateRef.current = null;
      } else if (touches.length === 1 && scaleRef.current > 1) {
        // pan start (tylko gdy zoomed in)
        const touch = touches[0];
        if (!touch) return;
        event.preventDefault();
        panStateRef.current = {
          initialX: touch.clientX,
          initialY: touch.clientY,
          initialPanX: panXRef.current,
          initialPanY: panYRef.current,
        };
      } else if (touches.length === 1) {
        // detect double tap
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          // toggle zoom
          event.preventDefault();
          if (scaleRef.current > 1) {
            setScale(1);
            setPanX(0);
            setPanY(0);
          } else {
            setScale(2.5);
          }
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
    }

    function handleTouchMove(event: TouchEvent) {
      const touches = event.touches;
      if (touches.length === 2 && pinchStateRef.current) {
        event.preventDefault();
        const t1 = touches[0];
        const t2 = touches[1];
        if (!t1 || !t2) return;
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const distance = Math.hypot(dx, dy);
        const ratio = distance / pinchStateRef.current.initialDistance;
        const newScale = Math.max(
          1,
          Math.min(maxScaleRef.current, pinchStateRef.current.initialScale * ratio),
        );
        setScale(newScale);

        // Pan podczas pinch: przesuwaj obraz tak, żeby punkt środkowy pinch
        // pozostał w tym samym miejscu wizualnie.
        const scaleDelta = newScale / pinchStateRef.current.initialScale;
        const newPanX = pinchStateRef.current.centerX * (1 - scaleDelta) + pinchStateRef.current.initialPanX * scaleDelta;
        const newPanY = pinchStateRef.current.centerY * (1 - scaleDelta) + pinchStateRef.current.initialPanY * scaleDelta;
        const clamped = clampPan(newPanX, newPanY, newScale);
        setPanX(clamped.panX);
        setPanY(clamped.panY);
      } else if (touches.length === 1 && panStateRef.current && scaleRef.current > 1) {
        event.preventDefault();
        const touch = touches[0];
        if (!touch) return;
        const newPanX = panStateRef.current.initialPanX + (touch.clientX - panStateRef.current.initialX);
        const newPanY = panStateRef.current.initialPanY + (touch.clientY - panStateRef.current.initialY);
        const clamped = clampPan(newPanX, newPanY, scaleRef.current);
        setPanX(clamped.panX);
        setPanY(clamped.panY);
      }
    }

    function handleTouchEnd(event: TouchEvent) {
      if (event.touches.length === 0) {
        pinchStateRef.current = null;
        panStateRef.current = null;
      }
    }

    // WHY: { passive: false } — kluczowe! Bez tego preventDefault() jest no-op.
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [clampPan]);

  const handleReset = useCallback(() => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // Mouse wheel zoom dla desktop (laptop z trackpadem)
  // WHY: onWheel w React jest passive na Chrome, więc też rejestrujemy natywnie.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = -event.deltaY * 0.005;
      setScale((prev) => Math.max(1, Math.min(maxScaleRef.current, prev + delta)));
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Gdy obraz się przeładuje (np. nowy schematic), resetuj zoom
  useEffect(() => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  }, [src]);

  return (
    <div
      ref={wrapperRef}
      className={`pinch-zoom-image ${className ?? ""}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: pinchStateRef.current || panStateRef.current ? "none" : "transform 0.15s ease-out",
          pointerEvents: "none",
        }}
      />
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
