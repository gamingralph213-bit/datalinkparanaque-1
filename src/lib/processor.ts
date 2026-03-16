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

export interface LandRecord {
  id?: string;
  date: string;
  arpNo: string;
  pin: string;
  update?: string;
  acctName: string;
  address: string; // The original address from source
  location: string; // The blank/calibrated field for Barangay, Section
  kind: string;
  au: string;
  landArea: number;
  unitValue?: number;
  marketValue: number;
  assessedValue: number;
  yearlyTax?: number;
  isDuplicate?: boolean;
  isCleanup?: boolean;
  cleanupReason?: string;
  isValid?: boolean;
  errors?: ValidationError[];
}

export interface CalibrationRule {
  id: string;
  pinPattern: string; // The "Target Section Identifier" (Key)
  barangay?: string;
  section?: string;
  unitValue?: number;
  overwrite: boolean;
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
  const escapedPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/x/g, '.*');
  const regex = new RegExp(`^${escapedPattern}$`, 'i');
  return regex.test(pin);
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

export function validateRecord(record: LandRecord, allArps: Set<string>): ValidationError[] {
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
  } else if (record.landArea <= 0) {
    errors.push({ field: 'landArea', message: 'Land area must be greater than 0' });
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
  }
): {
  processed: LandRecord[];
  allWithDuplicateMarkers: LandRecord[];
  duplicatesRemoved: number;
  cleanupCount: number;
} {
  const arpCounts = new Map<string, number>();
  records.forEach(r => {
    if (r.arpNo) {
      arpCounts.set(r.arpNo, (arpCounts.get(r.arpNo) || 0) + 1);
    }
  });

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
    
    if (unitValue === 0 && marketValue > 0 && landArea > 0) {
      unitValue = Math.round(marketValue / landArea);
    } else {
      unitValue = Math.round(unitValue);
    }

    if (unitValue > 0 && landArea > 0) {
      marketValue = unitValue * landArea;
    }

    const assessedValue = calculateAssessedValue(marketValue, r.au || '', taxRates);
    const yearlyTax = calculateYearlyTax(assessedValue, r.au || '', taxRates);

    const record: LandRecord = {
      ...r,
      pin: r.pin?.trim() || '',
      arpNo: r.arpNo?.trim() || '',
      update: r.update?.trim() || '',
      acctName: r.acctName?.trim().toUpperCase() || '',
      address: r.address?.trim().toUpperCase() || '',
      location: r.location || "",
      kind: r.kind?.trim().toUpperCase() || '',
      au: r.au?.trim().toUpperCase() || '',
      landArea,
      unitValue,
      marketValue,
      assessedValue,
      yearlyTax,
      isDuplicate: false,
      isCleanup,
      cleanupReason
    };

    // Run Validation
    const errors = validateRecord(record, new Set());
    // Check for Duplicate ARP in the whole batch
    if (record.arpNo && (arpCounts.get(record.arpNo) || 0) > 1) {
      errors.push({ field: 'arpNo', message: 'Duplicate ARP Number detected in source file' });
    }

    record.errors = errors;
    record.isValid = errors.length === 0;

    return record;
  });

  if (options.removeDuplicates) {
    const pinToBestRecord = new Map<string, { index: number, arpVal: number }>();
    result.forEach((record, idx) => {
      if (record.isCleanup || !record.pin || record.pin === '') return;
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

  const duplicatesCount = result.filter(r => r.isDuplicate && !r.isCleanup).length;
  const cleanupCount = result.filter(r => r.isCleanup).length;

  if (options.applyCalibration) {
    result = result.map(record => {
      if (record.isCleanup) return record;
      let updated = { ...record };
      const matchingRule = rules.find(rule => matchesPinPattern(record.pin, rule.pinPattern));
      if (matchingRule) {
        const brgy = (matchingRule.barangay || "").trim();
        const sec = (matchingRule.section || "").trim();
        if (brgy || sec) {
          updated.location = `${brgy}${brgy && sec ? ', ' : ''}${sec}`.toUpperCase();
        }
        if (matchingRule.unitValue !== undefined && !isNaN(matchingRule.unitValue) && matchingRule.unitValue > 0) {
          updated.unitValue = Math.round(matchingRule.unitValue);
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
                      updated.location = sectionSetting.location.toUpperCase();
                      if (sectionSetting.unitValue && sectionSetting.unitValue > 0) {
                          updated.unitValue = sectionSetting.unitValue;
                      }
                  }
              }
          }
      }
      if (updated.unitValue && updated.unitValue > 0 && updated.landArea > 0) {
          updated.marketValue = updated.landArea * updated.unitValue;
          updated.assessedValue = calculateAssessedValue(updated.marketValue, updated.au, taxRates);
      }
      updated.yearlyTax = calculateYearlyTax(updated.assessedValue, updated.au, taxRates);
      return updated;
    });
  }

  return {
    processed: result.filter(r => !r.isDuplicate && !r.isCleanup),
    allWithDuplicateMarkers: result,
    duplicatesRemoved: duplicatesCount,
    cleanupCount
  };
}