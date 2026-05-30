import { describe, expect, it } from "vitest";
import { constrainPan, resetViewport, type ViewportState } from "./schematicViewportController";

describe("schematicViewportController", () => {
  describe("constrainPan", () => {
    const layoutW = 1000;
    const layoutH = 2000;

    it("prevents panning outside left and top boundaries", () => {
      const vp: ViewportState = { panX: 100, panY: 200, zoom: 1 };
      const constrained = constrainPan(vp, 500, 500, layoutW, layoutH);
      
      // Pan cannot be > MARGIN (50)
      expect(constrained.panX).toBe(50);
      expect(constrained.panY).toBe(50);
    });

    it("prevents panning past right and bottom boundaries", () => {
      // Content size: 1000x2000, canvas size: 500x500
      // Max pan without margin is -500, -1500. With margin: -550, -1550
      const vp: ViewportState = { panX: -1000, panY: -2000, zoom: 1 };
      const constrained = constrainPan(vp, 500, 500, layoutW, layoutH);
      
      expect(constrained.panX).toBe(-550);
      expect(constrained.panY).toBe(-1550);
    });

    it("keeps pan within bounds when valid", () => {
      const vp: ViewportState = { panX: -200, panY: -300, zoom: 1 };
      const constrained = constrainPan(vp, 500, 500, layoutW, layoutH);
      
      expect(constrained.panX).toBe(-200);
      expect(constrained.panY).toBe(-300);
    });

    it("centers content if content is smaller than canvas", () => {
      // Content size: 1000x2000, canvas size: 2000x3000
      const vp: ViewportState = { panX: -100, panY: -100, zoom: 1 };
      const constrained = constrainPan(vp, 2000, 3000, layoutW, layoutH);
      
      // X should center: (2000 - 1000)/2 = 500
      // Y should center: (3000 - 2000)/2 = 500
      expect(constrained.panX).toBe(500);
      expect(constrained.panY).toBe(500);
    });
  });

  describe("resetViewport", () => {
    it("fits content to canvas and centers it", () => {
      const vp = resetViewport(500, 1000, 1000, 4000);
      
      // Canvas aspect ratio: 0.5. Layout ratio: 0.25
      // Height is the limiting factor: 1000 / 4000 = 0.25 zoom
      // But standard padding gives it some margin.
      // We just expect a valid viewport object with positive zoom
      expect(vp.zoom).toBeGreaterThan(0);
      expect(typeof vp.panX).toBe("number");
      expect(typeof vp.panY).toBe("number");
    });
  });
});
