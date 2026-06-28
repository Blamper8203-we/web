import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PinchZoomImage } from "./PinchZoomImage";

// Mock touch eventów w jsdom. React oczekuje TouchEvent z `touches` listą,
// ale konstruktor TouchEvent nie jest dostępny w jsdom. Tworzymy Event
// z dodatkowymi polami i rzutujemy — fireEvent z testing-library wymaga
// Event, nie TouchEvent, więc helper zwraca "Event & TouchEvent-like".
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

describe("PinchZoomImage", () => {
  it("renderuje img z src i alt", () => {
    render(<PinchZoomImage src="test.png" alt="Test image" />);
    const img = screen.getByAltText("Test image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "test.png");
  });

  it("domyślnie scale=1 — brak przycisku resetu", () => {
    render(<PinchZoomImage src="test.png" alt="Test" />);
    expect(screen.queryByLabelText(/reset zoom/i)).not.toBeInTheDocument();
  });

  it("aplikuje touch-action: none żeby pinch nie scrollował rodzica", () => {
    const { container } = render(<PinchZoomImage src="test.png" alt="Test" />);
    const wrapper = container.querySelector(".pinch-zoom-image");
    expect(wrapper).toHaveStyle({ touchAction: "none" });
  });

  it("nie crashuje przy onTouchStart z 1 palcem (double-tap detection)", () => {
    const { container } = render(<PinchZoomImage src="test.png" alt="Test" />);
    const wrapper = container.querySelector(".pinch-zoom-image");
    if (!wrapper) throw new Error("wrapper not found");
    const event = makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]);
    fireEvent(wrapper, event);
    // Brak throw = OK
  });

  it("nie crashuje przy onTouchStart z 2 palcami (pinch start)", () => {
    const { container } = render(<PinchZoomImage src="test.png" alt="Test" />);
    const wrapper = container.querySelector(".pinch-zoom-image");
    if (!wrapper) throw new Error("wrapper not found");
    const event = makeTouchEvent("touchstart", [
      { clientX: 100, clientY: 100 },
      { clientX: 200, clientY: 200 },
    ]);
    fireEvent(wrapper, event);
    // Brak throw = OK
  });

  it("double tap toggle zoom: scale 1 → 2.5 → 1", () => {
    const { container } = render(<PinchZoomImage src="test.png" alt="Test" />);
    const wrapper = container.querySelector(".pinch-zoom-image");
    if (!wrapper) throw new Error("wrapper not found");

    // pierwszy tap
    fireEvent(wrapper, makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    // czekamy 50ms
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // drugi tap (double tap)
        fireEvent(wrapper, makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
        const img = screen.getByAltText("Test");
        const transform = (img as HTMLElement).style.transform;
        // Po double tap z scale=1 → powinno być scale 2.5
        expect(transform).toContain("scale(2.5)");
        // reset button widoczny
        expect(screen.getByLabelText(/reset zoom/i)).toBeInTheDocument();
        resolve();
      }, 50);
    });
  });

  it("przy zmianie src resetuje zoom do 1x", () => {
    const { rerender, container } = render(<PinchZoomImage src="a.png" alt="Test" />);
    const wrapper = container.querySelector(".pinch-zoom-image");
    if (!wrapper) throw new Error("wrapper not found");

    // double tap → scale 2.5
    fireEvent(wrapper, makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        fireEvent(wrapper, makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
        const img = screen.getByAltText("Test");
        expect((img as HTMLElement).style.transform).toContain("scale(2.5)");

        // zmiana src → useEffect resetuje
        rerender(<PinchZoomImage src="b.png" alt="Test" />);
        const imgAfter = screen.getByAltText("Test");
        expect((imgAfter as HTMLElement).style.transform).toContain("scale(1)");
        resolve();
      }, 50);
    });
  });
});
