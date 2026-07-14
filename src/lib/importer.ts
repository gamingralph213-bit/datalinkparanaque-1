import * as XLSX from 'xlsx';
import { LandRecord } from './processor';

/**
 * Standardizes header detection by providing a wide range of common aliases.
 * These are processed using "Deep Matching" (ignoring casing, spaces, and punctuation).
 */
export const HEADER_ALIASES = {
  pin: [
    'pin', 'pinno', 'propertyindexno', 'propertyindexnumber', 'propertyidentificationnumber', 
    'tdpin', 'propertyindex', 'idpin'
  ],
  arpNo: [
    'arpno', 'arp', 'arpnumber', 'currentarp', 'current', 'tdno', 'tdnumber', 'taxdeclaration', 
    'taxdeclarationno', 'currenttd', 'oldarp', 'previousarp', 'taxdecno', '[inse'
  ],
  newArpNo: [
    'newarpno', 'arpnonew', 'newarp', 'newtdno', 'farp', 'newtd', 'arpno(new)', 'targetarp', 'arpno.new'
  ],
  acctName: [
    'acctname', 'accountname', 'owner', 'ownername', 'ownersname', 'account', 
    'taxpayername', 'taxpayer', 'declaredowner'
  ],
  address: [
    'address', 'location', 'propertyaddress', 'locationofproperty', 'addr', 'situs', 'siteaddress', 'locationstreet'
  ],
  landArea: [
    'landarea', 'area', 'areasqm', 'sqm', 'lotarea', 'totalarea', 'sqmeters', 'totalsqm'
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
  kind: ['kind', 'propertykind', 'classification', 'class'],
  au: [
    'au', 'actualuse', 'use', 'actualusage', 'usagecode'
  ],
  date: [
    'date', 'effectivity', 'dateeffectivity', 'effdate', 'revisiondate', 'dateofeffectivity', 'dateofconveyance'
  ],
  dateOfTransfer: [
    'dateoftransfer', 'transferdate', 'dateofsale', 'transfer', 'dateoftranser'
  ],
  lotNo: ['lotno', 'lot', 'lotnumber'],
  blkNo: ['blkno', 'block', 'blk', 'blocknumber'],
  tctNo: ['tctno', 'tct', 'titleno', 'titlenumber'],
  rollType: ['rolltype', 'roll', 'status'],
  // Sales specific
  sellingPrice: ['sellingprice', 'consideration', 'amount', 'considerationamount'],
  salesValue: ['salesvalue', 'salesvaluepsqm', 'valuepsqm'],
  docFileNo: ['documentfileno', 'docfileno', 'docno', 'fileno', 'documentfilenumber'],
  notary: [
    'notary', 'notarypublic', 'notaryname', 'atty', 'agent', 'notaryagent', 
    'attyagent', 'documentfileno1', 'documentfilenumber1' // Fallback for dual-column headers
  ],
  notarialDate: ['notarialdate', 'notarizeddate'],
  // Building Permit specific
  barangayName: ['barangay', 'brgy', 'bgy'],
  buildingPermitNo: ['buildpermitno', 'permitno', 'bpno', 'buildingpermitno', 'buildingpermitnumber'],
  dateIssued: ['dateissued', 'issueddate', 'permitdate'],
  estimatedCost: ['estcost', 'estimatedcost', 'cost', 'estimatedconstructioncost'],
  useOfOccupancy: ['useorcharacterofoccupancy', 'occupancy', 'useofoccupancy', 'characterofoccupancy']
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
 * Used to match headers reliably across formatting styles.
 */
const deepClean = (s: string): string => {
  if (!s) return "";
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

/**
 * Expands complex Tax Dec strings like E-003-52121/22/23 into individual TD numbers.
 */
function expandTdNumbers(tdString: string): string[] {
  if (!tdString || !tdString.includes('/')) return [String(tdString).trim()];
  
  const segments = tdString.split('/').map(s => s.trim());
  const first = segments[0];
  const results = [first];
  
  const match = first.match(/^(.*-)(\d+)$/);
  if (!match) return segments;
  
  const prefix = match[1];
  const baseNumStr = match[2];
  
  for (let i = 1; i < segments.length; i++) {
    const part = segments[i];
    if (part.match(/^\d+$/)) {
      if (part.length === baseNumStr.length) {
        results.push(`${prefix}${part}`);
      } else if (part.length < baseNumStr.length) {
        const newNum = baseNumStr.slice(0, baseNumStr.length - part.length) + part;
        results.push(`${prefix}${newNum}`);
      } else {
        results.push(`${prefix}${part}`);
      }
    } else {
      results.push(part.includes('-') ? part : `${prefix}${part}`);
    }
  }
  return results;
}

/**
 * Maps JSON data to LandRecord objects using robust fuzzy header detection.
 */
export const mapRawToRecords = (raw: any[], fileName: string, mode: 'raw' | 'exempt' | 'journal' | 'sales' | 'cancelled' | 'permits' | 'three-year-sales' = 'raw'): LandRecord[] => {
  let lastSeenDate = "";

  return raw.flatMap((item) => {
    const deepLookup: Record<string, any> = {};
    Object.keys(item).forEach(key => {
      const cleanedKey = deepClean(key);
      if (cleanedKey) {
        deepLookup[cleanedKey] = item[key];
      }
    });

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

    let dateValue = getValue('date');
    if (mode === 'journal' || fileName.toLowerCase().includes('journal')) {
      if (dateValue !== "") {
        lastSeenDate = dateValue;
      } else {
        dateValue = lastSeenDate;
      }
    }

    const arpRaw = getValue('arpNo');
    const expandedArps = (mode === 'sales' || mode === 'three-year-sales' || mode === 'cancelled') ? expandTdNumbers(arpRaw) : [arpRaw];
    
    let kind = getValue('kind');
    let au = getValue('au');
    const kauKey = Object.keys(deepLookup).find(k => k === 'kau');
    if (kauKey) {
      const kauValue = String(deepLookup[kauKey]).trim();
      if (kauValue.includes('-')) {
        const parts = kauValue.split('-');
        kind = parts[0]?.trim() || kind;
        au = parts[1]?.trim() || au;
      }
    }

    const baseRecord = {
      date: dateValue,
      dateOfTransfer: getValue('dateOfTransfer'),
      pin: getValue('pin'),
      previous: getValue('previous'),
      update: getValue('update'),
      taxability: (mode === 'exempt' ? 'E' : 'T') as 'T' | 'E',
      acctName: getValue('acctName'),
      address: getValue('address'),
      location: getValue('address') || deepLookup['location'] || '', 
      barangayName: getValue('barangayName'),
      lotNo: getValue('lotNo'),
      blkNo: getValue('blkNo'),
      tctNo: getValue('tctNo'),
      rollType: getValue('rollType'),
      kind,
      au: getValue('au') || getValue('useOfOccupancy') || au,
      landArea: parseNum(getValue('landArea')),
      unitValue: parseNum(getValue('unitValue')),
      marketValue: parseNum(getValue('marketValue')),
      assessedValue: parseNum(getValue('assessedValue')),
      yearlyTax: parseNum(getValue('yearlyTax')),
      sellingPrice: parseNum(getValue('sellingPrice')),
      salesValue: parseNum(getValue('salesValue')),
      docFileNo: getValue('docFileNo'),
      notary: getValue('notary'),
      notarialDate: getValue('notarialDate'),
      buildingPermitNo: getValue('buildingPermitNo'),
      dateIssued: getValue('dateIssued'),
      estimatedCost: parseNum(getValue('estimatedCost')),
      useOfOccupancy: getValue('useOfOccupancy'),
      isCleanup: false,
      cleanupReason: "",
      sourceFile: fileName,
      rawRow: item
    };

    return expandedArps.map((arp, index) => {
      const uniqueId = `${fileName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
      return {
        ...baseRecord,
        id: uniqueId,
        arpNo: arp,
        newArpNo: index === 0 ? getValue('newArpNo') : "",
        sellingPrice: index === 0 ? baseRecord.sellingPrice : 0,
        sellingPriceRef: index === 0 ? "" : expandedArps[0]
      };
    });
  });
};

export const parseFile = async (
  file: File, 
  workflowMode: string = 'standard',
  importMode: 'raw' | 'exempt' | 'journal' | 'sales' | 'three-year-sales' | 'cancelled' | 'permits' = 'raw'
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

        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];
        
        const validJson = json.filter(row => {
          const rowValues = Object.values(row).join('').trim();
          return rowValues.length > 0;
        });

        const mappedData = mapRawToRecords(validJson, file.name, importMode);
        
        const finalRecords = mappedData.filter(r => 
          (r.pin && r.pin.includes('-')) || 
          (r.arpNo && r.arpNo.length > 5) ||
          ((importMode === 'sales' || importMode === 'three-year-sales') && r.arpNo) ||
          (importMode === 'cancelled' && r.pin) ||
          (importMode === 'permits' && (r.buildingPermitNo || r.acctName))
        );

        resolve({ data: finalRecords, count: finalRecords.length });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsArrayBuffer(file);
  });
};
