import { useCallback, useRef, useState, type ReactNode } from "react";

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
  } | null>(null);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) {
      return;
    }
    const t1 = event.touches[0];
    const t2 = event.touches[1];
    if (!t1 || !t2) {
      return;
    }
    event.preventDefault();
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    pinchStateRef.current = {
      initialDistance: Math.hypot(dx, dy),
      initialScale: scale,
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
    event.preventDefault();
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    const distance = Math.hypot(dx, dy);
    const ratio = distance / pinchStateRef.current.initialDistance;
    const nextScale = Math.max(1, Math.min(MAX_SCALE, pinchStateRef.current.initialScale * ratio));
    setScale(nextScale);
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 0) {
      pinchStateRef.current = null;
    }
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    // WHY: reset scrolla do góry — po powrocie do scale=1 user widzi początek
    // dokumentu, a nie przypadkowy offset z poprzedniego zoom.
    // Defensive: niektóre środowiska (jsdom, stare WebView) nie implementują
    // scrollTo na HTMLElement — fallback do scrollTop assignment.
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    if (typeof stage.scrollTo === "function") {
      stage.scrollTo({ top: 0 });
    } else {
      stage.scrollTop = 0;
    }
  }, []);

  return (
    <div
      ref={stageRef}
      className={`mp-stage pinch-zoom-stage ${className ?? ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-x pan-y" }}
    >
      <div
        className="pinch-zoom-stage__content"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          transition: pinchStateRef.current ? "none" : "transform 0.15s ease-out",
        }}
      >
        {children}
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
