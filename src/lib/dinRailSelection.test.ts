import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../types/symbolItem";
import {
  DIN_RAIL_GROUP_FRAME_PADDING,
  buildDinRailGroupFrames,
  expandSelectionToGroupIds,
  formatDinRailGroupLabel,
  getDragSelectionIds,
} from "./dinRailSelection";

describe("formatDinRailGroupLabel", () => {
  it("normalizes numbered Polish and English group labels", () => {
    expect(formatDinRailGroupLabel("Grupa-1", "fallback")).toBe("Grupa 1");
    expect(formatDinRailGroupLabel("group 12", "fallback")).toBe("Grupa 12");
  });

  it("keeps custom labels instead of collapsing them to a generic label", () => {
    expect(formatDinRailGroupLabel("Kuchnia RCD", "fallback")).toBe("Kuchnia RCD");
  });

  it("uses fallback text when the group label is empty", () => {
    expect(formatDinRailGroupLabel("", "custom-group")).toBe("custom-group");
  });
});

describe("buildDinRailGroupFrames", () => {
  it("adds enough visual breathing room around grouped modules", () => {
    const frames = buildDinRailGroupFrames(
      [
        createDefaultSymbolItem({
          id: "rcd",
          group: "g1",
          groupName: "Grupa-1",
          x: 100,
          y: 200,
          width: 50,
          height: 120,
          isSnappedToRail: true,
          deviceKind: "rcd",
        }),
        createDefaultSymbolItem({
          id: "mcb",
          group: "g1",
          groupName: "Grupa-1",
          x: 150,
          y: 200,
          width: 50,
          height: 120,
          isSnappedToRail: true,
          deviceKind: "mcb",
        }),
      ],
      DIN_RAIL_GROUP_FRAME_PADDING,
    );

    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      x: 100 - DIN_RAIL_GROUP_FRAME_PADDING,
      y: 200 - DIN_RAIL_GROUP_FRAME_PADDING,
      width: 100 + DIN_RAIL_GROUP_FRAME_PADDING * 2,
      height: 120 + DIN_RAIL_GROUP_FRAME_PADDING * 2,
      label: "Grupa-1",
      memberCount: 2,
    });
  });

  it("builds a logical RCD group from connected MCB modules", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd",
      group: "g1",
      groupName: "Grupa-1",
      x: 100,
      y: 200,
      width: 72,
      height: 120,
      isSnappedToRail: true,
      deviceKind: "rcd",
    });
    const firstMcb = createDefaultSymbolItem({
      id: "mcb-1",
      x: 172,
      y: 200,
      width: 18,
      height: 120,
      isSnappedToRail: true,
      deviceKind: "mcb",
      rcdSymbolId: "rcd",
    });
    const secondMcb = createDefaultSymbolItem({
      id: "mcb-2",
      x: 190,
      y: 200,
      width: 18,
      height: 120,
      isSnappedToRail: true,
      deviceKind: "mcb",
      rcdSymbolId: "rcd",
    });

    const symbols = [rcd, firstMcb, secondMcb];
    const frames = buildDinRailGroupFrames(symbols, DIN_RAIL_GROUP_FRAME_PADDING);

    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      anchorSymbolId: "rcd",
      distributionCount: 2,
      id: "rcd:rcd",
      label: "Grupa-1",
      memberCount: 3,
      symbolIds: ["rcd", "mcb-1", "mcb-2"],
    });
    expect(expandSelectionToGroupIds(["mcb-1"], symbols).sort()).toEqual([
      "mcb-1",
      "mcb-2",
      "rcd",
    ]);
    expect(getDragSelectionIds("mcb-2", symbols, new Set())).toEqual([
      "rcd",
      "mcb-1",
      "mcb-2",
    ]);
  });
});
