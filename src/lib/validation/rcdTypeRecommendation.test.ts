import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { getRcdTypeRecommendation } from "./rcdTypeRecommendation";

describe("getRcdTypeRecommendation", () => {
  it("returns null when no keyword matches", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      circuitName: "Gniazdo w salonie",
    });
    expect(getRcdTypeRecommendation(symbol)).toBeNull();
  });

  it("recommends type B for PV / inverter / EV-charger circuits", () => {
    const pv = createDefaultSymbolItem({ deviceKind: "mcb", circuitName: "Inwerter PV" });
    const ev = createDefaultSymbolItem({ deviceKind: "mcb", circuitName: "Ladowarka EV" });
    const inverter = createDefaultSymbolItem({ deviceKind: "mcb", circuitName: "Falownik" });
    expect(getRcdTypeRecommendation(pv)?.allowedTypes).toEqual(["B"]);
    expect(getRcdTypeRecommendation(ev)?.allowedTypes).toEqual(["B"]);
    expect(getRcdTypeRecommendation(inverter)?.allowedTypes).toEqual(["B"]);
  });

  it("recommends F or B for heat-pump / AC / washing-machine circuits", () => {
    const heatPump = createDefaultSymbolItem({ deviceKind: "mcb", circuitName: "Pompa ciepła" });
    const ac = createDefaultSymbolItem({ deviceKind: "mcb", location: "Klimatyzacja" });
    const washer = createDefaultSymbolItem({ deviceKind: "mcb", circuitName: "Pralka" });
    expect(getRcdTypeRecommendation(heatPump)?.allowedTypes).toEqual(["F", "B"]);
    expect(getRcdTypeRecommendation(ac)?.allowedTypes).toEqual(["F", "B"]);
    expect(getRcdTypeRecommendation(washer)?.allowedTypes).toEqual(["F", "B"]);
  });

  it("recommends A, F, or B for induction / electronic-load circuits", () => {
    const induction = createDefaultSymbolItem({ deviceKind: "mcb", circuitName: "Płyta indukcyjna" });
    const dishwasher = createDefaultSymbolItem({ deviceKind: "mcb", circuitName: "Zmywarka" });
    expect(getRcdTypeRecommendation(induction)?.allowedTypes).toEqual(["A", "F", "B"]);
    expect(getRcdTypeRecommendation(dishwasher)?.allowedTypes).toEqual(["A", "F", "B"]);
  });

  it("prefers the most-specific match (DC risk dominates mixed-frequency)", () => {
    // "Falownik + pompa ciepla" — must hit the B-only (inverter) rule, not F/B.
    const mixed = createDefaultSymbolItem({
      deviceKind: "mcb",
      circuitName: "Falownik + pompa ciepła",
    });
    expect(getRcdTypeRecommendation(mixed)?.allowedTypes).toEqual(["B"]);
  });

  it("matches against circuitDescription and label as well, not just circuitName", () => {
    const byDescription = createDefaultSymbolItem({
      deviceKind: "mcb",
      circuitName: "Obwód 1",
      circuitDescription: "Zmywarka kuchnia",
    });
    const byLabel = createDefaultSymbolItem({
      deviceKind: "mcb",
      circuitName: "Obwód 2",
      label: "Piekarnik",
    });
    expect(getRcdTypeRecommendation(byDescription)?.allowedTypes).toEqual(["A", "F", "B"]);
    expect(getRcdTypeRecommendation(byLabel)?.allowedTypes).toEqual(["A", "F", "B"]);
  });
});
