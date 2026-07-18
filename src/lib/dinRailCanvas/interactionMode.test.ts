import { describe, it, expect } from "vitest";
import { resolveInteractionMode } from "./interactionMode";

describe("resolveInteractionMode", () => {
  it("środek myszy (button=1) → zawsze pan, niezależnie od platformy/toggle", () => {
    expect(resolveInteractionMode(false, false, 1)).toBe("pan"); // desktop, toggle off
    expect(resolveInteractionMode(true, false, 1)).toBe("pan"); // desktop, toggle on
    expect(resolveInteractionMode(false, true, 1)).toBe("pan"); // mobile, toggle off
    expect(resolveInteractionMode(true, true, 1)).toBe("pan"); // mobile, toggle on
  });

  it("mobile + panMode on + lewy przycisk → pan jednym palcem", () => {
    expect(resolveInteractionMode(true, true, 0)).toBe("pan");
  });

  it("mobile + panMode off + lewy przycisk → select (zachowanie dotychczasowe)", () => {
    expect(resolveInteractionMode(false, true, 0)).toBe("select");
  });

  it("desktop + panMode on + lewy przycisk → select (toggle ignorowany na desktop)", () => {
    // WHY: desktop ma środek myszy do panu — toggle jest tylko mobile-only.
    // Gdyby tu było "pan", psuilibyśmy desktop UX (lewy przycisk = ramka).
    expect(resolveInteractionMode(true, false, 0)).toBe("select");
  });

  it("desktop + panMode off + lewy przycisk → select", () => {
    expect(resolveInteractionMode(false, false, 0)).toBe("select");
  });

  it("inne przyciski myszy (np. prawy button=2) na desktop → select (default)", () => {
    // WHY: na desktop tylko środek (1) jest panem; prawy/lewy bez toggle
    // trafia do select. (Na mobile z panMode on każdy przycisk daje pan,
    // bo touch nie rozróżnia przycisków — ale to przypadek teoretyczny.)
    expect(resolveInteractionMode(false, false, 2)).toBe("select");
    expect(resolveInteractionMode(false, false, 0)).toBe("select");
  });
});
