import type { CircuitRow } from "../types/circuitRow";
import type {
  MeasurementContinuityProtocolRow,
  MeasurementInsulationProtocolRow,
  MeasurementLoopProtocolRow,
  MeasurementProtocolHeaderSettings,
  MeasurementProtocolsData,
  MeasurementRcdProtocolRow,
  ProjectMetadata,
} from "../types/projectMetadata";

export const CONTINUITY_ROW_COUNT = 15;
export const LOOP_ROW_COUNT = 15;
export const INSULATION_ROW_COUNT = 18;
export const RCD_ROW_COUNT = 6;

const CONTINUITY_DEFAULT_SUBTITLE =
  "Badanie ciągłości przewodów PE i połączeń wyrównawczych";
const LOOP_DEFAULT_SUBTITLE = "Badanie skuteczności ochrony przeciwporażeniowej";
const INSULATION_DEFAULT_SUBTITLE = "Badanie rezystancji izolacji obwodów";
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

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return "";
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

function createEmptyContinuityRow(index: number): MeasurementContinuityProtocolRow {
  return {
    index,
    sourceCircuitId: "",
    referenceDesignation: "",
    circuitName: "",
    location: "",
    connectionType: "",
    measuredResistance: "",
    assessment: "",
  };
}

function createEmptyLoopRow(index: number): MeasurementLoopProtocolRow {
  return {
    index,
    sourceCircuitId: "",
    referenceDesignation: "",
    circuitName: "",
    location: "",
    protectionType: "",
    ratedCurrent: "",
    tripCurrent: "",
    measuredImpedance: "",
    allowedImpedance: "",
    assessment: "",
  };
}

function createEmptyInsulationRow(index: number): MeasurementInsulationProtocolRow {
  return {
    index,
    sourceCircuitId: "",
    referenceDesignation: "",
    circuitName: "",
    location: "",
    lnResistance: "",
    lpeResistance: "",
    npeResistance: "",
    requiredResistance: "> 1.0",
    assessment: "",
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

function normalizeContinuityRows(
  rows: Partial<MeasurementContinuityProtocolRow>[] | undefined,
): MeasurementContinuityProtocolRow[] {
  const normalized = (rows ?? [])
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: normalizeText(row.sourceCircuitId),
      referenceDesignation: normalizeText(row.referenceDesignation),
      circuitName: normalizeText(row.circuitName),
      location: normalizeText(row.location),
      connectionType: normalizeText(row.connectionType),
      measuredResistance: normalizeText(row.measuredResistance),
      assessment: normalizeText(row.assessment),
    }));

  while (normalized.length < CONTINUITY_ROW_COUNT) {
    normalized.push(createEmptyContinuityRow(normalized.length + 1));
  }

  return normalized;
}

function normalizeLoopRows(
  rows: Partial<MeasurementLoopProtocolRow>[] | undefined,
): MeasurementLoopProtocolRow[] {
  const normalized = (rows ?? [])
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: normalizeText(row.sourceCircuitId),
      referenceDesignation: normalizeText(row.referenceDesignation),
      circuitName: normalizeText(row.circuitName),
      location: normalizeText(row.location),
      protectionType: normalizeText(row.protectionType),
      ratedCurrent: normalizeText(row.ratedCurrent),
      tripCurrent: normalizeText(row.tripCurrent),
      measuredImpedance: normalizeText(row.measuredImpedance),
      allowedImpedance: normalizeText(row.allowedImpedance),
      assessment: normalizeText(row.assessment),
    }));

  while (normalized.length < LOOP_ROW_COUNT) {
    normalized.push(createEmptyLoopRow(normalized.length + 1));
  }

  return normalized;
}

function normalizeInsulationRows(
  rows: Partial<MeasurementInsulationProtocolRow>[] | undefined,
): MeasurementInsulationProtocolRow[] {
  const normalized = (rows ?? [])
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: normalizeText(row.sourceCircuitId),
      referenceDesignation: normalizeText(row.referenceDesignation),
      circuitName: normalizeText(row.circuitName),
      location: normalizeText(row.location),
      lnResistance: normalizeText(row.lnResistance),
      lpeResistance: normalizeText(row.lpeResistance),
      npeResistance: normalizeText(row.npeResistance),
      requiredResistance: firstNonEmpty(row.requiredResistance, "> 1.0"),
      assessment: normalizeText(row.assessment),
    }));

  while (normalized.length < INSULATION_ROW_COUNT) {
    normalized.push(createEmptyInsulationRow(normalized.length + 1));
  }

  return normalized;
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

function buildContinuitySeedRows(circuitRows: CircuitRow[]): MeasurementContinuityProtocolRow[] {
  return buildCircuitSeedRows(circuitRows)
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: row.sourceCircuitId,
      referenceDesignation: row.referenceDesignation,
      circuitName: row.circuitName,
      location: row.location,
      connectionType: "PE",
      measuredResistance: "",
      assessment: "",
    }));
}

function buildLoopSeedRows(circuitRows: CircuitRow[]): MeasurementLoopProtocolRow[] {
  return buildCircuitSeedRows(circuitRows)
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: row.sourceCircuitId,
      referenceDesignation: row.referenceDesignation,
      circuitName: row.circuitName,
      location: row.location,
      protectionType: row.protectionType,
      ratedCurrent: row.ratedCurrent,
      tripCurrent: "",
      measuredImpedance: "",
      allowedImpedance: "",
      assessment: "",
    }));
}

function buildInsulationSeedRows(circuitRows: CircuitRow[]): MeasurementInsulationProtocolRow[] {
  return buildCircuitSeedRows(circuitRows)
    .map((row, index) => ({
      index: index + 1,
      sourceCircuitId: row.sourceCircuitId,
      referenceDesignation: row.referenceDesignation,
      circuitName: row.circuitName,
      location: row.location,
      lnResistance: "",
      lpeResistance: "",
      npeResistance: "",
      requiredResistance: "> 1.0",
      assessment: "",
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

function hasContinuityContent(row: MeasurementContinuityProtocolRow): boolean {
  return (
    row.circuitName.length > 0 ||
    row.location.length > 0 ||
    row.connectionType.length > 0 ||
    row.measuredResistance.length > 0 ||
    row.assessment.length > 0
  );
}

function hasLoopContent(row: MeasurementLoopProtocolRow): boolean {
  return (
    row.circuitName.length > 0 ||
    row.location.length > 0 ||
    row.protectionType.length > 0 ||
    row.ratedCurrent.length > 0 ||
    row.tripCurrent.length > 0 ||
    row.measuredImpedance.length > 0 ||
    row.allowedImpedance.length > 0 ||
    row.assessment.length > 0
  );
}

function hasInsulationContent(row: MeasurementInsulationProtocolRow): boolean {
  return (
    row.circuitName.length > 0 ||
    row.location.length > 0 ||
    row.lnResistance.length > 0 ||
    row.lpeResistance.length > 0 ||
    row.npeResistance.length > 0 ||
    row.requiredResistance.length > 0 ||
    row.assessment.length > 0
  );
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

function matchContinuityRow(
  candidate: MeasurementContinuityProtocolRow,
  seeded: MeasurementContinuityProtocolRow,
): boolean {
  if (candidate.sourceCircuitId && seeded.sourceCircuitId) {
    return candidate.sourceCircuitId === seeded.sourceCircuitId;
  }

  const fullKey = buildComparableKey(
    candidate.circuitName,
    candidate.location,
    candidate.connectionType,
  );
  const seededKey = buildComparableKey(seeded.circuitName, seeded.location, seeded.connectionType);

  if (fullKey && seededKey && fullKey === seededKey) {
    return true;
  }

  return buildComparableKey(candidate.circuitName, candidate.location) ===
    buildComparableKey(seeded.circuitName, seeded.location)
    ? true
    : buildComparableKey(candidate.circuitName) === buildComparableKey(seeded.circuitName);
}

function matchLoopRow(candidate: MeasurementLoopProtocolRow, seeded: MeasurementLoopProtocolRow): boolean {
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

function matchInsulationRow(
  candidate: MeasurementInsulationProtocolRow,
  seeded: MeasurementInsulationProtocolRow,
): boolean {
  if (candidate.sourceCircuitId && seeded.sourceCircuitId) {
    return candidate.sourceCircuitId === seeded.sourceCircuitId;
  }

  const fullKey = buildComparableKey(candidate.circuitName, candidate.location);
  const seededKey = buildComparableKey(seeded.circuitName, seeded.location);

  if (fullKey && seededKey && fullKey === seededKey) {
    return true;
  }

  return buildComparableKey(candidate.circuitName) === buildComparableKey(seeded.circuitName);
}

function matchRcdRow(candidate: MeasurementRcdProtocolRow, seeded: MeasurementRcdProtocolRow): boolean {
  if (candidate.sourceCircuitId && seeded.sourceCircuitId) {
    return candidate.sourceCircuitId === seeded.sourceCircuitId;
  }

  const fullKey = buildComparableKey(candidate.deviceType, candidate.residualCurrent);
  const seededKey = buildComparableKey(seeded.deviceType, seeded.residualCurrent);

  return fullKey.length > 0 && fullKey === seededKey;
}

function appendRemainingRows<T>(target: T[], pool: T[], predicate: (row: T) => boolean): void {
  for (const row of pool) {
    if (predicate(row)) {
      target.push(row);
    }
  }
}

function mergeContinuityRows(
  seededRows: MeasurementContinuityProtocolRow[],
  storedRows: MeasurementContinuityProtocolRow[],
): MeasurementContinuityProtocolRow[] {
  const storedPool = storedRows.map((row) => ({ ...row }));
  const merged: MeasurementContinuityProtocolRow[] = [];

  for (const seededRow of seededRows) {
    const matchIndex = storedPool.findIndex((candidate) => matchContinuityRow(candidate, seededRow));
    if (matchIndex >= 0) {
      const storedRow = storedPool.splice(matchIndex, 1)[0];
      merged.push({
        ...seededRow,
        connectionType: firstNonEmpty(storedRow.connectionType, seededRow.connectionType),
        measuredResistance: storedRow.measuredResistance,
        assessment: storedRow.assessment,
      });
    } else {
      merged.push(seededRow);
    }
  }

  appendRemainingRows(merged, storedPool, hasContinuityContent);
  return normalizeContinuityRows(merged);
}

function mergeLoopRows(
  seededRows: MeasurementLoopProtocolRow[],
  storedRows: MeasurementLoopProtocolRow[],
): MeasurementLoopProtocolRow[] {
  const storedPool = storedRows.map((row) => ({ ...row }));
  const merged: MeasurementLoopProtocolRow[] = [];

  for (const seededRow of seededRows) {
    const matchIndex = storedPool.findIndex((candidate) => matchLoopRow(candidate, seededRow));
    if (matchIndex >= 0) {
      const storedRow = storedPool.splice(matchIndex, 1)[0];
      merged.push({
        ...seededRow,
        tripCurrent: storedRow.tripCurrent,
        measuredImpedance: storedRow.measuredImpedance,
        allowedImpedance: storedRow.allowedImpedance,
        assessment: storedRow.assessment,
      });
    } else {
      merged.push(seededRow);
    }
  }

  appendRemainingRows(merged, storedPool, hasLoopContent);
  return normalizeLoopRows(merged);
}

function mergeInsulationRows(
  seededRows: MeasurementInsulationProtocolRow[],
  storedRows: MeasurementInsulationProtocolRow[],
): MeasurementInsulationProtocolRow[] {
  const storedPool = storedRows.map((row) => ({ ...row }));
  const merged: MeasurementInsulationProtocolRow[] = [];

  for (const seededRow of seededRows) {
    const matchIndex = storedPool.findIndex((candidate) => matchInsulationRow(candidate, seededRow));
    if (matchIndex >= 0) {
      const storedRow = storedPool.splice(matchIndex, 1)[0];
      merged.push({
        ...seededRow,
        lnResistance: storedRow.lnResistance,
        lpeResistance: storedRow.lpeResistance,
        npeResistance: storedRow.npeResistance,
        requiredResistance: firstNonEmpty(storedRow.requiredResistance, seededRow.requiredResistance),
        assessment: storedRow.assessment,
      });
    } else {
      merged.push(seededRow);
    }
  }

  appendRemainingRows(merged, storedPool, hasInsulationContent);
  return normalizeInsulationRows(merged);
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

export function createDefaultMeasurementProtocols(
  measurementDate: string,
  objectName: string,
): MeasurementProtocolsData {
  return {
    continuityHeader: createDefaultProtocolHeader(
      1,
      CONTINUITY_DEFAULT_SUBTITLE,
      measurementDate,
      objectName,
    ),
    loopHeader: createDefaultProtocolHeader(2, LOOP_DEFAULT_SUBTITLE, measurementDate, objectName),
    insulationHeader: createDefaultProtocolHeader(
      3,
      INSULATION_DEFAULT_SUBTITLE,
      measurementDate,
      objectName,
    ),
    rcdGroundHeader: createDefaultProtocolHeader(
      4,
      RCD_GROUND_DEFAULT_SUBTITLE,
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
    continuityRows: normalizeContinuityRows(undefined),
    loopImpedanceRows: normalizeLoopRows(undefined),
    insulationRows: normalizeInsulationRows(undefined),
    rcdRows: normalizeRcdRows(undefined),
  };
}

export function normalizeMeasurementProtocolsData(
  raw: Partial<MeasurementProtocolsData> | undefined,
  measurementDate: string,
  objectName: string,
): MeasurementProtocolsData {
  const defaults = createDefaultMeasurementProtocols(measurementDate, objectName);

  return {
    continuityHeader: normalizeHeader(raw?.continuityHeader, defaults.continuityHeader),
    loopHeader: normalizeHeader(raw?.loopHeader, defaults.loopHeader),
    insulationHeader: normalizeHeader(raw?.insulationHeader, defaults.insulationHeader),
    rcdGroundHeader: normalizeHeader(raw?.rcdGroundHeader, defaults.rcdGroundHeader),
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
    continuityRows: normalizeContinuityRows(raw?.continuityRows),
    loopImpedanceRows: normalizeLoopRows(raw?.loopImpedanceRows),
    insulationRows: normalizeInsulationRows(raw?.insulationRows),
    rcdRows: normalizeRcdRows(raw?.rcdRows),
  };
}

export function buildEditableMeasurementProtocols(
  metadata: ProjectMetadata,
  circuitRows: CircuitRow[],
): MeasurementProtocolsData {
  const objectName = firstNonEmpty(metadata.titlePageObjectType, metadata.company, "Nowy projekt");
  const measurementDate = firstNonEmpty(metadata.drawingDate, new Date().toISOString().slice(0, 10));
  const stored = normalizeMeasurementProtocolsData(
    metadata.measurementProtocols,
    measurementDate,
    objectName,
  );

  return {
    ...stored,
    continuityRows: mergeContinuityRows(
      buildContinuitySeedRows(circuitRows),
      stored.continuityRows,
    ),
    loopImpedanceRows: mergeLoopRows(buildLoopSeedRows(circuitRows), stored.loopImpedanceRows),
    insulationRows: mergeInsulationRows(
      buildInsulationSeedRows(circuitRows),
      stored.insulationRows,
    ),
    rcdRows: mergeRcdRows(buildRcdSeedRows(circuitRows), stored.rcdRows),
  };
}
