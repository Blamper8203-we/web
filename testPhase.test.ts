import { normalizeGroupConsistency } from "./src/lib/appHelpers";
import { SymbolItem } from "./src/types/symbolItem";

const symbols = [
  { id: "rcd1", deviceKind: "rcd", type: "RCD 4P", group: "g1", groupName: "G1", x: 10, phase: "L1+L2+L3", parameters: {} },
  { id: "f21", deviceKind: "mcb", type: "MCB 2P", group: "g1", groupName: "G1", x: 20, phase: "L1+L2", parameters: {} },
  { id: "f22", deviceKind: "mcb", type: "MCB 1P", group: "g1", groupName: "G1", x: 30, phase: "L2", parameters: {} }
] as SymbolItem[];

import { test } from 'vitest';

test('debug', () => {
  const result = normalizeGroupConsistency(symbols);
  console.log(result.map(s => `${s.id}: ${s.phase}`));
});
