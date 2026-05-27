import { describe, it, expect } from 'vitest';
import { validateProject } from './electricalValidationService';
import type { SymbolItem } from '../../types/symbolItem';

describe('electricalValidationService', () => {
  it('should return no errors for an empty project', () => {
    const result = validateProject([]);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should detect RCD with higher residual current than group head', () => {
    const head: Partial<SymbolItem> = {
      id: 'head-1',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdResidualCurrent: 30,
      group: 'group-1',
      groupName: 'RCD1'
    };

    const child: Partial<SymbolItem> = {
      id: 'child-1',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdResidualCurrent: 300, // Error: 300 > 30
      group: 'group-1',
      rcdSymbolId: 'head-1',
    };

    const result = validateProject([head as SymbolItem, child as SymbolItem]);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'VAL-009',
        symbolId: 'child-1'
      })
    );
  });

  it('should not error when child RCD has same or lower residual current', () => {
    const head: Partial<SymbolItem> = {
      id: 'head-1',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdResidualCurrent: 300,
      group: 'group-1',
      groupName: 'RCD1'
    };

    const child: Partial<SymbolItem> = {
      id: 'child-1',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdResidualCurrent: 30, // OK: 30 <= 300
      group: 'group-1',
      rcdSymbolId: 'head-1',
    };

    const result = validateProject([head as SymbolItem, child as SymbolItem]);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn when cascaded RCD residual currents are not selective enough', () => {
    const head: Partial<SymbolItem> = {
      id: 'head-30ma',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdResidualCurrent: 30,
      group: 'group-1',
      groupName: 'RCD główny',
    };
    const child: Partial<SymbolItem> = {
      id: 'child-30ma',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdResidualCurrent: 30,
      group: 'group-1',
      rcdSymbolId: 'head-30ma',
    };

    const result = validateProject([head as SymbolItem, child as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-022',
        symbolId: 'child-30ma',
      }),
    );
  });

  it('should not warn about RCD selectivity when parent residual current is clearly higher', () => {
    const head: Partial<SymbolItem> = {
      id: 'head-300ma',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdResidualCurrent: 300,
    };
    const child: Partial<SymbolItem> = {
      id: 'child-30ma',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdResidualCurrent: 30,
      rcdSymbolId: 'head-300ma',
    };

    const result = validateProject([head as SymbolItem, child as SymbolItem]);

    expect(result.warnings.some((entry) => entry.code === 'VAL-022')).toBe(false);
  });

  it('should detect RCD rated current exceeded by MCBs', () => {
    const rcd: Partial<SymbolItem> = {
      id: 'rcd-1',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdRatedCurrent: 40,
      group: 'group-1'
    };

    const mcb1: Partial<SymbolItem> = {
      id: 'mcb-1',
      type: 'MCB',
      deviceKind: 'mcb',
      group: 'group-1',
      rcdSymbolId: 'rcd-1',
      protectionType: 'B16',
      cableCrossSection: 2.5,
      powerW: 100
    };

    const mcb2: Partial<SymbolItem> = {
      id: 'mcb-2',
      type: 'MCB',
      deviceKind: 'mcb',
      group: 'group-1',
      rcdSymbolId: 'rcd-1',
      protectionType: 'B32', // 16 + 32 = 48 > 40
      cableCrossSection: 6, // 6mm^2 supports 32A
      powerW: 100
    };

    const result = validateProject([rcd as SymbolItem, mcb1 as SymbolItem, mcb2 as SymbolItem]);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-008',
        symbolId: 'rcd-1'
      })
    );
  });

  it('should ignore non-numeric protection types in RCD overload check', () => {
    const rcd: Partial<SymbolItem> = {
      id: 'rcd-1',
      type: 'RCD',
      deviceKind: 'rcd',
      rcdRatedCurrent: 40,
      group: 'group-1'
    };

    const mcb1: Partial<SymbolItem> = {
      id: 'mcb-1',
      type: 'MCB',
      deviceKind: 'mcb',
      group: 'group-1',
      rcdSymbolId: 'rcd-1',
      protectionType: 'B16',
      cableCrossSection: 2.5,
      powerW: 100
    };

    const mcb2: Partial<SymbolItem> = {
      id: 'mcb-2',
      type: 'MCB',
      deviceKind: 'mcb',
      group: 'group-1',
      rcdSymbolId: 'rcd-1',
      protectionType: 'Brak', // Ignored
      cableCrossSection: 2.5,
      powerW: 100
    };

    const result = validateProject([rcd as SymbolItem, mcb1 as SymbolItem, mcb2 as SymbolItem]);
    
    // We shouldn't get VAL-008 (RCD overload)
    const hasVal008 = result.warnings.some(w => w.code === 'VAL-008');
    expect(hasVal008).toBe(false);
  });

  it('should detect a circuit assigned to a different phase than a single-phase RCD', () => {
    const rcd: Partial<SymbolItem> = {
      id: 'rcd-1p-n',
      type: 'RCD',
      label: 'Rozłącznik różnicowoprądowy 1P+N',
      deviceKind: 'rcd',
      phase: 'L1',
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
    };
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-l2',
      type: 'MCB',
      deviceKind: 'mcb',
      phase: 'L2',
      rcdSymbolId: 'rcd-1p-n',
      protectionType: 'B16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
    };

    const result = validateProject([rcd as SymbolItem, mcb as SymbolItem]);

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'VAL-010',
        symbolId: 'mcb-l2',
      }),
    );
  });

  it('should detect a three-phase circuit under a single-phase RCD', () => {
    const rcd: Partial<SymbolItem> = {
      id: 'rcd-1p-n',
      type: 'RCD',
      label: 'Rozłącznik różnicowoprądowy 1P+N',
      deviceKind: 'rcd',
      phase: 'L1',
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
    };
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-3f',
      type: 'MCB 3P',
      deviceKind: 'mcb',
      phase: 'L1+L2+L3',
      rcdSymbolId: 'rcd-1p-n',
      protectionType: 'C16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 3000,
    };

    const result = validateProject([rcd as SymbolItem, mcb as SymbolItem]);

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'VAL-010',
        symbolId: 'mcb-3f',
      }),
    );
  });

  it('should allow single-phase and three-phase circuits under a three-phase RCD', () => {
    const rcd: Partial<SymbolItem> = {
      id: 'rcd-3p-n',
      type: 'RCD',
      label: 'Rozłącznik różnicowoprądowy 3P+N',
      deviceKind: 'rcd',
      phase: 'L1+L2+L3',
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
    };
    const l2: Partial<SymbolItem> = {
      id: 'mcb-l2',
      type: 'MCB',
      deviceKind: 'mcb',
      phase: 'L2',
      rcdSymbolId: 'rcd-3p-n',
      protectionType: 'B16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
    };
    const threePhase: Partial<SymbolItem> = {
      ...l2,
      id: 'mcb-3f',
      type: 'MCB 3P',
      phase: 'L1+L2+L3',
      protectionType: 'C16',
      powerW: 3000,
    };

    const result = validateProject([rcd as SymbolItem, l2 as SymbolItem, threePhase as SymbolItem]);

    expect(result.errors.some((entry) => entry.code === 'VAL-010')).toBe(false);
  });

  it('should warn when an induction circuit is protected by type AC RCD', () => {
    const rcd: Partial<SymbolItem> = {
      id: 'rcd-ac',
      type: 'RCD',
      deviceKind: 'rcd',
      phase: 'L1',
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: 'AC',
    };
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-induction',
      type: 'MCB',
      deviceKind: 'mcb',
      circuitName: 'Płyta indukcyjna',
      phase: 'L1',
      rcdSymbolId: 'rcd-ac',
      protectionType: 'B16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
    };

    const result = validateProject([rcd as SymbolItem, mcb as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-011',
        symbolId: 'mcb-induction',
      }),
    );
  });

  it('should warn when an inverter circuit is not protected by type B RCD', () => {
    const rcd: Partial<SymbolItem> = {
      id: 'rcd-a',
      type: 'RCD',
      deviceKind: 'rcd',
      phase: 'L1+L2+L3',
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: 'A',
    };
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-pv',
      type: 'MCB 3P',
      deviceKind: 'mcb',
      circuitName: 'Falownik PV',
      phase: 'L1+L2+L3',
      rcdSymbolId: 'rcd-a',
      protectionType: 'C16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
    };

    const result = validateProject([rcd as SymbolItem, mcb as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-011',
        symbolId: 'mcb-pv',
      }),
    );
  });

  it('should accept type F or B for heat pump style circuits', () => {
    const rcd: Partial<SymbolItem> = {
      id: 'rcd-f',
      type: 'RCD',
      deviceKind: 'rcd',
      phase: 'L1+L2+L3',
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: 'F',
    };
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-heat-pump',
      type: 'MCB 3P',
      deviceKind: 'mcb',
      circuitName: 'Pompa ciepła',
      phase: 'L1+L2+L3',
      rcdSymbolId: 'rcd-f',
      protectionType: 'C16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
    };

    const result = validateProject([rcd as SymbolItem, mcb as SymbolItem]);

    expect(result.warnings.some((entry) => entry.code === 'VAL-011')).toBe(false);
  });

  it('should validate RCBO type against the protected receiver', () => {
    const rcbo: Partial<SymbolItem> = {
      id: 'rcbo-ev',
      type: 'RCBO',
      deviceKind: 'rcbo',
      circuitName: 'Ładowarka EV',
      phase: 'L1+L2+L3',
      rcdResidualCurrent: 30,
      rcdRatedCurrent: 40,
      rcdType: 'A',
      protectionType: 'C16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
    };

    const result = validateProject([rcbo as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-011',
        symbolId: 'rcbo-ev',
      }),
    );
  });

  it('should warn when RCBO has incomplete residual-current parameters', () => {
    const rcbo: Partial<SymbolItem> = {
      id: 'rcbo-incomplete',
      type: 'RCBO',
      deviceKind: 'rcbo',
      circuitName: 'Gniazda łazienka',
      phase: 'L1',
      protectionType: 'B16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
      rcdResidualCurrent: 0,
      rcdType: '',
    };

    const result = validateProject([rcbo as SymbolItem]);

    expect(result.warnings.filter((entry) => entry.code === 'VAL-012')).toHaveLength(2);
  });

  it('should warn when RCBO has no overcurrent protection rating', () => {
    const rcbo: Partial<SymbolItem> = {
      id: 'rcbo-no-protection',
      type: 'RCBO',
      deviceKind: 'rcbo',
      circuitName: 'Gniazda pokój',
      phase: 'L1',
      protectionType: 'Brak',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: 'A',
    };

    const result = validateProject([rcbo as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-012',
        symbolId: 'rcbo-no-protection',
      }),
    );
  });

  it('should error when RCBO overcurrent rating exceeds its rated current', () => {
    const rcbo: Partial<SymbolItem> = {
      id: 'rcbo-rating',
      type: 'RCBO',
      deviceKind: 'rcbo',
      circuitName: 'Obwód techniczny',
      phase: 'L1',
      protectionType: 'C40',
      cableCrossSection: 10,
      cableLength: 10,
      powerW: 1000,
      rcdRatedCurrent: 25,
      rcdResidualCurrent: 30,
      rcdType: 'A',
    };

    const result = validateProject([rcbo as SymbolItem]);

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'VAL-013',
        symbolId: 'rcbo-rating',
      }),
    );
  });

  it('should warn when socket or lighting RCBO residual current is above 30mA', () => {
    const rcbo: Partial<SymbolItem> = {
      id: 'rcbo-100ma',
      type: 'RCBO',
      deviceKind: 'rcbo',
      circuitName: 'Gniazda kuchnia',
      circuitType: 'Gniazdo',
      phase: 'L1',
      protectionType: 'B16',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 1000,
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 100,
      rcdType: 'A',
    };

    const result = validateProject([rcbo as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-014',
        symbolId: 'rcbo-100ma',
      }),
    );
  });

  it('should warn when a circuit has missing cable cross-section or length', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-no-cable-data',
      type: 'MCB',
      deviceKind: 'mcb',
      circuitName: 'Gniazda pokój',
      circuitType: 'Gniazdo',
      phase: 'L1',
      protectionType: 'B16',
      cableCrossSection: 0,
      cableLength: 0,
      powerW: 1000,
    };

    const result = validateProject([mcb as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-015',
        symbolId: 'mcb-no-cable-data',
      }),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-016',
        symbolId: 'mcb-no-cable-data',
      }),
    );
  });

  it('should warn when cable cross-section is not in the validation capacity table', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-odd-cable',
      type: 'MCB',
      deviceKind: 'mcb',
      circuitName: 'Obwód nietypowy',
      circuitType: 'Inne',
      phase: 'L1',
      protectionType: 'B10',
      cableCrossSection: 3,
      cableLength: 10,
      powerW: 1000,
    };

    const result = validateProject([mcb as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-015',
        symbolId: 'mcb-odd-cable',
      }),
    );
    expect(result.errors.some((entry) => entry.code === 'VAL-002' || entry.code === 'VAL-005')).toBe(false);
  });

  it('should warn when socket circuit uses a cable below the typical minimum cross-section', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-socket-small-cable',
      type: 'MCB',
      deviceKind: 'mcb',
      circuitName: 'Gniazda salon',
      circuitType: 'Gniazdo',
      phase: 'L1',
      protectionType: 'B10',
      cableCrossSection: 1.5,
      cableLength: 10,
      powerW: 1000,
    };

    const result = validateProject([mcb as SymbolItem]);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-017',
        symbolId: 'mcb-socket-small-cable',
      }),
    );
  });

  it('should report missing circuit documentation fields and electrical inputs', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-missing-fields',
      type: 'MCB',
      label: 'MCB 1P',
      deviceKind: 'mcb',
      circuitName: '',
      location: '',
      circuitType: 'Gniazdo',
      phase: 'L1',
      protectionType: 'Brak',
      cableCrossSection: 2.5,
      cableLength: 10,
      powerW: 0,
    };

    const result = validateProject([mcb as SymbolItem]);

    expect(result.info).toContainEqual(
      expect.objectContaining({
        code: 'VAL-018',
        symbolId: 'mcb-missing-fields',
      }),
    );
    expect(result.info).toContainEqual(
      expect.objectContaining({
        code: 'VAL-019',
        symbolId: 'mcb-missing-fields',
      }),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-020',
        symbolId: 'mcb-missing-fields',
      }),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-021',
        symbolId: 'mcb-missing-fields',
      }),
    );
  });

  it('should detect overload against configured main breaker when FR is missing', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-main-1',
      type: 'MCB',
      deviceKind: 'mcb',
      phase: 'L1',
      powerW: 12000,
      protectionType: 'B32',
      cableCrossSection: 10,
      cableLength: 10,
    };

    const result = validateProject([mcb as SymbolItem], { mainBreakerA: 40 });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'VAL-007',
      }),
    );
  });

  it('should warn when branch protection is equal to the configured main breaker', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-main-equal',
      type: 'MCB',
      deviceKind: 'mcb',
      circuitName: 'Obwód techniczny',
      phase: 'L1',
      powerW: 1000,
      protectionType: 'B25',
      cableCrossSection: 6,
      cableLength: 10,
    };

    const result = validateProject([mcb as SymbolItem], { mainBreakerA: 25 });

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'VAL-023',
        symbolId: 'mcb-main-equal',
      }),
    );
  });

  it('should validate the main breaker against the highest phase current, not the sum of all phases', () => {
    const l1: Partial<SymbolItem> = {
      id: 'mcb-l1',
      type: 'MCB',
      deviceKind: 'mcb',
      phase: 'L1',
      powerW: 4600,
      protectionType: 'B25',
      cableCrossSection: 6,
      cableLength: 10,
    };
    const l2: Partial<SymbolItem> = {
      ...l1,
      id: 'mcb-l2',
      phase: 'L2',
    };
    const l3: Partial<SymbolItem> = {
      ...l1,
      id: 'mcb-l3',
      phase: 'L3',
    };

    const result = validateProject([l1 as SymbolItem, l2 as SymbolItem, l3 as SymbolItem], { mainBreakerA: 25 });

    expect(result.errors.some((entry) => entry.code === 'VAL-007')).toBe(false);
  });

  it('should detect main breaker overload on the most loaded phase', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-l1-heavy',
      type: 'MCB',
      deviceKind: 'mcb',
      phase: 'L1',
      powerW: 6900,
      protectionType: 'B32',
      cableCrossSection: 10,
      cableLength: 10,
    };

    const result = validateProject([mcb as SymbolItem], { mainBreakerA: 25 });

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'VAL-007',
        details: expect.stringContaining('L1:'),
      }),
    );
  });

  it('should use the three-phase voltage-drop formula for three-phase circuits', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-3f-drop',
      type: 'MCB',
      deviceKind: 'mcb',
      phase: 'L1+L2+L3',
      powerW: 12420,
      protectionType: 'B25',
      cableCrossSection: 6,
      cableLength: 113,
    };

    const result = validateProject([mcb as SymbolItem], { supplyVoltageV: 230 });

    expect(result.warnings.some((entry) => entry.code === 'VAL-004')).toBe(false);
  });

  it('should use configured supply voltage in current-based cable validation', () => {
    const mcb: Partial<SymbolItem> = {
      id: 'mcb-voltage-1',
      type: 'MCB',
      deviceKind: 'mcb',
      phase: 'L1',
      powerW: 9200,
      protectionType: 'B32',
      cableCrossSection: 6,
      cableLength: 10,
    };

    const lowVoltageResult = validateProject([mcb as SymbolItem], { supplyVoltageV: 230 });
    const highVoltageResult = validateProject([mcb as SymbolItem], { supplyVoltageV: 400 });

    expect(lowVoltageResult.errors.some((entry) => entry.code === 'VAL-002')).toBe(true);
    expect(highVoltageResult.errors.some((entry) => entry.code === 'VAL-002')).toBe(false);
  });
});
