import type { CircuitRow } from "../types/circuitRow";
import { firstNonEmpty } from "./stringHelpers";
import type {
  MeasurementProtocolHeaderSettings,
  MeasurementProtocolsData,
  MeasurementRcdProtocolRow,
  MeasurementUnifiedProtocolRow,
  ProjectMetadata,
} from "../types/projectMetadata";

export const LOOP_ROW_COUNT = 15;
export const RCD_ROW_COUNT = 6;
const RCD_GROUND_DEFAULT_SUBTITLE = "Test wyłączników RCD i rezystancja uziemienia";
const DEFAULT_GROUND_CONCLUSION =
  "Instalacja w zakresie ochrony przeciwporażeniowej, stanu izolacji oraz skuteczności uziemienia odpowiada wymogom normy PN-HD 60364 i nadaje się do eksploatacji.";

type CircuitSeed = {
  sourceCircuitId: string;
  referenceDesignation: string;
  circuitName: string;
  location: string;
  protectionType: string;
  ratedCurrent: string;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildComparableKey(...values: Array<string | null | undefined>): string {
  const normalized = values.map((value) => normalizeText(value).toLocaleLowerCase("pl-PL"));
  return normalized.every((value) => value.length === 0) ? "" : normalized.join("|");
}


function valueOrFallback(value: string | null | undefined, fallback: string): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return normalizeText(value);
}

function createDefaultProtocolHeader(
  protocolNumber: number,
  subtitle: string,
  measurementDate: string,
  objectName: string,
): MeasurementProtocolHeaderSettings {
  const year = measurementDate.slice(0, 4) || new Date().getFullYear().toString();

  return {
    headerTitle: `Protokół Nr ${String(protocolNumber).padStart(2, "0")} / ${year}`,
    headerSubtitle: subtitle,
    measurementDate,
    objectName,
  };
}

function normalizeHeader(
  raw: Partial<MeasurementProtocolHeaderSettings> | undefined,
  fallback: MeasurementProtocolHeaderSettings,
): MeasurementProtocolHeaderSettings {
  return {
    headerTitle: valueOrFallback(raw?.headerTitle, fallback.headerTitle),
    headerSubtitle: valueOrFallback(raw?.headerSubtitle, fallback.headerSubtitle),
    measurementDate: valueOrFallback(raw?.measurementDate, fallback.measurementDate),
    objectName: valueOrFallback(raw?.objectName, fallback.objectName),
  };
}


function createEmptyRcdRow(index: number): MeasurementRcdProtocolRow {
  return {
    index,
    sourceCircuitId: "",
    referenceDesignation: "",
    deviceType: "",
    residualCurrent: "",
    tripCurrent: "",
    tripTimeMs: "",
    testButtonResult: "",
    assessment: "",
  };
}

function createEmptyUnifiedRow(index: number): MeasurementUnifiedProtocolRow {
  return {
    index,
    sourceCircuitId: "",
    referenceDesignation: "",
    circuitName: "",
    location: "",
    protectionType: "",
    ratedCurrent: "",
    lnResistance: "",
    lpeResistance: "",
    npeResistance: "",
    measuredImpedance: "",
    allowedImpedance: "",
    assessment: "",
  };
}


function normalizeRcdRows(rows: Partial<MeasurementRcdProtocolRow>[] | undefined): MeasurementRcdProtocolRow[] {
  const normalized = (rows ?? [])
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: normalizeText(row.sourceCircuitId),
      referenceDesignation: normalizeText(row.referenceDesignation),
      deviceType: normalizeText(row.deviceType),
      residualCurrent: normalizeText(row.residualCurrent),
      tripCurrent: normalizeText(row.tripCurrent),
      tripTimeMs: normalizeText(row.tripTimeMs),
      testButtonResult: normalizeText(row.testButtonResult),
      assessment: normalizeText(row.assessment),
    }));

  while (normalized.length < RCD_ROW_COUNT) {
    normalized.push(createEmptyRcdRow(normalized.length + 1));
  }

  return normalized;
}

function normalizeUnifiedRows(
  rows: Partial<MeasurementUnifiedProtocolRow>[] | undefined,
): MeasurementUnifiedProtocolRow[] {
  const normalized = (rows ?? [])
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: normalizeText(row.sourceCircuitId),
      referenceDesignation: normalizeText(row.referenceDesignation),
      circuitName: normalizeText(row.circuitName),
      location: normalizeText(row.location),
      protectionType: normalizeText(row.protectionType),
      ratedCurrent: normalizeText(row.ratedCurrent),
      lnResistance: normalizeText(row.lnResistance),
      lpeResistance: normalizeText(row.lpeResistance),
      npeResistance: normalizeText(row.npeResistance),
      measuredImpedance: normalizeText(row.measuredImpedance),
      allowedImpedance: normalizeText(row.allowedImpedance),
      assessment: normalizeText(row.assessment),
    }));

  while (normalized.length < LOOP_ROW_COUNT) {
    normalized.push(createEmptyUnifiedRow(normalized.length + 1));
  }

  return normalized;
}

function extractRatedCurrent(protectionType: string): string {
  const match = normalizeText(protectionType).toUpperCase().match(/[BCD]\s*(\d+)/);
  return match?.[1] ?? "";
}

function extractResidualCurrent(source: CircuitRow): string {
  const searchable = `${source.displayProtection} ${source.protectionType} ${source.label} ${source.type}`;
  const match = searchable.match(/(\d+(?:[.,]\d+)?)\s*mA/i);
  return match?.[1]?.replace(",", ".") ?? "";
}

function buildCircuitSeedRows(circuitRows: CircuitRow[]): CircuitSeed[] {
  return circuitRows
    .filter((row) => row.deviceKind === "mcb" || row.deviceKind === "rcbo")
    .slice()
    .sort((left, right) => left.x - right.x)
    .map((row) => ({
      sourceCircuitId: row.id,
      referenceDesignation: normalizeText(row.referenceDesignation),
      circuitName: firstNonEmpty(row.circuitName, row.label, row.displayLocation, "Obwód"),
      location: firstNonEmpty(row.displayLocation, row.location),
      protectionType: firstNonEmpty(row.protectionType, row.displayProtection),
      ratedCurrent: extractRatedCurrent(firstNonEmpty(row.protectionType, row.displayProtection)),
    }));
}


function buildRcdSeedRows(circuitRows: CircuitRow[]): MeasurementRcdProtocolRow[] {
  return circuitRows
    .filter((row) => row.deviceKind === "rcd")
    .slice()
    .sort((left, right) => left.x - right.x)
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: row.id,
      referenceDesignation: normalizeText(row.referenceDesignation),
      deviceType: firstNonEmpty(row.displayProtection, row.label, row.type, `RCD ${index + 1}`),
      residualCurrent: extractResidualCurrent(row),
      tripCurrent: "",
      tripTimeMs: "",
      testButtonResult: "",
      assessment: "",
    }));
}

function buildUnifiedSeedRows(circuitRows: CircuitRow[]): MeasurementUnifiedProtocolRow[] {
  return buildCircuitSeedRows(circuitRows)
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: row.sourceCircuitId,
      referenceDesignation: row.referenceDesignation,
      circuitName: row.circuitName,
      location: row.location,
      protectionType: row.protectionType,
      ratedCurrent: row.ratedCurrent,
      lnResistance: "",
      lpeResistance: "",
      npeResistance: "",
      measuredImpedance: "",
      allowedImpedance: "",
      assessment: "",
    }));
}


function hasRcdContent(row: MeasurementRcdProtocolRow): boolean {
  return (
    row.deviceType.length > 0 ||
    row.residualCurrent.length > 0 ||
    row.tripCurrent.length > 0 ||
    row.tripTimeMs.length > 0 ||
    row.testButtonResult.length > 0 ||
    row.assessment.length > 0
  );
}

function hasUnifiedContent(row: MeasurementUnifiedProtocolRow): boolean {
  return (
    row.circuitName.length > 0 ||
    row.location.length > 0 ||
    row.protectionType.length > 0 ||
    row.ratedCurrent.length > 0 ||
    row.lnResistance.length > 0 ||
    row.lpeResistance.length > 0 ||
    row.npeResistance.length > 0 ||
    row.measuredImpedance.length > 0 ||
    row.allowedImpedance.length > 0 ||
    row.assessment.length > 0
  );
}


function matchRcdRow(candidate: MeasurementRcdProtocolRow, seeded: MeasurementRcdProtocolRow): boolean {
  if (candidate.sourceCircuitId && seeded.sourceCircuitId) {
    return candidate.sourceCircuitId === seeded.sourceCircuitId;
  }

  const fullKey = buildComparableKey(candidate.deviceType, candidate.residualCurrent);
  const seededKey = buildComparableKey(seeded.deviceType, seeded.residualCurrent);

  return fullKey.length > 0 && fullKey === seededKey;
}

function matchUnifiedRow(candidate: MeasurementUnifiedProtocolRow, seeded: MeasurementUnifiedProtocolRow): boolean {
  if (candidate.sourceCircuitId && seeded.sourceCircuitId) {
    return candidate.sourceCircuitId === seeded.sourceCircuitId;
  }

  const fullKey = buildComparableKey(
    candidate.circuitName,
    candidate.location,
    candidate.protectionType,
    candidate.ratedCurrent,
  );
  const seededKey = buildComparableKey(
    seeded.circuitName,
    seeded.location,
    seeded.protectionType,
    seeded.ratedCurrent,
  );

  if (fullKey && seededKey && fullKey === seededKey) {
    return true;
  }

  return buildComparableKey(candidate.circuitName, candidate.protectionType, candidate.ratedCurrent) ===
    buildComparableKey(seeded.circuitName, seeded.protectionType, seeded.ratedCurrent);
}

function appendRemainingRows<T>(target: T[], pool: T[], predicate: (row: T) => boolean): void {
  for (const row of pool) {
    if (predicate(row)) {
      target.push(row);
    }
  }
}


function mergeRcdRows(
  seededRows: MeasurementRcdProtocolRow[],
  storedRows: MeasurementRcdProtocolRow[],
): MeasurementRcdProtocolRow[] {
  const storedPool = storedRows.map((row) => ({ ...row }));
  const merged: MeasurementRcdProtocolRow[] = [];

  for (const seededRow of seededRows) {
    const matchIndex = storedPool.findIndex((candidate) => matchRcdRow(candidate, seededRow));
    if (matchIndex >= 0) {
      const storedRow = storedPool.splice(matchIndex, 1)[0];
      merged.push({
        ...seededRow,
        tripCurrent: storedRow.tripCurrent,
        tripTimeMs: storedRow.tripTimeMs,
        testButtonResult: storedRow.testButtonResult,
        assessment: storedRow.assessment,
      });
    } else {
      merged.push(seededRow);
    }
  }

  appendRemainingRows(merged, storedPool, hasRcdContent);
  return normalizeRcdRows(merged);
}

function mergeUnifiedRows(
  seededRows: MeasurementUnifiedProtocolRow[],
  storedRows: MeasurementUnifiedProtocolRow[],
): MeasurementUnifiedProtocolRow[] {
  const storedPool = storedRows.map((row) => ({ ...row }));
  const merged: MeasurementUnifiedProtocolRow[] = [];

  for (const seededRow of seededRows) {
    const matchIndex = storedPool.findIndex((candidate) => matchUnifiedRow(candidate, seededRow));
    if (matchIndex >= 0) {
      const storedRow = storedPool.splice(matchIndex, 1)[0];
      merged.push({
        ...seededRow,
        lnResistance: storedRow.lnResistance,
        lpeResistance: storedRow.lpeResistance,
        npeResistance: storedRow.npeResistance,
        measuredImpedance: storedRow.measuredImpedance,
        allowedImpedance: storedRow.allowedImpedance,
        assessment: storedRow.assessment,
      });
    } else {
      merged.push(seededRow);
    }
  }

  appendRemainingRows(merged, storedPool, hasUnifiedContent);
  return normalizeUnifiedRows(merged);
}

export function createDefaultMeasurementProtocols(
  measurementDate: string,
  objectName: string,
): MeasurementProtocolsData {
  return {
    rcdGroundHeader: createDefaultProtocolHeader(
      4,
      RCD_GROUND_DEFAULT_SUBTITLE,
      measurementDate,
      objectName,
    ),
    unifiedHeader: createDefaultProtocolHeader(
      1,
      "Tabela zbiorcza wyników pomiarów",
      measurementDate,
      objectName,
    ),
    continuityMeterName: "",
    continuityMeterSerialNumber: "",
    continuityMeasurementCurrent: ">= 200 mA",
    loopMeterName: "",
    loopMeterSerialNumber: "",
    loopNetworkVoltage: "230/400V",
    loopNetworkSystem: "TN-S / TN-C-S",
    insulationTestVoltage: "500V",
    insulationMeterName: "",
    insulationMeterSerialNumber: "",
    rcdGroundMeterName: "",
    rcdGroundMeterSerialNumber: "",
    groundMeasurementMethod: "Trójbiegunowa / impedancja pętli",
    groundElectrodeType: "Fundamentowy / otokowy",
    groundMeasuredResistance: "",
    groundRequiredResistance: "< 10 Ohm",
    groundConclusionText: DEFAULT_GROUND_CONCLUSION,
    recommendationsText: "",
    rcdRows: normalizeRcdRows(undefined),
    unifiedRows: normalizeUnifiedRows(undefined),
  };
}

export function normalizeMeasurementProtocolsData(
  raw: Partial<MeasurementProtocolsData> | undefined,
  measurementDate: string,
  objectName: string,
): MeasurementProtocolsData {
  const defaults = createDefaultMeasurementProtocols(measurementDate, objectName);

  return {
    rcdGroundHeader: normalizeHeader(raw?.rcdGroundHeader, defaults.rcdGroundHeader),
    unifiedHeader: normalizeHeader(raw?.unifiedHeader, defaults.unifiedHeader),
    continuityMeterName: normalizeText(raw?.continuityMeterName),
    continuityMeterSerialNumber: normalizeText(raw?.continuityMeterSerialNumber),
    continuityMeasurementCurrent: valueOrFallback(
      raw?.continuityMeasurementCurrent,
      defaults.continuityMeasurementCurrent,
    ),
    loopMeterName: normalizeText(raw?.loopMeterName),
    loopMeterSerialNumber: normalizeText(raw?.loopMeterSerialNumber),
    loopNetworkVoltage: valueOrFallback(raw?.loopNetworkVoltage, defaults.loopNetworkVoltage),
    loopNetworkSystem: valueOrFallback(raw?.loopNetworkSystem, defaults.loopNetworkSystem),
    insulationTestVoltage: valueOrFallback(raw?.insulationTestVoltage, defaults.insulationTestVoltage),
    insulationMeterName: normalizeText(raw?.insulationMeterName),
    insulationMeterSerialNumber: normalizeText(raw?.insulationMeterSerialNumber),
    rcdGroundMeterName: normalizeText(raw?.rcdGroundMeterName),
    rcdGroundMeterSerialNumber: normalizeText(raw?.rcdGroundMeterSerialNumber),
    groundMeasurementMethod: valueOrFallback(
      raw?.groundMeasurementMethod,
      defaults.groundMeasurementMethod,
    ),
    groundElectrodeType: valueOrFallback(raw?.groundElectrodeType, defaults.groundElectrodeType),
    groundMeasuredResistance: normalizeText(raw?.groundMeasuredResistance),
    groundRequiredResistance: valueOrFallback(
      raw?.groundRequiredResistance,
      defaults.groundRequiredResistance,
    ),
    groundConclusionText: valueOrFallback(raw?.groundConclusionText, defaults.groundConclusionText),
    recommendationsText: normalizeText(raw?.recommendationsText),
    rcdRows: normalizeRcdRows(raw?.rcdRows),
    unifiedRows: normalizeUnifiedRows(raw?.unifiedRows),
  };
}

export function buildEditableMeasurementProtocols(
  metadata: ProjectMetadata,
  circuitRows: CircuitRow[],
): MeasurementProtocolsData {
  const objectName = firstNonEmpty(metadata.titlePageObjectType, metadata.company, "Nowe zlecenie");
  const measurementDate = firstNonEmpty(metadata.drawingDate, new Date().toISOString().slice(0, 10));
  const stored = normalizeMeasurementProtocolsData(
    metadata.measurementProtocols,
    measurementDate,
    objectName,
  );

  return {
    ...stored,
    rcdRows: mergeRcdRows(buildRcdSeedRows(circuitRows), stored.rcdRows),
    unifiedRows: mergeUnifiedRows(buildUnifiedSeedRows(circuitRows), stored.unifiedRows),
  };
}
