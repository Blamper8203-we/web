import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useState } from 'react';
import {
  findDinRailSnapTarget,
  isGroupHeadSymbol,
  isDistributionSymbol,
  shouldExcludeFromAutoGrouping,
  getNextGroupName,
  getNextReferenceDesignation,
  getReferencePrefix,
  normalizeDinRailModuleOrdering,
  normalizeGroupConsistency,
  type SymbolHistorySnapshot,
  type PaletteTemplate,
  type RightTab,
  type SheetType,
} from '../lib/appHelpers';
import { getDinRailDimensions, LISTWY_ROW_SPACING } from '../lib/schematic/dinRailGenerator';
import {
  DIN_RAIL_PADDING_X,
  MODULE_UNIT_WIDTH,
  getPaletteTemplateDimensions,
  supportsDinRailPlacement,
} from '../lib/modules/moduleCatalog';
import { snapModulePlacementToDinRail } from '../lib/dinRailSnap';
import { createDefaultSymbolItem, type SymbolItem, MANUAL_REFERENCE_DESIGNATION_KEY } from "../types/symbolItem";
import type { DinRailCanvasRail } from '../components/DinRailCanvas';



interface UsePaletteActionsParams {
  symbols: SymbolItem[];
  paletteTemplateMap: Map<string, PaletteTemplate>;
  dinRail: DinRailCanvasRail;
  activeSheet: SheetType;
  selectedSymbol: SymbolItem | null;
  selectedSymbolId: string | null;
  selectedSymbolIds: string[];
  setActiveRightTab: (tab: RightTab) => void;
  setActiveSheet: (sheet: SheetType) => void;
  executeSymbolsCommand: (
    label: string,
    before: SymbolHistorySnapshot,
    after: SymbolHistorySnapshot,
    statusMessage: string,
  ) => boolean;
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;
  handleOpenDinRailGenerator: () => void;
  handleHidePaletteTemplate: (templateId: string) => void;
}

export function usePaletteActions({
  symbols,
  paletteTemplateMap,
  dinRail,
  activeSheet,
  selectedSymbol,
  selectedSymbolId,
  selectedSymbolIds,
  setActiveRightTab,
  setActiveSheet,
  executeSymbolsCommand,
  showTemporaryStatus,
  handleOpenDinRailGenerator,
  handleHidePaletteTemplate,
}: UsePaletteActionsParams) {
  const [paletteContextMenu, setPaletteContextMenu] = useState<{
    label: string;
    templateId: string;
    x: number;
    y: number;
  } | null>(null);

  const [pendingPaletteRemoval, setPendingPaletteRemoval] = useState<{
    label: string;
    templateId: string;
  } | null>(null);

  useEffect(() => {
    if (!paletteContextMenu && !pendingPaletteRemoval) return;

    const handlePointerDown = () => setPaletteContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPaletteContextMenu(null);
        setPendingPaletteRemoval(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [paletteContextMenu, pendingPaletteRemoval]);

  const handlePaletteDrop = useCallback(
    (templateId: string, x: number, y: number, options?: { snapToRail?: boolean }) => {
      if (!dinRail.isVisible) {
        showTemporaryStatus('Najpierw wygeneruj szynę DIN');
        handleOpenDinRailGenerator();
        return;
      }

      const template = paletteTemplateMap.get(templateId);
      if (!template) return;

      const referencePrefix = getReferencePrefix(template);
      const referenceDesignation = getNextReferenceDesignation(symbols, referencePrefix);
      const shouldLockReferenceDesignation =
        template.deviceKind === 'rcd' || template.deviceKind === 'fr';
      const moduleDimensions = getPaletteTemplateDimensions(template);
      const isTerminalBlock = template.category === "Listwy do rozdzielnicy" || template.category === "GSU";
      const shouldPlaceOnDinRail =
        options?.snapToRail === true && (supportsDinRailPlacement(template) || isTerminalBlock);

      let phase = template.phase;
      if (template.deviceKind === 'rcd') {
        const templateIdentity = `${template.type} ${template.code} ${template.label} ${template.moduleRef}`
          .toUpperCase();
        const isSinglePhaseRcd =
          !templateIdentity.includes("4P") &&
          !templateIdentity.includes("3P") &&
          (template.modules <= 2 || templateIdentity.includes("2P") || templateIdentity.includes("1P"));
        if (isSinglePhaseRcd) {
          const existingSinglePhaseRcds = symbols.filter((s) =>
            s.deviceKind === 'rcd' &&
            !`${s.type} ${s.label} ${s.moduleRef} ${s.visualPath}`.toUpperCase().includes("4P") &&
            !`${s.type} ${s.label} ${s.moduleRef} ${s.visualPath}`.toUpperCase().includes("3P")
          );
          const phases = ["L1", "L2", "L3"] as const;
          phase = phases[existingSinglePhaseRcds.length % 3];
        }
      }

      const nextSymbol = createDefaultSymbolItem({
        type: template.type,
        deviceKind: template.deviceKind,
        label: template.label,
        referenceDesignation,
        circuitName: template.label,
        circuitDescription: template.label,
        circuitType: template.circuitType ?? 'Inne',
        location: selectedSymbol?.location ?? '',
        powerW: template.powerW ?? 0,
        phase: phase,
        protectionType: template.protectionType ?? '',
        x,
        y,
        width: moduleDimensions.width,
        height: moduleDimensions.height,
        isSnappedToRail: shouldPlaceOnDinRail,
        rcdSymbolId: '',
        rcdRatedCurrent: template.rcdRatedCurrent ?? 0,
        rcdResidualCurrent: template.rcdResidualCurrent ?? 30,
        rcdType: template.rcdType ?? 'A',
        spdType: template.spdType ?? 'T1+T2',
        spdVoltage: template.spdVoltage ?? 275,
        spdDischargeCurrent: template.spdDischargeCurrent ?? 25,
        frRatedCurrent: template.frRatedCurrent ?? '63A',
        cableCrossSection:
          template.deviceKind === 'mcb' || template.deviceKind === 'rcbo'
            ? template.modules >= 3
              ? 4
              : 2.5
            : 10,
        moduleSourceType: template.moduleRef?.startsWith('imported/') || template.templateId.startsWith('imported-catalog-')
          ? 'ImportedSvg'
          : template.moduleRef
            ? 'BuiltInAsset'
            : 'palette',
        moduleRef: template.moduleRef ?? template.templateId,
        visualPath: template.assetPath ?? '',
        parameters: {
          ...(template.placeholderDefaults ?? {}),
          ...(shouldLockReferenceDesignation
            ? { [MANUAL_REFERENCE_DESIGNATION_KEY]: 'true' }
            : {}),
        },
      });

      let nextSymbols = [...symbols, nextSymbol];
      let statusMessage = shouldPlaceOnDinRail
        ? `Dodano ${template.code} do rozdzielnicy.`
        : `Dodano ${template.code} do schematu.`;

      if (shouldPlaceOnDinRail) {
        if (isTerminalBlock) {
          const topY = -1200;
          const rectHeight = 300;
          const bottomY = (dinRail.config.rows - 1) * LISTWY_ROW_SPACING + 2400;

          const gap = 300;
          const railDims = getDinRailDimensions(dinRail.config.rows, dinRail.config.modulesPerRow);
          const rectWidth = Math.min(2000, railDims.width * 0.35);
          const centerX = railDims.width / 2;
          const leftRectX = centerX - rectWidth - gap / 2;
          const rightRectX = centerX + gap / 2;
          
          const leftCenterX = leftRectX + rectWidth / 2;
          const rightCenterX = rightRectX + rectWidth / 2;

          let snapX = x;
          const distLeft = Math.abs((x + nextSymbol.width/2) - leftCenterX);
          const distRight = Math.abs((x + nextSymbol.width/2) - rightCenterX);
          
          if (distLeft < distRight && distLeft < 1500) snapX = leftCenterX - nextSymbol.width / 2;
          else if (distRight <= distLeft && distRight < 1500) snapX = rightCenterX - nextSymbol.width / 2;

          const inTopZone = y >= topY - 200 && y <= topY + rectHeight + 200;
          const inBottomZone = y >= bottomY - 200 && y <= bottomY + rectHeight + 200;

          if (inTopZone) {
             nextSymbol.x = snapX;
             nextSymbol.y = topY + rectHeight / 2 - nextSymbol.height / 2;
          } else if (inBottomZone) {
             nextSymbol.x = snapX;
             nextSymbol.y = bottomY + rectHeight / 2 - nextSymbol.height / 2;
          } else {
             const distTop = Math.abs(y - topY);
             const distBottom = Math.abs(y - bottomY);
             nextSymbol.x = snapX;
             if (distTop < distBottom) {
                nextSymbol.y = topY + rectHeight / 2 - nextSymbol.height / 2;
             } else {
                nextSymbol.y = bottomY + rectHeight / 2 - nextSymbol.height / 2;
             }
          }
        } else {
          const railDims = getDinRailDimensions(dinRail.config.rows, dinRail.config.modulesPerRow);
          const snappedSymbols = symbols.filter((s) => s.isSnappedToRail);
          const snapResult = snapModulePlacementToDinRail(
            nextSymbol.x,
            nextSymbol.y,
            nextSymbol.width,
            nextSymbol.height,
            railDims.width,
            railDims.rowCenters,
            snappedSymbols,
            undefined,
            { forceSnapToRail: true, moduleRef: nextSymbol.moduleRef }
          );

          nextSymbol.x = snapResult.x;
          nextSymbol.y = snapResult.y;

          const snapTarget = findDinRailSnapTarget(
            symbols,
            nextSymbol.x,
            nextSymbol.y,
            nextSymbol.width,
            nextSymbol.height,
            nextSymbol.moduleRef,
          );
          const excludeFromGrouping = shouldExcludeFromAutoGrouping(nextSymbol);

          if (snapTarget && !excludeFromGrouping) {
            if (snapTarget.group) {
              if (nextSymbol.deviceKind !== 'spd' && nextSymbol.deviceKind !== 'rcd') {
                nextSymbol.group = snapTarget.group;
                nextSymbol.groupName = snapTarget.groupName;

                if (snapTarget.rcdSymbolId) {
                  nextSymbol.rcdSymbolId = snapTarget.rcdSymbolId;
                  nextSymbol.rcdRatedCurrent = snapTarget.rcdRatedCurrent;
                  nextSymbol.rcdResidualCurrent = snapTarget.rcdResidualCurrent;
                  nextSymbol.rcdType = snapTarget.rcdType;
                } else if (snapTarget.deviceKind === 'rcd') {
                  nextSymbol.rcdSymbolId = snapTarget.id;
                  nextSymbol.rcdRatedCurrent = snapTarget.rcdRatedCurrent;
                  nextSymbol.rcdResidualCurrent = snapTarget.rcdResidualCurrent;
                  nextSymbol.rcdType = snapTarget.rcdType;
                }

                statusMessage = `Dodano ${template.code} do grupy ${snapTarget.groupName || snapTarget.group}.`;
              }
            } else {
              const targetIsHead = isGroupHeadSymbol(snapTarget);
              const newIsHead = isGroupHeadSymbol(nextSymbol);
              const targetIsDistribution = isDistributionSymbol(snapTarget);
              const newIsDistribution = isDistributionSymbol(nextSymbol);

              if ((targetIsHead || newIsHead) && (targetIsDistribution || newIsDistribution)) {
                const groupId = crypto.randomUUID();
                const groupName = getNextGroupName(symbols);

                nextSymbol.group = groupId;
                nextSymbol.groupName = groupName;
                nextSymbols = nextSymbols.map((s) =>
                  s.id === snapTarget.id ? { ...s, group: groupId, groupName } : s,
                );

                const rcdSymbol = targetIsHead ? snapTarget : nextSymbol;
                const childId = targetIsHead ? nextSymbol.id : snapTarget.id;
                nextSymbols = nextSymbols.map((s) =>
                  s.id === childId
                    ? ({
                        ...s,
                        rcdSymbolId: rcdSymbol.id,
                        rcdRatedCurrent: rcdSymbol.rcdRatedCurrent,
                        rcdResidualCurrent: rcdSymbol.rcdResidualCurrent,
                        rcdType: rcdSymbol.rcdType,
                      } as SymbolItem)
                    : s,
                );

                statusMessage = `Dodano ${template.code} i utworzono nowa grupe ${groupName}.`;
              }
            }
          }

          if (nextSymbol.deviceKind === 'rcd' && !nextSymbol.group) {
            const groupId = crypto.randomUUID();
            const groupName = getNextGroupName(symbols);
            nextSymbol.group = groupId;
            nextSymbol.groupName = groupName;
            statusMessage = `Dodano ${template.code} jako aparat grupowy ${groupName}.`;
          }

          nextSymbols = normalizeDinRailModuleOrdering(normalizeGroupConsistency(nextSymbols));
        }
      }

      setActiveRightTab('circuitEdit');
      executeSymbolsCommand(
        `Dodanie ${template.code}`,
        { symbols, selectedSymbolId, selectedSymbolIds },
        { symbols: nextSymbols, selectedSymbolId: nextSymbol.id, selectedSymbolIds: [nextSymbol.id] },
        statusMessage,
      );

      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Medium });
      }
    },
    [
      dinRail.config.modulesPerRow,
      dinRail.config.rows,
      dinRail.isVisible,
      executeSymbolsCommand,
      handleOpenDinRailGenerator,
      paletteTemplateMap,
      selectedSymbol,
      selectedSymbolId,
      selectedSymbolIds,
      setActiveRightTab,
      showTemporaryStatus,
      symbols,
    ],
  );

  const handlePaletteDropOnSheet2 = useCallback(
    (templateId: string) => {
      const template = paletteTemplateMap.get(templateId);
      if (!template) return;

      const column = symbols.length % 4;
      const row = Math.floor(symbols.length / 4) % 4;
      setActiveSheet('sheet2');
      handlePaletteDrop(templateId, 120 + column * 220, 140 + row * 130);
    },
    [handlePaletteDrop, paletteTemplateMap, setActiveSheet, symbols.length],
  );

  const handlePaletteInsert = useCallback(
    (templateId: string) => {
      const template = paletteTemplateMap.get(templateId);
      if (!template) return;

      if (activeSheet === 'sheet1') {
        if (!dinRail.isVisible) {
          showTemporaryStatus('Najpierw wygeneruj szynę DIN');
          handleOpenDinRailGenerator();
          return;
        }

        // WHY: "Listwy do rozdzielnicy" / "GSU" formalnie nie przechodzą
        // supportsDinRailPlacement(), ale są blokami zaciskowymi kładzionymi
        // nad/pod szyną DIN (patrz handlePaletteDrop: isTerminalBlock →
        // shouldPlaceOnDinRail, strefy top/bottom). Traktujemy je tu jak moduły
        // szynowe, żeby dwuklik w palecie kładł je na rozdzielnicy — zgodnie z
        // drag&drop (useDinRailDragDrop) — zamiast wysyłać na Schemat (sheet2).
        const isTerminalBlock =
          template.category === 'Listwy do rozdzielnicy' || template.category === 'GSU';
        if (!supportsDinRailPlacement(template) && !isTerminalBlock) {
          showTemporaryStatus(`${template.code} dodajemy poza szyną DIN.`);
          handlePaletteDropOnSheet2(templateId);
          return;
        }

        const moduleDimensions = getPaletteTemplateDimensions(template);
        const railDims = getDinRailDimensions(dinRail.config.rows, dinRail.config.modulesPerRow);
        const usedModules = symbols
          .filter((s) => s.isSnappedToRail)
          .reduce((sum, s) => sum + Math.max(1, Math.round(s.width / MODULE_UNIT_WIDTH)), 0);
        const rowIndex = Math.min(
          dinRail.config.rows - 1,
          Math.floor(usedModules / dinRail.config.modulesPerRow),
        );
        const slotIndex = usedModules % dinRail.config.modulesPerRow;
        const x = DIN_RAIL_PADDING_X + slotIndex * MODULE_UNIT_WIDTH;
        const y =
          (railDims.rowCenters[rowIndex] ?? railDims.rowCenters[0] ?? moduleDimensions.height / 2) -
          moduleDimensions.height / 2;

        handlePaletteDrop(templateId, x, y, { snapToRail: true });
        return;
      }

      handlePaletteDropOnSheet2(templateId);
    },
    [
      activeSheet,
      dinRail,
      handleOpenDinRailGenerator,
      handlePaletteDrop,
      handlePaletteDropOnSheet2,
      paletteTemplateMap,
      showTemporaryStatus,
      symbols,
    ],
  );

  const handleUnsupportedDinRailDrop = useCallback(
    (templateId: string) => {
      const template = paletteTemplateMap.get(templateId);
      if (!template) return;
      showTemporaryStatus(`${template.code} dodajemy na schemacie, nie na szynie DIN.`);
    },
    [paletteTemplateMap, showTemporaryStatus],
  );

  const handleConfirmPaletteRemoval = useCallback(() => {
    if (!pendingPaletteRemoval) return;
    handleHidePaletteTemplate(pendingPaletteRemoval.templateId);
    showTemporaryStatus(`Usunięto ${pendingPaletteRemoval.label} z lewego panelu`, 3000);
    setPendingPaletteRemoval(null);
  }, [handleHidePaletteTemplate, pendingPaletteRemoval, showTemporaryStatus]);

  return {
    paletteContextMenu,
    setPaletteContextMenu,
    pendingPaletteRemoval,
    setPendingPaletteRemoval,
    handlePaletteDrop,
    handlePaletteInsert,
    handleUnsupportedDinRailDrop,
    handleConfirmPaletteRemoval,
  };
}
