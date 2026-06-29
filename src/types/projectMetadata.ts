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

export interface MeasurementUnifiedProtocolRow {
  index: number;
  sourceCircuitId: string;
  referenceDesignation: string;
  circuitName: string;
  location: string;
  protectionType: string;
  ratedCurrent: string;
  lnResistance: string;
  lpeResistance: string;
  npeResistance: string;
  measuredImpedance: string;
  allowedImpedance: string;
  assessment: string;
}


export interface MeasurementProtocolsData {
  unifiedHeader: MeasurementProtocolHeaderSettings;
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
  rcdRows: MeasurementRcdProtocolRow[];
  unifiedRows: MeasurementUnifiedProtocolRow[];
}

export interface ProjectMetadata {
  projectNumber: string;
  author: string;
  authorLicense: string;
  company: string;
  titlePageObjectType: string;
  address: string;
  investor: string;
  investorAddress: string;
  contractor: string;
  contractorNip: string;
  contractorRegon: string;
  contractorPhone: string;
  contractorEmail: string;
  designerId: string;
  revision: string;
  drawingScale: string;
  drawingDate: string;
  statementDate: string;
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
  simultaneityFactor: number;
  // WHY: power factor (cosφ) controls how current is computed from installed
  // power. 0.9 is a conservative default for mixed residential / light-commercial
  // loads; workshops with large motors may need ~0.8. Per-symbol override would
  // require a schema migration, so the value lives here as a project-level knob.
  powerFactor: number;
}
