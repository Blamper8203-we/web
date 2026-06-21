import { safeGetItemSync } from "./storageService";
import {
  createDefaultMeasurementProtocols,
  normalizeMeasurementProtocolsData,
} from "./measurementProtocols";
import type {
  MeasurementProtocolsData,
  ProjectMetadata,
  TitlePageChecklistItem,
} from "../types/projectMetadata";

export const PROJECT_METADATA_STORAGE_KEY = "dinboard-web.project-metadata.v1";
const LEGACY_PROJECT_METADATA_STORAGE_KEY = "dinboard-tauri.project-metadata.v1";

const DEFAULT_STANDARDS = [
  "IEC 61082",
  "PN-EN 60617",
  "IEC 61346",
  "PN-HD 60364",
];
export const DEFAULT_SIMULTANEITY_FACTOR = 0.6;

export const DEFAULT_WORK_SCOPE_ITEMS = [
  "Montaż rozdzielnicy głównej",
  "Układanie przewodów i osprzętu",
  "Pomiary ochrony przeciwporażeniowej",
];

export const DEFAULT_ATTACHMENT_ITEMS = [
  "Tabela zbiorcza pomiarów",
  "RCD i uziemienie",
  "Schemat instalacji elektrycznej",
  "Widok rozdzielnicy elektrycznej",
  "Lista obwodów",
];

function createChecklistItems(values: string[]): TitlePageChecklistItem[] {
  return values.map((text) => ({
    text,
    isChecked: true,
  }));
}

const ATTACHMENT_ITEM_PREFIX_PATTERN = /^(?:[-*•]\s*|\[\s*[xX]?\]\s*|[\u2713\u2714\u2611]\s*)+/u;
const ATTACHMENT_ITEM_MARKER_PATTERN = /^(?:[-*•]+|\[\s*[xX]?\]|[\u2713\u2714\u2611]+)$/u;

const STANDARD_ATTACHMENT_ALIASES: Record<string, string> = {
  "tabela zbiorcza": "Tabela zbiorcza pomiarów",
  "tabela zbiorcza pomiarow": "Tabela zbiorcza pomiarów",
  "protokol rcd": "RCD i uziemienie",
  "protokol rcd i uziemienia": "RCD i uziemienie",
  "rcd i uziemienia": "RCD i uziemienie",
  "rcd i uziemienie": "RCD i uziemienie",
  schemat: "Schemat instalacji elektrycznej",
  "schemat instalacji": "Schemat instalacji elektrycznej",
  "schemat instalacji elektrycznej": "Schemat instalacji elektrycznej",
  "schemat jednokreskowy rozdzielnicy": "Schemat instalacji elektrycznej",
  rozdzielnica: "Widok rozdzielnicy elektrycznej",
  "widok rozdzielnicy": "Widok rozdzielnicy elektrycznej",
  "widok rozdzielnicy elektrycznej": "Widok rozdzielnicy elektrycznej",
  "lista obwodow": "Lista obwodów",
};

const LEGACY_STANDARD_ATTACHMENT_ITEMS = new Set([
  "opis obwodow",
  "protokol z pomiarow ochronnych",
  "protokoly z pomiarow",
  "schemat rozdzielnicy",
  "uprawnienia wykonawcy",
  "kopia uprawnien budowlanych / sep",
]);

function comparableAttachmentItem(value: string): string {
  return value
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeAttachmentItem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || ATTACHMENT_ITEM_MARKER_PATTERN.test(trimmed)) {
    return null;
  }

  const normalized = trimmed.replace(ATTACHMENT_ITEM_PREFIX_PATTERN, "").trim();
  if (!normalized || ATTACHMENT_ITEM_MARKER_PATTERN.test(normalized)) {
    return null;
  }

  const comparable = comparableAttachmentItem(normalized);
  const standardAlias = STANDARD_ATTACHMENT_ALIASES[comparable];
  if (standardAlias) {
    return standardAlias;
  }

  if (
    comparable === "zalaczniki" ||
    comparable === "zalaczniki do protokolu" ||
    comparable === "zakres prac" ||
    LEGACY_STANDARD_ATTACHMENT_ITEMS.has(comparable) ||
    DEFAULT_WORK_SCOPE_ITEMS.some((item) => comparableAttachmentItem(item) === comparable)
  ) {
    return null;
  }

  return normalized;
}

export function normalizeAttachmentItems(items: string[] | undefined): string[] {
  const normalizedItems: string[] = [];

  for (const item of items ?? []) {
    const normalized = normalizeAttachmentItem(item);
    if (!normalized) {
      continue;
    }

    const alreadyExists = normalizedItems.some(
      (candidate) => comparableAttachmentItem(candidate) === comparableAttachmentItem(normalized),
    );
    if (!alreadyExists) {
      normalizedItems.push(normalized);
    }
  }

  return normalizedItems;
}

export function mergeDefaultAttachmentItems(items: string[] | undefined): string[] {
  const merged = [...DEFAULT_ATTACHMENT_ITEMS];

  for (const item of normalizeAttachmentItems(items)) {
    const alreadyExists = merged.some(
      (mergedItem) => comparableAttachmentItem(mergedItem) === comparableAttachmentItem(item),
    );
    if (!alreadyExists) {
      merged.push(item);
    }
  }

  return merged;
}

function createPlaceholderMeasurementProtocols(): MeasurementProtocolsData {
  const base = createDefaultMeasurementProtocols("", "");

  return {
    ...base,
    rcdGroundHeader: {
      headerTitle: "",
      headerSubtitle: "",
      measurementDate: "",
      objectName: "",
    },
    continuityMeasurementCurrent: "",
    loopNetworkVoltage: "",
    loopNetworkSystem: "",
    insulationTestVoltage: "",
    groundMeasurementMethod: "",
    groundElectrodeType: "",
    groundRequiredResistance: "",
    groundConclusionText: "",
  };
}

export function createDefaultProjectMetadata(): ProjectMetadata {
  const today = formatDateForField(new Date().toISOString());
  const titlePageObjectType = "Budynek jednorodzinny / Lokal mieszkalny";

  return {
    projectNumber: "PW-01/2026",
    author: "Jan Kowalski",
    authorLicense: "SEP E+D nr 123/2026",
    company: "Dokumentacja powykonawcza instalacji elektrycznej",
    titlePageObjectType,
    address: "ul. Budowlana 12, 59-300 Lubin",
    investor: "Jan Kowalski",
    investorAddress: "",
    contractor: "FHU Elektro Jan Kowalski",
    contractorNip: "",
    contractorRegon: "",
    contractorPhone: "",
    contractorEmail: "",
    designerId: "SEP E+D nr 123/2026",
    revision: "wyd. 1",
    drawingScale: "bez skali",
    drawingDate: today,
    statementDate: today,
    sheetNumber: "",
    designerSignature: "Jan Kowalski",
    investorSignature: "",
    contractorSignature: "PIECZATKA WYKONAWCY",
    isFormalDocumentationMode: true,
    dateCreated: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    notes: "",
    standards: [...DEFAULT_STANDARDS],
    documentationOptionalScope: DEFAULT_WORK_SCOPE_ITEMS.join("\n"),
    titlePageWorkScopeItems: createChecklistItems(DEFAULT_WORK_SCOPE_ITEMS),
    titlePageAttachmentItems: [...DEFAULT_ATTACHMENT_ITEMS],
    titlePageSepValidUntil: "31.12.2026",
    titlePageUseManualWorkScopeCheckboxes: false,
    titlePageCompanyLogoFileName: "",
    titlePageCompanyLogoDataUrl: "",
    measurementProtocols: createDefaultMeasurementProtocols(today, titlePageObjectType),
    supplyVoltageV: 230,
    supplyPhases: 3,
    mainBreakerA: 63,
    contractedPowerKw: 14,
    simultaneityFactor: DEFAULT_SIMULTANEITY_FACTOR,
  };
}

export function createEmptyProjectMetadata(): ProjectMetadata {
  return {
    projectNumber: "",
    author: "",
    authorLicense: "",
    company: "",
    titlePageObjectType: "",
    address: "",
    investor: "",
    investorAddress: "",
    contractor: "",
    contractorNip: "",
    contractorRegon: "",
    contractorPhone: "",
    contractorEmail: "",
    designerId: "",
    revision: "",
    drawingScale: "",
    drawingDate: "",
    statementDate: "",
    sheetNumber: "",
    designerSignature: "",
    investorSignature: "",
    contractorSignature: "",
    isFormalDocumentationMode: true,
    dateCreated: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    notes: "",
    standards: [...DEFAULT_STANDARDS],
    documentationOptionalScope: "",
    titlePageWorkScopeItems: [],
    titlePageAttachmentItems: [],
    titlePageSepValidUntil: "",
    titlePageUseManualWorkScopeCheckboxes: false,
    titlePageCompanyLogoFileName: "",
    titlePageCompanyLogoDataUrl: "",
    measurementProtocols: createPlaceholderMeasurementProtocols(),
    supplyVoltageV: 230,
    supplyPhases: 3,
    mainBreakerA: 63,
    contractedPowerKw: 14,
    simultaneityFactor: DEFAULT_SIMULTANEITY_FACTOR,
  };
}

export function parseStandards(text: string): string[] {
  if (!text.trim()) {
    return [...DEFAULT_STANDARDS];
  }

  const values = text
    .replace(/\r/g, "")
    .replace(/\n/g, ";")
    .replace(/,/g, ";")
    .split(";")
    .map((value: string) => value.trim())
    .filter(Boolean)
    .filter((value: string, index: number, array: string[]) => {
      const lower = value.toLocaleLowerCase("pl-PL");
      return (
        array.findIndex(
          (candidate: string) => candidate.toLocaleLowerCase("pl-PL") === lower,
        ) === index
      );
    });

  return values.length > 0 ? values : [...DEFAULT_STANDARDS];
}

export function standardsToText(standards: string[]): string {
  if (standards.length === 0) {
    return DEFAULT_STANDARDS.join("; ");
  }

  return standards.join("; ");
}

export function formatDateForField(value: string): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

export function normalizeProjectMetadata(
  raw: Partial<ProjectMetadata> | null | undefined,
): ProjectMetadata {
  const defaults = createDefaultProjectMetadata();
  const objectName =
    raw?.titlePageObjectType?.trim() || raw?.company?.trim() || defaults.titlePageObjectType;
  const measurementDate = raw?.drawingDate?.trim() || defaults.drawingDate;

  return {
    ...defaults,
    ...raw,
    drawingDate: raw?.drawingDate?.trim() || defaults.drawingDate,
    statementDate: raw?.statementDate?.trim() || raw?.drawingDate?.trim() || defaults.statementDate,
    dateCreated: raw?.dateCreated || defaults.dateCreated,
    dateModified: raw?.dateModified || defaults.dateModified,
    investorAddress: raw?.investorAddress ?? defaults.investorAddress,
    contractorNip: raw?.contractorNip ?? defaults.contractorNip,
    contractorRegon: raw?.contractorRegon ?? defaults.contractorRegon,
    contractorPhone: raw?.contractorPhone ?? defaults.contractorPhone,
    contractorEmail: raw?.contractorEmail ?? defaults.contractorEmail,
    standards:
      Array.isArray(raw?.standards) && raw.standards.length > 0
        ? raw.standards.filter((value) => value.trim().length > 0)
        : defaults.standards,
    documentationOptionalScope:
      raw?.documentationOptionalScope ?? defaults.documentationOptionalScope,
    titlePageWorkScopeItems: Array.isArray(raw?.titlePageWorkScopeItems)
      ? raw.titlePageWorkScopeItems
          .filter((item) => item.text.trim().length > 0)
          .map((item) => ({
            text: item.text.trim(),
            isChecked: item.isChecked,
          }))
      : defaults.titlePageWorkScopeItems,
    titlePageAttachmentItems: Array.isArray(raw?.titlePageAttachmentItems)
      ? mergeDefaultAttachmentItems(raw.titlePageAttachmentItems)
      : defaults.titlePageAttachmentItems,
    titlePageSepValidUntil: raw?.titlePageSepValidUntil ?? defaults.titlePageSepValidUntil,
    titlePageUseManualWorkScopeCheckboxes:
      typeof raw?.titlePageUseManualWorkScopeCheckboxes === "boolean"
        ? raw.titlePageUseManualWorkScopeCheckboxes
        : defaults.titlePageUseManualWorkScopeCheckboxes,
    titlePageCompanyLogoFileName:
      raw?.titlePageCompanyLogoFileName ?? defaults.titlePageCompanyLogoFileName,
    titlePageCompanyLogoDataUrl:
      raw?.titlePageCompanyLogoDataUrl ?? defaults.titlePageCompanyLogoDataUrl,
    measurementProtocols: normalizeMeasurementProtocolsData(
      raw?.measurementProtocols,
      measurementDate,
      objectName,
    ),
    supplyVoltageV: raw?.supplyVoltageV ?? defaults.supplyVoltageV,
    supplyPhases: raw?.supplyPhases ?? defaults.supplyPhases,
    mainBreakerA: raw?.mainBreakerA ?? defaults.mainBreakerA,
    contractedPowerKw: raw?.contractedPowerKw ?? defaults.contractedPowerKw,
    simultaneityFactor: normalizeSimultaneityFactor(raw?.simultaneityFactor, defaults.simultaneityFactor),
  };
}

export function normalizeSimultaneityFactor(value: number | undefined, fallback = DEFAULT_SIMULTANEITY_FACTOR): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0.1, Math.min(1, Math.round(Number(value) * 100) / 100));
}

export function resetDocumentationFields(metadata: ProjectMetadata): ProjectMetadata {
  const defaults = createDefaultProjectMetadata();
  const objectName = metadata.titlePageObjectType || metadata.company || defaults.titlePageObjectType;
  const measurementDate = metadata.drawingDate || defaults.drawingDate;
  const resetHeaders = createDefaultMeasurementProtocols(measurementDate, objectName);
  const currentProtocols = normalizeMeasurementProtocolsData(
    metadata.measurementProtocols,
    measurementDate,
    objectName,
  );

  return normalizeProjectMetadata({
    ...metadata,
    titlePageSepValidUntil: defaults.titlePageSepValidUntil,
    titlePageUseManualWorkScopeCheckboxes: defaults.titlePageUseManualWorkScopeCheckboxes,
    titlePageWorkScopeItems: createChecklistItems(DEFAULT_WORK_SCOPE_ITEMS),
    titlePageAttachmentItems: [...DEFAULT_ATTACHMENT_ITEMS],
    documentationOptionalScope: DEFAULT_WORK_SCOPE_ITEMS.join("\n"),
    titlePageCompanyLogoFileName: "",
    titlePageCompanyLogoDataUrl: "",
    measurementProtocols: {
      ...currentProtocols,
      rcdGroundHeader: resetHeaders.rcdGroundHeader,
    },
    dateModified: new Date().toISOString(),
  });
}

export function loadProjectMetadata(): ProjectMetadata {
  if (typeof window === "undefined") {
    return createEmptyProjectMetadata();
  }

  const raw =
    safeGetItemSync(PROJECT_METADATA_STORAGE_KEY) ??
    safeGetItemSync(LEGACY_PROJECT_METADATA_STORAGE_KEY);

  if (!raw) {
    return createEmptyProjectMetadata();
  }

  try {
    return normalizeProjectMetadata(JSON.parse(raw) as Partial<ProjectMetadata>);
  } catch {
    return createEmptyProjectMetadata();
  }
}
