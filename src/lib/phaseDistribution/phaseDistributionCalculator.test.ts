import { describe, it, expect } from 'vitest';
import { calculateTotalDistribution } from './phaseDistributionCalculator';
import type { SymbolItem } from '../../types/symbolItem';

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
      { id: '3', phase: '' as any, powerW: 500 }, // Defaults to L1
      { id: '4', phase: undefined, powerW: 500 }, // Defaults to L1
    ];

    const result = calculateTotalDistribution(symbols as SymbolItem[]);
    expect(result.l1PowerW).toBe(1000 + 3000 + 500 + 500); // 1000(L1) + 3000(3F/3) + 500(empty) + 500(undef) = 5000
    expect(result.l2PowerW).toBe(3000); // 3000(3F/3)
    expect(result.l3PowerW).toBe(3000); // 3000(3F/3)
  });
});
