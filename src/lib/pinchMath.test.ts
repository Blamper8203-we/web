import { describe, it, expect } from "vitest";
import { computePinchTransform, touchDistance, midpoint } from "./pinchMath";

describe("computePinchTransform", () => {
  // Wspólne wartości dla czytelności testów.
  const MIN = 0.2;
  const MAX = 5.0;

  it("zoom-in 2× zakotwiczony w początkowym środku palców", () => {
    // Start: scale 1, pan (0,0), palce w (100,100) i (200,100) → mid (150,100),
    // distance 100. Po rozsunięciu do (50,100)/(250,100): distance 200 → ratio 2.
    const result = computePinchTransform(
      {
        initialScale: 1,
        initialPanX: 0,
        initialPanY: 0,
        initialMidX: 150,
        initialMidY: 100,
        initialDistance: 100,
      },
      {
        currentMidX: 150,
        currentMidY: 100,
        currentDistance: 200,
        minScale: MIN,
        maxScale: MAX,
      },
    );

    expect(result.scale).toBe(2);
    // Pan zakotwiczony w mid (150,100): panZoomed = 150 - (150-0)*2 = -150
    // + delta midpoint (150-150=0) → -150
    expect(result.panX).toBe(-150);
    expect(result.panY).toBe(-100);
  });

  it("zoom-out 0.5× zakotwiczony w początkowym środku palców", () => {
    const result = computePinchTransform(
      {
        initialScale: 2,
        initialPanX: -100,
        initialPanY: -50,
        initialMidX: 200,
        initialMidY: 100,
        initialDistance: 200,
      },
      {
        currentMidX: 200,
        currentMidY: 100,
        currentDistance: 100,
        minScale: MIN,
        maxScale: MAX,
      },
    );

    expect(result.scale).toBe(1);
    // scaleRatio = 1/2 = 0.5; panZoomedX = 200 - (200-(-100))*0.5 = 200 - 150 = 50
    // delta midpoint 0 → 50
    expect(result.panX).toBe(50);
    expect(result.panY).toBeCloseTo(100 - (100 - (-50)) * 0.5, 10);
  });

  it("clamp przy przekroczeniu MAX_SCALE", () => {
    const result = computePinchTransform(
      {
        initialScale: 4,
        initialPanX: 0,
        initialPanY: 0,
        initialMidX: 100,
        initialMidY: 100,
        initialDistance: 100,
      },
      {
        currentMidX: 100,
        currentMidY: 100,
        currentDistance: 1000, // ratio 10 → 4*10=40 → clamp do 5
        minScale: MIN,
        maxScale: MAX,
      },
    );

    expect(result.scale).toBe(MAX);
  });

  it("clamp przy przekroczeniu MIN_SCALE", () => {
    const result = computePinchTransform(
      {
        initialScale: 1,
        initialPanX: 0,
        initialPanY: 0,
        initialMidX: 100,
        initialMidY: 100,
        initialDistance: 100,
      },
      {
        currentMidX: 100,
        currentMidY: 100,
        currentDistance: 1, // ratio 0.01 → clamp do MIN
        minScale: MIN,
        maxScale: MAX,
      },
    );

    expect(result.scale).toBe(MIN);
  });

  it("czysta translacja: ratio 1, środek przesunięty o (+50,+30)", () => {
    const result = computePinchTransform(
      {
        initialScale: 1.5,
        initialPanX: 20,
        initialPanY: 40,
        initialMidX: 100,
        initialMidY: 200,
        initialDistance: 150,
      },
      {
        currentMidX: 150,
        currentMidY: 230,
        currentDistance: 150, // ratio 1 → bez zoom
        minScale: MIN,
        maxScale: MAX,
      },
    );

    // scaleRatio = 1 → panZoomed = initialPan (bez przesunięcia od zoomu).
    // + delta midpoint (+50,+30).
    expect(result.scale).toBe(1.5);
    expect(result.panX).toBe(20 + 50);
    expect(result.panY).toBe(40 + 30);
  });

  it("punkt pod palcami pozostaje nieruchomy podczas zoom", () => {
    // Kluczowa własność naturalnego pinch: świat pod środkiem palców nie "ucieka".
    // Start: mid=(200,150), scale=1, pan=(0,0). Połóżmy tam punkt świata X.
    // worldX = (200 - 0)/1 = 200. Po zoom do 2 (bez translacji midpoint):
    // widok: screenX = 200*2 + panX. Aby pod palcem (screenX=200) był ten sam świat:
    // 200 = 200*2 + panX → panX = -200. Sprawdzamy że tak jest.
    const result = computePinchTransform(
      {
        initialScale: 1,
        initialPanX: 0,
        initialPanY: 0,
        initialMidX: 200,
        initialMidY: 150,
        initialDistance: 100,
      },
      {
        currentMidX: 200,
        currentMidY: 150,
        currentDistance: 200,
        minScale: MIN,
        maxScale: MAX,
      },
    );

    // Świat, który był pod midem (worldX=200, worldY=150), ma teraz trafić w screen (200,150).
    expect(200 * result.scale + result.panX).toBeCloseTo(200, 10);
    expect(150 * result.scale + result.panY).toBeCloseTo(150, 10);
  });

  it("guard: initialDistance <= 0 zwraca stan bez zmian", () => {
    const result = computePinchTransform(
      {
        initialScale: 1.5,
        initialPanX: 30,
        initialPanY: 40,
        initialMidX: 100,
        initialMidY: 100,
        initialDistance: 0,
      },
      {
        currentMidX: 100,
        currentMidY: 100,
        currentDistance: 200,
        minScale: MIN,
        maxScale: MAX,
      },
    );

    expect(result.scale).toBe(1.5);
    expect(result.panX).toBe(30);
    expect(result.panY).toBe(40);
  });
});

describe("touchDistance", () => {
  it("odległość pozioma", () => {
    expect(touchDistance(0, 0, 100, 0)).toBe(100);
  });

  it("odległość pionowa", () => {
    expect(touchDistance(0, 0, 0, 100)).toBe(100);
  });

  it("odległość po przekątnej (3-4-5)", () => {
    expect(touchDistance(0, 0, 30, 40)).toBe(50);
  });
});

describe("midpoint", () => {
  it("środek odcinka", () => {
    expect(midpoint(0, 0, 100, 200)).toEqual({ x: 50, y: 100 });
  });

  it("identyczne punkty dają ten punkt", () => {
    expect(midpoint(50, 50, 50, 50)).toEqual({ x: 50, y: 50 });
  });
});
