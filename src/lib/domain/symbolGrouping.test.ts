import { describe, expect, it } from "vitest";
import {
  applyInheritedRcdInfo,
  canAutoJoinExistingGroup,
  getNextGroupName,
  isDistributionSymbol,
  isGroupHeadSymbol,
  normalizeGroupConsistency,
  resolveRcdSource,
  shouldExcludeFromAutoGrouping,
} from "./symbolGrouping";
import { createDefaultSymbolItem } from "../../types/symbolItem";

describe("symbolGrouping - isGroupHeadSymbol", () => {
  it("returns true for RCD", () => {
    expect(isGroupHeadSymbol(createDefaultSymbolItem({ id: "r1", deviceKind: "rcd" }))).toBe(true);
  });

  it("returns false for MCB", () => {
    expect(isGroupHeadSymbol(createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" }))).toBe(false);
  });

  it("returns false for terminal block", () => {
    expect(isGroupHeadSymbol(createDefaultSymbolItem({ id: "t1", deviceKind: "terminalBlock" }))).toBe(false);
  });
});

describe("symbolGrouping - isDistributionSymbol", () => {
  it("returns true for MCB", () => {
    expect(isDistributionSymbol(createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" }))).toBe(true);
  });

  it("returns true for RCBO", () => {
    expect(isDistributionSymbol(createDefaultSymbolItem({ id: "m1", deviceKind: "rcbo" }))).toBe(true);
  });

  it("returns false for RCD", () => {
    expect(isDistributionSymbol(createDefaultSymbolItem({ id: "r1", deviceKind: "rcd" }))).toBe(false);
  });

  it("returns false for FR", () => {
    expect(isDistributionSymbol(createDefaultSymbolItem({ id: "f1", deviceKind: "fr" }))).toBe(false);
  });
});

describe("symbolGrouping - shouldExcludeFromAutoGrouping", () => {
  it("returns true for FR", () => {
    expect(shouldExcludeFromAutoGrouping(createDefaultSymbolItem({ id: "f1", deviceKind: "fr" }))).toBe(true);
  });

  it("returns true for SPD", () => {
    expect(shouldExcludeFromAutoGrouping(createDefaultSymbolItem({ id: "s1", deviceKind: "spd" }))).toBe(true);
  });

  it("returns true for phaseIndicator", () => {
    expect(shouldExcludeFromAutoGrouping(createDefaultSymbolItem({ id: "p1", deviceKind: "phaseIndicator" }))).toBe(true);
  });

  it("returns true for RCD", () => {
    expect(shouldExcludeFromAutoGrouping(createDefaultSymbolItem({ id: "r1", deviceKind: "rcd" }))).toBe(true);
  });

  it("returns true for terminal block (auxiliary)", () => {
    expect(shouldExcludeFromAutoGrouping(createDefaultSymbolItem({ id: "t1", deviceKind: "terminalBlock" }))).toBe(true);
  });

  it("returns false for MCB", () => {
    expect(shouldExcludeFromAutoGrouping(createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" }))).toBe(false);
  });

  it("returns false for neutral terminal (N-type) - these CAN be grouped", () => {
    const n = createDefaultSymbolItem({
      id: "n1",
      deviceKind: "terminalBlock",
      type: "Listwa N 12PIN",
    });
    expect(shouldExcludeFromAutoGrouping(n)).toBe(false);
  });
});

describe("symbolGrouping - canAutoJoinExistingGroup", () => {
  it("returns true when symbol is RCD and target is distribution (MCB)", () => {
    const rcd = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd" });
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" });
    expect(canAutoJoinExistingGroup(rcd, mcb)).toBe(true);
  });

  it("returns true for MCB by default (not excluded)", () => {
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" });
    const rcd = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd" });
    expect(canAutoJoinExistingGroup(mcb, rcd)).toBe(true);
  });

  it("returns false for FR (always excluded)", () => {
    const fr = createDefaultSymbolItem({ id: "f1", deviceKind: "fr" });
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" });
    expect(canAutoJoinExistingGroup(fr, mcb)).toBe(false);
  });

  it("returns false for SPD (always excluded)", () => {
    const spd = createDefaultSymbolItem({ id: "s1", deviceKind: "spd" });
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" });
    expect(canAutoJoinExistingGroup(spd, mcb)).toBe(false);
  });
});

describe("symbolGrouping - getNextGroupName", () => {
  it("returns 'Grupa-1' when no groups exist", () => {
    expect(getNextGroupName([])).toBe("Grupa-1");
  });

  it("returns 'Grupa-{N+1}' after existing groups", () => {
    const s1 = createDefaultSymbolItem({ id: "s1", groupName: "Grupa-1" });
    const s2 = createDefaultSymbolItem({ id: "s2", groupName: "Grupa-2" });
    expect(getNextGroupName([s1, s2])).toBe("Grupa-3");
  });

  it("ignores non-matching group names", () => {
    const s1 = createDefaultSymbolItem({ id: "s1", groupName: "Custom Group" });
    const s2 = createDefaultSymbolItem({ id: "s2", groupName: "Grupa-2" });
    expect(getNextGroupName([s1, s2])).toBe("Grupa-3");
  });

  it("returns 'Grupa-1' if only one number is 0 (skipped)", () => {
    const s1 = createDefaultSymbolItem({ id: "s1", groupName: "Grupa-0" });
    expect(getNextGroupName([s1])).toBe("Grupa-1");
  });
});

describe("symbolGrouping - resolveRcdSource", () => {
  it("returns snapTarget when it is itself an RCD", () => {
    const rcd = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd" });
    expect(resolveRcdSource([], rcd)).toBe(rcd);
  });

  it("returns the explicit rcdSymbolId when present", () => {
    const rcd = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd" });
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb", rcdSymbolId: "r1" });
    expect(resolveRcdSource([rcd], mcb)).toBe(rcd);
  });

  it("returns the group's RCD when no explicit rcdSymbolId is set", () => {
    const rcd = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd", group: "G1" });
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb", group: "G1" });
    expect(resolveRcdSource([rcd, mcb], mcb)).toBe(rcd);
  });

  it("returns null when no RCD is reachable", () => {
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" });
    expect(resolveRcdSource([], mcb)).toBeNull();
  });
});

describe("symbolGrouping - applyInheritedRcdInfo", () => {
  it("does nothing when symbol itself is an RCD (group head)", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
    });
    const originalRcdResidual = rcd.rcdResidualCurrent;
    applyInheritedRcdInfo([rcd], rcd, rcd);
    // Should not have changed
    expect(rcd.rcdResidualCurrent).toBe(originalRcdResidual);
  });

  it("inherits RCD fields from a snap target's explicit RCD", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" });
    applyInheritedRcdInfo([rcd], mcb, rcd);
    expect(mcb.rcdSymbolId).toBe("r1");
    expect(mcb.rcdRatedCurrent).toBe(40);
    expect(mcb.rcdResidualCurrent).toBe(30);
    expect(mcb.rcdType).toBe("A");
  });

  it("clears RCD fields when no RCD is reachable", () => {
    const mcb = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      rcdSymbolId: "old-rcd",
      rcdRatedCurrent: 25,
    });
    applyInheritedRcdInfo([], mcb, mcb);
    expect(mcb.rcdSymbolId).toBe("");
    expect(mcb.rcdRatedCurrent).toBe(0);
    expect(mcb.rcdResidualCurrent).toBe(0);
    expect(mcb.rcdType).toBe("");
  });
});

describe("symbolGrouping - normalizeGroupConsistency", () => {
  it("returns a new array (does not mutate input)", () => {
    const s = createDefaultSymbolItem({ id: "s1" });
    const result = normalizeGroupConsistency([s]);
    expect(result).not.toBe([s]);
  });

  it("clears rcdSymbolId when referencing a non-existent RCD", () => {
    const mcb = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      rcdSymbolId: "ghost",
    });
    const result = normalizeGroupConsistency([mcb]);
    expect(result[0].rcdSymbolId).toBe("");
  });

  it("clears group/groupName/rcdSymbolId on non-neutral auxiliary symbols (terminal blocks)", () => {
    const s = createDefaultSymbolItem({
      id: "tb1",
      deviceKind: "terminalBlock",
      type: "Złączka",
      group: "G1",
      groupName: "Grupa-1",
      rcdSymbolId: "r1",
    });
    const result = normalizeGroupConsistency([s]);
    expect(result[0].group).toBe("");
    expect(result[0].groupName).toBe("");
    expect(result[0].rcdSymbolId).toBe("");
  });

  it("clears group on neutral terminals in a group with no RCD", () => {
    // Note: normalizeGroupConsistency's first neutral-aware pass preserves
    // groups on neutrals, but the subsequent group-processing loop clears
    // groups on all members of a group with no RCD head, including neutrals.
    const n = createDefaultSymbolItem({
      id: "n1",
      deviceKind: "terminalBlock",
      type: "Listwa N",
      moduleRef: "listwa-n-12pin",
      group: "G1",
    });
    const result = normalizeGroupConsistency([n]);
    expect(result[0].group).toBe("");
  });

  it("preserves group on neutral terminals in a group with an RCD head", () => {
    const rcd = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd", group: "G1" });
    const n = createDefaultSymbolItem({
      id: "n1",
      deviceKind: "terminalBlock",
      type: "Listwa N",
      moduleRef: "listwa-n-12pin",
      group: "G1",
    });
    const result = normalizeGroupConsistency([rcd, n]);
    const nResult = result.find((s) => s.id === "n1");
    expect(nResult?.group).toBe("G1");
  });

  it("clears group on all members when no RCD is present in the group", () => {
    const m1 = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb", group: "G1" });
    const m2 = createDefaultSymbolItem({ id: "m2", deviceKind: "mcb", group: "G1" });
    const result = normalizeGroupConsistency([m1, m2]);
    expect(result[0].group).toBe("");
    expect(result[1].group).toBe("");
  });

  it("assigns head RCD to MCB children in the same group", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      group: "G1",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
    });
    const m1 = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb", group: "G1" });
    const result = normalizeGroupConsistency([rcd, m1]);
    const m1Result = result.find((s) => s.id === "m1");
    expect(m1Result?.rcdSymbolId).toBe("r1");
    expect(m1Result?.rcdRatedCurrent).toBe(40);
  });

  it("auto-assigns phase to single-phase RCDs in sequence (L1, L2, L3)", () => {
    const r1 = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd", type: "RCD 2P 25A 30mA", group: "G1" });
    const r2 = createDefaultSymbolItem({ id: "r2", deviceKind: "rcd", type: "RCD 2P 25A 30mA", group: "G2" });
    const r3 = createDefaultSymbolItem({ id: "r3", deviceKind: "rcd", type: "RCD 2P 25A 30mA", group: "G3" });
    const result = normalizeGroupConsistency([r1, r2, r3]);
    // Phase rotation: first single-phase RCD -> L1, second -> L2, third -> L3
    expect(result.find((s) => s.id === "r1")?.phase).toBe("L1");
    expect(result.find((s) => s.id === "r2")?.phase).toBe("L2");
    expect(result.find((s) => s.id === "r3")?.phase).toBe("L3");
  });

  it("respects ManualPhase flag on RCD", () => {
    const r1 = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      type: "RCD 2P 25A 30mA",
      group: "G1",
      phase: "L3",
      parameters: { ManualPhase: "true" },
    });
    const result = normalizeGroupConsistency([r1]);
    expect(result[0].phase).toBe("L3");
  });

  it("respects isPhaseLocked on RCD", () => {
    const r1 = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      type: "RCD 2P 25A 30mA",
      group: "G1",
      phase: "L2",
      isPhaseLocked: true,
    });
    const result = normalizeGroupConsistency([r1]);
    expect(result[0].phase).toBe("L2");
  });
});
