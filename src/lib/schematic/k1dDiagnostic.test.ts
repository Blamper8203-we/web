/**
 * Diagnostic: parse AMPIO MSERV-4S SVG with the real parseBlock and verify
 * the -K1:D block's terminal positions match expected invariants.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

describe("k1d_diagnostic", () => {
  it("dumps the AMPIO MSERV-4S -K1:D block structure after real parseBlock", async () => {
    const svgText = readFileSync(
      "public/assets/symbols/Smart Home/Symbol AMPIO MSERV-4S.svg",
      "utf-8",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => svgText,
      })),
    );

    vi.resetModules();
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");
    const blocks = await fetchAndParseCadSymbol("ampio-mserv-4s", 1.25);

    // Find -K1:D by its label
    const k1d = blocks.find((b) => b.label && b.label.includes("-K1:D"));
    expect(k1d, "K1:D block should exist after parse").toBeTruthy();
    console.log(
      `k1d.originalX=${k1d.originalX} originalY=${k1d.originalY} w=${k1d.width} h=${k1d.height}`,
    );
    console.log(`k1d has ${k1d.terminals.length} terminals`);
    // First 3 coil terminals (left side, NOT yellow)
    const coils = k1d.terminals.filter((t) => t.radius > 4).slice(0, 3);
    coils.forEach((t, i) => console.log(`  coil[${i}] x=${t.x} y=${t.y} r=${t.radius}`));
    // First 3 yellow contact terminals (right side, smaller radius)
    const yellows = k1d.terminals.filter((t) => t.radius < 4).slice(0, 3);
    yellows.forEach((t, i) => console.log(`  yellow[${i}] x=${t.x} y=${t.y} r=${t.radius}`));

    // INVARIANT: world terminal positions should be on world 20-grid
    for (const t of k1d.terminals) {
      expect(t.x % 20).toBe(0);
      expect(t.y % 20).toBe(0);
    }

    // INVARIANT: coil terminals (left, r > 4) should have worldX=0 (= block origin x)
    // These should be ON the rect's left edge after my rect-mutation fix.
    for (const coil of coils) {
      expect(coil.x).toBe(0); // ON rect left edge
      expect(coil.y % 20).toBe(0); // ON world 20-grid
    }

    // INVARIANT: -K1:D should expose 40 terminals (10 channels × 4 each: A, B, contact-1, contact-2)
    expect(k1d.terminals.length, "-K1:D should have 40 terminals (10 channels × 4)").toBe(40);

    // INVARIANT: yellow contact terminals (r < 4) should be at worldX on grid
    // (960 source - 592 minX) * 1.25 scale = 460 = 23 × 20 ✓
    // (992 source - 592 minX) * 1.25 scale = 500 = 25 × 20 ✓
    const yellowXs = new Set(yellows.map((t) => t.x));
    for (const x of yellowXs) {
      expect(x % 20).toBe(0);
    }
    expect(yellowXs.has(460), "left contact pins at world x = 460").toBe(true);
    expect(yellowXs.has(500), "right contact pins at world x = 500").toBe(true);
  });
});
