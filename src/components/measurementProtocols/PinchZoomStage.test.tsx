import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PinchZoomStage } from "./PinchZoomStage";

type MockTouchEvent = Event & {
  touches: Array<{ identifier: number; clientX: number; clientY: number }>;
  preventDefault: () => void;
};

function makeTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>): MockTouchEvent {
  const baseEvent = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(baseEvent, {
    touches: touches.map((t, i) => ({ identifier: i, ...t })),
    preventDefault: vi.fn(),
  });
}

describe("PinchZoomStage", () => {
  it("renderuje children", () => {
    render(<PinchZoomStage><div>Test content</div></PinchZoomStage>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("domyślnie scale=1 — brak przycisku resetu", () => {
    render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    expect(screen.queryByLabelText(/reset zoom/i)).not.toBeInTheDocument();
  });

  it("aplikuje touch-action: pan-y (pozwala vertical scroll, blokuje native pinch)", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    expect(stage).toBeInTheDocument();
    expect(stage).toHaveStyle({ touchAction: "pan-y" });
  });

  it("ignores touchstart z < 2 palcami (nie wejdzie w pinch)", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    if (!stage) throw new Error("stage not found");

    fireEvent(stage, makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    // Brak throw i brak reset buttona = scale nadal 1.
    expect(screen.queryByLabelText(/reset zoom/i)).not.toBeInTheDocument();
  });

  it("2-palcowy pinch-in zwiększa scale i pokazuje reset button", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    if (!stage) throw new Error("stage not found");

    // Start: 2 palce, distance 100.
    fireEvent(stage, makeTouchEvent("touchstart", [
      { clientX: 100, clientY: 100 },
      { clientX: 200, clientY: 100 },
    ]));
    // Move: rozsunięte do distance 300 → ratio 3 → scale 3.
    fireEvent(stage, makeTouchEvent("touchmove", [
      { clientX: 0, clientY: 100 },
      { clientX: 300, clientY: 100 },
    ]));

    expect(screen.getByLabelText(/reset zoom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reset zoom/i)).toHaveAttribute(
      "title",
      expect.stringContaining("300%"),
    );
  });

  it("clamp przy max scale 4", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    if (!stage) throw new Error("stage not found");

    fireEvent(stage, makeTouchEvent("touchstart", [
      { clientX: 100, clientY: 100 },
      { clientX: 110, clientY: 100 }, // distance 10
    ]));
    // Rozsunięcie do distance 1000 → ratio 100 → clamp do 4.
    fireEvent(stage, makeTouchEvent("touchmove", [
      { clientX: 0, clientY: 100 },
      { clientX: 1000, clientY: 100 },
    ]));

    const resetBtn = screen.getByLabelText(/reset zoom/i);
    expect(resetBtn).toHaveAttribute("title", expect.stringContaining("400%"));
  });

  it("reset button przywraca scale do 1", () => {
    const { container } = render(<PinchZoomStage><div>x</div></PinchZoomStage>);
    const stage = container.querySelector(".pinch-zoom-stage");
    if (!stage) throw new Error("stage not found");

    // Zoom in.
    fireEvent(stage, makeTouchEvent("touchstart", [
      { clientX: 100, clientY: 100 },
      { clientX: 200, clientY: 100 },
    ]));
    fireEvent(stage, makeTouchEvent("touchmove", [
      { clientX: 50, clientY: 100 },
      { clientX: 250, clientY: 100 },
    ]));
    expect(screen.getByLabelText(/reset zoom/i)).toBeInTheDocument();

    // Reset.
    fireEvent.click(screen.getByLabelText(/reset zoom/i));
    expect(screen.queryByLabelText(/reset zoom/i)).not.toBeInTheDocument();
  });
});
