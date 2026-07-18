import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PinchZoomStage } from "./PinchZoomStage";

// WHY: Po przejściu na natywne event listenery (addEventListener z
// { passive: false }) zamiast React synthetic events, musimy dispatchować
// natywne TouchEvent na element DOM, a nie przez fireEvent z React.

function makeTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>): TouchEvent {
  const baseEvent = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(baseEvent, "touches", {
    value: touches.map((t, i) => ({ identifier: i, ...t })),
    writable: false,
  });
  return baseEvent as unknown as TouchEvent;
}

describe("PinchZoomStage", () => {
  it("renderuje children", () => {
    render(<PinchZoomStage><div>Test content</div></PinchZoomStage>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("domyślnie scale=1", () => {
    render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("aplikuje touch-action: pan-x pan-y (pozwala na scroll poziomy/pionowy, blokuje native pinch)", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    expect(stage).toBeInTheDocument();
    expect(stage).toHaveStyle({ touchAction: "pan-x pan-y" });
  });

  it("ignores touchstart z < 2 palcami (nie wejdzie w pinch)", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    if (!stage) throw new Error("stage not found");

    act(() => {
      stage.dispatchEvent(makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("2-palcowy pinch-in zwiększa scale", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    if (!stage) throw new Error("stage not found");

    // Start: 2 palce, distance 100.
    act(() => {
      stage.dispatchEvent(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]));
    });
    // Move: rozsunięte do distance 300 → ratio 3 → scale 3.
    act(() => {
      stage.dispatchEvent(makeTouchEvent("touchmove", [
        { clientX: 0, clientY: 100 },
        { clientX: 300, clientY: 100 },
      ]));
    });

    expect(screen.getByText("300%")).toBeInTheDocument();
  });

  it("clamp przy max scale 4", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    if (!stage) throw new Error("stage not found");

    act(() => {
      stage.dispatchEvent(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 110, clientY: 100 }, // distance 10
      ]));
    });
    // Rozsunięcie do distance 1000 → ratio 100 → clamp do 4.
    act(() => {
      stage.dispatchEvent(makeTouchEvent("touchmove", [
        { clientX: 0, clientY: 100 },
        { clientX: 1000, clientY: 100 },
      ]));
    });

    expect(screen.getByText("400%")).toBeInTheDocument();
  });

  it("przycisk 'Dopasuj do widoku' przywraca scale do 1", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    if (!stage) throw new Error("stage not found");

    // Zoom in.
    act(() => {
      stage.dispatchEvent(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ]));
    });
    act(() => {
      stage.dispatchEvent(makeTouchEvent("touchmove", [
        { clientX: 50, clientY: 100 },
        { clientX: 250, clientY: 100 },
      ]));
    });
    expect(screen.getByText("200%")).toBeInTheDocument();

    // Reset.
    const resetBtn = screen.getByLabelText(/Dopasuj do widoku/i);
    fireEvent.click(resetBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
