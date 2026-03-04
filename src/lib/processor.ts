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
  isDuplicate?: boolean;
  isCleanup?: boolean;
  cleanupReason?: string;
}

export interface CalibrationRule {
  id: string;
  pinPattern: string; // The "Target Section Identifier" (Key)
  barangay?: string;
  section?: string;
  unitValue?: number;
  overwrite: boolean;
}

export function extractArpNumeric(arp: string): number {
  if (!arp) return 0;
  // Handle Parañaque ARP format like 124-00-001-010-002
  const parts = arp.split('-');
  const lastPart = parts[parts.length - 1];
  // Extract only numbers from the last segment
  return parseInt(lastPart.replace(/\D/g, ''), 10) || 0;
}

export function matchesPinPattern(pin: string, pattern: string): boolean {
  if (!pin || !pattern) return false;
  // Convert 'x' wildcards to regex equivalent
  const escapedPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/x/g, '.*');
  const regex = new RegExp(`^${escapedPattern}$`, 'i');
  return regex.test(pin);
}

export function calculateAssessedValue(marketValue: number, au: string): number {
  const auUpper = (au || '').toUpperCase();
  let level = 0;
  
  // Standard Parañaque Assessment Levels:
  // COMM (Commercial) = 50%
  // RESI (Residential) = 20%
  if (auUpper.includes('COMM')) level = 0.50;
  else if (auUpper.includes('RESI')) level = 0.20;
  else level = 0.20; // Default to Residential 20% fallback
  
  return marketValue * level;
}

export function processRecords(
  records: LandRecord[],
  rules: CalibrationRule[],
  options: {
    removeDuplicates: boolean;
    applyCalibration: boolean;
  }
): {
  processed: LandRecord[];
  allWithDuplicateMarkers: LandRecord[];
  duplicatesRemoved: number;
  cleanupCount: number;
} {
  // 1. Initial Mapping and Rounding
  let result = records.map(r => {
    // If it's already a cleanup row from import, just return it as is but ensure financial consistency
    if (r.isCleanup) return { ...r };

    const landArea = Number(r.landArea) || 0;
    let marketValue = Number(r.marketValue) || 0;
    let unitValue = Number(r.unitValue) || 0;
    
    // Auto-fill Unit Value if missing but Market Value exists
    if (unitValue === 0 && marketValue > 0 && landArea > 0) {
      unitValue = Math.round(marketValue / landArea);
    } else {
      // Round existing Unit Value to nearest whole number
      unitValue = Math.round(unitValue);
    }

    // Always recalculate Market Value based on rounded Unit Value for consistency
    if (unitValue > 0 && landArea > 0) {
      marketValue = unitValue * landArea;
    }

    const assessedValue = calculateAssessedValue(marketValue, r.au || '');

    return {
      ...r,
      pin: r.pin?.trim() || '',
      arpNo: r.arpNo?.trim() || '',
      update: r.update?.trim() || '',
      acctName: r.acctName?.trim().toUpperCase() || '',
      address: r.address?.trim().toUpperCase() || '',
      location: "", // Start blank
      kind: r.kind?.trim().toUpperCase() || '',
      au: r.au?.trim().toUpperCase() || '',
      landArea,
      unitValue,
      marketValue,
      assessedValue,
      isDuplicate: false
    };
  });

  // 2. Exact PIN Duplicate Detection (Only for non-cleanup rows)
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

  const duplicatesCount = result.filter(r => r.isDuplicate && !r.isCleanup).length;
  const cleanupCount = result.filter(r => r.isCleanup).length;

  // 3. Apply Calibration Rules (Overwrites)
  result = result.map(record => {
    if (record.isCleanup) return record;

    let updated = { ...record };
    
    if (options.applyCalibration) {
      const matchingRule = rules.find(rule => matchesPinPattern(record.pin, rule.pinPattern));
      
      if (matchingRule) {
        const brgy = (matchingRule.barangay || "").trim();
        const sec = (matchingRule.section || "").trim();
        
        // Combine Barangay and Section into Location
        if (brgy || sec) {
          updated.location = `${brgy}${brgy && sec ? ', ' : ''}${sec}`.toUpperCase();
        }
        
        // Apply Unit Value override if specified
        if (matchingRule.unitValue !== undefined && !isNaN(matchingRule.unitValue) && matchingRule.unitValue > 0) {
          updated.unitValue = Math.round(matchingRule.unitValue);
          updated.marketValue = updated.landArea * updated.unitValue;
          updated.assessedValue = calculateAssessedValue(updated.marketValue, updated.au);
        }
      }
    }
    
    return updated;
  });

  return {
    processed: result.filter(r => !r.isDuplicate && !r.isCleanup),
    allWithDuplicateMarkers: result,
    duplicatesRemoved: duplicatesCount,
    cleanupCount
  };
}
