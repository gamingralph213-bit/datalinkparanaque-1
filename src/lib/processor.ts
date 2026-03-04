export interface LandRecord {
  id?: string;
  date: string;
  arpNo: string;
  pin: string;
  update?: string;
  acctName: string;
  location: string;
  kind: string;
  au: string;
  landArea: number;
  unitValue?: number;
  marketValue: number;
  assessedValue: number;
  isDuplicate?: boolean;
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

export function calculateAssessedValue(marketValue: number, au: string): number {
  const auUpper = (au || '').toUpperCase();
  let level = 0;
  
  // Standard Parañaque Assessment Levels:
  // COMM = 50%
  // RESI = 20%
  if (auUpper.includes('COMM')) level = 0.50;
  else if (auUpper.includes('RESI')) level = 0.20;
  else level = 0.20; // Default to Residential 20% as a fallback if not explicitly Commercial
  
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
} {
  let result = records.map(r => {
    const landArea = Number(r.landArea) || 0;
    let marketValue = Number(r.marketValue) || 0;
    let unitValue = Number(r.unitValue) || 0;
    
    // Auto-fill and Rounding Logic:
    // 1. If we have Market and Area but no Unit Value, calculate it
    if (unitValue === 0 && marketValue > 0 && landArea > 0) {
      unitValue = Math.round(marketValue / landArea);
    } else {
      // Otherwise, round the imported unit value to nearest integer
      unitValue = Math.round(unitValue);
    }

    // Always recalculate Market Value based on the rounded Unit Value for consistency
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
      location: r.location?.trim().toUpperCase() || '',
      kind: r.kind?.trim().toUpperCase() || '',
      au: r.au?.trim().toUpperCase() || '',
      landArea,
      unitValue,
      marketValue,
      assessedValue,
      isDuplicate: false
    };
  });

  const pinToBestRecord = new Map<string, { index: number, arpVal: number }>();
  
  result.forEach((record, idx) => {
    if (!record.pin) return;
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

  const duplicatesCount = result.filter(r => r.isDuplicate).length;

  result = result.map(record => {
    let updated = { ...record };
    
    if (options.applyCalibration) {
      const matchingRule = rules.find(rule => matchesPinPattern(record.pin, rule.pinPattern));
      
      if (matchingRule) {
        const brgy = (matchingRule.barangay || "").trim();
        const sec = (matchingRule.section || "").trim();
        if (brgy || sec) {
          updated.location = `${brgy}${brgy && sec ? ', ' : ''}${sec}`.toUpperCase();
        }
        
        if (matchingRule.unitValue !== undefined && !isNaN(matchingRule.unitValue) && matchingRule.unitValue > 0) {
          // Rule values should also be rounded for consistency
          updated.unitValue = Math.round(matchingRule.unitValue);
          updated.marketValue = updated.landArea * updated.unitValue;
          updated.assessedValue = calculateAssessedValue(updated.marketValue, updated.au);
        }
      }
    }
    
    return updated;
  });

  return {
    processed: options.removeDuplicates ? result.filter(r => !r.isDuplicate) : result,
    allWithDuplicateMarkers: result,
    duplicatesRemoved: duplicatesCount
  };
}
