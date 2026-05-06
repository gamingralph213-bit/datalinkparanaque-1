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
  date: string;
  arpNo: string;
  newArpNo?: string;
  pin: string;
  update?: string;
  taxability?: 'T' | 'E'; // T for Taxable, E for Exempt
  acctName: string;
  address: string; // The original address from source
  location: string; // The calibrated field for Barangay, Section
  barangayName?: string; // Derived barangay name for filtering
  kind: string;
  au: string;
  landArea: number;
  unitValue?: number;
  marketValue: number;
  assessedValue: number;
  yearlyTax?: number;
  isDuplicate?: boolean;
  isCleanup?: boolean;
  isManualArchive?: boolean;
  isComparisonInjected?: boolean; // UI-only field for comparison view
  cleanupReason?: string;
  isValid?: boolean;
  errors?: ValidationError[];
  sourceFile?: string; // Track original file in batch processing
  statusLabel?: RecordStatusType; // Specific labeling for UI
  rawRow?: any; // CRITICAL: Stores the 1:1 original source data for recovery
}

export interface CalibrationRule {
  id: string;
  pinPattern: string; // The "Target Section Identifier" (Key)
  barangay?: string;
  section?: string;
  unitValue?: number;
  overwrite: boolean;
}

export interface ProcessingReport {
  id: string; // Unique identifier for deletion
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
  records?: LandRecord[]; // Stores the dataset for later export
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
  // Normalize by stripping non-essential characters for matching
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

  // 1. PIN Validation
  if (!record.pin || record.pin.trim() === "") {
    errors.push({ field: 'pin', message: 'Missing PIN number' });
  } else {
    // Basic format check for Parañaque PIN: xxx-xx-xxx-xxx-xxx-xxxx
    const pinRegex = /^\d{3}-\d{2}-\d{3}-\d{3}-\d{3}-\d{4}$/;
    if (!pinRegex.test(record.pin)) {
      errors.push({ field: 'pin', message: 'Invalid PIN format (Expected: 000-00-000-000-000-0000)' });
    }
  }

  // 2. Land Area Validation
  if (record.landArea === undefined || record.landArea === null || isNaN(record.landArea)) {
    errors.push({ field: 'landArea', message: 'Missing land area' });
  } else if (record.landArea < 0) {
    errors.push({ field: 'landArea', message: 'Land area cannot be negative' });
  } else if (record.landArea === 0 && record.kind !== 'M') {
    // Machinery (M) does not require land area
    errors.push({ 
      field: 'landArea', 
      message: 'Land area is zero' 
    });
  }

  // 3. ARP Validation
  if (!record.arpNo || record.arpNo.trim() === "") {
    errors.push({ field: 'arpNo', message: 'Missing ARP number' });
  }

  // 4. Financial Validation
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
  // Capture snapshot of input records for raw recovery before any engine transformations
  const rawRecordsSnapshot = records.map(r => ({ ...r }));

  const arpCounts = new Map<string, number>();
  records.forEach(r => {
    if (r.arpNo) {
      arpCounts.set(r.arpNo, (arpCounts.get(r.arpNo) || 0) + 1);
    }
  });

  let calibratedCount = 0;

  // 1st Pass: Initial Mapping and Cleanup Identification
  let result = records.map(r => {
    let isCleanup = false;
    let cleanupReason = "";

    if (options.systemCleanup) {
      const rowValues = Object.values(r).map(v => String(v).toUpperCase());
      const isTotalRow = rowValues.some(v => 
        v.includes("GRAND TOTAL") || 
        v.includes("PAGE TOTAL") || 
        v.includes("TOTALS")
      );
      
      const allValuesEmpty = !r.pin && !r.arpNo && !r.acctName;
      
      const hasMinimalData = (
        (r.date || r.arpNo || r.pin) &&
        (r.acctName || (r.pin && r.pin !== ""))
      );

      if (allValuesEmpty) {
        isCleanup = true;
        cleanupReason = "Empty Row";
      } else if (isTotalRow) {
        isCleanup = true;
        cleanupReason = "Total Row";
      } else if (!hasMinimalData) {
        isCleanup = true;
        cleanupReason = "Incomplete Data";
      }
    }

    const landArea = Number(r.landArea) || 0;
    let marketValue = Number(r.marketValue) || 0;
    let unitValue = Number(r.unitValue) || 0;
    
    const kind = r.kind?.trim().toUpperCase() || '';

    // Auto-calculate unit value if missing but market value exists (only if not B or M)
    if (kind !== 'M' && kind !== 'B' && unitValue === 0 && marketValue > 0 && landArea > 0) {
      unitValue = Math.round(marketValue / landArea);
    } else {
      unitValue = Math.round(unitValue);
    }

    // Auto-calculate market value if area and unit value exist (only if not B or M)
    if (unitValue > 0 && landArea > 0 && kind !== 'M' && kind !== 'B') {
      marketValue = unitValue * landArea;
    }

    const assessedValue = calculateAssessedValue(marketValue, r.au || '', taxRates);

    const record: LandRecord = {
      ...r,
      pin: r.pin?.trim() || '',
      arpNo: r.arpNo?.trim() || '',
      update: r.update?.trim() || '',
      taxability: exemptPins.has(r.pin?.trim() || '') ? 'E' : 'T',
      acctName: r.acctName?.trim().toUpperCase() || '',
      address: r.address?.trim().toUpperCase() || '',
      location: r.location?.trim().toUpperCase() || "",
      kind: kind,
      au: r.au?.trim().toUpperCase() || '',
      barangayName: "UNMAPPED", // Default for data that cannot be mapped
      landArea,
      unitValue,
      marketValue,
      assessedValue,
      yearlyTax: calculateYearlyTax(assessedValue, r.au || '', taxRates),
      isDuplicate: false,
      isCleanup,
      isManualArchive: r.isManualArchive || false,
      cleanupReason
    };

    return record;
  });

  // 2nd Pass: Duplicate Detection
  if (options.removeDuplicates) {
    const pinToBestRecord = new Map<string, { index: number, arpVal: number }>();
    result.forEach((record, idx) => {
      if (record.isCleanup || record.isManualArchive || !record.pin || record.pin === '') return;
      const currentArpVal = extractArpNumeric(record.arpNo);
      const existing = pinToBestRecord.get(record.pin);
      if (!existing) {
        pinToBestRecord.set(record.pin, { index: idx, arpVal: currentArpVal });
      } else {
        if (currentArpVal > existing.arpVal) {
          result[existing.index].isDuplicate = true;
          pinToBestRecord.set(record.pin, { index: idx, arpVal: currentArpVal });
        } else {
          record.isDuplicate = true;
        }
      }
    });
  }

  const duplicatesCount = result.filter(r => r.isDuplicate && !r.isCleanup && !r.isManualArchive).length;
  const cleanupCount = result.filter(r => r.isCleanup || r.isManualArchive).length;

  // 3rd Pass: Apply Calibration
  if (options.applyCalibration) {
    result = result.map(record => {
      if (record.isCleanup || record.isManualArchive) return record;
      
      let updated = { ...record };
      const matchingRule = rules.find(rule => matchesPinPattern(record.pin, rule.pinPattern));
      
      let wasCalibrated = false;

      // Derivation of Barangay Name based on PIN segment
      if (updated.pin) {
        const pinParts = updated.pin.split('-');
        if (pinParts.length >= 3) {
          const brgyCode = pinParts[2];
          const brgy = locationSettings.find(b => b.barangayCode === brgyCode);
          if (brgy) {
            updated.barangayName = brgy.name;
          }
        }
      }

      // Check if B or M kind to bypass financial calibration
      const isBOrM = record.kind === 'M' || record.kind === 'B';

      // Apply Custom Calibration Rules
      if (matchingRule) {
        const brgy = (matchingRule.barangay || "").trim();
        const sec = (matchingRule.section || "").trim();
        if (brgy || sec) {
          updated.location = `${brgy}${brgy && sec ? ', ' : ''}${sec}`.toUpperCase();
          wasCalibrated = true;
          if (brgy) updated.barangayName = brgy;
        }
        
        // Calibration for B and M only applies to Location
        if (!isBOrM && matchingRule.unitValue !== undefined && !isNaN(matchingRule.unitValue) && matchingRule.unitValue > 0) {
          updated.unitValue = Math.round(matchingRule.unitValue);
          wasCalibrated = true;
        }
      }

      // Apply Global Location Settings (Barangay/Section Mapping)
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
                              if (lotMatchesPattern(lotCode, lotPattern)) {
                                  sectionSetting = section;
                                  break;
                              }
                          }
                      }
                  }
                  if (!sectionSetting) {
                      sectionSetting = targetBarangay.sections.find(s => s.section === sectionCode) || null;
                  }
                  if (sectionSetting) {
                      // Apply location even for B and M
                      updated.location = sectionSetting.location.toUpperCase();
                      wasCalibrated = true;
                      
                      // Financials remain raw for B and M
                      if (!isBOrM && sectionSetting.unitValue && sectionSetting.unitValue > 0) {
                          updated.unitValue = sectionSetting.unitValue;
                      }
                  }
              }
          }
      }
      
      if (wasCalibrated) calibratedCount++;

      // Recalculate based on calibrated values (Skip for B/M to preserve raw data)
      if (!isBOrM) {
          if (updated.unitValue && updated.unitValue > 0 && updated.landArea > 0) {
              updated.marketValue = updated.landArea * updated.unitValue;
          }
          updated.assessedValue = calculateAssessedValue(updated.marketValue, updated.au, taxRates);
          updated.yearlyTax = calculateYearlyTax(updated.assessedValue, updated.au, taxRates);
      }
      
      return updated;
    });
  }

  // Final Pass: Validation and Labeling
  result = result.map(record => {
    const errors = validateRecord(record);
    if (record.arpNo && (arpCounts.get(record.arpNo) || 0) > 1) {
      errors.push({ field: 'arpNo', message: 'Duplicate ARP Number detected in source file' });
    }

    let statusLabel: RecordStatusType = 'VALID';
    
    if (record.isDuplicate) {
      statusLabel = 'DUPLICATE';
    } else if (!record.pin || !record.acctName) {
      statusLabel = 'INCOMPLETE';
    } else {
      const pinRegex = /^\d{3}-\d{2}-\d{3}-\d{3}-\d{3}-\d{4}$/;
      if (record.pin && !pinRegex.test(record.pin)) {
        statusLabel = 'INVALID PIN FORMAT';
      } else if (record.landArea <= 0 && record.kind !== 'M') {
        statusLabel = 'AREA ERROR';
      } else if (!record.arpNo) {
        statusLabel = 'NO ARP NO#';
      } else if (!record.update) {
        statusLabel = 'NO UPDATE';
      } else if (!record.address) {
        statusLabel = 'NO ADDRESS';
      } else if (!record.kind) {
        statusLabel = 'NO KIND';
      } else if (!record.au) {
        statusLabel = 'NO AU';
      }
    }

    // Cleanup detection
    if (record.isCleanup && statusLabel === 'VALID') {
      statusLabel = 'CLEANUP';
    }

    return {
      ...record,
      errors,
      isValid: statusLabel === 'VALID',
      statusLabel
    };
  });

  // Assign NEW ARP NO# for BF Homes specifically
  let bfHomesSequence = 1;
  // Sort the references in the result array by PIN to assign sequence correctly
  const sortedForArp = [...result].sort((a, b) => (a.pin || '').localeCompare(b.pin || ''));
  
  sortedForArp.forEach(record => {
    const pinParts = (record.pin || '').split('-');
    const barangayCode = pinParts.length >= 3 ? pinParts[2] : '';
    
    // Only assign to active (non-archived) records for BF Homes
    if (barangayCode === '001' && !record.isDuplicate && !record.isCleanup && !record.isManualArchive) {
      const seqStr = String(bfHomesSequence).padStart(5, '0');
      record.newArpNo = `F-001-${seqStr}`;
      bfHomesSequence++;
    } else {
      record.newArpNo = '---';
    }
  });

  const finalProcessed = result.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP');
  const errorCount = finalProcessed.filter(r => !r.isValid).length;
  const validCount = finalProcessed.filter(r => r.isValid).length;

  const totalMarket = finalProcessed.reduce((sum, r) => sum + (r.marketValue || 0), 0);
  const totalAssessed = finalProcessed.reduce((sum, r) => sum + (r.assessedValue || 0), 0);

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
    totalMarketValue: totalMarket,
    totalAssessedValue: totalAssessed,
    // CRITICAL: We store the raw records snapshot here for the "Recover Raw Data" functionality
    records: rawRecordsSnapshot
  };

  return {
    processed: finalProcessed,
    allWithDuplicateMarkers: result,
    duplicatesRemoved: duplicatesCount,
    cleanupCount,
    report
  };
}
