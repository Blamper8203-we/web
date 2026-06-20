import { describe, it, expect } from 'vitest';
import { applyBalancePlan, autoBalancePhases, calculateTotalDistribution } from './phaseDistributionCalculator';
import { createDefaultSymbolItem, type SymbolItem } from '../../types/symbolItem';

describe('phaseDistributionCalculator', () => {
  it('should calculate empty distribution correctly', () => {
    const result = calculateTotalDistribution([]);
    
    expect(result.l1PowerW).toBe(0);
    expect(result.l2PowerW).toBe(0);
    expect(result.l3PowerW).toBe(0);
    expect(result.imbalancePercent).toBe(0);
  });

  it('should sum power correctly across phases', () => {
    const symbols: Partial<SymbolItem>[] = [
      { id: '1', phase: 'L1', powerW: 1000 },
      { id: '2', phase: 'L1', powerW: 500 },
      { id: '3', phase: 'L2', powerW: 2000 },
      { id: '4', phase: 'L3', powerW: 1000 },
    ];

    const result = calculateTotalDistribution(symbols as SymbolItem[]);

    expect(result.l1PowerW).toBe(1500);
    expect(result.l2PowerW).toBe(2000);
    expect(result.l3PowerW).toBe(1000);
  });

  it('should calculate imbalance correctly for uniform distribution', () => {
    const symbols: Partial<SymbolItem>[] = [
      { id: '1', phase: 'L1', powerW: 1000 },
      { id: '2', phase: 'L2', powerW: 1000 },
      { id: '3', phase: 'L3', powerW: 1000 },
    ];

    const result = calculateTotalDistribution(symbols as SymbolItem[]);
    expect(result.imbalancePercent).toBe(0);
  });

  it('should calculate imbalance correctly for non-uniform distribution', () => {
    const symbols: Partial<SymbolItem>[] = [
      { id: '1', phase: 'L1', powerW: 3000 }, // Max
      { id: '2', phase: 'L2', powerW: 1000 }, // Min
      { id: '3', phase: 'L3', powerW: 2000 },
    ];

    const result = calculateTotalDistribution(symbols as SymbolItem[]);
    
    // Average is 2000. 
    // Max deviation is L1 (3000 - 2000 = 1000) or L2 (2000 - 1000 = 1000)
    // Percentage deviation from average = (1000 / 2000) * 100 = 50%
    expect(result.imbalancePercent).toBe(50);
  });

  it('should correctly ignore 3-phase devices or devices without phase', () => {
    const symbols: Partial<SymbolItem>[] = [
      { id: '1', phase: 'L1', powerW: 1000 },
      { id: '2', phase: 'L1+L2+L3', powerW: 9000 }, // 3F is distributed across L1, L2, L3
      { id: '3', phase: '' as unknown as SymbolItem["phase"], powerW: 500 }, // Defaults to L1
      { id: '4', phase: undefined, powerW: 500 }, // Defaults to L1
    ];

    const result = calculateTotalDistribution(symbols as SymbolItem[]);
    expect(result.l1PowerW).toBe(1000 + 3000 + 500 + 500); // 1000(L1) + 3000(3F/3) + 500(empty) + 500(undef) = 5000
    expect(result.l2PowerW).toBe(3000); // 3000(3F/3)
    expect(result.l3PowerW).toBe(3000); // 3000(3F/3)
  });

  it('should distribute three equal 1P circuits across all phases', () => {
    const symbols: SymbolItem[] = [
      createDefaultSymbolItem({ id: 'mcb-1', type: 'MCB 1P', phase: 'L1', powerW: 1000, width: 18, height: 90 }),
      createDefaultSymbolItem({ id: 'mcb-2', type: 'MCB 1P', phase: 'L1', powerW: 1000, width: 18, height: 90 }),
      createDefaultSymbolItem({ id: 'mcb-3', type: 'MCB 1P', phase: 'L1', powerW: 1000, width: 18, height: 90 }),
    ];

    const plan = autoBalancePhases(symbols, 'Current', 'AllSinglePhase');
    const applied = applyBalancePlan(symbols, plan);
    const phases = new Set(applied.symbols.map((symbol) => symbol.phase));

    expect(phases.has('L1')).toBe(true);
    expect(phases.has('L2')).toBe(true);
    expect(phases.has('L3')).toBe(true);
  });

  it('should keep induction+oven scenario fixed to L1+L2 and L3', () => {
    const params = {
      "GroupScenario.InductionWithOven.Enabled": "true",
      "GroupScenario.InductionWithOven.Pattern": "Rcd4PWithMcb2PAnd1P",
    };

    const symbols: SymbolItem[] = [
      createDefaultSymbolItem({
        id: 'rcd-4p',
        type: 'RCD 4P',
        phase: 'L1+L2+L3',
        parameters: params,
        width: 72,
        height: 90,
      }),
      createDefaultSymbolItem({
        id: 'mcb-2p',
        type: 'MCB 2P',
        phase: 'L2+L3',
        powerW: 7200,
        rcdSymbolId: 'rcd-4p',
        parameters: params,
        width: 36,
        height: 90,
      }),
      createDefaultSymbolItem({
        id: 'mcb-1p',
        type: 'MCB 1P',
        phase: 'L2',
        powerW: 3500,
        rcdSymbolId: 'rcd-4p',
        parameters: params,
        width: 18,
        height: 90,
      }),
      createDefaultSymbolItem({ id: 'free-1', type: 'MCB 1P', phase: 'L1', powerW: 2000, width: 18, height: 90 }),
      createDefaultSymbolItem({ id: 'free-2', type: 'MCB 1P', phase: 'L1', powerW: 1500, width: 18, height: 90 }),
    ];

    const plan = autoBalancePhases(symbols, 'Power', 'AllSinglePhase');
    const applied = applyBalancePlan(symbols, plan);

    const mcb2p = applied.symbols.find((symbol) => symbol.id === 'mcb-2p');
    const mcb1p = applied.symbols.find((symbol) => symbol.id === 'mcb-1p');

    expect(mcb2p?.phase).toBe('L2+L3');
    expect(mcb1p?.phase).toBe('L1');
  });

  it('should keep locked circuit phase when scope is OnlyUnlocked', () => {
    const symbols: SymbolItem[] = [
      createDefaultSymbolItem({ id: 'locked-1', type: 'MCB 1P', phase: 'L2', powerW: 5000, isPhaseLocked: true, width: 18, height: 90 }),
      createDefaultSymbolItem({ id: 'free-1', type: 'MCB 1P', phase: 'L1', powerW: 2000, width: 18, height: 90 }),
      createDefaultSymbolItem({ id: 'free-2', type: 'MCB 1P', phase: 'L1', powerW: 2000, width: 18, height: 90 }),
      createDefaultSymbolItem({ id: 'free-3', type: 'MCB 1P', phase: 'L1', powerW: 2000, width: 18, height: 90 }),
    ];

    const plan = autoBalancePhases(symbols, 'Current', 'OnlyUnlocked');
    const applied = applyBalancePlan(symbols, plan);

    const locked = applied.symbols.find((symbol) => symbol.id === 'locked-1');
    expect(locked?.phase).toBe('L2');
  });

  it('should treat pending 1P module as single-phase and assign concrete phase', () => {
    const symbols: SymbolItem[] = [
      createDefaultSymbolItem({ id: 'mcb-pending', type: 'MCB 1P', phase: 'L1', powerW: 2300, width: 18, height: 90 }),
    ];

    symbols[0].phase = 'PENDING' as unknown as SymbolItem['phase'];

    const plan = autoBalancePhases(symbols, 'Current', 'AllSinglePhase');
    const applied = applyBalancePlan(symbols, plan);
    const assigned = applied.symbols[0]?.phase;

    expect(['L1', 'L2', 'L3']).toContain(assigned);
  });

  it('excludes terminal blocks (Listwy do rozdzielnicy) from phase load totals', () => {
    // Regression: previously a listwa with phase="L1+L2+L3" and any
    // powerW > 0 would falsely contribute to the phase total. The
    // '6M - L1' label observed by the user was the listwa's own
    // module count and phase being attributed to phase load instead
    // of being ignored as an auxiliary busbar.
    const symbols: SymbolItem[] = [
      createDefaultSymbolItem({ id: 'mcb', type: 'MCB 1P', deviceKind: 'mcb', phase: 'L1', powerW: 1000, width: 18, height: 90 }),
      createDefaultSymbolItem({
        id: 'listwa-n',
        type: 'Listwy',
        deviceKind: 'terminalBlock',
        label: 'Listwa 15 pin N',
        moduleRef: 'Listwy do rozdzielnicy/Listwa 15 pin N.svg',
        phase: 'L1+L2+L3',
        powerW: 0,
        width: 1243,
        height: 175,
      }),
    ];

    const result = calculateTotalDistribution(symbols);

    // Only the MCB contributes. The listwa is auxiliary (pass-through).
    expect(result.l1PowerW).toBe(1000);
    expect(result.l2PowerW).toBe(0);
    expect(result.l3PowerW).toBe(0);
  });
});
