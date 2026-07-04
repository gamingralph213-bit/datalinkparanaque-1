import * as XLSX from 'xlsx';
import { LandRecord } from './processor';

/**
 * Standardizes header detection by providing a wide range of common aliases.
 * These are processed using "Deep Matching" (ignoring casing, spaces, and punctuation).
 */
export const HEADER_ALIASES = {
  pin: [
    'pin', 'pinno', 'propertyindexno', 'propertyindexnumber', 'propertyidentificationnumber', 
    'tdpin', 'propertyindex', 'idpin', 'propertyindexno'
  ],
  arpNo: [
    'arpno', 'arp', 'arpnumber', 'currentarp', 'current', 'tdno', 'tdnumber', 'taxdeclaration', 
    'taxdeclarationno', 'currenttd', 'oldarp', 'previousarp'
  ],
  newArpNo: [
    'newarpno', 'arpnonew', 'newarp', 'newtdno', 'farp', 'newtd', 'arpno(new)', 'targetarp'
  ],
  acctName: [
    'acctname', 'accountname', 'owner', 'ownername', 'ownersname', 'acctname', 'account', 
    'taxpayername', 'taxpayer', 'taxpayer', 'declaredowner'
  ],
  address: [
    'address', 'location', 'propertyaddress', 'locationofproperty', 'addr', 'situs', 'siteaddress'
  ],
  landArea: [
    'landarea', 'area', 'areasqm', 'sqm', 'sqm', 'lotarea', 'totalarea', 'sqm', 'sqmeters', 'totalsqm'
  ],
  unitValue: [
    'unitvalue', 'uv', 'unitcost', 'marketvaluepersqm', 'unitprice', 'marketunitvalue'
  ],
  marketValue: [
    'marketvalue', 'mv', 'totalmarketvalue', 'marketval', 'totalmv', 'marketvaluetotal'
  ],
  assessedValue: [
    'assessedvalue', 'av', 'al', 'assessedval', 'totalav', 'assessedlevelamount', 'totalassessed'
  ],
  yearlyTax: [
    'yearlytax', 'tax', 'annualtax', 'taxdue', 'yearlytaxdue', 'annualtaxdue', 'totaltax'
  ],
  previous: [
    'previous', 'prev', 'prevarp', 'oldarp', 'previouspin', 'previousrecord'
  ],
  update: [
    'update', 'upd', 'updatecode', 'type', 'updcode', 'revision', 'transactioncode'
  ],
  kind: ['kind', 'propertykind', 'classification'],
  au: [
    'au', 'actualuse', 'use', 'actualusage', 'usagecode'
  ],
  date: [
    'date', 'effectivity', 'dateeffectivity', 'effdate', 'revisiondate', 'dateofeffectivity'
  ],
  lotNo: ['lotno', 'lot', 'lotnumber'],
  blkNo: ['blkno', 'block', 'blk', 'blocknumber'],
  tctNo: ['tctno', 'tct', 'titleno', 'titlenumber'],
  rollType: ['rolltype', 'roll', 'status']
};

const parseNum = (val: any) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Removes all non-alphanumeric characters and lowercases the string.
 * Used to match "ARP NO." with "arpno" reliably.
 */
const deepClean = (s: string): string => {
  if (!s) return "";
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

/**
 * Maps JSON data to LandRecord objects using robust header detection.
 * Supports Date Carry-Forward for Journal-style logs.
 */
export const mapRawToRecords = (raw: any[], fileName: string, mode: 'raw' | 'exempt' | 'journal' = 'raw'): LandRecord[] => {
  let lastSeenDate = "";

  return raw.map((item) => {
    // 1. Create a lookup map of [deepCleanedHeader] -> [originalValue]
    const deepLookup: Record<string, any> = {};
    Object.keys(item).forEach(key => {
      const cleanedKey = deepClean(key);
      if (cleanedKey) {
        deepLookup[cleanedKey] = item[key];
      }
    });

    /**
     * Attempts to find a value by iterating through aliases for a field.
     * Uses deep cleaning for maximum reliability.
     */
    const getValue = (field: keyof typeof HEADER_ALIASES) => {
      const aliases = HEADER_ALIASES[field];
      for (const alias of aliases) {
        const cleanedAlias = deepClean(alias);
        if (deepLookup[cleanedAlias] !== undefined && deepLookup[cleanedAlias] !== null && deepLookup[cleanedAlias] !== "") {
          return String(deepLookup[cleanedAlias]).trim();
        }
      }
      return "";
    };

    // Date Carry-Forward Logic for Journals
    let dateValue = getValue('date');
    if (mode === 'journal' || fileName.toLowerCase().includes('journal')) {
      if (dateValue !== "") {
        lastSeenDate = dateValue;
      } else {
        dateValue = lastSeenDate;
      }
    }

    let kind = getValue('kind');
    let au = getValue('au');
    
    // Handle combined K-AU format (e.g. "L-RESI")
    // Use deep match for "k-au" or "k/au"
    const kauKey = Object.keys(deepLookup).find(k => k === 'kau');
    if (kauKey) {
      const kauValue = String(deepLookup[kauKey]).trim();
      if (kauValue.includes('-')) {
        const parts = kauValue.split('-');
        kind = parts[0]?.trim() || kind;
        au = parts[1]?.trim() || au;
      }
    }
    
    const pin = getValue('pin');
    const arpNo = getValue('arpNo');
    const specificNewArp = getValue('newArpNo');
    const uniqueId = `${fileName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: uniqueId,
      date: dateValue,
      arpNo: arpNo,
      newArpNo: specificNewArp || "",
      pin: pin,
      previous: getValue('previous'),
      update: getValue('update'),
      taxability: mode === 'exempt' ? 'E' : 'T',
      acctName: getValue('acctName'),
      address: getValue('address'),
      location: deepLookup['location'] || '', // Fallback for raw location string
      lotNo: getValue('lotNo'),
      blkNo: getValue('blkNo'),
      tctNo: getValue('tctNo'),
      rollType: getValue('rollType'),
      kind: kind,
      au: au,
      landArea: parseNum(getValue('landArea')),
      unitValue: parseNum(getValue('unitValue')),
      marketValue: parseNum(getValue('marketValue')),
      assessedValue: parseNum(getValue('assessedValue')),
      yearlyTax: parseNum(getValue('yearlyTax')),
      isCleanup: false,
      cleanupReason: "",
      sourceFile: fileName,
      rawRow: item
    };
  });
};

export const parseFile = async (
  file: File, 
  workflowMode: 'standard' | 'roll' | 'journal' = 'standard',
  importMode: 'raw' | 'exempt' | 'journal' = 'raw'
): Promise<{ data: LandRecord[], count: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: false,
          cellNF: true,
          cellText: true
        });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Using sheet_to_json with defval ensures we get a consistent object array for header detection
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];
        
        // Filter out rows that are completely empty or represent noise
        const validJson = json.filter(row => {
          const rowValues = Object.values(row).join('').trim();
          return rowValues.length > 0;
        });

        const mappedData = mapRawToRecords(validJson, file.name, importMode);
        
        // Final sanity filter: only include records that look like property data
        const finalRecords = mappedData.filter(r => (r.pin && r.pin.includes('-')) || (r.arpNo && r.arpNo.length > 5));

        resolve({ data: finalRecords, count: finalRecords.length });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsArrayBuffer(file);
  });
};