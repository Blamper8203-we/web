import { describe, expect, it } from "vitest";
import { getSymbolTerminals } from "./moduleTerminals";
import { svgTerminalCache } from "./svgTerminalCache";
import { createDefaultSymbolItem } from "../../types/symbolItem";

describe("Listwa 15 pin N horizontal terminal placement", () => {
  it("generates 15 hotspots when added to a 'Dodaj listwy' zone", () => {
    // Clear any cached state for this moduleRef
    svgTerminalCache.set("Listwy do rozdzielnicy/Listwa 15 pin N.svg", []);

    // Simulate the symbol as it would be added by the DinRailConnectionsBackgroundLayer
    // "Dodaj listwy" placeholder. The listwa lands in a zone at (s.x, s.y) with
    // s.width/s.height matching the catalog entry (1243x175).
    const symbol = createDefaultSymbolItem({
      id: "test-listwa-15n",
      type: "Listwy",
      deviceKind: "terminalBlock",
      x: 0,
      y: 0,
      rotation: 0,
      width: 1243,
      height: 175,
      label: "Listwa 15 pin N",
      moduleRef: "Listwy do rozdzielnicy/Listwa 15 pin N.svg",
    });

    const hotspots = getSymbolTerminals(symbol);
    console.log("Generated hotspots:", hotspots.length);
    if (hotspots.length > 0) {
      console.log("First 3 hotspots:", JSON.stringify(hotspots.slice(0, 3)));
      console.log("Last hotspot:", JSON.stringify(hotspots[hotspots.length - 1]));
    }
    expect(hotspots.length).toBe(15);
  });
});
