
export interface LandRecord {
  id?: string;
  date: string;
  arpNo: string;
  pin: string;
  type: string;
  acctName: string;
  location: string;
  kind: string;
  au: string;
  landArea: number;
  marketValue: number;
  assessedValue: number;
  barangay?: string;
  section?: string;
  unitValue?: number;
}

export interface CalibrationRule {
  id: string;
  pinPattern: string;
  barangay?: string;
  section?: string;
  unitValue?: number;
  marketValueOverride?: number;
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
  // Convert x to wildcard .* and escape other characters
  const escapedPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/x/g, '.*'); // Convert x to wildcard
  const regex = new RegExp(`^${escapedPattern}$`, 'i');
  return regex.test(pin);
}

export function processRecords(
  records: LandRecord[],
  rules: CalibrationRule[],
  options: {
    removeDuplicates: boolean;
    applyCalibration: boolean;
    assessmentLevel: number;
  }
): {
  processed: LandRecord[];
  duplicatesRemoved: number;
} {
  let result = [...records];
  let duplicatesRemovedCount = 0;

  // 1. Cleaning & Standardization
  result = result.map(r => ({
    ...r,
    pin: r.pin?.trim() || '',
    arpNo: r.arpNo?.trim() || '',
    type: r.type?.trim().toUpperCase() || '',
    acctName: r.acctName?.trim().toUpperCase() || '',
    location: r.location?.trim().toUpperCase() || '',
    kind: r.kind?.trim().toUpperCase() || '',
    au: r.au?.trim().toUpperCase() || '',
    landArea: Number(r.landArea) || 0,
    marketValue: Number(r.marketValue) || 0,
    assessedValue: Number(r.assessedValue) || 0,
  }));

  // 2. Deduplication (by PIN, keep highest ARP No#)
  if (options.removeDuplicates) {
    const pinMap = new Map<string, LandRecord>();
    const originalCount = result.length;
    
    result.forEach(record => {
      if (!record.pin) return;
      const existing = pinMap.get(record.pin);
      if (!existing) {
        pinMap.set(record.pin, record);
      } else {
        const currentArp = extractArpNumeric(record.arpNo);
        const existingArp = extractArpNumeric(existing.arpNo);
        if (currentArp > existingArp) {
          pinMap.set(record.pin, record);
        }
      }
    });
    
    result = Array.from(pinMap.values());
    duplicatesRemovedCount = originalCount - result.length;
  }

  // 3. Calibration & Auto Computation
  result = result.map(record => {
    let updated = { ...record };
    
    if (options.applyCalibration) {
      // Find matching rules (first match wins)
      const matchingRule = rules.find(rule => matchesPinPattern(record.pin, rule.pinPattern));
      
      if (matchingRule) {
        if (matchingRule.barangay && (matchingRule.overwrite || !updated.barangay)) {
          updated.barangay = matchingRule.barangay;
        }
        if (matchingRule.section && (matchingRule.overwrite || !updated.section)) {
          updated.section = matchingRule.section;
        }
        if (matchingRule.unitValue !== undefined && !isNaN(matchingRule.unitValue)) {
          updated.unitValue = matchingRule.unitValue;
          updated.marketValue = updated.landArea * matchingRule.unitValue;
        } else if (matchingRule.marketValueOverride !== undefined && !isNaN(matchingRule.marketValueOverride)) {
          updated.marketValue = matchingRule.marketValueOverride;
        }
      }
    }

    // Final Auto Computation for everyone
    // If market value exists, recompute assessed value based on current assessment level
    updated.assessedValue = updated.marketValue * options.assessmentLevel;
    
    return updated;
  });

  return {
    processed: result,
    duplicatesRemoved: duplicatesRemovedCount
  };
}
