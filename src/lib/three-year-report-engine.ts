import * as XLSX from 'xlsx-js-style';
import { LandRecord } from './processor';

/**
 * Extended record interface for the Three Year Report join.
 * Extends LandRecord so it is fully compatible with DataPreviewTable.
 */
export interface ThreeYearReportRow extends LandRecord {
  kindGroup: 'Land' | 'Building' | 'Other';
  /** Original CLASS value from the Sales Data file */
  salesClassification: string;
  /** Owner name sourced from the Assessment Roll */
  rollOwner: string;
  /** True when ARP matched the roll AND kind is not Land/Building (e.g. M-RESI, M-COMM) */
  isOtherUnmapped: boolean;
  /** Selling Price from Sales file */
  sellingPrice?: number;
  /** Sales Value (Peso/Per Sqm) from Sales file */
  salesValue?: number;
  /** Internal tracking ID from the original source record */
  _sourceId?: string;
}

/** Strips whitespace for reliable ARP/Tax Dec. No. matching. */
const normalizeArp = (arp: string): string =>
  (arp || '').trim().toLowerCase().replace(/\s+/g, '');

/**
 * Expands ARP number ranges (e.g. "E-011-44494-97" -> 44494, 44495, 44496, 44497)
 * Also handles slashes (e.g. "45086/87") and "TO".
 */
function parseArpRange(arp: string): string[] {
  if (!arp) return [];
  const match = arp.trim().match(/^(.*?)(\d+)\s*(?:[-/]|TO)\s*(\d+)$/i);
  if (!match) return [arp];
  
  const prefix = match[1];
  const startStr = match[2];
  const endStr = match[3];
  
  const startNum = parseInt(startStr, 10);
  
  let fullEndStr = endStr;
  if (endStr.length < startStr.length) {
    fullEndStr = startStr.substring(0, startStr.length - endStr.length) + endStr;
  }
  
  const endNum = parseInt(fullEndStr, 10);
  
  // Guard against invalid/excessive ranges (max 100 properties in one bulk string)
  if (isNaN(startNum) || isNaN(endNum) || startNum >= endNum || endNum - startNum > 100) {
    return [arp]; 
  }
  
  const expanded: string[] = [];
  const padLength = startStr.length;
  for (let i = startNum; i <= endNum; i++) {
    const numStr = i.toString().padStart(padLength, '0');
    expanded.push(prefix + numStr);
  }
  
  return expanded;
}

/**
 * Joins Assessment Roll data with Sales Data on ARP No. (Tax Dec. No.).
 *
 * Matching key:
 *  - Roll side: record.arpNo  (maps to "Current" column via HEADER_ALIASES)
 *  - Sales side: record.arpNo (maps to "Tax Dec. No." column via HEADER_ALIASES)
 *
 * Unmatched sales rows are silently skipped.
 * Results are sorted: Land first, Building second, Other last.
 */
export const buildThreeYearReportData = (
  rollData: LandRecord[],
  salesData: LandRecord[]
): ThreeYearReportRow[] => {
  // Build a fast lookup from the Assessment Roll using normalized ARP
  const rollLookup = new Map<string, LandRecord>();
  rollData.forEach(r => {
    const key = normalizeArp(r.arpNo);
    if (key) rollLookup.set(key, r);
  });

  const rows: ThreeYearReportRow[] = [];

  // Expand grouped sales records (e.g., E-011-44494-97) into individual records
  const expandedSales: LandRecord[] = [];
  salesData.forEach(sale => {
    const arps = parseArpRange(sale.arpNo || '');
    if (arps.length === 1) {
      expandedSales.push(sale);
    } else {
      arps.forEach((expandedArp, index) => {
        expandedSales.push({
          ...sale,
          arpNo: expandedArp,
          id: `${sale.id}-exp-${index}`, // Prevent duplicate React keys
          sellingPrice: index === 0 ? sale.sellingPrice : 0,
          sellingPriceRef: index === 0 ? sale.sellingPriceRef : (sale.sellingPriceRef || arps[0])
        });
      });
    }
  });

  expandedSales.forEach(sale => {
    const key = normalizeArp(sale.arpNo);
    const rollMatch = key ? rollLookup.get(key) : undefined;

    // Determine the Kind group. For unlinked, we fallback to sale.kind
    const rawKind = (rollMatch?.kind || sale.kind || '').trim().toUpperCase();
    let kindGroup: 'Land' | 'Building' | 'Other' = 'Other';
    if (rawKind === 'L') kindGroup = 'Land';
    else if (rawKind === 'B') kindGroup = 'Building';

    rows.push({
      // --- Base: spread the Sales record so all LandRecord fields are present ---
      ...sale,
      _sourceId: sale.id,
      id: `3yr-${sale.id}-${rollMatch?.id ?? 'unlinked'}`,

      // --- Overrides sourced from the Roll ---
      kind:     rollMatch?.kind || sale.kind,  // L / B for grouping
      au:       rollMatch?.au   || sale.au,    // RESI / COMM etc.
      acctName: rollMatch?.acctName || sale.acctName, // "Name of New Owner"

      // --- Three-Year-Report specific extras ---
      kindGroup,
      salesClassification: sale.kind || '', // Raw CLASS value from Sales (before overwrite)
      rollOwner: rollMatch?.acctName || '',

      // --- Status markers ---
      isJoined: !!rollMatch,
      isOtherUnmapped: !!rollMatch && kindGroup === 'Other',
      isUnderReview: !!rollMatch && kindGroup !== 'Other' && (
                     !(sale.acctName?.trim() || rollMatch?.acctName?.trim()) ||
                     !(sale.arpNo?.trim()   || rollMatch?.arpNo?.trim())    ||
                     !(rollMatch?.location?.trim() || sale.location?.trim() || rollMatch?.address?.trim() || sale.address?.trim()) ||
                     !(rollMatch?.kind?.trim() || sale.kind?.trim())        ||
                     (kindGroup === 'Land' && (!sale.landArea && !rollMatch?.landArea))
      ),
      statusLabel: (rollMatch ? 'VALID' : 'NO MATCH') as any,
    });
  });

  // Deduplicate rows that have the exact same core data
  const uniqueRows: ThreeYearReportRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const fingerprint = [
      normalizeArp(row.arpNo),
      (row.acctName || '').trim().toLowerCase(),
      (row.salesClassification || '').trim().toLowerCase(),
      (row.location || '').trim().toLowerCase()
    ].join('||');

    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      uniqueRows.push(row);
    } else {
      // If we see a duplicate but it has a selling price and the stored one doesn't, upgrade it
      if (row.sellingPrice && row.sellingPrice > 0) {
        const existingIndex = uniqueRows.findIndex(r => 
          [normalizeArp(r.arpNo), (r.acctName || '').trim().toLowerCase(), (r.salesClassification || '').trim().toLowerCase(), (r.location || '').trim().toLowerCase()].join('||') === fingerprint
        );
        if (existingIndex >= 0 && (!uniqueRows[existingIndex].sellingPrice || uniqueRows[existingIndex].sellingPrice === 0)) {
          uniqueRows[existingIndex] = { ...uniqueRows[existingIndex], sellingPrice: row.sellingPrice, salesValue: row.salesValue || uniqueRows[existingIndex].salesValue };
        }
      }
    }
  }

  // Sort: Land (0) → Building (1) → Other (2)
  const ORDER: Record<ThreeYearReportRow['kindGroup'], number> = {
    Land: 0, Building: 1, Other: 2,
  };
  uniqueRows.sort((a, b) => ORDER[a.kindGroup] - ORDER[b.kindGroup]);

  return uniqueRows;
};

/**
 * Exports the Three Year Report as a formatted XLSX with:
 * - Merged title rows
 * - Two header rows (main + numbered sub-headers with Lowest/Median/Highest)
 * - Column A dynamically merged per Land / Building group
 * - Sales Value columns (H, I, J) left blank for manual entry
 */
export const exportThreeYearReport = (rows: ThreeYearReportRow[], filenameSuffix?: string): void => {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  // ── Row indices (1-based) ───────────────────────────────────────────────────
  const R_TITLE     = 1;
  const R_SUBTITLE  = 2;
  const R_DATE      = 3;
  // R 4: intentionally empty
  const R_HEADER    = 5;
  const R_SUBHEADER = 6;
  const R_DATA      = 7; // first data row

  const COL_LETTERS = 'ABCDEFGHIJKL'.split('');

  /** Write a cell value at (col 0-indexed, row 1-indexed). */
  const c = (col: number, row: number, v: any): void => {
    const addr = `${COL_LETTERS[col]}${row}`;
    
    // Apply center alignment for all rows >= 5 (Header row and below)
    let style = {};
    if (row >= 5) {
      style = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
    }

    ws[addr] = typeof v === 'number' 
      ? { v, t: 'n', s: style } 
      : { v: v ?? '', t: 's', s: style };
  };

  // ── Title / subtitle rows ──────────────────────────────────────────────────
  c(0, R_TITLE,    '3 Year Report of Lowest to Highest');
  c(0, R_SUBTITLE, 'PARAÑAQUE CITY - REAL PROPERTY DATA DIVISION');
  c(0, R_DATE,     `EXPORT DATE: ${new Date().toLocaleString()}`);

  // ── Header Row 1 (Row 5) ───────────────────────────────────────────────────
  c(0, R_HEADER, 'Kind of Property');
  c(1, R_HEADER, 'Name of New Owner');
  c(2, R_HEADER, 'ARPN/PIN');
  c(3, R_HEADER, 'Location');
  c(4, R_HEADER, 'Classification');
  c(5, R_HEADER, 'Sub-class/Type of Bldg.');
  c(6, R_HEADER, 'Area');
  c(7, R_HEADER, 'Selling Price');
  c(8, R_HEADER, 'Sales Value\n(Peso/Per Sqm)');
  c(9, R_HEADER, 'Sales Value'); // merged J5:L5 in the merges array

  // ── Header Row 2 – numbered sub-headers (Row 6) ───────────────────────────
  c(0, R_SUBHEADER, '(1)');
  c(1, R_SUBHEADER, '(2)');
  c(2, R_SUBHEADER, '(3)');
  c(3, R_SUBHEADER, '(4)');
  c(4, R_SUBHEADER, '(5)');
  c(5, R_SUBHEADER, '(6)');
  c(6, R_SUBHEADER, '(7)');
  c(7, R_SUBHEADER, '(8)');
  c(8, R_SUBHEADER, '(9)');
  c(9, R_SUBHEADER, 'Lowest\n(10)');
  c(10, R_SUBHEADER, 'Median\n(11)');
  c(11, R_SUBHEADER, 'Highest\n(12)');

  // ── Merges list (populated below with data-group merges) ──────────────────
  const merges: XLSX.Range[] = [
    // Title A1:L1
    { s: { r: R_TITLE    - 1, c: 0 }, e: { r: R_TITLE    - 1, c: 11 } },
    // Subtitle A2:L2
    { s: { r: R_SUBTITLE - 1, c: 0 }, e: { r: R_SUBTITLE - 1, c: 11 } },
    // Date A3:L3
    { s: { r: R_DATE     - 1, c: 0 }, e: { r: R_DATE     - 1, c: 11 } },
    // "Sales Value" merged header J5:L5
    { s: { r: R_HEADER   - 1, c: 9 }, e: { r: R_HEADER   - 1, c: 11 } },
  ];

  // ── Write data rows ────────────────────────────────────────────────────────
  let currentRow = R_DATA;

  for (const dataRow of rows) {
    let kindLabel = '';
    if (!dataRow.isJoined) {
      kindLabel = 'UNLINKED';
    } else if ((dataRow as any).isOtherUnmapped) {
      kindLabel = 'OTHER/UNMAPPED';
    } else {
      kindLabel = dataRow.kindGroup === 'Land' ? 'LAND' : 'BUILDING';
    }

    c(0, currentRow, kindLabel);                                  // Kind of Property
    c(1, currentRow, dataRow.acctName || '');                     // Name of New Owner
    c(2, currentRow, dataRow.arpNo    || '');                     // ARPN/PIN (Tax Dec. No.)
    c(3, currentRow, dataRow.address  || dataRow.location || ''); // Location / Street
    c(4, currentRow, dataRow.salesClassification || '');          // Classification (CLASS)
    c(5, currentRow, '');                                         // Sub-class — blank
    c(6, currentRow, dataRow.landArea !== undefined && dataRow.landArea !== 0
      ? dataRow.landArea : ((dataRow as any).rollArea || ''));    // Area
    c(7, currentRow, dataRow.sellingPriceRef ? `Ref: ${dataRow.sellingPriceRef}` : (dataRow.sellingPrice || ''));                 // Selling Price
    c(8, currentRow, dataRow.salesValue || '');                   // Sales Value (Peso/Per Sqm)
    c(9, currentRow, '');                                         // Lowest  — blank
    c(10, currentRow, '');                                        // Median  — blank
    c(11, currentRow, '');                                        // Highest — blank
    currentRow++;
  }

  // ── Finalize sheet ─────────────────────────────────────────────────────────
  const lastRow = Math.max(currentRow - 1, R_DATA);
  ws['!ref']    = `A1:L${lastRow}`;
  ws['!merges'] = merges;
  ws['!cols']   = [
    { wch: 14 }, // A: Kind of Property
    { wch: 32 }, // B: Name of New Owner
    { wch: 18 }, // C: ARPN/PIN
    { wch: 36 }, // D: Location
    { wch: 16 }, // E: Classification
    { wch: 22 }, // F: Sub-class/Type of Bldg.
    { wch: 10 }, // G: Area
    { wch: 18 }, // H: Selling Price
    { wch: 18 }, // I: Sales Value (Peso/Sqm)
    { wch: 14 }, // J: Lowest
    { wch: 14 }, // K: Median
    { wch: 14 }, // L: Highest
  ];

  const suffixStr = filenameSuffix ? `-${filenameSuffix}` : '';
  XLSX.utils.book_append_sheet(wb, ws, 'ThreeYearReport');
  XLSX.writeFile(wb, `3YearReport${suffixStr}-${new Date().toISOString().split('T')[0]}.xlsx`);
};
