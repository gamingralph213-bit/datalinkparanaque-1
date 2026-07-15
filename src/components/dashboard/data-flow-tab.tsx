"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  FileText, BookUser, Filter, GitMerge, CheckCircle2, Zap,
  Database, Search, Tag, HardHat, TrendingUp, X,
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Info, Layers, AlertCircle,
  Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Node dimensions ──────────────────────────────────────────────────────────
const NW = 192; // node width
const NH = 70;  // node height

type Side = 'top' | 'bottom' | 'left' | 'right';

interface FNode {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  bg: string; border: string; text: string; dot: string;
  icon: React.ReactNode;
  desc: string;
}

interface FEdge {
  from: string;
  to: string;
  fp?: Side;
  tp?: Side;
  label?: string;
  color?: string;
  dashed?: boolean;
}

interface Flow {
  nodes: FNode[];
  edges: FEdge[];
  w: number;
  h: number;
}

// ─── Color themes (dark glass style, works on both light/dark bg) ─────────────
const amber  = { bg: '#431407', border: '#f97316', text: '#fed7aa', dot: '#fb923c' };
const blue   = { bg: '#0c1a3a', border: '#3b82f6', text: '#bfdbfe', dot: '#60a5fa' };
const red    = { bg: '#3b0a0a', border: '#ef4444', text: '#fecaca', dot: '#f87171' };
const green  = { bg: '#052e16', border: '#22c55e', text: '#bbf7d0', dot: '#4ade80' };
const violet = { bg: '#2e1065', border: '#a855f7', text: '#e9d5ff', dot: '#c084fc' };
const slate  = { bg: '#0f172a', border: '#475569', text: '#cbd5e1', dot: '#94a3b8' };
const indigo = { bg: '#1e1b4b', border: '#6366f1', text: '#e0e7ff', dot: '#818cf8' };
const teal   = { bg: '#042f2e', border: '#0d9488', text: '#99f6e4', dot: '#2dd4bf' };
const emerald= { bg: '#022c22', border: '#059669', text: '#a7f3d0', dot: '#10b981' };

// All unique dot colors used in edges → need arrow markers for each
const ARROW_COLORS = [
  '#fb923c', '#60a5fa', '#f87171', '#4ade80', '#c084fc',
  '#818cf8', '#2dd4bf', '#10b981', '#94a3b8',
];

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function getPort(n: FNode, s: Side): { x: number; y: number } {
  switch (s) {
    case 'top':    return { x: n.x + NW / 2, y: n.y };
    case 'bottom': return { x: n.x + NW / 2, y: n.y + NH };
    case 'left':   return { x: n.x,          y: n.y + NH / 2 };
    case 'right':  return { x: n.x + NW,     y: n.y + NH / 2 };
  }
}

function makePath(
  from: { x: number; y: number }, to: { x: number; y: number },
  fs: Side, ts: Side
): string {
  const dy = Math.abs(to.y - from.y);
  const dx = Math.abs(to.x - from.x);
  const tv = Math.max(dy * 0.45, 70);
  const th = Math.max(dx * 0.45, 60);
  let c1 = { ...from }, c2 = { ...to };
  if (fs === 'bottom') c1.y += tv;
  else if (fs === 'top')   c1.y -= tv;
  else if (fs === 'right') c1.x += th;
  else if (fs === 'left')  c1.x -= th;
  if (ts === 'top')    c2.y -= tv;
  else if (ts === 'bottom') c2.y += tv;
  else if (ts === 'left')  c2.x -= th;
  else if (ts === 'right') c2.x += th;
  return `M${from.x} ${from.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`;
}

function midPt(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ─── Flow: Abstract ───────────────────────────────────────────────────────────
function abstractFlow(): Flow {
  const lx = 60, cx = 374, rx = 688;
  const nodes: FNode[] = [
    { id: 'journal', label: 'Journal Log File', sublabel: 'SOURCE DATA', x: cx, y: 40,
      ...amber, icon: <FileText className="w-4 h-4" />,
      desc: 'Imported spreadsheet containing all ownership conveyances. Each row is one transfer event — Deed of Sale, Cancellation, Update, etc. This is the primary input for the Abstract engine.' },

    { id: 'filter', label: 'Filter Valid Records', x: cx, y: 200,
      ...indigo, icon: <Filter className="w-4 h-4" />,
      desc: 'Rows missing required fields (ARP No., account name, or date) are flagged and excluded. Only structurally complete transaction rows proceed to the matching stage.' },

    { id: 'normalize', label: 'Normalize Identifiers', sublabel: 'PIN / ARP / Name', x: cx, y: 360,
      ...slate, icon: <Zap className="w-4 h-4" />,
      desc: 'ARP numbers and PINs are stripped of extra spaces and standardized (e.g., "E-001-56710" → "e-001-56710") to ensure reliable cross-file lookup regardless of formatting differences.' },

    // Left branch ─ Assessment Roll
    { id: 'roll', label: 'Assessment Roll', sublabel: 'REFERENCE MASTER', x: lx, y: 540,
      ...blue, icon: <BookUser className="w-4 h-4" />,
      desc: 'The master parcel database. Contains: current owner (acctName), address, ARP No., PIN, TCT/OCT No., land area, and valuation for every registered property.' },
    { id: 'roll-match', label: 'Match PIN or ARP No.', x: lx, y: 700,
      ...slate, icon: <Search className="w-4 h-4" />,
      desc: 'Matching key: PIN (normalized exact match) first, then ARP No. A successful match links the journal entry to its current parcel record in the Assessment Roll.' },
    { id: 'roll-result', label: 'Get Owner & TCT No.', sublabel: 'New owner · address · title', x: lx, y: 860,
      ...blue, icon: <Database className="w-4 h-4" />,
      desc: 'Returns: New Owner Name (acctName), Property Address, New TCT/OCT No. (rollTctNo), and Lot No. from the matched roll record. Populates the "Ownership Transfer To" columns.' },

    // Center branch ─ Cancelled File
    { id: 'cancelled', label: 'Cancelled File', sublabel: 'HISTORICAL DATA', x: cx, y: 540,
      ...red, icon: <FileText className="w-4 h-4" />,
      desc: 'Contains records of previously cancelled TCT/OCT titles. Used to identify the previous owner and old title number before the conveyance took place.' },
    { id: 'cancelled-match', label: 'Match Previous ARP', x: cx, y: 700,
      ...slate, icon: <Search className="w-4 h-4" />,
      desc: 'Matching key: "Previous ARP" from the journal record. This looks up the Cancelled File to find who previously owned the property and what the old title number was.' },
    { id: 'cancelled-result', label: 'Get Previous Owner', sublabel: 'Cancelled owner · old title', x: cx, y: 860,
      ...red, icon: <Database className="w-4 h-4" />,
      desc: 'Returns: Previous Owner Name (cancelledOwner) and the Cancelled TCT/OCT No. (cancelledTctNo). These fill the "Ownership Transfer From" columns in the Abstract report.' },

    // Right branch ─ Sales File
    { id: 'sales', label: 'Sales File', sublabel: 'OPTIONAL', x: rx, y: 540,
      ...green, icon: <Tag className="w-4 h-4" />,
      desc: 'Optional spreadsheet containing deed-of-sale prices (Amount of Consideration). If not uploaded, Consideration defaults to ₱0.00. Matched by ARP No. / Tax Declaration No.' },
    { id: 'sales-match', label: 'Match ARP / TD No.', x: rx, y: 700,
      ...slate, icon: <Search className="w-4 h-4" />,
      desc: 'Matching key: ARP No. (Tax Declaration No.). The first matching sale record is used. Unmatched entries leave Consideration blank in the output.' },
    { id: 'sales-result', label: 'Get Consideration', sublabel: 'Amount of consideration (₱)', x: rx, y: 860,
      ...green, icon: <Tag className="w-4 h-4" />,
      desc: 'Returns the Amount of Consideration (sellingPrice) — the monetary value declared in the Deed of Sale for this property transfer, expressed in Philippine Pesos.' },

    { id: 'merge', label: 'Merge All Results', x: cx, y: 1060,
      ...teal, icon: <GitMerge className="w-4 h-4" />,
      desc: 'Data from all three lookups (Roll, Cancelled, Sales) is merged into one enriched record. Fields with no match default to "---". isJoined is set based on whether a Roll match was found.' },
    { id: 'output', label: 'Joined Preview', sublabel: 'ABSTRACT OF TRANSACTIONS', x: cx, y: 1210,
      ...emerald, icon: <CheckCircle2 className="w-4 h-4" />,
      desc: 'Final output: enriched transaction records ready for the Abstract of Transactions export. Shows: ARP No., Date, Previous Owner, New Owner, Address, Mode of Conveyance, Consideration, and Title Nos.' },
  ];

  const edges: FEdge[] = [
    { from: 'journal',   to: 'filter',           label: 'All Records',    color: amber.dot },
    { from: 'filter',    to: 'normalize',         label: 'Valid Only',     color: indigo.dot },
    { from: 'normalize', to: 'roll',              label: 'PIN / ARP',      color: blue.dot },
    { from: 'normalize', to: 'cancelled',         label: 'Prev. ARP',      color: red.dot },
    { from: 'normalize', to: 'sales',             label: 'ARP No.',        color: green.dot, dashed: true },
    { from: 'roll',      to: 'roll-match',        color: blue.dot },
    { from: 'cancelled', to: 'cancelled-match',   color: red.dot },
    { from: 'sales',     to: 'sales-match',       color: green.dot, dashed: true },
    { from: 'roll-match',      to: 'roll-result',      label: 'Match → Enrich', color: blue.dot },
    { from: 'cancelled-match', to: 'cancelled-result', label: 'Match → Enrich', color: red.dot },
    { from: 'sales-match',     to: 'sales-result',     label: 'Match → Enrich', color: green.dot, dashed: true },
    { from: 'roll-result',      to: 'merge', color: blue.dot },
    { from: 'cancelled-result', to: 'merge', color: red.dot },
    { from: 'sales-result',     to: 'merge', color: green.dot, dashed: true },
    { from: 'merge',  to: 'output', label: 'Enriched Records', color: teal.dot },
  ];

  return { nodes, edges, w: 940, h: 1390 };
}

// ─── Flow: Building Permit ────────────────────────────────────────────────────
function permitFlow(): Flow {
  const cx = 374;
  const nodes: FNode[] = [
    { id: 'permit', label: 'Permit Log File', sublabel: 'SOURCE DATA', x: 60, y: 40,
      ...amber, icon: <HardHat className="w-4 h-4" />,
      desc: 'Imported building permit spreadsheet containing all issued permits: Permit No., Date Issued, Barangay/Owner Name, Use of Occupancy, and Estimated Cost.' },
    { id: 'roll', label: 'Assessment Roll', sublabel: 'REFERENCE DATA', x: 688, y: 40,
      ...blue, icon: <BookUser className="w-4 h-4" />,
      desc: 'The Assessment Roll provides reference data for permit matching: ARP/TDN, owner name, address, floor area, property classification, and PIN.' },

    { id: 'parse-permit', label: 'Parse Permit Records', x: 60, y: 210,
      ...slate, icon: <Zap className="w-4 h-4" />,
      desc: 'Each permit record is parsed and the owner name (Barangay field) is normalized for matching. PIN and ARP fields are extracted if present in the permit log.' },
    { id: 'build-index', label: 'Build Roll Lookup Index', sublabel: 'PIN / ARP / Name Index', x: 688, y: 210,
      ...slate, icon: <Database className="w-4 h-4" />,
      desc: 'Three lookup maps are built from the Roll: (1) PIN → records, (2) ARP No. → records, (3) Normalized owner name → records. These allow O(1) lookup during the match step.' },

    { id: 'match', label: 'Match Engine', sublabel: 'PIN → ARP → Name → Fuzzy JW', x: cx, y: 410,
      ...indigo, icon: <Search className="w-4 h-4" />,
      desc: 'Matching priority: ① Exact PIN match, ② Exact ARP No. match, ③ Exact normalized name, ④ Jaro-Winkler similarity ≥ 0.96 (Matched), ⑤ Score 0.88–0.96 (Potential Match). Below 0.88 → Unlinked.' },

    { id: 'classify', label: 'Classify Match Result', x: cx, y: 580,
      ...slate, icon: <Layers className="w-4 h-4" />,
      desc: 'Each permit is classified as: Matched (linked to a Roll record with high confidence), Potential Match (fuzzy score 0.88–0.96), or Unlinked (no Roll record found).' },

    { id: 'flag', label: 'Flag Under Review', x: cx, y: 750,
      ...amber, icon: <AlertCircle className="w-4 h-4" />,
      desc: 'If the same owner name (Barangay field) appears in more than one permit, all their permits are flagged "Under Review" — indicating ambiguous matches requiring manual verification.' },

    { id: 'output', label: 'Permit Join Preview', sublabel: 'BUILDING PERMIT ANALYTICS', x: cx, y: 930,
      ...emerald, icon: <CheckCircle2 className="w-4 h-4" />,
      desc: 'Final output: permit records enriched with roll data (ARP/TDN, Floor Area, Class, Owner, Address). Status per row: Matched / Potential Match / Unlinked / Under Review.' },
  ];

  const edges: FEdge[] = [
    { from: 'permit',      to: 'parse-permit',  label: 'PERMIT LOG',        color: amber.dot },
    { from: 'roll',        to: 'build-index',   label: 'ASSESSMENT ROLL',   color: blue.dot },
    { from: 'parse-permit', to: 'match',        color: amber.dot },
    { from: 'build-index', to: 'match',         label: 'PIN / ARP / Name',  color: blue.dot },
    { from: 'match',       to: 'classify',      label: 'JW Score',          color: indigo.dot },
    { from: 'classify',    to: 'flag',          color: slate.dot },
    { from: 'flag',        to: 'output',        label: 'Final Records',     color: emerald.dot },
  ];

  return { nodes, edges, w: 940, h: 1100 };
}

// ─── Flow: Three-Year Report ──────────────────────────────────────────────────
function threeYearFlow(): Flow {
  const cx = 374;
  const nodes: FNode[] = [
    { id: 'sales', label: 'Sales Data File', sublabel: 'SOURCE DATA', x: 60, y: 40,
      ...violet, icon: <FileText className="w-4 h-4" />,
      desc: 'Imported sales data spreadsheet containing property sale records: Tax Dec. No. (ARP), Owner Name, Classification, and Area. ARP ranges like "E-011-44494-97" are supported and auto-expanded.' },
    { id: 'roll', label: 'Assessment Roll', sublabel: 'REFERENCE DATA', x: 688, y: 40,
      ...blue, icon: <BookUser className="w-4 h-4" />,
      desc: 'Provides: Owner Name, Kind (L/B), Actual Use (AU), Location/Address, and Land Area for each matched parcel. Indexed by normalized ARP No. for fast lookup.' },

    { id: 'parse', label: 'Parse & Expand ARPs', x: 60, y: 210,
      ...slate, icon: <Zap className="w-4 h-4" />,
      desc: 'ARP ranges in the Sales Data are expanded into individual records (e.g., "E-011-44494-97" becomes 44494, 44495, 44496, 44497). Maximum 100 expansions per entry to prevent abuse.' },
    { id: 'index', label: 'Index Roll by ARP No.', x: 688, y: 210,
      ...slate, icon: <Database className="w-4 h-4" />,
      desc: 'The Assessment Roll is indexed using normalized ARP No. (Tax Declaration No.) as the key. Normalization: strip spaces, lowercase. Allows O(1) match lookup during join.' },

    { id: 'match', label: 'Match by ARP / TD No.', sublabel: 'Exact normalized match', x: cx, y: 410,
      ...indigo, icon: <Search className="w-4 h-4" />,
      desc: 'Each expanded sales record is matched against the Roll lookup using normalized ARP No. Unmatched rows are included as "Unlinked" — they still appear in the output without roll data.' },

    { id: 'classify', label: 'Classify Kind Group', sublabel: 'Land / Building / Other', x: cx, y: 580,
      ...slate, icon: <Layers className="w-4 h-4" />,
      desc: 'Kind from Roll (or Sales fallback): L → Land, B → Building, anything else (M-RESI, M-COMM, machinery, etc.) → Other/Unmapped. This determines the section in the 3-Year Report.' },

    { id: 'review', label: 'Flag Under Review', x: cx, y: 750,
      ...violet, icon: <AlertCircle className="w-4 h-4" />,
      desc: 'A matched record is flagged "Under Review" when critical fields are missing after the join: no owner name, no ARP, no location, no kind classification, or zero land area for Land records.' },

    { id: 'dedup', label: 'Deduplicate Records', x: cx, y: 920,
      ...teal, icon: <GitMerge className="w-4 h-4" />,
      desc: 'Records with identical fingerprint (ARP + Owner + Classification + Location) are collapsed to one row. Prevents duplicate entries when the same sale appears multiple times in input.' },

    { id: 'sort', label: 'Sort: Land → Bldg → Other', x: cx, y: 1090,
      ...slate, icon: <Layers className="w-4 h-4" />,
      desc: 'The deduplicated dataset is sorted: Land records first, Building records second, Other/Unmapped records last. Within each group, original import order is preserved.' },

    { id: 'output', label: '3YR Join Preview', sublabel: 'THREE-YEAR REPORT', x: cx, y: 1260,
      ...emerald, icon: <CheckCircle2 className="w-4 h-4" />,
      desc: 'Final output: enriched records showing Kind of Property, Owner Name, ARPN/PIN, Location, Classification, Area, and Sales Values (Lowest/Median/Highest). Ready for 3-Year Report export.' },
  ];

  const edges: FEdge[] = [
    { from: 'sales',    to: 'parse',    label: 'SALES DATA',        color: violet.dot },
    { from: 'roll',     to: 'index',    label: 'ASSESSMENT ROLL',   color: blue.dot },
    { from: 'parse',    to: 'match',    label: 'ARP No. / TD No.',  color: violet.dot },
    { from: 'index',    to: 'match',    label: 'ARP Lookup Map',    color: blue.dot },
    { from: 'match',    to: 'classify', label: 'Matched / Unlinked',color: indigo.dot },
    { from: 'classify', to: 'review',   color: slate.dot },
    { from: 'review',   to: 'dedup',   color: violet.dot },
    { from: 'dedup',    to: 'sort',    label: 'Unique Records',    color: teal.dot },
    { from: 'sort',     to: 'output',  label: 'Sorted Dataset',    color: emerald.dot },
  ];

  return { nodes, edges, w: 940, h: 1440 };
}

// ─── Flow: Standard ───────────────────────────────────────────────────────────
function standardFlow(): Flow {
  const cx = 284;
  const nodes: FNode[] = [
    { id: 'raw', label: 'Assessment Roll Files', sublabel: 'SOURCE DATA', x: 60, y: 40,
      ...blue, icon: <BookUser className="w-4 h-4" />,
      desc: 'Imported Excel/CSV files containing Assessment Roll data. Multiple files from different barangays can be loaded simultaneously and will be merged. Duplicate source files are detected and replaced.' },
    { id: 'exempt', label: 'Exempt File', sublabel: 'OPTIONAL', x: 508, y: 40,
      ...slate, icon: <FileText className="w-4 h-4" />,
      desc: 'Optional file containing PINs of tax-exempt properties. Matching records get taxability = "E" (Exempt). If not uploaded, all records default to Taxable (T). Does not affect market/assessed value computation.' },

    { id: 'parse', label: 'Parse & Merge Files', x: cx, y: 220,
      ...slate, icon: <Zap className="w-4 h-4" />,
      desc: 'All imported files are parsed (Excel column mapping via HEADER_ALIASES), type-converted (dates, numbers), and merged into a single flat dataset. Each record is assigned a unique stable ID.' },

    { id: 'cleanup', label: 'System Cleanup', sublabel: 'CLEANUP / INCOMPLETE flags', x: cx, y: 390,
      ...slate, icon: <Filter className="w-4 h-4" />,
      desc: 'Records with missing critical fields are flagged: CLEANUP (missing ARP or PIN entirely), INCOMPLETE (has identity but zero area and valid PIN). These move to the Archive tab — they are never deleted.' },

    { id: 'dedup', label: 'Detect Duplicates', sublabel: 'Same PIN → flag lowest priority', x: cx, y: 560,
      ...indigo, icon: <Search className="w-4 h-4" />,
      desc: 'Records sharing the same PIN are compared. The "canonical" record (highest ARP priority) is kept as VALID; others are flagged DUPLICATE and archived. Matching key: normalized PIN.' },

    { id: 'calibrate', label: 'Apply Calibration Rules', sublabel: 'Location · AU · Assessment Level', x: cx, y: 730,
      ...slate, icon: <Layers className="w-4 h-4" />,
      desc: 'Location settings (Barangay → Location mapping) and Actual Use (AU) classification rules are applied per record. Each gets its Location zone, AU code (RESI/COMM/AGRI…), and Assessment Level assigned.' },

    { id: 'compute', label: 'Compute Financial Values', sublabel: 'Market / Assessed / Yearly Tax', x: cx, y: 900,
      ...teal, icon: <Database className="w-4 h-4" />,
      desc: 'Market Value = Land Area × Unit Value. Assessed Value = Market Value × Assessment Level. Yearly Tax = Assessed Value × Tax Rate. Both 2028 (base) and 2029 (revalued) values are computed for each record.' },

    { id: 'output', label: 'Preview Results', sublabel: 'STANDARD REPORT', x: cx, y: 1070,
      ...emerald, icon: <CheckCircle2 className="w-4 h-4" />,
      desc: 'Final output: all VALID records with computed market value, assessed value, and yearly tax for both 2028 and 2029. Duplicates and cleanup records appear in the Archive tab. Export to Excel via "Export Data".' },
  ];

  const edges: FEdge[] = [
    { from: 'raw',       to: 'parse',    label: 'Raw Roll Data', color: blue.dot },
    { from: 'exempt',    to: 'parse',    label: 'Exempt PINs',   color: slate.dot, dashed: true },
    { from: 'parse',     to: 'cleanup',  label: 'All Records',   color: slate.dot },
    { from: 'cleanup',   to: 'dedup',    label: 'Flagged Records',color: slate.dot },
    { from: 'dedup',     to: 'calibrate',label: 'Deduplicated',  color: indigo.dot },
    { from: 'calibrate', to: 'compute',  label: 'Location Rules', color: slate.dot },
    { from: 'compute',   to: 'output',   label: 'Final Values',  color: emerald.dot },
  ];

  return { nodes, edges, w: 760, h: 1250 };
}

function getFlow(mode: string): Flow {
  switch (mode) {
    case 'abstract':        return abstractFlow();
    case 'building-permit': return permitFlow();
    case 'three-year-report': return threeYearFlow();
    default:                return standardFlow();
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DataFlowTab({ workflowMode }: { workflowMode: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView]             = useState({ x: 60, y: 40, scale: 0.7 });
  const [dragging, setDragging]     = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });
  const [selected, setSelected]     = useState<FNode | null>(null);

  const flow    = useMemo(() => getFlow(workflowMode), [workflowMode]);
  const nodeMap = useMemo(() => new Map(flow.nodes.map(n => [n.id, n])), [flow.nodes]);

  // Fit to container on mode change
  const fitView = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const s = Math.min((r.width - 80) / flow.w, (r.height - 80) / flow.h, 1.0);
    const scale = parseFloat(s.toFixed(3));
    const x = Math.max((r.width - flow.w * scale) / 2, 40);
    const y = 40;
    setView({ x, y, scale });
  }, [flow.w, flow.h]);

  useEffect(() => {
    const t = setTimeout(fitView, 80);
    return () => clearTimeout(t);
  }, [workflowMode, fitView]);

  // Non-passive wheel zoom (zoom to cursor)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      
      setView(prev => {
        const nextScale = parseFloat(Math.min(Math.max(prev.scale * factor, 0.2), 2.5).toFixed(3));
        return {
          scale: nextScale,
          x: mx - (mx - prev.x) * (nextScale / prev.scale),
          y: my - (my - prev.y) * (nextScale / prev.scale),
        };
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Zoom to center (for buttons)
  const zoomCenter = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    setView(prev => {
      const nextScale = parseFloat(Math.min(Math.max(prev.scale * factor, 0.2), 2.5).toFixed(3));
      return {
        scale: nextScale,
        x: mx - (mx - prev.x) * (nextScale / prev.scale),
        y: my - (my - prev.y) * (nextScale / prev.scale),
      };
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - view.x, y: e.clientY - view.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setView(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };
  const stopDrag = () => setDragging(false);

  // Mode metadata
  const modeLabel =
    workflowMode === 'abstract'          ? 'Abstract Join Engine'      :
    workflowMode === 'building-permit'   ? 'Permit Match Engine'       :
    workflowMode === 'three-year-report' ? '3-Year Report Engine'      : 'Standard Processing Engine';
  const modeBadgeClass =
    workflowMode === 'abstract'          ? 'bg-amber-700'   :
    workflowMode === 'building-permit'   ? 'bg-orange-600'  :
    workflowMode === 'three-year-report' ? 'bg-violet-700'  : 'bg-blue-700';

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* ── Canvas ─────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        style={{
          flex: 1,
          overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'grab',
          backgroundColor: '#080f1e',
          backgroundImage: 'radial-gradient(circle, #1e293b 1.5px, transparent 1.5px)',
          backgroundPosition: `${view.x}px ${view.y}px`,
          backgroundSize: `${28 * view.scale}px ${28 * view.scale}px`,
          position: 'relative',
        }}
      >
        {/* Transform wrapper */}
        <div style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          width: flow.w,
          height: flow.h,
        }}>
          {/* SVG arrow layer */}
          <svg
            style={{ position: 'absolute', left: 0, top: 0, width: flow.w, height: flow.h, overflow: 'visible', pointerEvents: 'none' }}
          >
            <defs>
              {ARROW_COLORS.map(c => (
                <marker key={c} id={`arr-${c.replace('#', '')}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={c} />
                </marker>
              ))}
            </defs>
            {flow.edges.map((e, i) => {
              const fn = nodeMap.get(e.from);
              const tn = nodeMap.get(e.to);
              if (!fn || !tn) return null;
              const fp = e.fp ?? 'bottom';
              const tp = e.tp ?? 'top';
              const f = getPort(fn, fp);
              const t = getPort(tn, tp);
              const c = e.color ?? '#94a3b8';
              const mid = midPt(f, t);
              const path = makePath(f, t, fp, tp);
              const markerId = `arr-${c.replace('#', '')}`;
              const labelW = e.label ? e.label.length * 5.4 + 14 : 0;
              return (
                <g key={i}>
                  <path
                    d={path}
                    fill="none"
                    stroke={c}
                    strokeWidth={1.5}
                    strokeOpacity={0.65}
                    strokeDasharray={e.dashed ? '6 4' : undefined}
                    markerEnd={`url(#${markerId})`}
                  />
                  {e.label && (
                    <g transform={`translate(${mid.x}, ${mid.y})`}>
                      <rect
                        x={-labelW / 2} y={-10}
                        width={labelW} height={20}
                        rx={4}
                        fill="#0c1525" fillOpacity={0.92}
                        stroke={c} strokeWidth={0.5} strokeOpacity={0.4}
                      />
                      <text
                        x={0} y={4.5}
                        textAnchor="middle"
                        fill={c}
                        fontSize={8.5}
                        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                        fontWeight="700"
                      >
                        {e.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Node cards */}
          {flow.nodes.map(n => {
            const isSel = selected?.id === n.id;
            return (
              <div
                key={n.id}
                data-node="true"
                onClick={() => setSelected(prev => prev?.id === n.id ? null : n)}
                style={{
                  position: 'absolute',
                  left: n.x, top: n.y,
                  width: NW, height: NH,
                  background: n.bg,
                  border: `1.5px solid ${isSel ? '#ffffff' : n.border}`,
                  borderRadius: 10,
                  padding: '10px 13px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  boxShadow: isSel
                    ? `0 0 0 2px ${n.border}, 0 0 22px ${n.border}55`
                    : `0 2px 14px ${n.border}1a`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                  overflow: 'hidden',
                }}
              >
                {/* Top row: icon + label + status dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ color: n.dot, flexShrink: 0 }}>{n.icon}</div>
                  <div style={{
                    flex: 1,
                    fontSize: 10.5, fontWeight: 800,
                    color: n.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{n.label}</div>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: n.dot, flexShrink: 0,
                    boxShadow: `0 0 5px ${n.dot}`,
                  }} />
                </div>
                {/* Sublabel */}
                {n.sublabel && (
                  <div style={{
                    fontSize: 8, fontWeight: 700,
                    color: n.border,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    opacity: 0.85,
                    paddingLeft: 23,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{n.sublabel}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Zoom controls (top-left) ──────────────────────────────── */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 20 }}>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-slate-900/80 backdrop-blur border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={() => zoomCenter(1.2)}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-slate-900/80 backdrop-blur border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={() => zoomCenter(0.8)}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-slate-900/80 backdrop-blur border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={fitView}>
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-slate-900/80 backdrop-blur border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={() => { fitView(); setSelected(null); }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* ── Engine badge (top-right) ──────────────────────────────── */}
        <div style={{ position: 'absolute', top: 12, right: selected ? 316 : 12, zIndex: 20, transition: 'right 0.25s ease' }}>
          <Badge className={`${modeBadgeClass} text-white font-black uppercase text-[9px] tracking-widest px-3`}>
            <Network className="w-3 h-3 mr-1.5" />
            {modeLabel}
          </Badge>
        </div>

        {/* ── Scale indicator (bottom-left) ────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: '0.05em',
        }}>
          <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{Math.round(view.scale * 100)}%</span>
          <span style={{ color: '#334155' }}>·</span>
          <Info className="w-3 h-3" style={{ color: '#334155' }} />
          <span>Click node for details · Scroll to zoom · Drag to pan</span>
        </div>

        {/* ── Legend ───────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 12, right: selected ? 316 : 12, zIndex: 20, transition: 'right 0.25s ease',
          display: 'flex', gap: 8,
        }}>
          {[
            { color: '#fb923c', label: 'Source File' },
            { color: '#60a5fa', label: 'Reference' },
            { color: '#818cf8', label: 'Processing' },
            { color: '#2dd4bf', label: 'Merge' },
            { color: '#10b981', label: 'Output' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Info Panel (slides in from right when node selected) ─────── */}
      {selected && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 300,
          background: 'rgba(9, 15, 29, 0.97)',
          borderLeft: `1px solid ${selected.border}33`,
          backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', gap: 0,
          zIndex: 30, overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{
            padding: '18px 16px 14px',
            borderBottom: `1px solid ${selected.border}22`,
            background: `${selected.bg}cc`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                <div style={{ color: selected.dot, flexShrink: 0 }}>{selected.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: selected.text, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>
                    {selected.label}
                  </div>
                  {selected.sublabel && (
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: selected.border, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                      {selected.sublabel}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none', padding: '2px', flexShrink: 0, lineHeight: 1 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid #1e293b` }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
              What this step does
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.75, fontWeight: 500 }}>
              {selected.desc}
            </div>
          </div>

          {/* Incoming edges (matching keys) */}
          {flow.edges.filter(e => e.to === selected.id && e.label).length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: `1px solid #1e293b` }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                Matching / Join Key
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {flow.edges.filter(e => e.to === selected.id && e.label).map((e, i) => (
                  <div key={i} style={{
                    background: '#0f172a',
                    border: `1px solid ${e.color ?? '#334155'}55`,
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: 10,
                    fontWeight: 800,
                    color: e.color ?? '#94a3b8',
                    fontFamily: "'JetBrains Mono', monospace",
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ opacity: 0.5 }}>↳</span> {e.label}
                    {e.dashed && <span style={{ fontSize: 8, color: '#475569', fontStyle: 'italic', fontFamily: 'sans-serif' }}>(optional)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing connections */}
          {flow.edges.filter(e => e.from === selected.id).length > 0 && (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                Connects To
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {flow.edges.filter(e => e.from === selected.id).map((e, i) => {
                  const target = nodeMap.get(e.to);
                  return target ? (
                    <button
                      key={i}
                      onClick={() => setSelected(target)}
                      style={{
                        background: '#0f172a',
                        border: `1px solid ${target.border}44`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: target.text,
                        display: 'flex', alignItems: 'center', gap: 7,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'border-color 0.1s',
                      }}
                    >
                      <div style={{ color: target.dot, flexShrink: 0 }}>{target.icon}</div>
                      <span style={{ flex: 1 }}>{target.label}</span>
                      {e.label && (
                        <span style={{ fontSize: 8, color: e.color ?? '#475569', fontFamily: 'monospace', fontWeight: 800 }}>
                          {e.label}
                        </span>
                      )}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
