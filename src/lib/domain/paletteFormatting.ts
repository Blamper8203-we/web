import { detectExplicitPoleCount } from "../modules/importedModuleCatalog";
import { getPaletteTemplateDimensions, type PaletteTemplate } from "../modules/moduleCatalog";
import { createDefaultSymbolItem, type PhaseAssignment, type SymbolItem } from "../../types/symbolItem";
import { AppIconName } from "../../components/AppIcon";

const MANUAL_PHASE_KEY = "ManualPhase";
const SINGLE_PHASES: PhaseAssignment[] = ["L1", "L2", "L3"];

export function buildPaletteTemplateMap(
  paletteGroups: Array<{ items: PaletteTemplate[] }>,
) {
  return new Map(
    paletteGroups.flatMap((group) => group.items.map((item) => [item.templateId, item] as const)),
  );
}

function isFixedThreePhaseRcdTemplate(template: PaletteTemplate): boolean {
  if (template.deviceKind !== "rcd") {
    return false;
  }

  const identity = `${template.type} ${template.label} ${template.code} ${template.moduleRef}`
    .toLocaleUpperCase("pl-PL");
  if (identity.includes("2P") || identity.includes("1P")) {
    return false;
  }

  return template.modules >= 3 || identity.includes("4P") || identity.includes("3P") || template.phase === "L1+L2+L3";
}

function isFixedThreePhaseTemplate(template: PaletteTemplate): boolean {
  if (template.deviceKind !== "rcd") {
    return template.phase === "L1+L2+L3" || template.phase === "3F";
  }

  return isFixedThreePhaseRcdTemplate(template);
}

function isSinglePhaseRcdTemplate(template: PaletteTemplate): boolean {
  return template.deviceKind === "rcd" && !isFixedThreePhaseRcdTemplate(template);
}

function isSinglePhaseAssignment(phase: string | null | undefined): phase is PhaseAssignment {
  return SINGLE_PHASES.includes((phase || "").toUpperCase() as PhaseAssignment);
}

function normalizeSinglePhaseAssignment(
  phase: string | null | undefined,
  fallback: string | null | undefined = "L1",
): PhaseAssignment {
  const normalizedPhase = (phase || "").toUpperCase();
  if (isSinglePhaseAssignment(normalizedPhase)) {
    return normalizedPhase;
  }

  const normalizedFallback = (fallback || "").toUpperCase();
  return isSinglePhaseAssignment(normalizedFallback) ? normalizedFallback : "L1";
}

export function normalizePaletteAssetDimensions(
  symbols: SymbolItem[],
  paletteTemplateMap: Map<string, PaletteTemplate>,
): SymbolItem[] {
  let changed = false;

  const nextSymbols = symbols.map((symbol) => {
    if (!symbol.moduleRef) {
      return symbol;
    }

    const template = Array.from(paletteTemplateMap.values()).find(
      (item) => item.moduleRef === symbol.moduleRef,
    );

    if (!template) {
      return symbol;
    }

    const dimensions = getPaletteTemplateDimensions(template);
    const widthChanged = Math.abs(symbol.width - dimensions.width) > 0.01;
    const heightChanged = Math.abs(symbol.height - dimensions.height) > 0.01;
    const sourceType = template.templateId.startsWith("imported-catalog-")
      ? "ImportedSvg"
      : symbol.moduleSourceType;
    const sourceTypeChanged = symbol.moduleSourceType !== sourceType;
    const visualPath = template.assetPath || symbol.visualPath;
    const visualPathChanged = symbol.visualPath !== visualPath;
    const deviceKind = template.deviceKind;
    const deviceKindChanged = symbol.deviceKind !== deviceKind;
    const isFixedThreePhase = isFixedThreePhaseTemplate(template);
    const rawPhase =
      !isFixedThreePhase
        ? (symbol.phase || template.phase)
        : template.phase;
    const phase = isSinglePhaseRcdTemplate(template)
      ? normalizeSinglePhaseAssignment(rawPhase, template.phase)
      : rawPhase;
    const phaseChanged = symbol.phase !== phase;
    const shouldClearManualPhase =
      symbol.parameters[MANUAL_PHASE_KEY] === "true"
      && (isFixedThreePhase || (isSinglePhaseRcdTemplate(template) && !isSinglePhaseAssignment(symbol.phase)));
    const parameters =
      shouldClearManualPhase
        ? { ...symbol.parameters, [MANUAL_PHASE_KEY]: "false" }
        : symbol.parameters;
    const parametersChanged = parameters !== symbol.parameters;
    const rcdRatedCurrent = template.rcdRatedCurrent ?? symbol.rcdRatedCurrent;
    const rcdRatedCurrentChanged = symbol.rcdRatedCurrent !== rcdRatedCurrent;
    const rcdResidualCurrent = template.rcdResidualCurrent ?? symbol.rcdResidualCurrent;
    const rcdResidualCurrentChanged = symbol.rcdResidualCurrent !== rcdResidualCurrent;
    const rcdType = template.rcdType ?? symbol.rcdType;
    const rcdTypeChanged = symbol.rcdType !== rcdType;
    const isBuiltInLikeSource =
      symbol.moduleSourceType === "BuiltInAsset" || symbol.moduleSourceType === "ImportedSvg";
    const widthRatio = dimensions.width > 0 ? symbol.width / dimensions.width : 1;
    const heightRatio = dimensions.height > 0 ? symbol.height / dimensions.height : 1;
    const isSeverelyUnderscaled =
      Number.isFinite(widthRatio)
      && Number.isFinite(heightRatio)
      && widthRatio > 0
      && heightRatio > 0
      && widthRatio < 0.55
      && heightRatio < 0.55;
    const shouldNormalizeDimensions =
      isBuiltInLikeSource
      ? (widthChanged || heightChanged)
      : isSeverelyUnderscaled;
    const shouldNormalize =
      shouldNormalizeDimensions ||
      sourceTypeChanged ||
      visualPathChanged ||
      deviceKindChanged ||
      phaseChanged ||
      parametersChanged ||
      rcdRatedCurrentChanged ||
      rcdResidualCurrentChanged ||
      rcdTypeChanged;

    if (!shouldNormalize) {
      return symbol;
    }

    changed = true;
    return createDefaultSymbolItem({
      ...symbol,
      deviceKind,
      moduleSourceType: sourceType,
      phase,
      parameters,
      rcdRatedCurrent,
      rcdResidualCurrent,
      rcdType,
      visualPath,
      width: shouldNormalizeDimensions ? dimensions.width : symbol.width,
      height: shouldNormalizeDimensions ? dimensions.height : symbol.height,
    });
  });

  return changed ? nextSymbols : symbols;
}

export function getPaletteIconName(template: PaletteTemplate): AppIconName {
  switch (template.deviceKind) {
    case "fr":
      return "busbar";
    case "rcd":
    case "rcbo":
      return "validation";
    case "mcb":
      return "fileTree";
    case "spd":
      return "balance";
    case "terminalBlock":
      return "list";
    case "phaseIndicator":
      return "theme";
    default:
      return "palette";
  }
}

export function getPaletteDescription(template: PaletteTemplate): string {
  if (template.deviceKind === "terminalBlock") {
    return "";
  }

  let phaseText: string = template.phase;
  if (template.deviceKind === "mcb" || template.deviceKind === "rcd") {
    const poleCount = detectExplicitPoleCount(template.label) || template.modules;
    phaseText = `${poleCount}P`;
  } else if (
    template.category === "Blok rozdzielczy" ||
    template.deviceKind === "fr" ||
    template.deviceKind === "spd" ||
    template.deviceKind === "phaseIndicator"
  ) {
    phaseText = "";
  }

  const parts = [`${template.modules}M`];
  if (phaseText) {
    parts.push(phaseText);
  }
  const normalizedLabel = template.label.trim().toLocaleLowerCase("pl");
  const normalizedCode = template.code.trim().toLocaleLowerCase("pl");

  if (template.protectionType) {
    parts.push(template.protectionType);
  }

  if (template.rcdRatedCurrent && template.rcdResidualCurrent) {
    parts.push(`${template.rcdRatedCurrent}A / ${template.rcdResidualCurrent}mA`);
  }

  if (
    template.frRatedCurrent
    && !normalizedLabel.includes(template.frRatedCurrent.toLocaleLowerCase("pl"))
    && !normalizedCode.includes(template.frRatedCurrent.toLocaleLowerCase("pl"))
  ) {
    parts.push(template.frRatedCurrent);
  }

  if (
    template.spdType
    && !normalizedLabel.includes(template.spdType.toLocaleLowerCase("pl"))
    && !normalizedCode.includes(template.spdType.toLocaleLowerCase("pl"))
  ) {
    parts.push(template.spdType);
  }

  return parts.filter(Boolean).join(" · ");
}

export function getSymbolRatingText(symbol: SymbolItem): string | undefined {
  const value = `${symbol.type} ${symbol.label} ${symbol.visualPath} ${symbol.circuitName}`.toLocaleLowerCase("pl-PL");

  if (symbol.deviceKind === "rcd" || value.includes("rcd")) {
    const mA = symbol.rcdResidualCurrent;
    const residualStr = mA === 30 ? "0,03A" : mA === 100 ? "0,1A" : mA === 300 ? "0,3A" : `${mA}mA`;
    return `${symbol.rcdRatedCurrent}A/${residualStr}`;
  }
  if (symbol.deviceKind === "fr" || /\bfr\b/.test(value) || value.includes("switch") || value.includes("rozlacznik")) {
    return symbol.frRatedCurrent;
  }
  
  if (value.includes("przelacznik") && value.includes("siec")) {
    return symbol.frRatedCurrent;
  }

  if (symbol.protectionType || symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo" || value.includes("mcb") || /s\s*-?\s*30\d/.test(value)) {
    return symbol.protectionType;
  }

  return undefined;
}
