import type { CircuitTypeValue, DeviceKind, PhaseAssignment } from "../../types/symbolItem";

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

type ModuleEntry = Omit<PaletteTemplate, "assetPath">;

const INCLUDE_LEGACY_BUILT_IN_MODULES = false;

export const DIN_RAIL_UNIT_PER_MODULE = 250;
export const DIN_RAIL_PADDING_X = 55;
export const MODULE_UNIT_WIDTH = 232.58;
export const MODULE_UNIT_MM_WIDTH = 17.5;
export const MODULE_PX_PER_MM = MODULE_UNIT_WIDTH / MODULE_UNIT_MM_WIDTH;
export const MODULE_UNIT_HEIGHT = Math.round(83 * MODULE_PX_PER_MM);

function svg300DpiPx(svgPixels: number): number {
  return Math.round(svgPixels * (25.4 / 300) * MODULE_PX_PER_MM * 100) / 100;
}

const MODULE_HEIGHT_MM_BY_REF: Record<string, number> = {
  "FR/fr 1P.svg": 80,
  "FR/FR.svg": 80,
  "SPD/SPD 1p.svg": 90,
  "SPD/SPD.svg": 90,
  "RCD/RCD 2P.svg": 83,
  "RCD/RCD 4P.svg": 83,
  "MCB/MCB 1P.svg": 83,
  "MCB/MCB 2P.svg": 83,
  "MCB/MCB 3p.svg": 83,
  "Controls/Kontrolki faz.svg": 83,
  "Inne/GNIAZDO SZYNA DIN.svg": 85,
};

const MODULE_VIEWBOX_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "Listwy zaciskowe/LISTWA 12 PIN.svg": { width: 124, height: 1063 },
  "zlacza/listwa-zaciskowa-5pin-3p-n-pe.svg": { width: 750, height: 473 },
  "zlacza/zlacze-3xpen.svg": { width: 456, height: 473 },
};

const moduleEntries: ModuleEntry[] = [
  {
    templateId: "fr-1p-svg",
    code: "fr 1P",
    label: "fr 1P",
    type: "FR",
    category: "FR",
    deviceKind: "fr",
    phase: "L1",
    modules: 1,
    moduleRef: "FR/fr 1P.svg",
    frRatedCurrent: "63A",
  },
  {
    templateId: "fr-3p-svg",
    code: "FR",
    label: "FR",
    type: "FR",
    category: "FR",
    deviceKind: "fr",
    phase: "L1+L2+L3",
    modules: 3,
    moduleRef: "FR/FR.svg",
    placeholderDefaults: { LABEL: "63A" },
    frRatedCurrent: "63A",
  },
  {
    templateId: "spd-1p-svg",
    code: "SPD 1p",
    label: "SPD 1p",
    type: "SPD",
    category: "SPD",
    deviceKind: "spd",
    phase: "L1",
    modules: 1,
    moduleRef: "SPD/SPD 1p.svg",
    spdType: "T2",
    spdVoltage: 275,
    spdDischargeCurrent: 25,
  },
  {
    templateId: "spd-4p-svg",
    code: "SPD",
    label: "SPD",
    type: "SPD",
    category: "SPD",
    deviceKind: "spd",
    phase: "L1+L2+L3",
    modules: 4,
    moduleRef: "SPD/SPD.svg",
    spdType: "T1+T2",
    spdVoltage: 275,
    spdDischargeCurrent: 25,
  },
  {
    templateId: "rcd-2p-svg",
    code: "RCD 2P",
    label: "RCD 2P",
    type: "RCD",
    category: "RCD",
    deviceKind: "rcd",
    phase: "L1",
    modules: 2,
    moduleRef: "RCD/RCD 2P.svg",
    placeholderDefaults: { CURRENT: "40A" },
    rcdRatedCurrent: 40,
    rcdResidualCurrent: 30,
    rcdType: "A",
  },
  {
    templateId: "rcd-4p-svg",
    code: "RCD 4P",
    label: "RCD 4P",
    type: "RCD",
    category: "RCD",
    deviceKind: "rcd",
    phase: "L1+L2+L3",
    modules: 4,
    moduleRef: "RCD/RCD 4P.svg",
    placeholderDefaults: { CURRENT: "40A" },
    rcdRatedCurrent: 40,
    rcdResidualCurrent: 30,
    rcdType: "A",
  },
  {
    templateId: "mcb-1p-svg",
    code: "MCB 1P",
    label: "MCB 1P",
    type: "MCB",
    category: "MCB",
    deviceKind: "mcb",
    phase: "L1",
    modules: 1,
    moduleRef: "MCB/MCB 1P.svg",
    placeholderDefaults: { CURRENT: "B16" },
    protectionType: "B16",
    powerW: 2300,
  },
  {
    templateId: "mcb-2p-svg",
    code: "MCB 2P",
    label: "MCB 2P",
    type: "MCB",
    category: "MCB",
    deviceKind: "mcb",
    phase: "L1+L2",
    modules: 2,
    moduleRef: "MCB/MCB 2P.svg",
    placeholderDefaults: { CURRENT: "B16" },
    protectionType: "B16",
    powerW: 7200,
  },
  {
    templateId: "mcb-3p-svg",
    code: "MCB 3p",
    label: "MCB 3p",
    type: "MCB",
    category: "MCB",
    deviceKind: "mcb",
    phase: "L1+L2+L3",
    modules: 3,
    moduleRef: "MCB/MCB 3p.svg",
    placeholderDefaults: { CURRENT: "C16" },
    protectionType: "C16",
    powerW: 11000,
  },
  {
    templateId: "blok-rozdzielczy-4-15-svg",
    code: "blok rozdzielczy 4 15",
    label: "blok rozdzielczy 4 15",
    type: "Blok rozdzielczy",
    category: "Blok rozdzielczy",
    deviceKind: "other",
    phase: "L1+L2+L3",
    modules: 6,
    moduleRef: "Blok rozdzielczy/blok rozdzielczy 4 15.svg",
    placeholderDefaults: { BLUE_COVER_VISIBILITY: "visible" },
  },
  {
    templateId: "kontrolki-faz-svg",
    code: "Kontrolki faz",
    label: "Kontrolki faz",
    type: "Controls",
    category: "Controls",
    deviceKind: "phaseIndicator",
    phase: "L1+L2+L3",
    modules: 1,
    moduleRef: "Controls/Kontrolki faz.svg",
  },
  {
    templateId: "gniazdo-szyna-din-svg",
    code: "GNIAZDO SZYNA DIN",
    label: "GNIAZDO SZYNA DIN",
    type: "Inne",
    category: "Inne",
    deviceKind: "other",
    phase: "L1",
    modules: 2,
    moduleRef: "Inne/GNIAZDO SZYNA DIN.svg",
    circuitType: "Gniazdo",
  },
  {
    templateId: "listwa-12-pin-svg",
    code: "LISTWA 12 PIN",
    label: "LISTWA 12 PIN",
    type: "Listwy",
    category: "Listwy zaciskowe",
    deviceKind: "terminalBlock",
    phase: "L1+L2+L3",
    modules: 1,
    moduleRef: "Listwy zaciskowe/LISTWA 12 PIN.svg",
    customWidth: MODULE_UNIT_WIDTH,
    customHeight: MODULE_UNIT_HEIGHT,
  },
  {
    templateId: "listwa-zaciskowa-5pin-svg",
    code: "Listwa zaciskowa 5pin",
    label: "Listwa zaciskowa 5pin (3P+N+PE)",
    type: "Z\u0142\u0105cza",
    category: "Z\u0142\u0105cza",
    deviceKind: "terminalBlock",
    phase: "L1+L2+L3",
    modules: 3,
    moduleRef: "zlacza/listwa-zaciskowa-5pin-3p-n-pe.svg",
  },
  {
    templateId: "zlacze-3xpen-svg",
    code: "Z\u0141\u0104CZE 3XPEN",
    label: "Z\u0141\u0104CZE 3XPEN",
    type: "Z\u0142\u0105cza",
    category: "Z\u0142\u0105cza",
    deviceKind: "terminalBlock",
    phase: "L1+L2+L3",
    modules: 2,
    moduleRef: "zlacza/zlacze-3xpen.svg",
  },
];

const currentModuleEntries: ModuleEntry[] = [
  {
    templateId: "przelacznik-sieci-3p-svg",
    code: "Przełącznik sieci 3P",
    label: "Przełącznik sieci 3P",
    type: "Przełącznik sieci",
    category: "Przełączniki sieci",
    deviceKind: "other",
    phase: "L1+L2+L3",
    modules: 4,
    moduleRef: "Przelaczniki sieci/Przelacznik sieci 3P.svg",
    customWidth: svg300DpiPx(1152),
    customHeight: svg300DpiPx(983),
  },
  {
    templateId: "przelacznik-sieci-4p-svg",
    code: "Przełącznik sieci 4P",
    label: "Przełącznik sieci 4P",
    type: "Przełącznik sieci",
    category: "Przełączniki sieci",
    deviceKind: "other",
    phase: "L1+L2+L3",
    modules: 4,
    moduleRef: "Przelaczniki sieci/Przelacznik sieci 4P.svg",
    customWidth: svg300DpiPx(1474),
    customHeight: svg300DpiPx(983),
  },
  {
    templateId: "przelacznik-siec-4p-svg",
    code: "Przełącznik sieć 4P",
    label: "Przełącznik sieć 4P",
    type: "Przełącznik sieci",
    category: "Przełączniki sieci",
    deviceKind: "other",
    phase: "L1+L2+L3",
    modules: 4,
    moduleRef: "Przelaczniki sieci/Przelacznik siec 4P.svg",
    customWidth: svg300DpiPx(829),
    customHeight: svg300DpiPx(983),
  },
  {
    templateId: "rcd-1p-n-new-svg",
    code: "Rozłącznik różnicowoprądowy 1P+N",
    label: "Rozłącznik różnicowoprądowy 1P+N",
    type: "RCD",
    category: "RCD",
    deviceKind: "rcd",
    phase: "L1",
    modules: 2,
    moduleRef: "RCD/Rozłącznik różnicowoprądowy 1P+N.svg",
    customWidth: svg300DpiPx(416),
    customHeight: svg300DpiPx(983),
    rcdRatedCurrent: 40,
    rcdResidualCurrent: 30,
    rcdType: "A",
  },
  {
    templateId: "rcd-3p-n-new-svg",
    code: "Rozłącznik różnicowoprądowy 3P+N",
    label: "Rozłącznik różnicowoprądowy 3P+N",
    type: "RCD",
    category: "RCD",
    deviceKind: "rcd",
    phase: "L1+L2+L3",
    modules: 4,
    moduleRef: "RCD/Rozłącznik różnicowoprądowy 3P+N.svg",
    customWidth: svg300DpiPx(853),
    customHeight: svg300DpiPx(983),
    rcdRatedCurrent: 40,
    rcdResidualCurrent: 30,
    rcdType: "A",
  },
];

const groupOrder = [
  "FR",
  "SPD",
  "RCD",
  "MCB",
  "Blok rozdzielczy",
  "Przełączniki sieci",
  "Controls",
  "Inne",
  "Listwy zaciskowe",
  "Z\u0142\u0105cza",
];

const groupDisplayNames: Record<string, string> = {
  Controls: "Kontrolki faz",
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

export function supportsDinRailPlacement(_template: {
  category?: string;
  deviceKind?: DeviceKind;
  moduleRef?: string;
}): boolean {
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

  if (moduleRef.includes("blok rozdzielczy")) {
    width = Math.max(width, 6 * MODULE_UNIT_WIDTH);
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
