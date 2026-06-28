import { useMemo } from 'react';
import type { SymbolItem } from '../../types/symbolItem';
import type { ProjectMetadata } from '../../types/projectMetadata';
import type { DinRailCanvasRail } from '../../components/DinRailCanvasPixi';
import { buildCircuitRowsFromSymbols } from '../../lib/circuitRows';
import { validateProject, type ValidationResult } from '../../lib/validation/electricalValidationService';
import { getProjectFileName } from '../../lib/appHelpers';
import type { RcdManagerEntry } from '../../components/RcdManagementDialog';

export const EMPTY_VALIDATION_RESULT: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  info: [],
};

interface UseAppWorkspaceDerivedParams {
  symbols: SymbolItem[];
  dinRail: DinRailCanvasRail;
  metadata: ProjectMetadata;
  currentFilePath: string | null;
}

export function useAppWorkspaceDerived({
  symbols,
  dinRail,
  metadata,
  currentFilePath,
}: UseAppWorkspaceDerivedParams) {
  const circuitRows = useMemo(() => buildCircuitRowsFromSymbols(symbols), [symbols]);
  const hasGeneratedDinRail = dinRail.isVisible;
  const hasModules = symbols.length > 0;
  const canShowSchematicAndCircuitList = hasGeneratedDinRail && hasModules;
  const totalPower = symbols.reduce((sum, s) => sum + s.powerW, 0);
  const groupCount = symbols.filter((s) => s.deviceKind === "rcd").length;

  const validationResult = useMemo(
    () => {
      if (!hasGeneratedDinRail) {
        return EMPTY_VALIDATION_RESULT;
      }

      return validateProject(symbols, {
        supplyVoltageV: metadata.supplyVoltageV,
        mainBreakerA: metadata.mainBreakerA,
      });
    },
    [hasGeneratedDinRail, symbols, metadata.supplyVoltageV, metadata.mainBreakerA],
  );

  const errorCount = validationResult.errors.length;
  const warningCount = validationResult.warnings.length;
  const projectFileName = getProjectFileName(currentFilePath);

  const rcdManagerEntries = useMemo<RcdManagerEntry[]>(
    () =>
      symbols
        .filter((symbol) => symbol.deviceKind === "rcd")
        .map((symbol) => ({
          id: symbol.id,
          referenceDesignation: symbol.referenceDesignation,
          label: symbol.label,
          groupName: symbol.groupName,
          rcdRatedCurrent: symbol.rcdRatedCurrent,
          rcdResidualCurrent: symbol.rcdResidualCurrent,
          rcdType: symbol.rcdType,
        })),
    [symbols],
  );

  return {
    circuitRows,
    hasGeneratedDinRail,
    hasModules,
    canShowSchematicAndCircuitList,
    totalPower,
    groupCount,
    validationResult,
    errorCount,
    warningCount,
    projectFileName,
    rcdManagerEntries,
  };
}
