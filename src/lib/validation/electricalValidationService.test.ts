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
});
