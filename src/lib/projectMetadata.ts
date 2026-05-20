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

const DEFAULT_WORK_SCOPE_ITEMS = [
  "Montaż rozdzielnicy głównej",
  "Układanie przewodów i osprzętu",
  "Pomiary ochrony przeciwporażeniowej",
];

const DEFAULT_ATTACHMENT_ITEMS = [
  "Protokoły z pomiarów",
  "Schemat rozdzielnicy",
  "Uprawnienia wykonawcy",
];

function createChecklistItems(values: string[]): TitlePageChecklistItem[] {
  return values.map((text) => ({
    text,
    isChecked: true,
  }));
}

function createPlaceholderMeasurementProtocols(): MeasurementProtocolsData {
  const base = createDefaultMeasurementProtocols("", "");

  return {
    ...base,
    continuityHeader: {
      headerTitle: "",
      headerSubtitle: "",
      measurementDate: "",
      objectName: "",
    },
    loopHeader: {
      headerTitle: "",
      headerSubtitle: "",
      measurementDate: "",
      objectName: "",
    },
    insulationHeader: {
      headerTitle: "",
      headerSubtitle: "",
      measurementDate: "",
      objectName: "",
    },
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
    projectNumber: "E-01",
    author: "inz. Adam Wisniewski",
    authorLicense: "upr. bud. nr 67890",
    company: "Instalacja elektryczna - dom jednorodzinny",
    titlePageObjectType,
    address: "ul. Budowlana 12, 59-300 Lubin",
    investor: "Jan Kowalski",
    contractor: "FHU Elektro Jan Kowalski",
    designerId: "upr. bud. nr 67890",
    revision: "1.0",
    drawingScale: "bez skali",
    drawingDate: today,
    sheetNumber: "",
    designerSignature: "mgr inz. Adam Wisniewski",
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
    titlePageUseManualWorkScopeCheckboxes: true,
    titlePageCompanyLogoFileName: "",
    titlePageCompanyLogoDataUrl: "",
    measurementProtocols: createDefaultMeasurementProtocols(today, titlePageObjectType),
    supplyVoltageV: 230,
    supplyPhases: 3,
    mainBreakerA: 63,
    contractedPowerKw: 14,
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
    contractor: "",
    designerId: "",
    revision: "",
    drawingScale: "",
    drawingDate: "",
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
    titlePageUseManualWorkScopeCheckboxes: true,
    titlePageCompanyLogoFileName: "",
    titlePageCompanyLogoDataUrl: "",
    measurementProtocols: createPlaceholderMeasurementProtocols(),
    supplyVoltageV: 230,
    supplyPhases: 3,
    mainBreakerA: 63,
    contractedPowerKw: 14,
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
    dateCreated: raw?.dateCreated || defaults.dateCreated,
    dateModified: raw?.dateModified || defaults.dateModified,
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
      ? raw.titlePageAttachmentItems.filter((item) => item.trim().length > 0)
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
  };
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
      continuityHeader: resetHeaders.continuityHeader,
      loopHeader: resetHeaders.loopHeader,
      insulationHeader: resetHeaders.insulationHeader,
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
    window.localStorage.getItem(PROJECT_METADATA_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_PROJECT_METADATA_STORAGE_KEY);

  if (!raw) {
    return createEmptyProjectMetadata();
  }

  try {
    return normalizeProjectMetadata(JSON.parse(raw) as Partial<ProjectMetadata>);
  } catch {
    return createEmptyProjectMetadata();
  }
}
