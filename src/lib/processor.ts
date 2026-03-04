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
  pinPattern: string;
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
  const auUpper = au.toUpperCase();
  let level = 0;
  if (auUpper.includes('COMM')) level = 0.50;
  else if (auUpper.includes('RESI')) level = 0.20;
  
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
  let result = records.map(r => ({
    ...r,
    pin: r.pin?.trim() || '',
    arpNo: r.arpNo?.trim() || '',
    update: r.update || '',
    acctName: r.acctName?.trim().toUpperCase() || '',
    location: r.location?.trim().toUpperCase() || '',
    kind: r.kind?.trim().toUpperCase() || '',
    au: r.au?.trim().toUpperCase() || '',
    landArea: Number(r.landArea) || 0,
    unitValue: Number(r.unitValue) || 0,
    marketValue: Number(r.marketValue) || 0,
    assessedValue: Number(r.assessedValue) || 0,
    isDuplicate: false
  }));

  // Identify Duplicates (by PIN, keep highest ARP No#)
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

  // Calibration & Auto Computation
  result = result.map(record => {
    let updated = { ...record };
    
    if (options.applyCalibration) {
      const matchingRule = rules.find(rule => matchesPinPattern(record.pin, rule.pinPattern));
      
      if (matchingRule) {
        // Replace Location
        const brgy = matchingRule.barangay?.trim() || "";
        const sec = matchingRule.section?.trim() || "";
        if (brgy || sec) {
          updated.location = `${brgy}${brgy && sec ? ', ' : ''}${sec}`.toUpperCase();
        }
        
        // Auto Calculator
        if (matchingRule.unitValue !== undefined && !isNaN(matchingRule.unitValue) && matchingRule.unitValue > 0) {
          updated.unitValue = matchingRule.unitValue;
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
