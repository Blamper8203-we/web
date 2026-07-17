import { describe, it, expect } from "vitest";
import { TAP_THRESHOLD_PX, touchDistance, isTap, type TouchPoint } from "./tapDetection";

describe("touchDistance", () => {
  it("is 0 when start and end coincide", () => {
    const p: TouchPoint = { x: 100, y: 50 };
    expect(touchDistance(p, p)).toBe(0);
  });

  it("computes straight horizontal distance", () => {
    expect(touchDistance({ x: 0, y: 0 }, { x: 30, y: 0 })).toBeCloseTo(30);
  });

  it("computes diagonal distance via Euclidean formula", () => {
    // 3-4-5 triangle → distance = 5
    expect(touchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it("is symmetric: dist(a,b) == dist(b,a)", () => {
    const a: TouchPoint = { x: 10, y: 20 };
    const b: TouchPoint = { x: 70, y: -15 };
    expect(touchDistance(a, b)).toBeCloseTo(touchDistance(b, a));
  });
});

describe("isTap", () => {
  it("returns true for a touch at the same point (0px movement)", () => {
    const p: TouchPoint = { x: 100, y: 100 };
    expect(isTap(p, p)).toBe(true);
  });

  it("returns true for a tiny finger jitter under the threshold", () => {
    expect(isTap({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true); // ~7px < 10
  });

  it("returns false for a clear vertical swipe", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 100, y: 150 })).toBe(false); // 50px
  });

  it("returns false for a clear horizontal swipe", () => {
    expect(isTap({ x: 0, y: 0 }, { x: 30, y: 0 })).toBe(false);
  });

  it("returns false for a diagonal swipe just past the threshold", () => {
    // Build a point exactly at the threshold boundary. isTap uses strict <,
    // so distance === threshold counts as a swipe (false), not a tap.
    const dist = TAP_THRESHOLD_PX;
    expect(isTap({ x: 0, y: 0 }, { x: dist, y: 0 })).toBe(false);
    expect(isTap({ x: 0, y: 0 }, { x: dist - 0.01, y: 0 })).toBe(true);
  });

  it("returns false when start is null (touchend without preceding touchstart)", () => {
    // Bezpieczny fallback: nigdy nie traktujemy "wiszącego" touchend jako tap,
    // bo to dodawałoby moduł przypadkiem (np. po systemowym przerwaniu sekwencji).
    expect(isTap(null, { x: 0, y: 0 })).toBe(false);
  });
});
