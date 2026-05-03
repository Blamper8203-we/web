import { createDefaultSymbolItem } from '../types/symbolItem';
import type { SymbolItem } from '../types/symbolItem';

export function createDemoSymbols(): SymbolItem[] {
  const symbols: SymbolItem[] = [];
  const rcd1Id = crypto.randomUUID();
  const rcd2Id = crypto.randomUUID();

  symbols.push(
    createDefaultSymbolItem({
      type: "FR-63",
      deviceKind: "other",
      label: "FR1",
      referenceDesignation: "Q1",
      protectionType: "C63",
      x: 100,
      y: 50,
      phase: "L1+L2+L3",
      powerW: 0,
    }),
  );
  symbols.push(
    createDefaultSymbolItem({
      type: "SPD-T1T2",
      deviceKind: "spd",
      label: "SPD1",
      referenceDesignation: "FA1",
      spdType: "T1+T2",
      spdVoltage: 275,
      spdDischargeCurrent: 25,
      x: 200,
      y: 50,
      phase: "L1+L2+L3",
      powerW: 0,
    }),
  );
  symbols.push(
    createDefaultSymbolItem({
      id: rcd1Id,
      type: "RCD-4P",
      deviceKind: "rcd",
      label: "RCD1",
      referenceDesignation: "Q2",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
      x: 100,
      y: 200,
      phase: "L1",
      powerW: 0,
    }),
  );

  const circuits1 = [
    { name: "Oswietlenie parter", loc: "Parter", p: 800, ph: "L1" as const, pr: "B10" },
    { name: "Gniazda salon", loc: "Salon", p: 2000, ph: "L2" as const, pr: "B16" },
    { name: "Gniazda kuchnia", loc: "Kuchnia", p: 2500, ph: "L3" as const, pr: "B20" },
  ];
  for (const c of circuits1) {
    const index = circuits1.indexOf(c);
    symbols.push(
      createDefaultSymbolItem({
        type: "MCB-1P",
        deviceKind: "mcb",
        label: c.name,
        referenceDesignation: `F${index + 1}`,
        circuitName: c.name,
        location: c.loc,
        protectionType: c.pr,
        powerW: c.p,
        phase: c.ph,
        x: 100 + index * 40,
        y: 300,
        rcdSymbolId: rcd1Id,
        cableCrossSection: 2.5,
        cableLength: 15,
      }),
    );
  }

  symbols.push(
    createDefaultSymbolItem({
      id: rcd2Id,
      type: "RCD-4P",
      deviceKind: "rcd",
      label: "RCD2",
      referenceDesignation: "Q3",
      rcdRatedCurrent: 63,
      rcdResidualCurrent: 30,
      rcdType: "A",
      x: 100,
      y: 450,
      phase: "L1",
      powerW: 0,
    }),
  );

  const circuits2 = [
    { name: "Pralka", loc: "Lazienka", p: 2200, ph: "L1" as const, pr: "B16" },
    { name: "Zmywarka", loc: "Kuchnia", p: 2000, ph: "L2" as const, pr: "B16" },
    { name: "Piekarnik", loc: "Kuchnia", p: 3000, ph: "L3" as const, pr: "B20" },
    { name: "Lodowka", loc: "Kuchnia", p: 400, ph: "L1" as const, pr: "B10" },
  ];
  for (const c of circuits2) {
    const index = circuits2.indexOf(c);
    symbols.push(
      createDefaultSymbolItem({
        type: "MCB-1P",
        deviceKind: "mcb",
        label: c.name,
        referenceDesignation: `F${circuits1.length + index + 1}`,
        circuitName: c.name,
        location: c.loc,
        protectionType: c.pr,
        powerW: c.p,
        phase: c.ph,
        x: 100 + index * 40,
        y: 550,
        rcdSymbolId: rcd2Id,
        cableCrossSection: 2.5,
        cableLength: 12,
      }),
    );
  }

  return symbols;
}
