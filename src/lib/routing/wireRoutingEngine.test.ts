import { describe, expect, it } from "vitest";
import { calculateWirePath, getOrthoExit } from "./wireRoutingEngine";

describe("wireRoutingEngine calculateWirePath & getOrthoExit", () => {
  const from = { x: 100, y: 100 };
  const to = { x: 200, y: 300 };

  it("calculates orthogonal exit correctly", () => {
    const exit = getOrthoExit(from, to, 40);
    expect(exit.axis).toBe('y'); // Because dy > dx
    expect(exit.y).toBe(140);
  });

  it("calculates basic path correctly", () => {
    const path = calculateWirePath(from, to);
    expect(path).toContain("M 100 100");
    expect(path).toContain("L");
  });
});
