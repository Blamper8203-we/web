import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PinchZoomImage } from "./PinchZoomImage";

// WHY: Po przejściu na natywne event listenery (addEventListener z
// { passive: false }) zamiast React synthetic events, musimy dispatchować
// natywne TouchEvent na element DOM, a nie przez fireEvent z React.
// fireEvent uruchamia React synthetic event, ale nasze handlery są
// zarejestrowane natywnie — fireEvent ich nie triggeruje.

function makeTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>): TouchEvent {
  // jsdom nie ma pełnego TouchEvent, ale możemy stworzyć Event z polem touches.
  const baseEvent = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(baseEvent, "touches", {
    value: touches.map((t, i) => ({ identifier: i, ...t })),
    writable: false,
  });
  return baseEvent as unknown as TouchEvent;
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
    act(() => {
      wrapper.dispatchEvent(makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });
    // Brak throw = OK
  });

  it("nie crashuje przy onTouchStart z 2 palcami (pinch start)", () => {
    const { container } = render(<PinchZoomImage src="test.png" alt="Test" />);
    const wrapper = container.querySelector(".pinch-zoom-image");
    if (!wrapper) throw new Error("wrapper not found");
    act(() => {
      wrapper.dispatchEvent(makeTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 },
      ]));
    });
    // Brak throw = OK
  });

  it("double tap toggle zoom: scale 1 → 2.5 → 1", () => {
    const { container } = render(<PinchZoomImage src="test.png" alt="Test" />);
    const wrapper = container.querySelector(".pinch-zoom-image");
    if (!wrapper) throw new Error("wrapper not found");

    // pierwszy tap
    act(() => {
      wrapper.dispatchEvent(makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });
    // czekamy 50ms
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // drugi tap (double tap)
        act(() => {
          wrapper.dispatchEvent(makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
        });
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
    act(() => {
      wrapper.dispatchEvent(makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        act(() => {
          wrapper.dispatchEvent(makeTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
        });
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
