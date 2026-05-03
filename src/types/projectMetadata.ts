export interface TitlePageChecklistItem {
  text: string;
  isChecked: boolean;
}

export interface MeasurementProtocolHeaderSettings {
  headerTitle: string;
  headerSubtitle: string;
  measurementDate: string;
  objectName: string;
}

export interface MeasurementContinuityProtocolRow {
  index: number;
  sourceCircuitId: string;
  referenceDesignation: string;
  circuitName: string;
  location: string;
  connectionType: string;
  measuredResistance: string;
  assessment: string;
}

export interface MeasurementLoopProtocolRow {
  index: number;
  sourceCircuitId: string;
  referenceDesignation: string;
  circuitName: string;
  location: string;
  protectionType: string;
  ratedCurrent: string;
  tripCurrent: string;
  measuredImpedance: string;
  allowedImpedance: string;
  assessment: string;
}

export interface MeasurementInsulationProtocolRow {
  index: number;
  sourceCircuitId: string;
  referenceDesignation: string;
  circuitName: string;
  location: string;
  lnResistance: string;
  lpeResistance: string;
  npeResistance: string;
  requiredResistance: string;
  assessment: string;
}

export interface MeasurementRcdProtocolRow {
  index: number;
  sourceCircuitId: string;
  referenceDesignation: string;
  deviceType: string;
  residualCurrent: string;
  tripCurrent: string;
  tripTimeMs: string;
  testButtonResult: string;
  assessment: string;
}

export interface MeasurementProtocolsData {
  continuityHeader: MeasurementProtocolHeaderSettings;
  loopHeader: MeasurementProtocolHeaderSettings;
  insulationHeader: MeasurementProtocolHeaderSettings;
  rcdGroundHeader: MeasurementProtocolHeaderSettings;
  continuityMeterName: string;
  continuityMeterSerialNumber: string;
  continuityMeasurementCurrent: string;
  loopMeterName: string;
  loopMeterSerialNumber: string;
  loopNetworkVoltage: string;
  loopNetworkSystem: string;
  insulationTestVoltage: string;
  insulationMeterName: string;
  insulationMeterSerialNumber: string;
  rcdGroundMeterName: string;
  rcdGroundMeterSerialNumber: string;
  groundMeasurementMethod: string;
  groundElectrodeType: string;
  groundMeasuredResistance: string;
  groundRequiredResistance: string;
  groundConclusionText: string;
  recommendationsText: string;
  continuityRows: MeasurementContinuityProtocolRow[];
  loopImpedanceRows: MeasurementLoopProtocolRow[];
  insulationRows: MeasurementInsulationProtocolRow[];
  rcdRows: MeasurementRcdProtocolRow[];
}

export interface ProjectMetadata {
  projectNumber: string;
  author: string;
  authorLicense: string;
  company: string;
  titlePageObjectType: string;
  address: string;
  investor: string;
  contractor: string;
  designerId: string;
  revision: string;
  drawingScale: string;
  drawingDate: string;
  sheetNumber: string;
  designerSignature: string;
  investorSignature: string;
  contractorSignature: string;
  isFormalDocumentationMode: boolean;
  dateCreated: string;
  dateModified: string;
  notes: string;
  standards: string[];
  documentationEquipmentList?: string;
  documentationCableSelection?: string;
  documentationTechnicalCalculations?: string;
  documentationLegendAndSymbols?: string;
  documentationTechnicalDescription?: string;
  documentationShockProtection?: string;
  documentationAcceptanceConditions?: string;
  documentationOptionalScope: string;
  documentationLegalBasis?: string;
  titlePageWorkScopeItems: TitlePageChecklistItem[];
  titlePageAttachmentItems: string[];
  titlePageSepValidUntil: string;
  titlePageUseManualWorkScopeCheckboxes: boolean;
  titlePageCompanyLogoFileName: string;
  titlePageCompanyLogoDataUrl: string;
  measurementProtocols: MeasurementProtocolsData;

  // Power supply configuration
  supplyVoltageV: 230 | 400;
  supplyPhases: 1 | 3;
  mainBreakerA: 25 | 32 | 40 | 63 | 80 | 100 | 125;
  contractedPowerKw: number;
}
