import type { CircuitTypeValue, DeviceKind, PhaseAssignment } from "../../types/symbolItem";
import {
  currentModuleEntries,
  groupOrder,
  groupDisplayNames,
  moduleEntries,
  DIN_RAIL_UNIT_PER_MODULE,
  DIN_RAIL_PADDING_X,
  MODULE_UNIT_WIDTH,
  MODULE_UNIT_MM_WIDTH,
  MODULE_PX_PER_MM,
  MODULE_UNIT_HEIGHT,
} from "./builtinModules";
import type { ModuleEntry } from "./builtinModules";

export {
  currentModuleEntries,
  DIN_RAIL_UNIT_PER_MODULE,
  DIN_RAIL_PADDING_X,
  MODULE_UNIT_WIDTH,
  MODULE_UNIT_MM_WIDTH,
  MODULE_PX_PER_MM,
  MODULE_UNIT_HEIGHT,
};

export interface PaletteTemplate {
  templateId: string;
  code: string;
  label: string;
  type: string;
  category: string;
  deviceKind: DeviceKind;
  phase: PhaseAssignment;
  modules: number;
  moduleRef: string;
  assetPath: string;
  customWidth?: number;
  customHeight?: number;
  placeholderDefaults?: Record<string, string>;
  protectionType?: string;
  powerW?: number;
  circuitType?: CircuitTypeValue;
  rcdRatedCurrent?: number;
  rcdResidualCurrent?: number;
  rcdType?: string;
  spdType?: string;
  spdVoltage?: number;
  spdDischargeCurrent?: number;
  frRatedCurrent?: string;
}

export interface PaletteGroup {
  title: string;
  subtitle: string;
  items: PaletteTemplate[];
}

const INCLUDE_LEGACY_BUILT_IN_MODULES = false;


const MODULE_HEIGHT_MM_BY_REF: Record<string, number> = {
  "FR/fr 1P.svg": 80,
  "FR/FR.svg": 80,
  "SPD/SPD 1p.svg": 90,
  "SPD/SPD.svg": 90,
  "RCD/RCD 2P.svg": 83,
  "RCD/RCD 4P.svg": 83,
  "MCB/roz\u0142acznik nadpr\u0105dowy MCB 1P.svg": 83,
  "MCB/roz\u0142acznik nadpr\u0105dowy MCB 2P.svg": 83,
  "Kontrolki faz/Kontrolki faz.svg": 83,
  "GSU/GSU.svg": 84,
  "Inne/GNIAZDO SZYNA DIN.svg": 85,
};

const MODULE_VIEWBOX_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "Listwy zaciskowe/LISTWA 12 PIN.svg": { width: 124, height: 1063 },
  "zlacza/listwa-zaciskowa-5pin-3p-n-pe.svg": { width: 750, height: 473 },
  "zlacza/zlacze-3xpen.svg": { width: 456, height: 473 },
  "Złącza/Złączka 5-torowa (L1-L2-L3-N-PE).svg": { width: 1002, height: 593 },
  "Złącza/Złączka N 1-zaciskowa.svg": { width: 202, height: 593 },
  "Złącza/Złączka N 2-zaciskowa.svg": { width: 390, height: 593 },
  "Złącza/Złączka N 3-zaciskowa.svg": { width: 606, height: 593 },
  "Złącza/Złączka PE 1-zaciskowa.svg": { width: 206, height: 611 },
  "Złącza/Złączka PE 2-zaciskowa.svg": { width: 396, height: 611 },
  "Złącza/Złączka PE 3-zaciskowa.svg": { width: 585, height: 612 },
};





function getPaletteEntryAssetPath(item: ModuleEntry): string {
  const assetUrl = getModuleAssetUrl(item.moduleRef);
  return currentModuleEntries.includes(item)
    ? `${assetUrl}?dinboardSource=importedSvg`
    : assetUrl;
}

export const PALETTE_GROUPS: PaletteGroup[] = groupOrder
  .map((category) => {
    const sourceItems = [
      ...currentModuleEntries.filter((item) => item.category === category),
      ...(
        INCLUDE_LEGACY_BUILT_IN_MODULES
          ? moduleEntries.filter((item) => item.category === category)
          : []
      ),
    ];
    const items = sourceItems.map((item) => ({
      ...item,
      assetPath: getPaletteEntryAssetPath(item),
    }));

    return {
      title: groupDisplayNames[category] ?? category,
      subtitle: `Assets/Modules/${category}`,
      items,
    };
  });

export const PALETTE_TEMPLATE_MAP = new Map(
  PALETTE_GROUPS.flatMap((group) => group.items.map((item) => [item.templateId, item] as const)),
);

export function getPaletteTemplateById(templateId: string): PaletteTemplate | undefined {
  return PALETTE_TEMPLATE_MAP.get(templateId);
}

export function getModuleSnapAnchorRatioY(moduleRef?: string): number {
  if (!moduleRef) {
    return 0.5;
  }

  const normalized = moduleRef.toLocaleLowerCase("pl-PL");
  if (
    normalized.includes("listwa 12 pin") ||
    normalized.includes("listwa 12pin") ||
    (normalized.includes("listwa") && normalized.includes("12pin")) ||
    normalized.includes("listwa zaciskowa 12 pin") ||
    normalized.includes("listwa zaciskowa 12pin")
  ) {
    // This asset's DIN clamp axis is above the geometric center of its viewBox.
    return 0.464;
  }

  return 0.5;
}

export function supportsDinRailPlacement(template: {
  category?: string;
  deviceKind?: DeviceKind;
  moduleRef?: string;
}): boolean {
  if (template.category === "Listwy do rozdzielnicy" || template.category === "GSU") {
    return false;
  }
  return true;
}

export function getPaletteTemplateDimensions(template: {
  category?: string;
  customHeight?: number;
  customWidth?: number;
  moduleRef?: string;
  modules: number;
}): { width: number; height: number } {
  if (template.customWidth && template.customHeight) {
    return { width: template.customWidth, height: template.customHeight };
  }

  const originalModuleRef = template.moduleRef ?? "";
  const moduleRef = originalModuleRef.toLocaleLowerCase("pl-PL");
  const category = template.category?.toLocaleLowerCase("pl-PL") ?? "";
  const modules = Math.max(1, template.modules);
  let width = modules * MODULE_UNIT_WIDTH;
  let height = MODULE_UNIT_HEIGHT;

  if (moduleRef.includes("blok rozdzielczy 4x7")) {
    width = Math.round(71 * MODULE_PX_PER_MM * 100) / 100;
    height = Math.round(97 * MODULE_PX_PER_MM * 100) / 100;
  } else if (moduleRef.includes("blok rozdzielczy")) {
    // Fallback dla ewentualnych innych bloków rozdzielczych zdefiniowanych w przyszłości (ok. 4 moduły szerokości, 88mm wys)
    width = modules * MODULE_UNIT_WIDTH;
    height = Math.round(88 * 13.29);
  }

  const viewBox = MODULE_VIEWBOX_DIMENSIONS[originalModuleRef];
  if (viewBox) {
    height = Math.round(((width * viewBox.height) / viewBox.width) * 100) / 100;
  }

  const customHeightMm = MODULE_HEIGHT_MM_BY_REF[originalModuleRef];
  const shouldUseAuthoredModuleSize =
    !!customHeightMm &&
    !moduleRef.includes("blok rozdzielczy") &&
    !category.includes("listwy") &&
    !category.includes("z\u0142\u0105cza") &&
    !moduleRef.includes("listwa") &&
    !moduleRef.includes("zlacze") &&
    !moduleRef.includes("zlacza");
  if (shouldUseAuthoredModuleSize && customHeightMm) {
    width = Math.round(modules * MODULE_UNIT_WIDTH * 100) / 100;
    height = Math.round(customHeightMm * MODULE_PX_PER_MM * 100) / 100;
  }

  return { width, height };
}

export function getModuleAssetUrl(moduleRef: string): string {
  const baseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  let encodedRef = moduleRef
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  // Vite's development server on local filesystem (especially on Windows)
  // fails to locate files containing "+" if they are percent-encoded as "%2B".
  // Decode %2B back to + during local development.
  if (import.meta.env.DEV) {
    encodedRef = encodedRef.replace(/%2B/gi, "+");
  }

  return `${baseUrl}assets/modules/${encodedRef}`;
}
