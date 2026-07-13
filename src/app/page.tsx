
"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback, useRef } from 'react';
import Image from 'next/image';
import { 
  FileDown, 
  Settings,
  Archive,
  CheckCircle2,
  Database,
  Download,
  Search,
  Filter,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  MapPin,
  RefreshCw,
  Lightbulb,
  Loader2,
  FileSpreadsheet,
  BookUser,
  ShieldOff,
  Cpu,
  ShieldCheck,
  Files,
  Plus,
  BarChart3,
  ArrowRight,
  Trash2,
  X,
  FileText,
  ArrowUpDown,
  Zap,
  ChevronLeft,
  ArrowRightLeft,
  Info,
  Link2,
  TrendingUp,
  Tag,
  Unlink2,
  FileX,
  Construction,
  HardHat,
  AlertCircle,
  Building2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Cell, 
  Pie, 
  PieChart, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ImportZone } from '@/components/dashboard/import-zone';
import { CalibrationSidebar } from '@/components/dashboard/calibration-sidebar';
import { DataPreviewTable } from '@/components/dashboard/data-preview-table';
import { LandRecord, CalibrationRule, processRecords, TaxRateMap, ProcessingReport, RecordStatusType, normalizePin, getModeOfConveyance, normalizeNameForMatch, getJaroWinklerSimilarity, extractArpNumeric } from '@/lib/processor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';
import { BarangayConfig, initialLocationSettings } from '@/lib/locations';
import { ModeToggle } from '@/components/mode-toggle';
import { RecordDetailModal } from '@/components/dashboard/record-detail-modal';
import { AboutModal } from '@/components/dashboard/about-modal';
import { ProcessingReportModal } from '@/components/dashboard/processing-report-modal';
import { AuditLogTab } from '@/components/dashboard/audit-log-tab';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportSettingsModal, ExportFinalSettings } from '@/components/dashboard/export-settings-modal';
import { AbstractExportModal, AbstractExportSettings } from '@/components/dashboard/abstract-export-modal';
import { PermitExportModal, PermitExportSettings, PermitMatchStatus } from '@/components/dashboard/permit-export-modal';
import { useNotification } from '@/contexts/NotificationContext';
import { SettingsOverlay } from '@/components/dashboard/settings-overlay';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { parseFile } from '@/lib/importer';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { startOfDay, endOfDay, parse, isValid } from 'date-fns';

// Sub-components
import { MetricOverview } from '@/components/dashboard/metric-overview';
import { AnalyticsView } from '@/components/dashboard/analytics-view';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const defaultTaxRates: TaxRateMap = {
  "RESI": { assessmentLevel: 0.20, taxRate: 0.02 },
  "COMM": { assessmentLevel: 0.50, taxRate: 0.03 },
  "INDU": { assessmentLevel: 0.50, taxRate: 0.03 },
  "AGRI": { assessmentLevel: 0.20, taxRate: 0.025 },
  "GOV": { assessmentLevel: 0.15, taxRate: 0.00 },
  "SPEC": { assessmentLevel: 0.15, taxRate: 0.025 },
  "SPC1": { assessmentLevel: 0.15, taxRate: 0.025 },
  "SPC2": { assessmentLevel: 0.15, taxRate: 0.025 },
  "SPC3": { assessmentLevel: 0.15, taxRate: 0.025 },
  "SPC4": { assessmentLevel: 0.15, taxRate: 0.025 },
  "SPC5": { assessmentLevel: 0.15, taxRate: 0.025 },
};

type ProcessingStep = 'idle' | 'cleanup' | 'dedupe' | 'calibrate' | 'complete';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ImportManager = ({ mode, manifest, onAdd, onDelete }: { mode: 'raw' | 'exempt' | 'journal' | 'sales' | 'roll' | 'cancelled' | 'permits', manifest: any[], onAdd: () => void, onDelete: (name: string) => void }) => (
  <Popover>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className={cn(
                "h-9 w-9 transition-all", 
                mode === 'raw' ? "border-primary/30 text-primary hover:bg-primary/10" : 
                mode === 'exempt' ? "border-blue-500/30 text-blue-600 hover:bg-blue-50/10" :
                mode === 'journal' ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10" :
                mode === 'sales' ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10" :
                mode === 'permits' ? "border-orange-500/30 text-orange-600 hover:bg-orange-500/10" :
                "border-red-500/30 text-red-600 hover:bg-red-500/10"
              )}
            >
              {mode === 'raw' ? <BookUser className="w-4 h-4" /> : 
               mode === 'exempt' ? <ShieldOff className="w-4 h-4" /> :
               mode === 'journal' ? <FileText className="w-4 h-4" /> :
               mode === 'sales' ? <Tag className="w-4 h-4" /> :
               mode === 'permits' ? <HardHat className="w-4 h-4" /> :
               <FileX className="w-4 h-4" />}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-black uppercase text-[10px] tracking-widest">
          {mode === 'raw' ? "Manage Raw Records" : mode === 'exempt' ? "Manage Exempt Reference" : mode === 'journal' ? "Manage Journal Files" : mode === 'sales' ? "Manage Sales Data" : mode === 'permits' ? "Manage Permit Log" : "Manage Cancelled File"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <PopoverContent className="w-80 p-0 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl overflow-hidden" align="end">
      <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'raw' ? <BookUser className="w-4 h-4 text-primary" /> : 
           mode === 'exempt' ? <ShieldOff className="w-4 h-4 text-blue-600" /> :
           mode === 'journal' ? <FileText className="w-4 h-4 text-amber-600" /> :
           mode === 'sales' ? <Tag className="w-4 h-4 text-emerald-600" /> :
           mode === 'permits' ? <HardHat className="w-4 h-4 text-orange-600" /> :
           <FileX className="w-4 h-4 text-red-600" />}
          <span className="text-[10px] font-black uppercase tracking-widest">{mode === 'raw' ? "Raw File Manager" : mode === 'exempt' ? "Exempt File Manager" : mode === 'journal' ? "Journal File Manager" : mode === 'sales' ? "Sales File Manager" : mode === 'permits' ? "Permit File Manager" : "Cancelled File Manager"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-7 px-2 text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white">
          <Plus className="w-3 shadow-sm h-3 mr-1" /> Add File
        </Button>
      </div>
      <ScrollArea className="h-[250px]">
        {manifest.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center opacity-30">
            <Files className="w-8 h-8 mb-2" />
            <p className="text-[9px] font-black uppercase tracking-widest">No Files Loaded</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {manifest.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-white/5 group hover:bg-muted/30 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase truncate pr-2" title={file.name}>{file.name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{file.count} Records</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onDelete(file.name)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="p-3 bg-muted/30 border-t flex items-center justify-between">
        <span className="text-[9px] font-black text-muted-foreground uppercase">Total records: {manifest.reduce((sum, f) => sum + f.count, 0).toLocaleString()}</span>
      </div>
    </PopoverContent>
  </Popover>
);

export default function Home() {
  const { toast } = useToast();
  const { showSuccessModal, showSuccessToast } = useNotification();
  const [isPending, startTransition] = useTransition();

  // --- 1. DATA STATE ---
  const [rawData, setRawData] = useState<LandRecord[]>([]);
  const [previewData, setPreviewData] = useState<LandRecord[]>([]);
  const [processedData, setProcessedData] = useState<LandRecord[]>([]);
  const [journalData, setJournalData] = useState<LandRecord[]>([]);
  const [salesData, setSalesData] = useState<LandRecord[]>([]);
  const [cancelledData, setCancelledData] = useState<LandRecord[]>([]);
  const [permitData, setPermitData] = useState<LandRecord[]>([]);
  const [exemptPins, setExemptPins] = useState<Set<string>>(new Set());
  const [rules, setRules] = useState<CalibrationRule[]>([]);
  const [locationSettings, setLocationSettings] = useState<BarangayConfig[]>(initialLocationSettings);
  const [taxRates, setTaxRates] = useState<TaxRateMap>(defaultTaxRates);
  const [processingReports, setProcessingReports] = useState<ProcessingReport[]>([]);
  
  // --- 1.2 WORKFLOW STATE ---
  const [workflowMode, setWorkflowMode] = useState<'idle' | 'standard' | 'abstract' | 'building-permit'>('idle');
  const [abstractStep, setAbstractStep] = useState<'roll' | 'journal' | 'ready'>('roll');
  const [permitStep, setPermitStep] = useState<'roll' | 'permits' | 'ready'>('roll');

  const isAbstract = workflowMode === 'abstract';
  const isBuildingPermit = workflowMode === 'building-permit';

  // --- 1.1 MANIFEST STATE ---
  const [rawFileManifest, setRawFileManifest] = useState<{ name: string, count: number }[]>([]);
  const [exemptFileManifest, setExemptFileManifest] = useState<{ name: string, count: number, pins: string[] }[]>([]);
  const [journalFileManifest, setJournalFileManifest] = useState<{ name: string, count: number }[]>([]);
  const [salesFileManifest, setSalesFileManifest] = useState<{ name: string, count: number }[]>([]);
  const [cancelledFileManifest, setCancelledFileManifest] = useState<{ name: string, count: number }[]>([]);
  const [permitFileManifest, setPermitFileManifest] = useState<{ name: string, count: number }[]>([]);

  // --- 2. UI & MODAL STATE ---
  const [isClient, setIsClient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isDirectImporting, setIsDirectImporting] = useState(false);
  const [directImportProgress, setDirectImportProgress] = useState({ current: 0, total: 0, mode: 'raw' as any });
  const [viewMode, setViewMode] = useState<'results' | 'archive' | 'analytics' | 'audit'>('results');
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isAbstractExportModalOpen, setIsAbstractExportModalOpen] = useState(false);
  const [isPermitExportModalOpen, setIsPermitExportModalOpen] = useState(false);
  const [isRunProcessorDialogOpen, setIsRunProcessorDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [comparisonRecord, setComparisonRecord] = useState<LandRecord | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [taxViewMode, setTaxViewMode] = useState<'T' | 'E'>('T');
  const [sortBy, setSortBy] = useState<'pin' | 'arpNo'>('pin');

  // --- 3. REFS FOR DIRECT IMPORT ---
  const rawFileInputRef = useRef<HTMLInputElement>(null);
  const exemptFileInputRef = useRef<HTMLInputElement>(null);
  const journalFileInputRef = useRef<HTMLInputElement>(null);
  const salesFileInputRef = useRef<HTMLInputElement>(null);
  const cancelledFileInputRef = useRef<HTMLInputElement>(null);
  const permitFileInputRef = useRef<HTMLInputElement>(null);

  // --- 4. FILTER & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFileFilter, setSourceFileFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [taxabilityFilter, setTaxabilityFilter] = useState("all");

  // --- 5. ANALYTICS & DIAGNOSTIC STATE ---
  const [explainType, setExplainType] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<'usage' | 'barangay' | 'update' | 'market' | null>(null);

  // --- 6. ENGINE OPTIONS ---
  const [options, setOptions] = useState({
    removeDuplicates: true,
    applyCalibration: true,
    systemCleanup: true
  });
  
  const defaultExportColumns = {
    "TYPE": true,
    "DATE": true,
    "ARP NO#": true,
    "PIN": true,
    "PREVIOUS": true,
    "NEW ARP NO#": true,
    "UPDATE": true,
    "TAXABILITY": true,
    "ACCTNAME": true,
    "ADDRESS": true,
    "LOCATION": true,
    "KIND": true,
    "AU": true,
    "LAND AREA": true,
    "UNIT VALUE (2028)": true,
    "MARKET VALUE (2028)": true,
    "ASSESSED VALUE (2028)": true,
    "YEARLY TAX (2028 CAP)": true,
    "UNIT VALUE": true,
    "MARKET VALUE": true,
    "ASSESSED VALUE": true,
    "YEARLY TAX": true,
    "RECORD STATUS": true
  };
  const [exportColumns, setExportColumns] = useState<Record<string, boolean>>(defaultExportColumns);

  // Helper to parse date strings for multi-level sorting
  const parseRecordDate = (dateStr: string) => {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();
    const formats = ['MM/dd/yyyy', 'M/d/yyyy', 'yyyy-MM-dd', 'MM-dd-yyyy', 'yyyy-dd-MM'];
    for (const fmt of formats) {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }
    const fallback = new Date(cleaned);
    return isValid(fallback) ? fallback : null;
  };

  // --- 7. STATS CALCULATION ---
  const joinedAbstractData = useMemo(() => {
    if (workflowMode !== 'abstract') return [];
    
    const journals = journalData.length > 0 ? journalData : rawData.filter(r => r.sourceFile?.toLowerCase().includes('journal'));
    const rolls = rawData.filter(r => !r.sourceFile?.toLowerCase().includes('journal'));
    
    const rollLookup = new Map<string, LandRecord>();
    rolls.forEach(r => { if (r.pin) rollLookup.set(normalizePin(r.pin), r); });

    const salesLookup = new Map<string, LandRecord>();
    const cleanKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    
    salesData.forEach(s => { 
      if (s.arpNo) {
        salesLookup.set(cleanKey(s.arpNo), s); 
      }
    });

    // Rank and Process Journals first for sequential historical owner detection
    const journalPoolByPin = new Map<string, LandRecord[]>();
    journals.forEach(j => {
      const pinNorm = normalizePin(j.pin);
      if (!journalPoolByPin.has(pinNorm)) journalPoolByPin.set(pinNorm, []);
      journalPoolByPin.get(pinNorm)!.push(j);
    });
    // Sort each PIN's journal pool by ARP descending (highest first)
    journalPoolByPin.forEach(list => {
      list.sort((a, b) => extractArpNumeric(b.arpNo) - extractArpNumeric(a.arpNo));
    });

    const cancelledPoolByPin = new Map<string, LandRecord[]>();
    cancelledData.forEach(c => {
      if (c.pin) {
        const pinNorm = normalizePin(c.pin);
        if (!cancelledPoolByPin.has(pinNorm)) cancelledPoolByPin.set(pinNorm, []);
        cancelledPoolByPin.get(pinNorm)!.push(c);
      }
    });
    // Sort cancelled pool by ARP descending
    cancelledPoolByPin.forEach(list => {
      list.sort((a, b) => extractArpNumeric(b.arpNo) - extractArpNumeric(a.arpNo));
    });

    const normalizedExemptPins = new Set(Array.from(exemptPins).map(p => normalizePin(p)));

    const joined = journals.map(j => {
      const pinNorm = normalizePin(j.pin);
      const currentArpVal = extractArpNumeric(j.arpNo);
      const rollMatch = rollLookup.get(pinNorm) || null;
      const salesMatch = salesLookup.get(cleanKey(j.arpNo)) || null;
      const isExempt = normalizedExemptPins.has(pinNorm);

      // SEQUENTIAL LOGIC: Find Ownership Transfer From
      // 1. Look in the Journal pool for the record with the highest ARP strictly less than current
      const jHistory = journalPoolByPin.get(pinNorm) || [];
      const prevJ = jHistory.find(h => extractArpNumeric(h.arpNo) < currentArpVal);

      // 2. Look in the Cancelled pool for the record with the highest ARP strictly less than current
      const cHistory = cancelledPoolByPin.get(pinNorm) || [];
      const prevC = cHistory.find(h => extractArpNumeric(h.arpNo) < currentArpVal);

      // Determine the "best" previous record based on proximity (highest ARP that is < current)
      let prevRecord = null;
      if (prevJ && prevC) {
        prevRecord = extractArpNumeric(prevJ.arpNo) > extractArpNumeric(prevC.arpNo) ? prevJ : prevC;
      } else {
        prevRecord = prevJ || prevC;
      }

      let considerationValue: string | number = 0;
      if (salesMatch) {
        considerationValue = salesMatch.sellingPriceRef ? `REF: ${salesMatch.sellingPriceRef}` : (salesMatch.sellingPrice || 0);
      }

      return {
        ...j,
        taxability: isExempt ? 'E' : 'T',
        rollOwner: rollMatch?.acctName || '---',
        rollAddress: rollMatch?.address || '---',
        rollLotNo: rollMatch?.lotNo || '---',
        rollTctNo: rollMatch?.tctNo || '---',
        rollArea: rollMatch?.landArea || 0,
        isJoined: !!rollMatch,
        sellingPrice: considerationValue,
        dateOfTransfer: salesMatch?.dateOfTransfer || '',
        notarialDate: salesMatch?.notarialDate || '',
        docFileNo: salesMatch?.docFileNo || '',
        notary: salesMatch?.notary || '',
        cancelledOwner: prevRecord?.acctName || '',
        cancelledTctNo: prevRecord?.tctNo || '' 
      };
    });

    return [...joined].sort((a, b) => {
       const dateA = parseRecordDate(a.date) || new Date(0);
       const dateB = parseRecordDate(b.date) || new Date(0);
       if (dateA.getTime() !== dateB.getTime()) {
         return dateA.getTime() - dateB.getTime();
       }
       return (a.arpNo || "").localeCompare(b.arpNo || "", undefined, { numeric: true });
    });
  }, [workflowMode, journalData, rawData, exemptPins, salesData, cancelledData]);

  const joinedPermitData = useMemo(() => {
    if (workflowMode !== 'building-permit') return [];
    
    const permitOwnerCounts = new Map<string, number>();
    permitData.forEach(p => {
      const name = (p.barangayName || "").trim().toUpperCase();
      if (name) permitOwnerCounts.set(name, (permitOwnerCounts.get(name) || 0) + 1);
    });

    const rolls = rawData;
    const pinLookup = new Map<string, LandRecord[]>();
    const arpLookup = new Map<string, LandRecord[]>();
    const exactNameLookup = new Map<string, LandRecord[]>();
    
    const rollWordIndex = new Map<string, Set<string>>();
    const normNameToRollRecords = new Map<string, LandRecord[]>();

    const genericTokens = new Set(['DEVELOPMENT', 'REALTY', 'HOLDINGS', 'CORPORATION', 'INC', 'CORP', 'CO', 'AND', 'ESTATE', 'PHILS', 'PHILIPPINES']);

    rolls.forEach(r => { 
      if (r.pin) {
        const pNorm = normalizePin(r.pin);
        const existing = pinLookup.get(pNorm) || [];
        existing.push(r);
        pinLookup.set(pNorm, existing);
      }
      if (r.arpNo) {
        const aNorm = r.arpNo.trim();
        const existing = arpLookup.get(aNorm) || [];
        existing.push(r);
        arpLookup.set(aNorm, existing);
      }
      if (r.acctName) {
        const normName = normalizeNameForMatch(r.acctName);
        if (normName) {
          const existing = exactNameLookup.get(normName) || [];
          existing.push(r);
          exactNameLookup.set(normName, existing);
          
          const records = normNameToRollRecords.get(normName) || [];
          records.push(r);
          normNameToRollRecords.set(normName, records);

          const tokens = normName.split(' ');
          tokens.forEach(t => {
            if (!rollWordIndex.has(t)) rollWordIndex.set(t, new Set());
            rollWordIndex.get(t)!.add(normName);
          });
        }
      }
    });

    return permitData.flatMap(p => {
      const pinNorm = normalizePin(p.pin);
      const cleanPermitArp = (p.arpNo || "").trim();
      const rawPermitOwner = (p.barangayName || "").trim().toUpperCase();
      const normPermitOwner = normalizeNameForMatch(p.barangayName || ""); 
      
      const isUnderReview = (permitOwnerCounts.get(rawPermitOwner) || 0) > 1;

      const exactMatches = (pinNorm ? pinLookup.get(pinNorm) : null) || 
                           (cleanPermitArp ? arpLookup.get(cleanPermitArp) : null) ||
                           (normPermitOwner ? exactNameLookup.get(normPermitOwner) : null);
      
      if (exactMatches && exactMatches.length > 0) {
        return exactMatches.map(match => ({
          ...p,
          id: `${p.id}-${match.arpNo}-${match.pin}`,
          isJoined: true,
          isPotentialMatch: false,
          isUnderReview,
          rollArp: match.arpNo || '---',
          rollAddress: match.address || '---',
          rollArea: match.landArea || 0,
          rollUpdate: match.update || '---',
          rollOwner: match.acctName || '---'
        }));
      }

      if (normPermitOwner) {
        const pTokens = normPermitOwner.split(' ');
        const candidateOverlapCounts = new Map<string, number>();
        const candidateHasUniqueMatch = new Map<string, boolean>();

        pTokens.forEach(token => {
          const matchingRollNames = rollWordIndex.get(token);
          if (matchingRollNames) {
            matchingRollNames.forEach(rollName => {
              candidateOverlapCounts.set(rollName, (candidateOverlapCounts.get(rollName) || 0) + 1);
              if (!genericTokens.has(token)) {
                candidateHasUniqueMatch.set(rollName, true);
              }
            });
          }
        });

        const candidates: string[] = [];
        candidateOverlapCounts.forEach((count, rollName) => {
          if (count >= 2 && candidateHasUniqueMatch.get(rollName)) {
            candidates.push(rollName);
          }
        });

        let bestMatchName = null;
        let maxScore = 0;

        for (const candidateName of candidates) {
          const score = getJaroWinklerSimilarity(normPermitOwner, candidateName);
          if (score > maxScore) {
            maxScore = score;
            bestMatchName = candidateName;
          }
        }

        if (bestMatchName) {
           const matches = normNameToRollRecords.get(bestMatchName)!;
           if (maxScore >= 0.96) {
             return matches.map(match => ({
               ...p,
               id: `${p.id}-${match.arpNo}-${match.pin}`,
               isJoined: true,
               isPotentialMatch: false,
               isUnderReview,
               rollArp: match.arpNo || '---',
               rollAddress: match.address || '---',
               rollArea: match.landArea || 0,
               rollUpdate: match.update || '---',
               rollOwner: match.acctName || '---'
             }));
           } else if (maxScore >= 0.88) {
             return matches.map(match => ({
               ...p,
               id: `${p.id}-${match.arpNo}-${match.pin}`,
               isJoined: true,
               isPotentialMatch: true, 
               isUnderReview,
               rollArp: match.arpNo || '---',
               rollAddress: match.address || '---',
               rollArea: match.landArea || 0,
               rollUpdate: match.update || '---',
               rollOwner: match.acctName || '---'
             }));
           }
        }
      }
      
      return [{
        ...p,
        isJoined: false,
        isUnderReview,
        rollArp: '---',
        rollAddress: '---',
        rollArea: 0,
        rollUpdate: '---',
        rollOwner: '---'
      }];
    });
  }, [workflowMode, permitData, rawData]);

  const stats = useMemo(() => {
    if (workflowMode === 'abstract') {
      const joined = joinedAbstractData;
      const journals = journalData.length > 0 ? journalData : rawData.filter(r => r.sourceFile?.toLowerCase().includes('journal'));
      const rolls = rawData.filter(r => !r.sourceFile?.toLowerCase().includes('journal'));
      const linkedCount = joined.filter(r => r.isJoined).length;
      const unlinkedCount = joined.length - linkedCount;
      const exemptedCount = joined.filter(r => r.taxability === 'E').length;
      
      return {
        totalRawRows: journals.length,
        systemCleanup: 0,
        totalImported: journals.length,
        duplicatesRemoved: 0,
        finalCount: joined.reduce((sum, r) => sum + (r.landArea || 0), 0), 
        totalMarketValue: joined.reduce((sum, r) => sum + (r.marketValue || 0), 0),
        totalAssessedValue: joined.reduce((sum, r) => sum + (r.assessedValue || 0), 0),
        totalYearlyTax: 0,
        totalErrors: unlinkedCount,
        linkedCount,
        unlinkedCount,
        rollCount: rolls.length,
        exemptedCount
      };
    }

    if (workflowMode === 'building-permit') {
      const joined = joinedPermitData;
      const linkedCount = joined.filter(r => r.isJoined).length;
      return {
        totalRawRows: permitData.length,
        totalImported: permitData.length,
        finalCount: joined.length,
        linkedCount,
        unlinkedCount: joined.length - linkedCount,
        totalMarketValue: joined.reduce((sum, r) => sum + (r.estimatedCost || 0), 0),
        rollCount: rawData.length,
        totalErrors: 0,
        systemCleanup: 0,
        duplicatesRemoved: 0,
        totalAssessedValue: 0,
        totalYearlyTax: 0
      };
    }

    const active = previewData.filter(r => r.statusLabel !== 'CLEANUP' && r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && !r.isManualArchive);
    const valid = active.filter(r => r.statusLabel === 'VALID');
    const filteredValid = valid.filter(r => r.taxability === taxViewMode);
    const errors = active.filter(r => r.statusLabel !== 'VALID').length;
    const isProcessed = processedData.length > 0;
    const mvField = isProcessed ? 'marketValue2029' : 'marketValue2028';
    const avField = isProcessed ? 'assessedValue2029' : 'assessedValue2028';
    const ytField = isProcessed ? 'yearlyTax2029' : 'yearlyTax2028';

    return { 
      totalRawRows: rawData.length + journalData.length + permitData.length,
      systemCleanup: previewData.filter(r => r.statusLabel === 'CLEANUP' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'DUPLICATE' || r.isManualArchive).length,
      totalImported: rawData.length + journalData.length + permitData.length, 
      duplicatesRemoved: previewData.filter(r => r.statusLabel === 'DUPLICATE').length, 
      finalCount: active.length,
      totalMarketValue: filteredValid.reduce((sum, r) => sum + (r[mvField as keyof LandRecord] as number || 0), 0),
      totalAssessedValue: filteredValid.reduce((sum, r) => sum + (r[avField as keyof LandRecord] as number || 0), 0),
      totalYearlyTax: filteredValid.reduce((sum, r) => sum + (r[ytField as keyof LandRecord] as number || 0), 0),
      totalErrors: errors
    };
  }, [previewData, rawData, journalData, permitData, taxViewMode, processedData.length, workflowMode, joinedAbstractData, joinedPermitData]);

  const latestReport = processingReports[0] || null;

  const uniqueSourceFiles = useMemo(() => {
    const files = new Set<string>();
    previewData.forEach(r => { if (r.sourceFile) files.add(r.sourceFile); });
    processedData.forEach(r => { if (r.sourceFile) files.add(r.sourceFile); });
    return Array.from(files);
  }, [previewData, processedData]);

  const uniqueBarangays = useMemo(() => {
    const brgySet = new Set<string>();
    previewData.forEach(r => { brgySet.add(r.barangayName || 'UNMAPPED'); });
    return Array.from(brgySet).sort();
  }, [previewData]);

  const dynamicStatusOptions = useMemo(() => {
    if ((isAbstract || isBuildingPermit) && viewMode === 'results') { return ['Linked', 'No Match', 'Under Review']; }
    const activeData = viewMode === 'archive' 
      ? previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'CLEANUP' || r.isManualArchive)
      : (processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP' && !r.isManualArchive));
    const available = new Set<string>();
    activeData.forEach(r => { if (r.statusLabel) available.add(r.statusLabel); });
    return Array.from(available);
  }, [previewData, processedData, viewMode, workflowMode, isAbstract, isBuildingPermit]);

  const analyticsData = useMemo(() => {
    if (workflowMode === 'abstract' || workflowMode === 'building-permit') {
      const activeData = workflowMode === 'abstract' ? joinedAbstractData : joinedPermitData;
      const filteredData = activeData.filter(record => {
        if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
        if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;
        return true;
      });
      const kindDistribution: Record<string, number> = {};
      const taxabilityDistribution: Record<string, number> = {};
      const joinDistribution: Record<string, number> = {};
      const locationDistribution: Record<string, number> = {};
      filteredData.forEach(r => {
        const kind = (r.kind || 'UNKNOWN').trim().toUpperCase();
        kindDistribution[kind] = (kindDistribution[kind] || 0) + 1;
        const tax = r.taxability === 'E' ? 'EXEMPT' : 'TAXABLE';
        taxabilityDistribution[tax] = (taxabilityDistribution[tax] || 0) + 1;
        const join = r.isUnderReview ? 'UNDER REVIEW' : (r.isJoined ? 'LINKED' : 'NO MATCH');
        joinDistribution[join] = (joinDistribution[join] || 0) + 1;
        const loc = (r.location || 'UNMAPPED').toUpperCase();
        locationDistribution[loc] = (locationDistribution[loc] || 0) + 1;
      });
      return { totalRecords: filteredData.length, auChart: Object.entries(kindDistribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), marketChart: Object.entries(taxabilityDistribution).map(([name, value]) => ({ name, value })), updateChart: Object.entries(joinDistribution).map(([name, value]) => ({ name, value })), barangayChart: Object.entries(locationDistribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 15) };
    }
    const activeData = processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'CLEANUP' && r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && !r.isManualArchive);
    const filteredActiveData = activeData.filter(record => {
      if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
      if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;
      if (taxabilityFilter !== 'all') {
        if (taxabilityFilter === 'T' && record.taxability !== 'T') return false;
        if (taxabilityFilter === 'E' && record.taxability !== 'E') return false;
      }
      return true;
    });
    const auDistribution: Record<string, number> = {};
    const marketValueSum: Record<string, number> = {};
    const updateDistribution: Record<string, number> = {};
    const barangayDistribution: Record<string, number> = {};
    filteredActiveData.forEach(r => {
      const au = r.au || 'UNKNOWN';
      auDistribution[au] = (auDistribution[au] || 0) + 1;
      marketValueSum[au] = (marketValueSum[au] || 0) + (r.marketValue || 0);
      const updateCode = (r.update || 'NONE').toUpperCase();
      updateDistribution[updateCode] = (updateDistribution[updateCode] || 0) + 1;
      const brgy = r.barangayName || 'UNMAPPED';
      barangayDistribution[brgy] = (barangayDistribution[brgy] || 0) + 1;
    });
    return { totalRecords: filteredActiveData.length, auChart: Object.entries(auDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value), marketChart: Object.entries(marketValueSum).map(([name, value]) => ({ name, value })).filter(item => item.value > 0), updateChart: Object.entries(updateDistribution).map(([name, value]) => ({ name, value })), barangayChart: Object.entries(barangayDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value) };
  }, [processedData, previewData, joinedAbstractData, joinedPermitData, workflowMode, sourceFileFilter, barangayFilter, taxabilityFilter]);

  const filteredDisplayData = useMemo(() => {
    if ((isAbstract || isBuildingPermit) && viewMode === 'results') {
      const baseData = isAbstract ? joinedAbstractData : joinedPermitData;
      const query = searchQuery.toLowerCase();
      return baseData.filter(record => {
        if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
        if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;
        if (statusFilter !== 'all') {
          if (statusFilter === 'Linked' && !record.isJoined) return false;
          if (statusFilter === 'No Match' && record.isJoined) return false;
          if (statusFilter === 'Under Review' && !record.isUnderReview) return false;
        }
        if (query) {
          if (searchField === 'all') {
            return record.arpNo?.toLowerCase().includes(query) || record.date?.toLowerCase().includes(query) || record.acctName?.toLowerCase().includes(query) || (record as any).rollAddress?.toLowerCase().includes(query) || record.location?.toLowerCase().includes(query) || record.pin?.toLowerCase().includes(query) || (record as any).rollTctNo?.toLowerCase().includes(query) || record.buildingPermitNo?.toLowerCase().includes(query);
          } else {
            const value = (record as any)[searchField];
            return String(value || '').toLowerCase().includes(query);
          }
        }
        return true;
      });
    }
    const baseData = viewMode === 'results' 
      ? (processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP' && !r.isManualArchive))
      : previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'CLEANUP' || r.isManualArchive);
    const filtered = baseData.filter(record => {
      if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
      if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;
      const query = searchQuery.toLowerCase();
      let matchesSearch = true;
      if (query) {
        if (searchField === 'all') {
          matchesSearch = record.acctName?.toLowerCase().includes(query) || record.pin?.toLowerCase().includes(query) || record.arpNo?.toLowerCase().includes(query) || record.location?.toLowerCase().includes(query) || record.address?.toLowerCase().includes(query) || record.au?.toLowerCase().includes(query) || record.taxability?.toLowerCase().includes(query) || record.sourceFile?.toLowerCase().includes(query);
        } else {
          const value = record[searchField as keyof LandRecord];
          matchesSearch = String(value || '').toLowerCase().includes(query);
        }
      }
      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      return record.statusLabel === statusFilter;
    });
    const sorted = [...filtered].sort((a, b) => {
      const fieldA = sortBy === 'pin' ? (a.pin || '') : (a.arpNo || '');
      const fieldB = sortBy === 'pin' ? (b.pin || '') : (b.arpNo || '');
      return fieldA.localeCompare(fieldB);
    });
    if (viewMode === 'archive' && (statusFilter === 'all' || statusFilter === 'DUPLICATE')) {
      const finalWithComparisons: LandRecord[] = [];
      sorted.forEach(record => {
        if (record.statusLabel === 'DUPLICATE') {
          const validPeer = previewData.find(p => p.pin === record.pin && !p.isDuplicate && !p.isCleanup && !p.isManualArchive);
          if (validPeer) { finalWithComparisons.push({ ...validPeer, id: `comparison-${validPeer.id}-${record.id}`, isComparisonInjected: true }); }
        }
        finalWithComparisons.push(record);
      });
      return finalWithComparisons;
    }
    return sorted;
  }, [previewData, processedData, joinedAbstractData, joinedPermitData, workflowMode, viewMode, searchQuery, searchField, statusFilter, sourceFileFilter, barangayFilter, sortBy, isAbstract, isBuildingPermit]);

  useEffect(() => {
    setIsClient(true);
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const handleAppInstalled = () => { setDeferredPrompt(null); toast({ title: "Installation Successful", description: "Data Link Parañaque is now available on your device." }); };
    const handleFullScreenChange = () => { setIsFullScreen(!!document.fullscreenElement); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeinstallprompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const clearWorkspace = async () => {
    setIsClearing(true);
    await delay(500);
    setRawData([]); setProcessedData([]); setPreviewData([]); setJournalData([]); setSalesData([]); setCancelledData([]); setPermitData([]); setExemptPins(new Set());
    setRawFileManifest([]); setExemptFileManifest([]); setJournalFileManifest([]); setSalesFileManifest([]); setCancelledFileManifest([]); setPermitFileManifest([]);
    setSearchQuery(""); setImportedFileName(""); setShowDetailedResults(false);
    setWorkflowMode('idle'); setAbstractStep('roll'); setPermitStep('roll'); setViewMode('results');
    setIsClearing(false);
    toast({ title: "Workspace Cleared", description: "All active data removed. Audit logs preserved." });
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); }
    else { document.exitFullscreen(); }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setDeferredPrompt(null); }
  };

  const runProcessWithData = async (data: LandRecord[], rawCount: number, fileName: string, silent = false, overrideExemptPins?: Set<string>) => {
    if (!silent) { setIsProcessing(true); setProcessingStep('cleanup'); await delay(1200); setProcessingStep('dedupe'); await delay(1000); setProcessingStep('calibrate'); await delay(800); }
    startTransition(() => {
      const activeExemptPins = overrideExemptPins || exemptPins;
      const { processed, allWithDuplicateMarkers, report } = processRecords(data, rules, locationSettings, taxRates, options, fileName, activeExemptPins);
      setProcessedData(processed);
      setPreviewData(allWithDuplicateMarkers);
      setProcessingReports(prev => [report, ...prev]);
      if (!silent) {
          setProcessingStep('complete');
          setTimeout(() => {
            setIsProcessing(false); setProcessingStep('idle');
            showSuccessModal({ title: "Engine Analysis Complete", message: `${report.validCount} records have been successfully calibrated. Please conduct a manual review of all results to ensure final data integrity before export.`, onDownload: () => setIsExportSettingsOpen(true), onViewResult: () => { setViewMode('results'); } });
        }, 800);
      }
    });
  };

  const handleDataImported = (importResults: any[], mode: 'raw' | 'exempt' | 'journal' | 'sales' | 'roll' | 'cancelled' | 'permits' = 'raw') => {
    let latestRawData = [...rawData];
    let latestJournalData = [...journalData];
    let latestSalesData = [...salesData];
    let latestCancelledData = [...cancelledData];
    let latestPermitData = [...permitData];
    let latestExemptPins = new Set(exemptPins);
    
    const newManifestEntries: { name: string, count: number }[] = [];
    const newExemptManifestEntries: { name: string, count: number, pins: string[] }[] = [];
    
    const incomingRecords: LandRecord[] = [];

    importResults.forEach(res => {
      const { data: imported, fileName, rawCount } = res;
      incomingRecords.push(...imported);

      if (mode === 'exempt') {
        const pinsFromThisFile = new Set<string>();
        imported.forEach(r => { if (r.pin) { const pin = r.pin.trim(); latestExemptPins.add(pin); pinsFromThisFile.add(pin); } });
        newExemptManifestEntries.push({ name: fileName, count: imported.length, pins: Array.from(pinsFromThisFile) });
      } else if (mode === 'journal') {
        latestJournalData = [...latestJournalData.filter(r => r.sourceFile !== fileName), ...imported];
        newManifestEntries.push({ name: fileName, count: rawCount });
      } else if (mode === 'sales') {
        latestSalesData = [...latestSalesData.filter(r => r.sourceFile !== fileName), ...imported];
        newManifestEntries.push({ name: fileName, count: rawCount });
      } else if (mode === 'cancelled') {
        latestCancelledData = [...latestCancelledData.filter(r => r.sourceFile !== fileName), ...imported];
        newManifestEntries.push({ name: fileName, count: rawCount });
      } else if (mode === 'permits') {
        latestPermitData = [...latestPermitData.filter(r => r.sourceFile !== fileName), ...imported];
        newManifestEntries.push({ name: fileName, count: rawCount });
      } else {
        latestRawData = [...latestRawData.filter(r => r.sourceFile !== fileName), ...imported];
        newManifestEntries.push({ name: fileName, count: rawCount });
      }
    });

    if (mode === 'exempt') {
      setExemptPins(new Set(latestExemptPins));
      setExemptFileManifest(prev => {
        const names = new Set(newExemptManifestEntries.map(e => e.name));
        return [...prev.filter(f => !names.has(f.name)), ...newExemptManifestEntries];
      });
    } else if (mode === 'journal') {
      setJournalFileManifest(prev => {
        const names = new Set(newManifestEntries.map(e => e.name));
        return [...prev.filter(f => !names.has(f.name)), ...newManifestEntries];
      });
      setJournalData(latestJournalData);
    } else if (mode === 'sales') {
      setSalesFileManifest(prev => {
        const names = new Set(newManifestEntries.map(e => e.name));
        return [...prev.filter(f => !names.has(f.name)), ...newManifestEntries];
      });
      setSalesData(latestSalesData);
    } else if (mode === 'cancelled') {
      setCancelledFileManifest(prev => {
        const names = new Set(newManifestEntries.map(e => e.name));
        return [...prev.filter(f => !names.has(f.name)), ...newManifestEntries];
      });
      setCancelledData(latestCancelledData);
    } else if (mode === 'permits') {
      setPermitFileManifest(prev => {
        const names = new Set(newManifestEntries.map(e => e.name));
        return [...prev.filter(f => !names.has(f.name)), ...newManifestEntries];
      });
      setPermitData(latestPermitData);
    } else {
      setRawFileManifest(prev => {
        const names = new Set(newManifestEntries.map(e => e.name));
        return [...prev.filter(f => !names.has(f.name)), ...newManifestEntries];
      });
      setRawData(latestRawData);
    }
    
    const combined = [...latestRawData, ...latestJournalData, ...latestSalesData, ...latestCancelledData, ...latestPermitData];
    const topFileName = importResults.length > 1 ? `Batch (${importResults.length} Files)` : importResults[0].fileName;
    if (mode !== 'exempt') setImportedFileName(topFileName);
    
    if (workflowMode === 'abstract') {
      if (abstractStep === 'roll' && (mode === 'raw' || mode === 'roll')) { setAbstractStep('journal'); toast({ title: "Roll Staged", description: "Assessment Roll loaded. Now, please upload the corresponding Journal file." }); }
      else if (abstractStep === 'journal' && mode === 'journal') { setAbstractStep('ready'); setShowDetailedResults(true); const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, topFileName, latestExemptPins); setPreviewData(allWithDuplicateMarkers); toast({ title: "Data Staged", description: "Roll and Journal joined. Report ready for Abstract Export." }); }
      else if (abstractStep === 'ready' || (isAbstract && (mode === 'exempt' || mode === 'sales' || mode === 'cancelled'))) {
        setShowDetailedResults(true);
        const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, topFileName, latestExemptPins);
        setPreviewData(allWithDuplicateMarkers);
      }
    } else if (workflowMode === 'building-permit') {
      if (permitStep === 'roll' && (mode === 'raw' || mode === 'roll')) { setPermitStep('permits'); toast({ title: "Roll Staged", description: "Assessment Roll loaded. Now, please upload the Building Permit log." }); }
      else if (permitStep === 'permits' && mode === 'permits') { setPermitStep('ready'); setShowDetailedResults(true); const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, topFileName, latestExemptPins); setPreviewData(allWithDuplicateMarkers); toast({ title: "Permit Data Staged", description: "Assessment Roll and Permit Log linked successfully." }); }
      else if (permitStep === 'ready') {
        setShowDetailedResults(true);
        const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, topFileName, latestExemptPins);
        setPreviewData(allWithDuplicateMarkers);
      }
    } else {
      if (mode !== 'exempt') setShowDetailedResults(true);
      if (processedData.length > 0) { runProcessWithData(combined, combined.length, topFileName, true, latestExemptPins); }
      else { const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, topFileName, latestExemptPins); setPreviewData(allWithDuplicateMarkers); if (mode !== 'exempt' && mode !== 'cancelled') setShowDetailedResults(true); }
    }
    const totalRecordsImported = incomingRecords.length;
    toast({ title: mode === 'exempt' ? "Exempt Data Integrated" : mode === 'journal' ? "Journal Data Integrated" : mode === 'sales' ? "Sales Data Integrated" : mode === 'cancelled' ? "Cancelled Reference Integrated" : mode === 'permits' ? "Permit Data Integrated" : "Data Loaded", description: mode === 'exempt' ? `${totalRecordsImported} records integrated and indexed as Exempt reference.` : `${totalRecordsImported} records from ${importResults.length} file(s) imported successfully.` });
  };

  const deleteFile = (fileName: string, mode: 'raw' | 'exempt' | 'journal' | 'sales' | 'roll' | 'cancelled' | 'permits') => {
    if (mode === 'raw' || mode === 'roll') { setRawData(prev => prev.filter(r => r.sourceFile !== fileName)); setRawFileManifest(prev => prev.filter(f => f.name !== fileName)); }
    else if (mode === 'journal') { setJournalData(prev => prev.filter(r => r.sourceFile !== fileName)); setJournalFileManifest(prev => prev.filter(f => f.name !== fileName)); }
    else if (mode === 'sales') { setSalesData(prev => prev.filter(r => r.sourceFile !== fileName)); setSalesFileManifest(prev => prev.filter(f => f.name !== fileName)); }
    else if (mode === 'cancelled') { setCancelledData(prev => prev.filter(r => r.sourceFile !== fileName)); setCancelledFileManifest(prev => prev.filter(f => f.name !== fileName)); }
    else if (mode === 'permits') { setPermitData(prev => prev.filter(r => r.sourceFile !== fileName)); setPermitFileManifest(prev => prev.filter(f => f.name !== fileName)); }
    else { const newExemptFiles = exemptFileManifest.filter(f => f.name !== fileName); setExemptFileManifest(newExemptFiles); const newExemptPins = new Set<string>(); newExemptFiles.forEach(f => f.pins.forEach(pin => newExemptPins.add(pin))); setExemptPins(newExemptPins); }
    setProcessedData([]); toast({ title: "File Removed", description: `${fileName} has been removed from the session.` });
  };

  const handleDirectImport = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'raw' | 'exempt' | 'journal' | 'sales' | 'roll' | 'cancelled' | 'permits') => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setIsDirectImporting(true); setDirectImportProgress({ current: 0, total: files.length, mode });
    const allResults: any[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setDirectImportProgress(prev => ({ ...prev, current: i }));
        const workflow = workflowMode === 'abstract' ? (mode === 'journal' ? 'journal' : mode === 'sales' ? 'sales' : mode === 'cancelled' ? 'cancelled' : 'roll') : 
                        workflowMode === 'building-permit' ? (mode === 'permits' ? 'permits' : 'roll') :
                        workflowMode;
        const result = await parseFile(files[i], workflow as any, mode as any);
        allResults.push({
          data: result.data,
          fileName: files[i].name,
          rawCount: result.count
        });
        await delay(400);
      }
      handleDataImported(allResults, mode as any);
    } catch (err: any) { toast({ variant: "destructive", title: "Import Error", description: err.message || "Failed to parse one or more files." }); }
    finally { setIsDirectImporting(false); if (e.target) e.target.value = ''; }
  };

  const runProcess = async () => { const combined = [...rawData, ...journalData, ...salesData, ...cancelledData, ...permitData]; if (combined.length === 0) return; runProcessWithData(combined, combined.length, importedFileName); };

  const handleSaveRecord = useCallback((updatedRecord: LandRecord, silent = false) => {
    setSelectedRecord(null); setComparisonRecord(null); if (!silent) setIsProcessing(true);
    startTransition(() => {
      setRawData(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      setJournalData(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      setSalesData(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      setCancelledData(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      setPermitData(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      setTimeout(() => {
        const combined = [...rawData, ...journalData, ...salesData, ...cancelledData, ...permitData];
        if (processedData.length > 0) { runProcessWithData(combined, combined.length, importedFileName, silent); }
        else { const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, importedFileName, exemptPins); setPreviewData(allWithDuplicateMarkers); if (!silent) setIsProcessing(false); }
      }, silent ? 0 : 10);
    });
  }, [rawData, journalData, salesData, cancelledData, permitData, processedData.length, importedFileName, locationSettings, taxRates, exemptPins]);

  const handleArchiveRecord = useCallback((record: LandRecord) => { handleSaveRecord({ ...record, isManualArchive: true }, true); toast({ title: "Record Archived", description: "The record has been moved to the Archive tab." }); }, [handleSaveRecord]);
  const handleUnarchiveRecord = useCallback((record: LandRecord) => { handleSaveRecord({ ...record, isManualArchive: false }, true); toast({ title: "Record Restored", description: "The record has been moved back to the Results tab." }); }, [handleSaveRecord]);

  const handleRowClick = useCallback((record: LandRecord) => { if (workflowMode === 'abstract' || workflowMode === 'building-permit') return; setSelectedRecord(record); if (record.statusLabel === 'DUPLICATE') { const validPeer = previewData.find(p => p.pin === record.pin && !p.isDuplicate && !p.isCleanup && !p.isManualArchive); setSelectedRecord({ ...record, duplicateWithReference: validPeer?.arpNo || "N/A" }); setComparisonRecord(validPeer || null); } else { setComparisonRecord(null); } }, [previewData, workflowMode]);

  const handleFinalExport = async (settings: ExportFinalSettings) => {
    setIsExporting(true); setIsExportSettingsOpen(false);
    try {
      await delay(1500);
      const baseFilteredSet = previewData.filter(r => settings.barangays.includes(r.barangayName || 'UNMAPPED') && settings.statuses.includes(r.statusLabel || 'VALID' as any) && settings.kinds.includes(r.kind?.trim().toUpperCase() || '') && settings.taxabilities.includes(r.taxability || 'T') && settings.updateCodes.includes(r.update?.trim().toUpperCase() || ''));
      if (baseFilteredSet.length === 0) { toast({ variant: "destructive", title: "Export Failed", description: "No records match your selected export criteria." }); setIsExporting(false); return; }
      const finalOutputList: LandRecord[] = []; const handledIds = new Set<string>();
      [...baseFilteredSet].sort((a, b) => (a.arpNo || '').localeCompare(b.arpNo || '')).forEach(record => {
        if (handledIds.has(record.id!)) return;
        if (record.statusLabel === 'DUPLICATE') {
          const ref = previewData.find(p => p.pin === record.pin && !p.isDuplicate && !p.isCleanup && !p.isManualArchive);
          finalOutputList.push(record); handledIds.add(record.id!);
          if (ref) { finalOutputList.push({ ...ref, isComparisonInjected: true }); if (baseFilteredSet.some(r => r.id === ref.id)) { handledIds.add(record.id!); } }
        } else { finalOutputList.push(record); handledIds.add(record.id!); }
      });
      const taxableRecords = finalOutputList.filter(r => r.taxability === 'T'); const exemptRecords = finalOutputList.filter(r => r.taxability === 'E');
      const sum = (recs: LandRecord[], field: keyof LandRecord) => recs.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
      const fmt = (val: number) => `₱${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
      
      const headerMapping: Record<string, string> = { 
        duplicateWithReference: "TYPE",
        date: "DATE", 
        arpNo: "ARP NO#", 
        pin: "PIN",
        previous: "PREVIOUS", 
        newArpNo: "NEW ARP NO#", 
        update: "UPDATE", 
        taxability: "TAXABILITY", 
        acctName: "ACCTNAME", 
        address: "ADDRESS", 
        location: "LOCATION", 
        kind: "KIND", 
        au: "AU", 
        landArea: "LAND AREA", 
        unitValue2028: "UNIT VALUE (2028)", 
        marketValue2028: "MARKET VALUE (2028)", 
        assessedValue2028: "ASSESSED VALUE (2028)", 
        yearlyTax2028: "YEARLY TAX (2028 CAP)", 
        unitValue: "UNIT VALUE", 
        marketValue: "MARKET VALUE", 
        assessedValue: "ASSESSED VALUE", 
        yearlyTax: "YEARLY TAX",
        statusLabel: "RECORD STATUS"
      };

      const activeHeaders = Object.values(headerMapping).filter(h => settings.columns[h]);
      
      const formattedExport = finalOutputList.map(record => { 
        const row: any = {}; 
        Object.entries(headerMapping).forEach(([key, label]) => { 
          if (settings.columns[label]) { 
            if (label === "TYPE") {
              row[label] = record.isComparisonInjected ? "VALID" : (record.duplicateWithReference === 'REF' ? 'VALID' : record.duplicateWithReference || "VALID");
            } else if (label === "UNIT VALUE") {
              row[label] = processedData.length > 0 ? record.unitValue2029 : record.unitValue2028; 
            } else if (label === "MARKET VALUE") {
              row[label] = processedData.length > 0 ? record.marketValue2029 : record.marketValue2028; 
            } else if (label === "ASSESSED VALUE") {
              row[label] = processedData.length > 0 ? record.assessedValue2029 : record.assessedValue2028; 
            } else if (label === "YEARLY TAX") {
              row[label] = processedData.length > 0 ? record.yearlyTax2029 : record.yearlyTax2028; 
            } else {
              row[label] = record[key as keyof LandRecord]; 
            }
          } 
        }); 
        return row; 
      });

      const wb = XLSX.utils.book_new(); 
      const ws = XLSX.utils.aoa_to_sheet([["DATA LINK PARAÑAQUE - SMART EXPORT"], ["EXPORT DATE:", new Date().toLocaleString()], ["TOTAL RECORDS:", finalOutputList.length.toLocaleString()], [], ["SUMMARY TAXABLE PROPERTIES"], [], ["CURRENT (2028)"], ["TOTAL MARKET VALUE (2028):", fmt(sum(taxableRecords, 'marketValue2028'))], ["TOTAL ASSESSED VALUE (2028):", fmt(sum(taxableRecords, 'assessedValue2028'))], ["TOTAL YEARLY TAX (2028 capped at 6%):", fmt(sum(taxableRecords, 'yearlyTax2028'))], [], ["RPVARA (2029)"], ["TOTAL MARKET VALUE (2029):", fmt(sum(taxableRecords, 'marketValue2029'))], ["TOTAL ASSESSED VALUE (2029):", fmt(sum(taxableRecords, 'assessedValue2029'))], ["TOTAL YEARLY TAX (2029):", fmt(sum(taxableRecords, 'yearlyTax2029'))], [], ["SUMMARY EXEMPTED PROPERTIES"], [], ["CURRENT (2028)"], ["TOTAL MARKET VALUE (2028):", fmt(sum(exemptRecords, 'marketValue2028'))], ["TOTAL ASSESSED VALUE (2028):", fmt(sum(exemptRecords, 'assessedValue2028'))], [], ["RPVARA (2029)"], ["TOTAL MARKET VALUE (2029):", fmt(sum(exemptRecords, 'marketValue2029'))], ["TOTAL ASSESSED VALUE (2029):", fmt(sum(exemptRecords, 'assessedValue2029'))], [], activeHeaders]);
      XLSX.utils.sheet_add_json(ws, formattedExport, { origin: -1, skipHeader: true }); ws['!cols'] = activeHeaders.map(() => ({ wch: 22 })); XLSX.utils.book_append_sheet(wb, ws, "ExportResults");
      
      const geoPart = settings.barangays.length === uniqueBarangays.length ? "All-Barangays" : settings.barangays.join("-");
      const statusPart = settings.statuses.join("-").replace(/\s+/g, '_');
      const codesPart = settings.updateCodes.join("-");
      
      XLSX.writeFile(wb, `${geoPart}_${statusPart}_${codesPart}.xlsx`);
      showSuccessToast(`Exported ${finalOutputList.length} records successfully.`);
    } catch (error: any) { toast({ variant: "destructive", title: "Export Failed", description: error.message }); }
    finally { setIsExporting(false); }
  };

  const handleAbstractExport = async (settings: AbstractExportSettings) => {
    setIsExporting(true);
    try {
      await delay(1500);
      let baseData = [...joinedAbstractData].filter(record => {
        const matchStatus = record.isJoined ? 'Linked' : 'Unlinked';
        if (!settings.matchRules.includes(matchStatus)) return false;
        
        if (settings.startDate || settings.endDate) { 
          const recDate = parseRecordDate(record.date); 
          if (!recDate) return false; 
          if (settings.startDate && recDate < startOfDay(new Date(settings.startDate))) return false; 
          if (settings.endDate && recDate > endOfDay(new Date(settings.endDate))) return false; 
        }
        if (!settings.kinds.includes((record.kind || '').trim().toUpperCase())) return false;
        if (!settings.taxabilities.includes(record.taxability)) return false;
        if (!settings.updateCodes.includes((record.update || '').trim().toUpperCase())) return false;
        return true;
      });
      if (baseData.length === 0) { toast({ variant: "destructive", title: "Abstract Export Failed", description: "No records found matching your specific filter criteria." }); setIsExporting(false); return; }
      
      const abstractData = baseData.map(j => {
        const kind = (j.kind || "").trim().toUpperCase();
        const areaToUse = (kind === 'B' || kind === 'BUILDING') 
          ? ((j as any).rollArea || j.landArea || 0) 
          : (j.landArea || 0);

        return { 
          "ARP NO.": j.arpNo || "", 
          "DATE OF CONVEYANCE/TRANSFER": j.date || "",
          "OWNERSHIP TRANSFER FROM": (j as any).cancelledOwner || "", 
          "OWNERSHIP TRANSFER TO": j.acctName || "", 
          "ADDRESS OF NEW OWNER": (j as any).rollAddress || "", 
          "LOCATION OF PROPERTY": j.location || "", 
          "MODE OF CONVEYANCE": getModeOfConveyance(j.update, j.acctName), 
          "AMOUNT OF CONSIDERATION": j.sellingPrice || "", 
          "PROPERTY CONVEYED (L)": (kind === 'L' || kind === 'LAND') ? 'x' : "", 
          "PROPERTY CONVEYED (B)": (kind === 'B' || kind === 'BUILDING') ? 'x' : "", 
          "PROPERTY CONVEYED (M)": (kind === 'M' || kind === 'MACHINERY') ? 'x' : "", 
          "AREA (LAND/BLDG.)": areaToUse, 
          "LOT NO.": (j as any).rollLotNo || "", 
          "TITLE NO. (PREVIOUS)": (j as any).cancelledTctNo || "", 
          "TITLE NO. (NEW)": (j as any).rollTctNo || "", 
          "NOTARIAL DATE": j.notarialDate || "", 
          "DOCUMENT FILE NO.": j.docFileNo || "",
          "NOTARY / AGENT": (j as any).notary || ""
        };
      });

      const wb = XLSX.utils.book_new(); 
      const headers = ["ARP NO.", "DATE OF CONVEYANCE/TRANSFER", "OWNERSHIP TRANSFER FROM", "OWNERSHIP TRANSFER TO", "ADDRESS OF NEW OWNER", "LOCATION OF PROPERTY", "MODE OF CONVEYANCE", "AMOUNT OF CONSIDERATION", "PROPERTY CONVEYED (L)", "PROPERTY CONVEYED (B)", "PROPERTY CONVEYED (M)", "AREA (LAND/BLDG.)", "LOT NO.", "TITLE NO. (PREVIOUS)", "TITLE NO. (NEW)", "NOTARIAL DATE", "DOCUMENT FILE NO.", "NOTARY / AGENT"];
      const ws = XLSX.utils.aoa_to_sheet([
        ["ABSTRACT OF REGISTERED REAL PROPERTY TRANSACTION"], 
        ["PARAÑAQUE CITY - REAL PROPERTY DATA DIVISION"], 
        ["EXPORT DATE:", new Date().toLocaleString()], 
        [], 
        headers
      ]);
      
      XLSX.utils.sheet_add_json(ws, abstractData, { origin: -1, skipHeader: true }); 
      ws['!cols'] = headers.map(() => ({ wch: 22 })); 
      XLSX.utils.book_append_sheet(wb, ws, "AbstractReport"); 
      XLSX.writeFile(wb, `AbstractReport-${new Date().toISOString().split('T')[0]}.xlsx`);
      showSuccessToast(`Exported ${abstractData.length} Abstract entries successfully.`);
    } catch (error: any) { toast({ variant: "destructive", title: "Abstract Export Failed", description: error.message }); }
    finally { setIsExporting(false); }
  };

  const handlePermitExport = async (settings: PermitExportSettings) => {
    setIsExporting(true);
    try {
      await delay(1500);
      const start = settings.startDate ? startOfDay(new Date(settings.startDate)) : null;
      const end = settings.endDate ? endOfDay(new Date(settings.endDate)) : null;

      const baseData = joinedPermitData.filter(record => {
        let recordStatus: PermitMatchStatus = 'Unlinked';
        if (record.isUnderReview) recordStatus = 'Under Review';
        else if (record.isPotentialMatch) recordStatus = 'Potential Match';
        else if (record.isJoined) recordStatus = 'Matched';

        if (!settings.statuses.includes(recordStatus)) return false;

        if (start || end) {
          const recDate = parseRecordDate(record.dateIssued);
          if (!recDate) return false;
          if (start && recDate < start) return false;
          if (end && recDate > end) return false;
        }
        
        return true;
      });

      if (baseData.length === 0) { toast({ variant: "destructive", title: "Permit Export Failed", description: "No records match your selected export criteria." }); setIsExporting(false); return; }

      const exportRows = baseData.map(p => ({
        "Date Issued": p.dateIssued || "",
        "Proposed Date of Construction": "",
        "Expected Date of Completion": "",
        "Permit No.": p.buildingPermitNo || "",
        "Permittee Owner": p.barangayName || "",
        "ARP/TDN": (p as any).rollArp || "",
        "Address of Permittee": (p as any).rollAddress || "",
        "Location of Property": p.location || "",
        "Scope of Work": "",
        "Kind of Building": p.useOfOccupancy || "",
        "Structural Type": "",
        "No. of Story": "",
        "Total Floor Area": (p as any).rollArea || 0,
        "Estimated Building Cost": p.estimatedCost || 0,
        "Class": (p as any).rollUpdate || "",
        "Potential Match": (p as any).isPotentialMatch ? (p as any).rollOwner : "",
        "Review Status": (p as any).isUnderReview ? "UNDER REVIEW" : ""
      }));

      const wb = XLSX.utils.book_new();
      const headers = ["Date Issued", "Proposed Date of Construction", "Expected Date of Completion", "Permit No.", "Permittee Owner", "ARP/TDN", "Address of Permittee", "Location of Property", "Scope of Work", "Kind of Building", "Structural Type", "No. of Story", "Total Floor Area", "Estimated Building Cost", "Class", "Potential Match", "Review Status"];
      const ws = XLSX.utils.aoa_to_sheet([
        ["ABSTRACT OF BUILDING PERMITS"],
        ["PARAÑAQUE CITY - REAL PROPERTY DATA DIVISION"],
        ["EXPORT DATE:", new Date().toLocaleString()],
        [],
        headers
      ]);
      XLSX.utils.sheet_add_json(ws, exportRows, { origin: -1, skipHeader: true });
      ws['!cols'] = headers.map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, ws, "BuildingPermits");
      XLSX.writeFile(wb, `BuildingPermitAbstract-${new Date().toISOString().split('T')[0]}.xlsx`);
      showSuccessToast(`Exported ${exportRows.length} Permit entries successfully.`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Permit Export Failed", description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const canAbstractExport = (journalData.length > 0 && rawData.length > 0) || workflowMode === 'abstract';
  const canPermitExport = (permitData.length > 0 && rawData.length > 0) || workflowMode === 'building-permit';

  return (
    <div className="h-screen bg-background flex flex-col font-body overflow-hidden" suppressHydrationWarning>
      <input type="file" id="raw-file-input" ref={rawFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'raw')} />
      <input type="file" id="exempt-file-input" ref={exemptFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'exempt')} />
      <input type="file" id="journal-file-input" ref={journalFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'journal')} />
      <input type="file" id="sales-file-input" ref={salesFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'sales')} />
      <input type="file" id="cancelled-file-input" ref={cancelledFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'cancelled')} />
      <input type="file" id="permit-file-input" ref={permitFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'permits')} />

      <header className="bg-card/80 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg shrink-0 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-[5px] cursor-pointer hover:opacity-80 transition-all active:scale-95 group relative" onClick={() => setIsAboutOpen(true)}>
                <div className="relative w-[86px] flex items-center h-full"><div className="absolute left-0 -translate-y-1/2 top-1/2"><Image src="/LOGO.png" alt="DataLink Logo" width={86} height={86} className="object-contain" /></div></div>
                <div className="flex items-center" style={{ marginLeft: '5px' }}><h1 className="text-[32px] font-black tracking-tighter leading-none"><span className="text-foreground">DataLink</span><span className="text-primary ml-1.5">Parañaque</span></h1></div>
              </div>
            </TooltipTrigger>
            <TooltipContent>About DataLink Parañaque</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex items-center gap-1.5">
          {workflowMode !== 'idle' && <Button variant="ghost" onClick={() => clearWorkspace()} className="mr-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary gap-2"><ChevronLeft className="w-3.5 h-3.5" /> Switch Engine</Button>}
          {showDetailedResults && <div className="flex items-center gap-2 mr-3 px-4 border-r border-white/10"><TooltipProvider><Tooltip><TooltipTrigger asChild><div className="flex items-center gap-3"><Label htmlFor="summary-toggle" className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground cursor-pointer hover:text-primary transition-colors">Show Summary</Label><Switch id="summary-toggle" checked={showSummary} onCheckedChange={setShowSummary} className="data-[state=checked]:bg-primary scale-90"/></div></TooltipTrigger><TooltipContent>Toggle Dashboard KPI Overview</TooltipContent></Tooltip></TooltipProvider></div>}
          {deferredPrompt && <Button variant="ghost" size="icon" onClick={handleInstallClick} className="hover:bg-muted"><Download className="w-5 h-5" /></Button>}
          <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="hover:bg-muted">{isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</Button>
          <ModeToggle />
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className={cn("transition-all hover:bg-muted", isSettingsOpen && "bg-primary text-white hover:bg-emerald-700")}><Settings className="w-5 h-5" /></Button></TooltipTrigger><TooltipContent>Shortcut: Ctrl + Alt + S</TooltipContent></Tooltip></TooltipProvider>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 flex flex-col p-6 overflow-hidden gap-4 min-h-0">
            <Tabs value={viewMode} onValueChange={(val: any) => { setViewMode(val); setStatusFilter('all'); }} className="flex-1 flex flex-col min-h-0">
              {workflowMode === 'idle' && viewMode !== 'audit' ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full py-12 scrollbar-vertical-custom overflow-y-auto">
                   <div className="text-center space-y-3 mb-16 shrink-0"><h2 className="text-6xl font-black uppercase tracking-tight text-foreground">Select Engine Workflow</h2><p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Choose the processing logic tailored to your source data format.</p></div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto px-6 items-stretch">
                      <Card className="p-10 border-white/10 bg-card hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group shadow-2xl flex flex-col items-center text-center h-full" onClick={() => setWorkflowMode('standard')}><div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner"><Zap className="w-10 h-10 text-primary" /></div><h3 className="text-2xl font-black uppercase tracking-tight mb-4">Standard Processor</h3><p className="text-sm font-bold text-muted-foreground leading-relaxed mb-8">Best for general land record spreadsheets. Uses flexible header aliases.</p><Button className="w-full h-14 bg-primary hover:bg-emerald-700 font-black uppercase text-xs tracking-widest mt-auto">Launch Standard</Button></Card>
                      <Card className="p-10 border-white/10 bg-card hover:bg-blue-600/5 hover:border-blue-500/50 transition-all cursor-pointer group shadow-2xl flex flex-col items-center text-center h-full" onClick={() => { setWorkflowMode('abstract'); setAbstractStep('roll'); }}><div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner"><ArrowRightLeft className="w-10 h-10 text-blue-600" /></div><h3 className="text-2xl font-black uppercase tracking-tight mb-4">Abstract of Transactions</h3><p className="text-sm font-bold text-muted-foreground leading-relaxed mb-8">Specialized mode for joining Journals with Assessment Rolls for transfer reports.</p><Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest mt-auto">Launch Abstract</Button></Card>
                      <Card className="p-10 border-white/10 bg-card hover:bg-orange-600/5 hover:border-orange-500/50 transition-all cursor-pointer group shadow-2xl flex flex-col items-center text-center h-full" onClick={() => { setWorkflowMode('building-permit'); setPermitStep('roll'); }}><div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner"><Construction className="w-10 h-10 text-orange-600" /></div><h3 className="text-2xl font-black uppercase tracking-tight mb-4">Abstract of Building Permit</h3><p className="text-sm font-bold text-muted-foreground leading-relaxed mb-8">Specialized mode for processing building permit logs and assessments.</p><Button className="w-full h-14 bg-orange-600 hover:bg-orange-700 font-black uppercase text-xs tracking-widest mt-auto">Launch Permit Engine</Button></Card>
                   </div>
                </div>
              ) : (!showDetailedResults && viewMode !== 'audit') ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full py-12">
                   <div className="text-center space-y-3 mb-10 shrink-0">
                      <h2 className="text-5xl font-black uppercase tracking-tight text-foreground">
                        {workflowMode === 'abstract' ? (abstractStep === 'roll' ? 'Step 1: Import Assessment Roll' : 'Step 2: Import Journal Logs') : 
                         workflowMode === 'building-permit' ? (permitStep === 'roll' ? 'Step 1: Import Assessment Roll' : 'Step 2: Import Building Permit Log') :
                         `Import ${workflowMode === 'standard' ? 'Records' : 'Assessment Roll'}`}
                      </h2>
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
                        {workflowMode === 'abstract' ? (abstractStep === 'roll' ? 'Start by uploading your current Assessment Roll reference.' : 'Now, upload the corresponding Journal transactions for the join.') : 
                         workflowMode === 'building-permit' ? (permitStep === 'roll' ? 'Upload the official Assessment Roll as a relational reference.' : 'Upload your Building Permit log to link with the Assessment Roll.') :
                         `Upload your records to begin the ${workflowMode === 'standard' ? 'cleanup' : 'positional parsing'} process.`}
                      </p>
                   </div>
                   <div className="grid grid-cols-1 gap-8 w-full max-w-4xl mx-auto px-6">
                      <ImportZone 
                        onDataImported={handleDataImported} 
                        mode={
                          workflowMode === 'abstract' ? (abstractStep === 'roll' ? 'raw' : 'journal') : 
                          workflowMode === 'building-permit' ? (permitStep === 'roll' ? 'raw' : 'permits') :
                          'raw'
                        } 
                        workflowMode={
                          workflowMode === 'abstract' ? (abstractStep === 'roll' ? 'roll' : 'journal') : 
                          workflowMode === 'building-permit' ? (permitStep === 'roll' ? 'roll' : 'permits') :
                          workflowMode
                        } 
                      />
                   </div>
                </div>
              ) : (
                <div className={cn("flex-1 flex flex-col min-h-0 transition-all duration-700 ease-in-out", showDetailedResults ? "gap-4 h-full" : "items-center justify-center h-full", isClearing && "animate-out fade-out zoom-out-95 duration-500 fill-mode-forwards")}>
                  <div className={cn("transition-all duration-700 ease-in-out w-full overflow-hidden", showDetailedResults ? "shrink-0" : "flex-1 flex items-center justify-center", !showSummary && showDetailedResults ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[800px] opacity-100")}><div className={cn("transition-all duration-700 ease-in-out w-full", !showDetailedResults && "animate-in fade-in zoom-in-95 duration-1000")}><MetricOverview stats={stats} variant={showDetailedResults ? 'default' : 'hero'} taxViewMode={taxViewMode} onTaxViewModeChange={setTaxViewMode} workflowMode={workflowMode} /></div></div>
                  {!showDetailedResults && viewMode !== 'audit' ? (
                    <div className="shrink-0 flex flex-col items-center justify-center pb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300"><Button size="lg" onClick={() => setShowDetailedResults(true)} className="h-16 px-16 bg-primary hover:bg-emerald-700 text-white font-black uppercase tracking-[0.25em] text-xs shadow-2xl transition-all active:scale-95 group">Show Overall Results & Analysis<ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" /></Button></div>
                  ) : (
                    <Card className="flex-1 overflow-hidden flex flex-col min-h-0 shadow-xl border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="p-3 bg-muted/30 border-b flex flex-col xl:flex-row items-center justify-between gap-4 shrink-0">
                        <TabsList className="bg-background border"><TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-white h-9 text-xs font-bold px-4"><TableIcon className="w-3.5 h-3.5 mr-2" /> {workflowMode === 'abstract' ? 'Joined Preview' : workflowMode === 'building-permit' ? 'Permit Join Preview' : 'Results'}</TabsTrigger>{workflowMode !== 'abstract' && workflowMode !== 'building-permit' ? (<><TabsTrigger value="archive" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white h-9 text-xs font-bold px-4"><Archive className="w-3.5 h-3.5 mr-2" /> Archive</TabsTrigger><TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-9 text-xs font-bold px-4"><BarChart3 className="w-3.5 h-3.5 mr-2" /> Analytics</TabsTrigger><TabsTrigger value="audit" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-9 text-xs font-bold px-4"><ShieldCheck className="w-3.5 h-3.5 mr-2" /> Audit Log</TabsTrigger></>) : (<TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-9 text-xs font-bold px-4"><BarChart3 className="w-3.5 h-3.5 mr-2" /> Relational Analytics</TabsTrigger>)}</TabsList>
                        {viewMode !== 'analytics' && viewMode !== 'audit' && (
                          <div className="flex flex-1 items-center gap-2 w-full max-w-[1400px]">
                            <div className="flex items-center gap-2 flex-1 min-w-0"><Select value={searchField} onValueChange={setSearchField}><SelectTrigger className="w-[120px] h-9 text-xs font-bold uppercase shrink-0"><SelectValue placeholder="In" /></SelectTrigger><SelectContent>{workflowMode === 'abstract' ? (<><SelectItem value="all">All Fields</SelectItem><SelectItem value="arpNo">ARP No.</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="acctName">Transfer (To)</SelectItem><SelectItem value="rollAddress">Reg. Address</SelectItem><SelectItem value="location">Location</SelectItem><SelectItem value="pin">PIN</SelectItem><SelectItem value="rollTctNo">TCT No.</SelectItem></>) : workflowMode === 'building-permit' ? (<><SelectItem value="all">All Fields</SelectItem><SelectItem value="buildingPermitNo">Permit No.</SelectItem><SelectItem value="acctName">Owner</SelectItem><SelectItem value="location">Property Location</SelectItem><SelectItem value="dateIssued">Date Issued</SelectItem></>) : (<><SelectItem value="all">All Fields</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="arpNo">ARP No#</SelectItem><SelectItem value="pin">PIN</SelectItem><SelectItem value="acctName">Account</SelectItem><SelectItem value="address">Address</SelectItem><SelectItem value="update">Update</SelectItem><SelectItem value="taxability">Taxability</SelectItem><SelectItem value="kind">Kind</SelectItem><SelectItem value="au">AU</SelectItem></>)}</SelectContent></Select><div className="relative flex-1 min-w-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder={`Search property records...`} className="pl-9 text-sm h-9 w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>
                            {uniqueBarangays.length > 1 && (<Select value={barangayFilter} onValueChange={setBarangayFilter}><SelectTrigger className="w-[180px] h-9 text-xs font-bold uppercase shrink-0"><MapPin className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Barangay" /></SelectTrigger><SelectContent><SelectItem value="all">All Barangays</SelectItem>{uniqueBarangays.map(brgy => (<SelectItem key={brgy} value={brgy}>{brgy}</SelectItem>))}</SelectContent></Select>)}
                            {uniqueSourceFiles.length > 1 && (<Select value={sourceFileFilter} onValueChange={setSourceFileFilter}><SelectTrigger className="w-[150px] h-9 text-xs font-bold uppercase shrink-0"><Files className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="File Source" /></SelectTrigger><SelectContent><SelectItem value="all">All Files</SelectItem>{uniqueSourceFiles.map(file => (<SelectItem key={file} value={file}>{file}</SelectItem>))}</SelectContent></Select>)}
                            {workflowMode !== 'abstract' && workflowMode !== 'building-permit' && (<Select value={sortBy} onValueChange={(val: any) => { setSortBy(val); setStatusFilter('all'); }}><SelectTrigger className="w-[160px] h-9 text-xs font-bold uppercase shrink-0"><ArrowUpDown className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Sort By" /></SelectTrigger><SelectContent><SelectItem value="pin">Sort by PIN</SelectItem><SelectItem value="arpNo">Sort by ARP No#</SelectItem></SelectContent></Select>)}
                            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] h-9 text-xs font-bold uppercase shrink-0"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{(workflowMode === 'abstract' || workflowMode === 'building-permit') ? (<><SelectItem value="Linked">Linked Records</SelectItem><SelectItem value="No Match">Unlinked Records</SelectItem><SelectItem value="Under Review">Under Review</SelectItem></>) : (dynamicStatusOptions.sort().map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>)))}</SelectContent></Select>
                            <div className="flex gap-2 items-center shrink-0">
                              <ImportManager mode="raw" manifest={rawFileManifest} onAdd={() => rawFileInputRef.current?.click()} onDelete={(name) => deleteFile(name, 'raw')} />
                              <ImportManager mode="exempt" manifest={exemptFileManifest} onAdd={() => exemptFileInputRef.current?.click()} onDelete={(name) => deleteFile(name, 'exempt')} />
                              {workflowMode === 'abstract' && <ImportManager mode="journal" manifest={journalFileManifest} onAdd={() => journalFileInputRef.current?.click()} onDelete={(name) => deleteFile(name, 'journal')} />}
                              {workflowMode === 'abstract' && <ImportManager mode="sales" manifest={salesFileManifest} onAdd={() => salesFileInputRef.current?.click()} onDelete={(name) => deleteFile(name, 'sales')} />}
                              {workflowMode === 'abstract' && <ImportManager mode="cancelled" manifest={cancelledFileManifest} onAdd={() => cancelledFileInputRef.current?.click()} onDelete={(name) => deleteFile(name, 'cancelled')} />}
                              {workflowMode === 'building-permit' && <ImportManager mode="permits" manifest={permitFileManifest} onAdd={() => permitFileInputRef.current?.click()} onDelete={(name) => deleteFile(name, 'permits')} />}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden min-h-0">
                        <TabsContent value="results" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"><DataPreviewTable data={filteredDisplayData} isProcessed={processedData.length > 0} onRowClick={handleRowClick} workflowMode={workflowMode} /></TabsContent>
                        {workflowMode !== 'abstract' && workflowMode !== 'building-permit' && (<TabsContent value="archive" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"><DataPreviewTable data={filteredDisplayData} isProcessed={true} onRowClick={handleRowClick} showLabels /></TabsContent>)}
                        <TabsContent value="analytics" className="m-0 h-full p-6 overflow-y-auto scrollbar-vertical-custom bg-muted/5 data-[state=active]:flex data-[state=active]:flex-col"><AnalyticsView analyticsData={analyticsData} onExplain={setExplainType} onExpand={setExpandedChart} taxabilityFilter={taxabilityFilter} onTaxabilityFilterChange={setTaxabilityFilter} workflowMode={workflowMode === 'building-permit' ? 'standard' : workflowMode} /></TabsContent>
                        <TabsContent value="audit" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"><AuditLogTab reports={processingReports} onClearHistory={() => { setProcessingReports([]); toast({ title: "History Purged", description: "Audit logs cleared permanently." }); }} onDeleteReport={(id) => { setProcessingReports(prev => prev.filter(r => r.id !== id)); toast({ title: "Log Deleted", description: "Audit entry has been removed." }); }} /></TabsContent>
                      </div>
                    </Card>
                  )}

                  <div className="mb-4 flex items-center justify-between bg-card p-3 rounded-3xl shadow-2xl border border-white/10 shrink-0 transition-all duration-700 ease-in-out px-6">
                    <div className="flex items-center gap-4">
                      {workflowMode === 'standard' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" onClick={() => setIsExportSettingsOpen(true)} size="sm" className={cn("font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-muted transition-all", showDetailedResults ? "h-10 px-5 text-[10px]" : "h-14 px-8 text-[12px]")} disabled={isExporting}>
                                <FileDown className={cn(showDetailedResults ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2")} /> {isExporting ? "Generating..." : "Export Data"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Standard Report Export</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {workflowMode === 'abstract' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" onClick={() => setIsAbstractExportModalOpen(true)} size="sm" className={cn("font-black uppercase tracking-widest transition-all", showDetailedResults ? "h-10 px-5 text-[10px]" : "h-14 px-8 text-[12px]", canAbstractExport ? "border-blue-500/30 text-blue-600 hover:bg-blue-50" : "opacity-30 border-muted text-muted-foreground")} disabled={isExporting || !canAbstractExport}>
                                <ArrowRightLeft className={cn(showDetailedResults ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2")} /> Abstract Export
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{canAbstractExport ? "Generate Abstract of Transactions (Roll + Journal Join)" : "Requires both Assessment Roll and Journal data staged"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {workflowMode === 'building-permit' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" onClick={() => setIsPermitExportModalOpen(true)} size="sm" className={cn("font-black uppercase tracking-widest transition-all", showDetailedResults ? "h-10 px-5 text-[10px]" : "h-14 px-8 text-[12px]", canPermitExport ? "border-orange-500/30 text-orange-600 hover:bg-orange-50" : "opacity-30 border-muted text-muted-foreground")} disabled={isExporting || !canPermitExport}>
                                <HardHat className={cn(showDetailedResults ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2")} /> Permit Export
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{canPermitExport ? "Generate Abstract of Building Permits (Roll + Permit Join)" : "Requires both Assessment Roll and Permit Log staged"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => setIsClearConfirmOpen(true)} className="font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-red-600 hover:bg-muted transition-all flex items-center gap-2"><Trash2 className="w-4 h-4" /> Clear Session</Button></TooltipTrigger><TooltipContent>Reset Session Data</TooltipContent></Tooltip></TooltipProvider>
                    </div>
                    <div className="flex gap-4 items-center">
                      {workflowMode === 'standard' && viewMode !== 'analytics' && viewMode !== 'audit' && (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="lg" className={cn("bg-primary hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95", showDetailedResults ? "h-10 px-6 text-[10px]" : "h-14 px-10 text-[12px]")} disabled={isProcessing} onClick={() => setIsRunProcessorDialogOpen(true)}>{isProcessing ? "Processing Batch..." : "Run Batch Processor"}</Button></TooltipTrigger><TooltipContent>Run engine analysis sequence</TooltipContent></Tooltip></TooltipProvider>)}
                    </div>
                  </div>
                </div>
              )}
            </Tabs>
          </main>
      </div>

      {/* Diagnostic Explanation Dialog */}
      <Dialog open={!!explainType} onOpenChange={(open) => !open && setExplainType(null)}>
        <DialogContent className="sm:max-w-xl bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> {isBuildingPermit ? (explainType === 'usage' ? 'Occupancy Trends' : explainType === 'barangay' ? 'Development Hotspots' : explainType === 'update' ? 'Match Integrity' : 'Investment Density') : (isAbstract ? (explainType === 'usage' ? 'Asset Class Profile' : explainType === 'barangay' ? 'Geographic Hotspots' : explainType === 'update' ? 'Join Efficiency Analysis' : 'Fiscal Profile Distribution') : (explainType === 'usage' ? 'Property Usage Analysis' : explainType === 'barangay' ? 'Geographic Distribution' : explainType === 'update' ? 'Transaction Code Insights' : 'Financial Concentration Analysis'))}</DialogTitle><DialogDescription className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Automated diagnostic report based on current session data.</DialogDescription></DialogHeader>
          <div className="py-6 space-y-6"><div className="p-5 rounded-2xl bg-muted/20 border border-white/5 space-y-4"><p className="text-sm font-bold leading-relaxed text-foreground/80">{isBuildingPermit ? (explainType === 'usage' ? "This chart categorizes building permit logs by their 'Use of Occupancy'. Predominance of Residential (Resi) versus Commercial (Comm) occupancy helps identify the prevailing type of urban growth in the batch." : explainType === 'barangay' ? "Highlights the specific Barangays listed in the permit logs. High volume in certain sectors indicates active construction zones requiring increased field inspection focus." : explainType === 'update' ? "Analyzes the confidence of relational links. 'MATCHED' indicates high-certainty ARP/PIN parity, while 'POTENTIAL' and 'UNDER REVIEW' signal entries that require human verification due to log repetition or name variations." : "Visualizes the total 'Estimated Construction Cost' grouped by Occupancy. This helps in identifying high-value investments and tracking the economic impact of new developments.") : (isAbstract ? (explainType === 'usage' ? "Shows the distribution of transferred assets. 'L' (Land) vs 'B' (Building) markers help determine the primary nature of real estate movements within this Abstract period. Ensure that classification markers align with the Assessment Roll reference." : explainType === 'barangay' ? "Identifies locations with the highest transaction frequency from the Journal logs. Higher volume in specific areas indicates active development zones or high-demand sectors in Parañaque." : explainType === 'update' ? "Analyzes the matching efficiency between the Journal and the Assessment Roll. A high 'NO MATCH' rate suggests potential data discrepancies, missing parcel records in the reference roll, or non-standard PIN formats in the source Journal." : "Visualizes the ratio of taxable revenue-generating transactions versus exempted transfers (government, religious, or charitable). This helps in projecting future fiscal impact resulting from current transfers.") : (explainType === 'usage' ? "The system identifies that RESI (Residential) and COMM (Commercial) types dominate the current batch. This suggests a high concentration of taxable assets in developed zones. Ensure that assessment levels (20% for RESI, 50% for COMM) are correctly applied in the Configuration Panel." : explainType === 'barangay' ? "The geographic distribution highlights key hotspots across Parañaque. Higher record counts in specific barangays often correlate with recent subdivision updates or large-scale land developments. Cross-reference this with the 'Update Code' chart to identify if these are primarily NEW or TR (Transfer) transactions." : explainType === 'update' ? "The distribution of update codes (e.g., NEW, TR, RC) provides a longitudinal view of property movements. A high percentage of TR codes indicates an active real estate market, while RC (Re-assessment) suggests a batch update cycle is in progress." : "This pie chart visualizes the total fiscal weight of each property classification. If a small percentage of 'INDU' (Industrial) properties accounts for a large portion of the pie, it indicates high-value individual assets. This helps in prioritizing audit resources for high-impact properties."))}</p></div><div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10"><Info className="w-5 h-5 text-primary shrink-0 mt-0.5" /><p className="text-[11px] font-bold text-muted-foreground leading-relaxed uppercase">This insight is generated using the Parañaque Smart Logic engine. Manual verification of these trends is recommended during official reporting.</p></div></div>
          <DialogFooter><Button onClick={() => setExplainType(null)} className="bg-primary hover:bg-emerald-700 font-black uppercase text-xs tracking-widest px-8">Acknowledge</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expanded Chart Dialog */}
      <Dialog open={!!expandedChart} onOpenChange={(open) => !open && setExpandedChart(null)}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 shadow-2xl p-0">
          <div className="p-8 border-b shrink-0 flex items-center justify-between">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">{isBuildingPermit ? (expandedChart === 'usage' ? <><HardHat className="w-6 h-6 text-primary" /> Occupancy Profile</> : expandedChart === 'barangay' ? <><MapPin className="w-6 h-6 text-primary" /> Permitting Locations</> : expandedChart === 'update' ? <><ShieldCheck className="w-6 h-6 text-primary" /> Join Status Audit</> : <><TrendingUp className="w-6 h-6 text-primary" /> Cost Distribution</>) : (isAbstract ? (expandedChart === 'usage' ? <><Plus className="w-6 h-6 text-primary" /> Asset Classification</> : expandedChart === 'barangay' ? <><MapPin className="w-6 h-6 text-primary" /> Transaction Hotspots</> : expandedChart === 'update' ? <><Link2 className="w-6 h-6 text-primary" /> Join Efficiency</> : <><Database className="w-6 h-6 text-primary" /> Fiscal Profiles</>) : (expandedChart === 'usage' ? <><CheckCircle2 className="w-6 h-6 text-primary" /> Property Usage Distribution</> : expandedChart === 'barangay' ? <><MapPin className="w-6 h-6 text-primary" /> Barangay Distribution</> : expandedChart === 'update' ? <><RefreshCw className="w-6 h-6 text-primary" /> Update Code distribution</> : <><Database className="w-6 h-6 text-primary" /> Market Value Breakdown</>))}</DialogTitle>
              <DialogDescription className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Full-scale visualization for detailed analysis</DialogDescription>
            </DialogHeader>
            <Button variant="ghost" size="icon" onClick={() => setExpandedChart(null)} className="rounded-full"><X className="w-5 h-5" /></Button>
          </div>
          <div className="flex-1 p-10 flex flex-col items-center justify-center overflow-hidden"><ChartContainer config={expandedChart === 'market' ? { value: { label: "Value", color: "hsl(var(--primary))" } } : { value: { label: "Count", color: "hsl(var(--primary))" } }} className="w-full h-full max-h-[500px]">{expandedChart === 'market' ? (<PieChart><Pie data={analyticsData.marketChart} cx="50%" cy="50%" innerRadius={100} outerRadius={160} paddingAngle={8} dataKey="value" stroke="none" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>{analyticsData.marketChart.map((entry, index) => <Cell key={`cell-exp-m-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /><Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '40px', fontSize: '12px', fontWeight: 'bold' }}/></PieChart>) : (<BarChart data={expandedChart === 'usage' ? analyticsData.auChart : expandedChart === 'barangay' ? analyticsData.barangayChart : analyticsData.updateChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}><CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} /><YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{(expandedChart === 'usage' ? analyticsData.auChart : expandedChart === 'barangay' ? analyticsData.barangayChart : analyticsData.updateChart).map((entry, index) => (<Cell key={`cell-exp-${index}`} fill={COLORS[(index + (expandedChart === 'barangay' ? 4 : expandedChart === 'update' ? 2 : 0)) % COLORS.length]} />))}</Bar></BarChart>)}</ChartContainer></div>
          <div className="p-6 border-t bg-muted/20 flex justify-center shrink-0"><Button onClick={() => setExpandedChart(null)} className="font-black uppercase text-xs tracking-widest bg-slate-800 hover:bg-slate-900 h-12 px-12">Close Visualization</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRunProcessorDialogOpen} onOpenChange={isRunProcessorDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl"><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Run Batch Processor</DialogTitle><DialogDescription className="text-sm font-bold text-muted-foreground leading-relaxed">The engine will now perform a multi-pass validation sequence including system cleanup, deduplication, and financial calibration.</DialogDescription></DialogHeader><div className="py-4"><CalibrationSidebar options={options} setOptions={setOptions} rules={rules} setRules={setRules} /></div><DialogFooter className="gap-3"><Button variant="ghost" onClick={() => setIsRunProcessorDialogOpen(false)} className="font-black uppercase text-xs h-10 px-6">Cancel</Button><Button onClick={() => { setIsRunProcessorDialogOpen(false); runProcess(); }} className="bg-primary hover:bg-emerald-700 text-white font-black uppercase text-xs h-10 px-8 shadow-lg shadow-primary/20">Execute Engine</Button></DialogFooter></DialogContent>
      </Dialog>

      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="sm:max-w-[1200px] w-[95vw] p-0 border-none bg-card shadow-2xl"><SheetHeader className="sr-only"><SheetTitle>Configuration Panel</SheetTitle><SheetHeader><SheetTitle>Configuration Panel</SheetTitle><SheetDescription>Update global settings and calibration rules.</SheetDescription></SheetHeader></SheetHeader><SettingsOverlay onClose={() => setIsSettingsOpen(false)} /></SheetContent>
      </Sheet>

      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}><AlertDialogContent className="bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600" /> Confirm Session Reset</AlertDialogTitle><AlertDialogDescription className="text-sm font-bold text-muted-foreground leading-relaxed">Are you sure you want to clear your current workspace? All property records and processing results in this session will be permanently removed.<br /><br /><span className="text-red-600/80 font-black uppercase tracking-tighter">Note: Your administrative audit logs will not be affected.</span></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3"><AlertDialogCancel className="font-black uppercase text-xs h-10 px-6 hover:bg-muted hover:text-foreground">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setIsClearConfirmOpen(false); clearWorkspace(); }} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs h-10 px-8 shadow-lg shadow-red-500/10 transition-all">Wipe Session Data</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      {isDirectImporting && (
        <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-12 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105">
            <div className="relative flex items-center justify-center mb-8"><Loader2 className={cn("w-16 h-16 animate-spin", directImportProgress.mode === 'raw' ? "text-primary" : directImportProgress.mode === 'journal' ? "text-amber-600" : directImportProgress.mode === 'sales' ? "text-emerald-600" : directImportProgress.mode === 'cancelled' ? "text-red-600" : directImportProgress.mode === 'permits' ? "text-orange-600" : "text-blue-600")} /><div className="absolute inset-0 flex items-center justify-center">{directImportProgress.mode === 'raw' ? <BookUser className="w-6 h-6 text-primary" /> : directImportProgress.mode === 'journal' ? <FileText className="w-6 h-6 text-amber-600" /> : directImportProgress.mode === 'sales' ? <Tag className="w-6 h-6 text-emerald-600" /> : directImportProgress.mode === 'cancelled' ? <FileX className="w-6 h-6 text-red-600" /> : directImportProgress.mode === 'permits' ? <HardHat className="w-6 h-6 text-orange-600" /> : <ShieldOff className="w-6 h-6 text-blue-600" />}</div></div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2 text-center">{directImportProgress.mode === 'raw' ? "Analyzing Records" : directImportProgress.mode === 'journal' ? "Parsing Journal Logs" : directImportProgress.mode === 'sales' ? "Ingesting Sales Data" : directImportProgress.mode === 'cancelled' ? "Indexing Cancelled Data" : directImportProgress.mode === 'permits' ? "Ingesting Permit Log" : "Indexing PIN Reference"}</h3>
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-8 animate-pulse text-center">INITIALIZING ENGINE...</p>
            <div className="w-full pt-6 border-t flex flex-col items-center gap-2"><span className={cn("text-[10px] font-black uppercase tracking-widest", directImportProgress.mode === 'raw' ? "text-primary" : directImportProgress.mode === 'journal' ? "text-amber-600" : directImportProgress.mode === 'sales' ? "text-emerald-600" : directImportProgress.mode === 'cancelled' ? "text-red-600" : directImportProgress.mode === 'permits' ? "text-orange-600" : "text-blue-600")}>Batch Progress: {directImportProgress.current + 1} / {directImportProgress.total}</span></div>
            <p className="mt-10 text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">System working • Do not refresh session</p>
          </Card>
        </div>
      )}

      {isProcessing && processingStep !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-10 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105"><div className="relative flex items-center justify-center mb-8"><Loader2 className="w-16 h-16 text-primary animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><Cpu className="w-6 h-6 text-primary" /></div></div><h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-8">Engine Initializing...</h3><div className="w-full space-y-4">{[ { step: 'cleanup', label: '1. System Cleanup', icon: RefreshCw }, { step: 'dedupe', label: '2. Deduplication', icon: Archive }, { step: 'calibrate', label: '3. Calibration', icon: Cpu } ].map((item) => (<div key={item.step} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-white/5"><div className="flex items-center gap-3"><div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all", processingStep === item.step ? "bg-primary/20 text-primary animate-pulse" : (processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') ? "bg-primary text-white" : "bg-muted text-muted-foreground"))}>{processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') ? <TableIcon className="w-3.5 h-3.5" /> : <item.icon className="w-3.5 h-3.5" />}</div><span className={cn("text-xs font-black uppercase tracking-widest", processingStep === item.step ? "text-primary" : "text-muted-foreground")}>{item.label}</span></div>{processingStep === item.step && <span className="text-[10px] font-bold text-primary animate-pulse uppercase">⏳ Running</span>}{processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') && <span className="text-[10px] font-bold text-primary uppercase">✔ Done</span>}</div>))}</div><p className="mt-8 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Validating Parañaque Land Records</p></Card>
        </div>
      )}

      <ExportSettingsModal initialSortBy={sortBy} open={isExportSettingsOpen} onOpenChange={setIsExportSettingsOpen} data={previewData} isProcessed={processedData.length > 0} exportColumns={exportColumns} onColumnToggle={(col) => setExportColumns(prev => ({ ...prev, [col]: !prev[col] }))} onBulkColumnChange={(cols) => setExportColumns(cols)} onExport={handleFinalExport} />
      <AbstractExportModal open={isAbstractExportModalOpen} onOpenChange={setIsAbstractExportModalOpen} data={joinedAbstractData} onExport={handleAbstractExport} />
      <PermitExportModal open={isPermitExportModalOpen} onOpenChange={setIsPermitExportModalOpen} data={joinedPermitData} onExport={handlePermitExport} />
      <AboutModal open={isAboutOpen} onOpenChange={setIsAboutOpen} />
      <ProcessingReportModal report={latestReport} open={isReportOpen} onOpenChange={setIsReportOpen} />
      <RecordDetailModal record={selectedRecord} comparisonRecord={comparisonRecord} open={!!selectedRecord} onOpenChange={(isOpen) => { if (!isOpen) { setSelectedRecord(null); setComparisonRecord(null); } }} onSave={handleSaveRecord} onArchive={handleArchiveRecord} onUnarchive={handleUnarchiveRecord} />
    </div>
  );
}
