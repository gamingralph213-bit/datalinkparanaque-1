import { BarangayConfig } from './locations';

export interface TaxRateConfig {
  assessmentLevel: number; // e.g., 0.20 for 20%
  taxRate: number;         // e.g., 0.02 for 2%
}

export type TaxRateMap = Record<string, TaxRateConfig>;

export interface ValidationError {
  field: string;
  message: string;
}

export type RecordStatusType = 
  | 'VALID' 
  | 'INVALID PIN FORMAT' 
  | 'INCOMPLETE' 
  | 'AREA ERROR' 
  | 'DUPLICATE' 
  | 'CLEANUP'
  | 'NO ARP NO#'
  | 'NO UPDATE'
  | 'NO ADDRESS'
  | 'NO KIND'
  | 'NO AU';

export interface LandRecord {
  id?: string;
  date: string; // Used for Conveyance Date
  dateOfTransfer?: string; // Specifically for Sales Data
  arpNo: string;
  newArpNo?: string;
  pin: string;
  previous?: string; 
  update?: string;
  taxability?: 'T' | 'E'; 
  acctName: string;
  address: string; 
  location: string; 
  barangayName?: string; 
  kind: string;
  au: string;
  landArea: number;
  
  // Assessment Roll Specific Fields
  lotNo?: string;
  blkNo?: string;
  tctNo?: string;
  rollType?: string;

  // Sales Data Specific Fields
  sellingPrice?: number;
  sellingPriceRef?: string; 
  salesValue?: number;
  docFileNo?: string;
  notary?: string;
  notarialDate?: string;

  // Building Permit Specific Fields
  buildingPermitNo?: string;
  dateIssued?: string;
  estimatedCost?: number;
  useOfOccupancy?: string;

  // Year-Specific Data
  unitValue2028?: number;
  marketValue2028?: number;
  assessedValue2028?: number;
  yearlyTax2028?: number;
  
  unitValue2029?: number;
  marketValue2029?: number;
  assessedValue2029?: number;
  yearlyTax2029?: number;

  // Active mapping
  unitValue?: number;
  marketValue: number;
  assessedValue: number;
  yearlyTax?: number;

  isDuplicate?: boolean;
  isCleanup?: boolean;
  isManualArchive?: boolean;
  isComparisonInjected?: boolean; 
  cleanupReason?: string;
  isValid?: boolean;
  errors?: ValidationError[];
  sourceFile?: string; 
  statusLabel?: RecordStatusType; 
  rawRow?: any; 
  duplicateWithReference?: string; 
  isJoined?: boolean;
}

export interface CalibrationRule {
  id: string;
  pinPattern: string; 
  barangay?: string;
  section?: string;
  unitValue?: number;
  overwrite: boolean;
}

export interface ProcessingReport {
  id: string; 
  timestamp: string;
  fileName: string;
  totalImported: number;
  cleanupCount: number;
  duplicatesDetected: number;
  calibratedCount: number;
  errorCount: number;
  validCount: number;
  totalMarketValue: number;
  totalAssessedValue: number;
  totalMarketValue2028: number;
  totalAssessedValue2028: number;
  totalYearlyTax2028: number;
  records?: LandRecord[]; 
}

export function normalizePin(pin: string): string {
  if (!pin) return "";
  return pin.replace(/\D/g, '');
}

/**
 * Determines the Mode of Conveyance based on the Update Code.
 * - TR or TRANSFER -> DEED OF SALE
 * - DC -> NEW
 * - Others -> UPDATE
 */
export function getModeOfConveyance(updateCode?: string): string {
  const code = (updateCode || "").trim().toUpperCase();
  if (code === "TR" || code === "TRANSFER") {
    return "DEED OF SALE";
  }
  if (code === "DC") {
    return "NEW";
  }
  return "UPDATE";
}

function lotMatchesPattern(lot: string, pattern: string): boolean {
  const lotNum = parseInt(lot, 10);
  if (isNaN(lotNum)) return false;

  const normalizedPattern = pattern.replace(/,/g, '/');
  const patternCleaned = normalizedPattern.replace(/[{()}]/g, '');
  const parts = patternCleaned.split('/');

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.includes(' TO ') || trimmedPart.includes('-')) {
      const rangeTokens = trimmedPart.includes(' TO ') ? ' TO ' : '-';
      const [startStr, endStr] = trimmedPart.split(rangeTokens);
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && lotNum >= start && lotNum <= end) {
        return true;
      }
    } else {
      const singleLot = parseInt(trimmedPart, 10);
      if (!isNaN(singleLot) && lotNum === singleLot) {
        return true;
      }
    }
  }
  return false;
}

export function extractArpNumeric(arp: string): number {
  if (!arp) return 0;
  const parts = arp.split('-');
  const lastPart = parts[parts.length - 1];
  return parseInt(lastPart.replace(/\D/g, ''), 10) || 0;
}

export function matchesPinPattern(pin: string, pattern: string): boolean {
  if (!pin || !pattern) return false;
  const cleanPin = pin.trim();
  const escapedPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/x/g, '.*');
  const regex = new RegExp(`^${escapedPattern}$`, 'i');
  return regex.test(cleanPin);
}

export function calculateAssessedValue(marketValue: number, au: string, taxRates: TaxRateMap): number {
  const auUpper = (au || '').toUpperCase().trim();
  let config = taxRates[auUpper];
  if (!config) {
    const baseKey = Object.keys(taxRates).find(key => auUpper.includes(key));
    if (baseKey) config = taxRates[baseKey];
  }
  const level = config ? config.assessmentLevel : 0.20;
  return marketValue * level;
}

export function calculateYearlyTax(assessedValue: number, au: string, taxRates: TaxRateMap): number {
  const auUpper = (au || '').toUpperCase().trim();
  let config = taxRates[auUpper];
  if (!config) {
    const baseKey = Object.keys(taxRates).find(key => auUpper.includes(key));
    if (baseKey) config = taxRates[baseKey];
  }
  const rate = config ? config.taxRate : 0.02;
  return assessedValue * rate;
}

export function validateRecord(record: LandRecord): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!record.pin || record.pin.trim() === "") {
    errors.push({ field: 'pin', message: 'Missing PIN number' });
  } else {
    const pinRegex = /^\d{3}-\d{2}-\d{3}-\d{3}-\d{3}-\d{4}$/;
    if (!pinRegex.test(record.pin)) {
      errors.push({ field: 'pin', message: 'Invalid PIN format (Expected: 000-00-000-000-000-0000)' });
    }
  }
  if (record.landArea === undefined || record.landArea === null || isNaN(record.landArea)) {
    errors.push({ field: 'landArea', message: 'Missing land area' });
  } else if (record.landArea < 0) {
    errors.push({ field: 'landArea', message: 'Land area cannot be negative' });
  } else if (record.landArea === 0 && record.kind !== 'M') {
    errors.push({ field: 'landArea', message: 'Land area is zero' });
  }
  if (!record.arpNo || record.arpNo.trim() === "") {
    errors.push({ field: 'arpNo', message: 'Missing ARP number' });
  }
  if ((record.unitValue || 0) < 0) {
    errors.push({ field: 'unitValue', message: 'Unit value cannot be negative' });
  }
  if ((record.marketValue || 0) < 0) {
    errors.push({ field: 'marketValue', message: 'Market value cannot be negative' });
  }
  return errors;
}

export function processRecords(
  records: LandRecord[],
  rules: CalibrationRule[],
  locationSettings: BarangayConfig[],
  taxRates: TaxRateMap,
  options: {
    removeDuplicates: boolean;
    applyCalibration: boolean;
    systemCleanup: boolean;
  },
  fileName: string = "Unknown",
  exemptPins: Set<string> = new Set()
): {
  processed: LandRecord[];
  allWithDuplicateMarkers: LandRecord[];
  duplicatesRemoved: number;
  cleanupCount: number;
  report: ProcessingReport;
} {
  const arpCounts = new Map<string, number>();
  records.forEach(r => { if (r.arpNo) arpCounts.set(r.arpNo, (arpCounts.get(r.arpNo) || 0) + 1); });

  let calibratedCount = 0;
  const normalizedExemptPins = new Set(Array.from(exemptPins).map(p => normalizePin(p)));

  let result = records.map(r => {
    let isCleanup = false;
    let cleanupReason = "";

    if (options.systemCleanup) {
      const rowValues = Object.values(r).map(v => String(v).toUpperCase());
      const isTotalRow = rowValues.some(v => v.includes("GRAND TOTAL") || v.includes("PAGE TOTAL") || v.includes("TOTALS"));
      const allValuesEmpty = !r.pin && !r.arpNo && !r.acctName;
      const hasMinimalData = ((r.date || r.arpNo || r.pin) && (r.acctName || (r.pin && r.pin !== "")));
      if (allValuesEmpty) { isCleanup = true; cleanupReason = "Empty Row"; }
      else if (isTotalRow) { isCleanup = true; cleanupReason = "Total Row"; }
      else if (!hasMinimalData) { isCleanup = true; cleanupReason = "Incomplete Data"; }
    }

    const landArea = Number(r.landArea) || 0;
    let marketValue = Number(r.marketValue) || 0;
    let unitValue = Number(r.unitValue) || 0;
    const kind = r.kind?.trim().toUpperCase() || '';
    const isExempt = normalizedExemptPins.has(normalizePin(r.pin));

    if (kind !== 'M' && kind !== 'B' && unitValue === 0 && marketValue > 0 && landArea > 0) {
      unitValue = Math.round(marketValue / landArea);
    } else { unitValue = Math.round(unitValue); }

    if (unitValue > 0 && landArea > 0 && kind !== 'M' && kind !== 'B') {
      marketValue = unitValue * landArea;
    }

    const assessedValue = calculateAssessedValue(marketValue, r.au || '', taxRates);
    const yearlyTax = isExempt ? 0 : calculateYearlyTax(assessedValue, r.au || '', taxRates);

    const unitValue2028 = unitValue;
    const marketValue2028 = marketValue;
    const assessedValue2028 = assessedValue;
    const yearlyTax2028 = isExempt ? 0 : (yearlyTax + (yearlyTax * 0.06));

    const record: LandRecord = {
      ...r,
      pin: r.pin?.trim() || '',
      arpNo: r.arpNo?.trim() || '',
      update: r.update?.trim() || '',
      taxability: isExempt ? 'E' : 'T',
      acctName: r.acctName?.trim().toUpperCase() || '',
      address: r.address?.trim().toUpperCase() || '',
      location: r.location?.trim().toUpperCase() || "",
      kind: kind,
      au: r.au?.trim().toUpperCase() || '',
      barangayName: r.barangayName || "UNMAPPED",
      landArea,
      unitValue,
      marketValue,
      assessedValue,
      yearlyTax,
      unitValue2028,
      marketValue2028,
      assessedValue2028,
      yearlyTax2028,
      isDuplicate: false,
      isCleanup,
      isManualArchive: r.isManualArchive || false,
      cleanupReason,
      duplicateWithReference: "N/A"
    };
    return record;
  });

  if (options.removeDuplicates) {
    const pinToBestRecord = new Map<string, { index: number, arpVal: number, arpNo: string }>();
    result.forEach((record, idx) => {
      if (record.isCleanup || record.isManualArchive || !record.pin || record.pin === '') return;
      const currentArpVal = extractArpNumeric(record.arpNo);
      const existing = pinToBestRecord.get(record.pin);
      if (!existing) { 
        pinToBestRecord.set(record.pin, { index: idx, arpVal: currentArpVal, arpNo: record.arpNo }); 
        record.duplicateWithReference = "REF";
      }
      else {
        if (currentArpVal > existing.arpVal) {
          result[existing.index].isDuplicate = true;
          result[existing.index].duplicateWithReference = "DUP";
          pinToBestRecord.set(record.pin, { index: idx, arpVal: currentArpVal, arpNo: record.arpNo });
          record.isDuplicate = false;
          record.duplicateWithReference = "REF";
        } else { 
          record.isDuplicate = true; 
          record.duplicateWithReference = "DUP";
        }
      }
    });
  }

  const duplicatesCount = result.filter(r => r.isDuplicate && !r.isCleanup && !r.isManualArchive).length;
  const cleanupCount = result.filter(r => r.isCleanup || r.isManualArchive).length;

  if (options.applyCalibration) {
    result = result.map(record => {
      if (record.isCleanup || record.isManualArchive) return record;
      let updated = { ...record };
      const matchingRule = rules.find(rule => matchesPinPattern(record.pin, rule.pinPattern));
      let wasCalibrated = false;

      if (updated.pin) {
        const pinParts = updated.pin.split('-');
        if (pinParts.length >= 3) {
          const brgyCode = pinParts[2];
          const brgy = locationSettings.find(b => b.barangayCode === brgyCode);
          if (brgy) updated.barangayName = brgy.name;
        }
      }

      const isBOrM = record.kind === 'M' || record.kind === 'B';
      const isExempt = record.taxability === 'E';

      if (matchingRule) {
        const brgy = (matchingRule.barangay || "").trim();
        const sec = (matchingRule.section || "").trim();
        if (brgy || sec) {
          updated.location = `${brgy}${brgy && sec ? ', ' : ''}${sec}`.toUpperCase();
          wasCalibrated = true;
          if (brgy) updated.barangayName = brgy;
        }
        if (!isBOrM && matchingRule.unitValue !== undefined && !isNaN(matchingRule.unitValue) && matchingRule.unitValue > 0) {
          updated.unitValue = Math.round(matchingRule.unitValue);
          wasCalibrated = true;
        }
      }

      if (locationSettings) {
          const pinParts = updated.pin.split('-');
          if (pinParts.length >= 4) {
              const barangayCode = pinParts[2];
              const sectionCode = pinParts[3];
              const lotCode = pinParts.length > 4 ? pinParts[4] : '';
              const targetBarangay = locationSettings.find(b => b.barangayCode === barangayCode);
              if (targetBarangay) {
                  updated.barangayName = targetBarangay.name;
                  let sectionSetting = null;
                  if (lotCode) {
                      for (const section of targetBarangay.sections) {
                          const sectionParts = section.section.split(/-(.+)/);
                          if (sectionParts.length > 1 && sectionParts[0] === sectionCode) {
                              const lotPattern = sectionParts[1];
                              if (lotMatchesPattern(lotCode, lotPattern)) { sectionSetting = section; break; }
                          }
                      }
                  }
                  if (!sectionSetting) sectionSetting = targetBarangay.sections.find(s => s.section === sectionCode) || null;
                  if (sectionSetting) {
                      updated.location = sectionSetting.location.toUpperCase();
                      wasCalibrated = true;
                      if (!isBOrM && sectionSetting.unitValue && sectionSetting.unitValue > 0) {
                          updated.unitValue = sectionSetting.unitValue;
                      }
                  }
              }
          }
      }
      
      if (wasCalibrated) calibratedCount++;

      if (!isBOrM) {
          if (updated.unitValue && updated.unitValue > 0 && updated.landArea > 0) {
              updated.marketValue = updated.landArea * updated.unitValue;
          }
          updated.assessedValue = calculateAssessedValue(updated.marketValue, updated.au, taxRates);
          updated.yearlyTax = isExempt ? 0 : calculateYearlyTax(updated.assessedValue, updated.au, taxRates);
      } else if (isExempt) {
          updated.yearlyTax = 0;
      }

      updated.unitValue2029 = updated.unitValue;
      updated.marketValue2029 = updated.marketValue;
      updated.assessedValue2029 = updated.assessedValue;
      updated.yearlyTax2029 = updated.yearlyTax;
      
      return updated;
    });
  }

  result = result.map(record => {
    const errors = validateRecord(record);
    if (record.arpNo && (arpCounts.get(record.arpNo) || 0) > 1) {
      errors.push({ field: 'arpNo', message: 'Duplicate ARP Number detected in source file' });
    }
    let statusLabel: RecordStatusType = 'VALID';
    if (record.isDuplicate) statusLabel = 'DUPLICATE';
    else if (!record.pin || !record.acctName) statusLabel = 'INCOMPLETE';
    else {
      const pinRegex = /^\d{3}-\d{2}-\d{3}-\d{3}-\d{3}-\d{4}$/;
      if (record.pin && !pinRegex.test(record.pin)) statusLabel = 'INVALID PIN FORMAT';
      else if (record.landArea <= 0 && record.kind !== 'M') statusLabel = 'AREA ERROR';
      else if (!record.arpNo) statusLabel = 'NO ARP NO#';
      else if (!record.update) statusLabel = 'NO UPDATE';
      else if (!record.address) statusLabel = 'NO ADDRESS';
      else if (!record.kind) statusLabel = 'NO KIND';
      else if (!record.au) statusLabel = 'NO AU';
    }
    if (record.isCleanup && statusLabel === 'VALID') statusLabel = 'CLEANUP';

    return { ...record, errors, isValid: statusLabel === 'VALID', statusLabel };
  });

  const barangaySequences = new Map<string, number>();
  const sortedForArp = [...result].sort((a, b) => (a.pin || '').localeCompare(b.pin || ''));
  sortedForArp.forEach(record => {
    const pinParts = (record.pin || '').split('-');
    const barangayCode = pinParts.length >= 3 ? pinParts[2] : '';
    if (barangayCode && !record.isDuplicate && !record.isCleanup && !record.isManualArchive) {
      const currentSeq = barangaySequences.get(barangayCode) || 1;
      const seqStr = String(currentSeq).padStart(5, '0');
      record.newArpNo = `F-${barangayCode}-${seqStr}`;
      barangaySequences.set(barangayCode, currentSeq + 1);
    } else { record.newArpNo = '---'; }
  });

  const finalProcessed = result.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP');
  const errorCount = finalProcessed.filter(r => !r.isValid).length;
  const validCount = finalProcessed.filter(r => r.isValid).length;

  const report: ProcessingReport = {
    id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toLocaleString(),
    fileName: fileName,
    totalImported: records.length,
    cleanupCount: cleanupCount,
    duplicatesDetected: duplicatesCount,
    calibratedCount: calibratedCount,
    errorCount: errorCount,
    validCount: validCount,
    totalMarketValue: finalProcessed.reduce((sum, r) => sum + (r.marketValue || 0), 0),
    totalAssessedValue: finalProcessed.reduce((sum, r) => sum + (r.assessedValue || 0), 0),
    totalMarketValue2028: finalProcessed.reduce((sum, r) => sum + (r.marketValue2028 || 0), 0),
    totalAssessedValue2028: finalProcessed.reduce((sum, r) => sum + (r.assessedValue2028 || 0), 0),
    totalYearlyTax2028: finalProcessed.reduce((sum, r) => sum + (r.yearlyTax2028 || 0), 0),
    records: [] // DO NOT STORE LARGE DATASETS IN REPORTS (QUOTA PROTECTION)
  };

  return { processed: finalProcessed, allWithDuplicateMarkers: result, duplicatesRemoved: duplicatesCount, cleanupCount, report };
}
