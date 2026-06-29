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
  Check,
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
  MoreVertical,
  ChevronDown,
  X,
  FileText,
  LayoutDashboard,
  ArrowUpDown,
  Zap,
  ChevronLeft,
  ArrowRightLeft,
  Info,
  Link2
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
import { LandRecord, CalibrationRule, processRecords, TaxRateMap, ProcessingReport, RecordStatusType, normalizePin } from '@/lib/processor';
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
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportSettingsModal, ExportFinalSettings } from '@/components/dashboard/export-settings-modal';
import { AbstractExportModal, AbstractExportSettings } from '@/components/dashboard/abstract-export-modal';
import { useNotification } from '@/contexts/NotificationContext';
import { SettingsOverlay } from '@/components/dashboard/settings-overlay';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { parseFile } from '@/lib/importer';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { parse, isValid, startOfDay, endOfDay } from 'date-fns';

// Sub-components
import { MetricOverview } from '@/components/dashboard/metric-overview';
import { AnalyticsView } from '@/components/dashboard/analytics-view';

const LOCAL_STORAGE_KEY = 'paranaque_datalink_v31';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const analyticsChartConfig = {
  value: {
    label: "Count",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const marketChartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

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

const ImportManager = ({ mode, manifest, onAdd, onDelete }: { mode: 'raw' | 'exempt' | 'journal', manifest: any[], onAdd: () => void, onDelete: (name: string) => void }) => (
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
                "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              )}
            >
              {mode === 'raw' ? <BookUser className="w-4 h-4" /> : 
               mode === 'exempt' ? <ShieldOff className="w-4 h-4" /> :
               <FileText className="w-4 h-4" />}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-black uppercase text-[10px] tracking-widest">
          {mode === 'raw' ? "Manage Raw Records" : mode === 'exempt' ? "Manage Exempt Reference" : "Manage Journal Files"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <PopoverContent className="w-80 p-0 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl overflow-hidden" align="end">
      <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'raw' ? <BookUser className="w-4 h-4 text-primary" /> : 
           mode === 'exempt' ? <ShieldOff className="w-4 h-4 text-blue-600" /> :
           <FileText className="w-4 h-4 text-amber-600" />}
          <span className="text-[10px] font-black uppercase tracking-widest">{mode === 'raw' ? "Raw File Manager" : mode === 'exempt' ? "Exempt File Manager" : "Journal File Manager"}</span>
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
                    <p className="text-[11px] font-black uppercase truncate pr-2">{file.name}</p>
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
  const [exemptPins, setExemptPins] = useState<Set<string>>(new Set());
  const [rules, setRules] = useState<CalibrationRule[]>([]);
  const [locationSettings, setLocationSettings] = useState<BarangayConfig[]>(initialLocationSettings);
  const [taxRates, setTaxRates] = useState<TaxRateMap>(defaultTaxRates);
  const [processingReports, setProcessingReports] = useState<ProcessingReport[]>([]);
  
  // --- 1.2 WORKFLOW STATE ---
  const [workflowMode, setWorkflowMode] = useState<'idle' | 'standard' | 'abstract'>('idle');
  const [abstractStep, setAbstractStep] = useState<'roll' | 'journal' | 'ready'>('roll');

  // --- 1.1 MANIFEST STATE ---
  const [rawFileManifest, setRawFileManifest] = useState<{ name: string, count: number }[]>([]);
  const [exemptFileManifest, setExemptFileManifest] = useState<{ name: string, count: number, pins: Set<string> }[]>([]);
  const [journalFileManifest, setJournalFileManifest] = useState<{ name: string, count: number }[]>([]);

  // --- 2. UI & MODAL STATE ---
  const [isClient, setIsClient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isDirectImporting, setIsDirectImporting] = useState(false);
  const [directImportProgress, setDirectImportProgress] = useState({ current: 0, total: 0, mode: 'raw' as 'raw' | 'exempt' | 'journal' });
  const [viewMode, setViewMode] = useState<'results' | 'archive' | 'analytics' | 'audit'>('results');
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isAbstractExportModalOpen, setIsAbstractExportModalOpen] = useState(false);
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
    "ARP NO#": true, "DATE": true, "PREVIOUS": true, "NEW ARP NO#": true, "UPDATE": true, "TAXABILITY": true,
    "ACCTNAME": true, "ADDRESS": true, "LOCATION": true, "KIND": true,
    "AU": true, "LAND AREA": true, "UNIT VALUE (2028)": true, "MARKET VALUE (2028)": true,
    "ASSESSED VALUE (2028)": true, "YEARLY TAX (2028 CAP)": true,
    "UNIT VALUE": true, "MARKET VALUE": true,
    "ASSESSED VALUE": true, "YEARLY TAX": true
  };
  const [exportColumns, setExportColumns] = useState<Record<string, boolean>>(defaultExportColumns);

  // Helper to parse date strings for multi-level sorting
  const parseRecordDate = (dateStr: string) => {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();
    const formats = ['MM/dd/yyyy', 'M/d/yyyy', 'yyyy-MM-dd', 'MM-dd-yyyy'];
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

    const normalizedExemptPins = new Set(Array.from(exemptPins).map(p => normalizePin(p)));

    // Mapping - Ensure full original date is preserved for logic
    const joined = journals.map(j => {
      const pinNorm = normalizePin(j.pin);
      const rollMatch = rollLookup.get(pinNorm) || null;
      
      const rollOwnerRaw = (rollMatch?.acctName || "").trim().toUpperCase();
      const journalOwnerRaw = (j.acctName || "").trim().toUpperCase();
      
      const ownersMatch = rollOwnerRaw !== "" && journalOwnerRaw !== "" && rollOwnerRaw === journalOwnerRaw;
      const isExempt = normalizedExemptPins.has(pinNorm);

      return {
        ...j,
        taxability: isExempt ? 'E' : 'T',
        rollOwner: ownersMatch ? "" : (rollMatch?.acctName || '---'),
        rollAddress: rollMatch?.address || '---',
        rollLotNo: rollMatch?.lotNo || '---',
        rollTctNo: rollMatch?.tctNo || '---',
        isJoined: !!rollMatch
      };
    });

    // Multi-level sort: Date Ascending, then ARP Ascending
    return [...joined].sort((a, b) => {
       const dateA = parseRecordDate(a.date) || new Date(0);
       const dateB = parseRecordDate(b.date) || new Date(0);
       if (dateA.getTime() !== dateB.getTime()) {
         return dateA.getTime() - dateB.getTime();
       }
       return (a.arpNo || "").localeCompare(b.arpNo || "", undefined, { numeric: true });
    });
  }, [workflowMode, journalData, rawData, exemptPins]);

  const stats = useMemo(() => {
    if (workflowMode === 'abstract') {
      const journals = journalData.length > 0 ? journalData : rawData.filter(r => r.sourceFile?.toLowerCase().includes('journal'));
      const rolls = rawData.filter(r => !r.sourceFile?.toLowerCase().includes('journal'));
      const joined = joinedAbstractData;
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

    const active = previewData.filter(r => r.statusLabel !== 'CLEANUP' && r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && !r.isManualArchive);
    const valid = active.filter(r => r.statusLabel === 'VALID');
    const filteredValid = valid.filter(r => r.taxability === taxViewMode);
    const errors = active.filter(r => r.statusLabel !== 'VALID').length;
    const isProcessed = processedData.length > 0;
    const mvField = isProcessed ? 'marketValue2029' : 'marketValue2028';
    const avField = isProcessed ? 'assessedValue2029' : 'assessedValue2028';
    const ytField = isProcessed ? 'yearlyTax2029' : 'yearlyTax2028';

    return { 
      totalRawRows: rawData.length + journalData.length,
      systemCleanup: previewData.filter(r => r.statusLabel === 'CLEANUP' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'DUPLICATE' || r.isManualArchive).length,
      totalImported: rawData.length + journalData.length, 
      duplicatesRemoved: previewData.filter(r => r.statusLabel === 'DUPLICATE').length, 
      finalCount: active.length,
      totalMarketValue: filteredValid.reduce((sum, r) => sum + (r[mvField as keyof LandRecord] as number || 0), 0),
      totalAssessedValue: filteredValid.reduce((sum, r) => sum + (r[avField as keyof LandRecord] as number || 0), 0),
      totalYearlyTax: filteredValid.reduce((sum, r) => sum + (r[ytField as keyof LandRecord] as number || 0), 0),
      totalErrors: errors
    };
  }, [previewData, rawData.length, journalData.length, taxViewMode, processedData.length, workflowMode, joinedAbstractData]);

  const latestReport = processingReports[0] || null;

  // --- 8. DERIVED STATE ---
  const uniqueSourceFiles = useMemo(() => {
    const files = new Set<string>();
    previewData.forEach(r => { if (r.sourceFile) files.add(r.sourceFile); });
    processedData.forEach(r => { if (r.sourceFile) files.add(r.sourceFile); });
    return Array.from(files);
  }, [previewData, processedData]);

  const uniqueBarangays = useMemo(() => {
    const brgySet = new Set<string>();
    previewData.forEach(r => { 
      brgySet.add(r.barangayName || 'UNMAPPED'); 
    });
    return Array.from(brgySet).sort();
  }, [previewData]);

  const dynamicStatusOptions = useMemo(() => {
    if (workflowMode === 'abstract' && viewMode === 'results') {
      return ['Linked', 'No Match'];
    }

    const activeData = viewMode === 'archive' 
      ? previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'CLEANUP' || r.isManualArchive)
      : (processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP' && !r.isManualArchive));
    
    const available = new Set<string>();
    activeData.forEach(r => {
        if (r.statusLabel) available.add(r.statusLabel);
    });
    return Array.from(available);
  }, [previewData, processedData, viewMode, workflowMode]);

  const analyticsData = useMemo(() => {
    if (workflowMode === 'abstract') {
      const activeData = joinedAbstractData.filter(record => {
        if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
        if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;
        if (taxabilityFilter !== 'all' && record.taxability !== taxabilityFilter) return false;
        return true;
      });

      const kindDistribution: Record<string, number> = {};
      const taxabilityDistribution: Record<string, number> = {};
      const joinDistribution: Record<string, number> = {};
      const locationDistribution: Record<string, number> = {};

      activeData.forEach(r => {
        const kind = (r.kind || 'UNKNOWN').trim().toUpperCase();
        kindDistribution[kind] = (kindDistribution[kind] || 0) + 1;
        
        const tax = r.taxability === 'E' ? 'EXEMPT' : 'TAXABLE';
        taxabilityDistribution[tax] = (taxabilityDistribution[tax] || 0) + 1;
        
        const join = r.isJoined ? 'LINKED' : 'NO MATCH';
        joinDistribution[join] = (joinDistribution[join] || 0) + 1;
        
        const loc = (r.location || 'UNMAPPED').toUpperCase();
        locationDistribution[loc] = (locationDistribution[loc] || 0) + 1;
      });

      return {
        totalRecords: activeData.length,
        auChart: Object.entries(kindDistribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        marketChart: Object.entries(taxabilityDistribution).map(([name, value]) => ({ name, value })),
        updateChart: Object.entries(joinDistribution).map(([name, value]) => ({ name, value })),
        barangayChart: Object.entries(locationDistribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 15)
      };
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

    return { 
      totalRecords: filteredActiveData.length,
      auChart: Object.entries(auDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value),
      marketChart: Object.entries(marketValueSum).map(([name, value]) => ({ name, value })).filter(item => item.value > 0),
      updateChart: Object.entries(updateDistribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      barangayChart: Object.entries(barangayDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value)
    };
  }, [processedData, previewData, joinedAbstractData, workflowMode, sourceFileFilter, barangayFilter, taxabilityFilter]);

  const filteredDisplayData = useMemo(() => {
    if (workflowMode === 'abstract' && viewMode === 'results') {
      const query = searchQuery.toLowerCase();
      const filtered = joinedAbstractData.filter(record => {
        // Relational source file filter
        if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
        
        // Relational barangay filter
        if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;

        // Relational status filter (Linked vs No Match)
        if (statusFilter !== 'all') {
          if (statusFilter === 'Linked' && !record.isJoined) return false;
          if (statusFilter === 'No Match' && record.isJoined) return false;
        }

        // Relational search logic
        if (query) {
          if (searchField === 'all') {
            return (
              record.arpNo?.toLowerCase().includes(query) ||
              record.date?.toLowerCase().includes(query) ||
              record.acctName?.toLowerCase().includes(query) ||
              (record as any).rollAddress?.toLowerCase().includes(query) ||
              record.location?.toLowerCase().includes(query) ||
              record.pin?.toLowerCase().includes(query) ||
              (record as any).rollTctNo?.toLowerCase().includes(query)
            );
          } else {
            const value = (record as any)[searchField];
            return String(value || '').toLowerCase().includes(query);
          }
        }
        return true;
      });

      return filtered;
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
          if (validPeer) {
            finalWithComparisons.push({ ...validPeer, id: `comparison-${validPeer.id}-${record.id}`, isComparisonInjected: true });
          }
        }
        finalWithComparisons.push(record);
      });
      return finalWithComparisons;
    }
    return sorted;
  }, [previewData, processedData, joinedAbstractData, workflowMode, viewMode, searchQuery, searchField, statusFilter, sourceFileFilter, barangayFilter, sortBy]);

  // Initialization & Storage Load
  useEffect(() => {
    setIsClient(true);
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const handleAppInstalled = () => { setDeferredPrompt(null); toast({ title: "Installation Successful", description: "Data Link Parañaque is now available on your device." }); };
    const handleFullScreenChange = () => { setIsFullScreen(!!document.fullscreenElement); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.exportColumns) setExportColumns({ ...defaultExportColumns, ...parsed.exportColumns });
        if (parsed.locationSettings) setLocationSettings(parsed.locationSettings);
        if (parsed.options) setOptions({ ...options, ...parsed.options });
        if (parsed.taxRates) setTaxRates(parsed.taxRates);
        if (parsed.processingReports) setProcessingReports(parsed.processingReports);
        if (parsed.showSummary !== undefined) setShowSummary(parsed.showSummary);
      }
    } catch (error) { console.error("Failed to parse localStorage:", error); }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Adaptive Storage Persistence
  useEffect(() => {
    if (isClient) {
      const saveToStorage = (reports: ProcessingReport[]) => {
        try {
          const payload = JSON.stringify({ rules, exportColumns, locationSettings, options, taxRates, processingReports: reports, showSummary });
          localStorage.setItem(LOCAL_STORAGE_KEY, payload);
          return true;
        } catch (e) { return false; }
      };
      if (!saveToStorage(processingReports)) {
        const partiallySlimmed = processingReports.map((r, i) => i < 3 ? r : { ...r, records: undefined });
        if (!saveToStorage(partiallySlimmed)) {
          const mostlySlimmed = processingReports.map((r, i) => i === 0 ? r : { ...r, records: undefined });
          if (!saveToStorage(mostlySlimmed)) {
            const fullySlimmed = processingReports.map(r => ({ ...r, records: undefined }));
            if (!saveToStorage(fullySlimmed)) { saveToStorage(fullySlimmed.slice(0, 10)); }
          }
        }
      }
    }
  }, [rules, exportColumns, locationSettings, options, taxRates, processingReports, showSummary, isClient]);

  const clearWorkspace = async () => {
    setIsClearing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRawData([]);
    setProcessedData([]);
    setPreviewData([]);
    setJournalData([]);
    setExemptPins(new Set());
    setRawFileManifest([]);
    setExemptFileManifest([]);
    setJournalFileManifest([]);
    setSearchQuery("");
    setSearchField("all");
    setImportedFileName("");
    setSourceFileFilter("all");
    setBarangayFilter("all");
    setTaxabilityFilter("all");
    setShowDetailedResults(false);
    setWorkflowMode('idle');
    setAbstractStep('roll');
    setViewMode('results');
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

  const runProcessWithData = async (data: LandRecord[], rawCount: number, fileName: string, silent = false) => {
    if (!silent) { setIsProcessing(true); setProcessingStep('cleanup'); await delay(1200); setProcessingStep('dedupe'); await delay(1000); setProcessingStep('calibrate'); await delay(800); }
    startTransition(() => {
      const { processed, allWithDuplicateMarkers, report } = processRecords(data, rules, locationSettings, taxRates, options, fileName, exemptPins);
      setProcessedData(processed);
      setPreviewData(allWithDuplicateMarkers);
      setProcessingReports(prev => [report, ...prev]);
      if (!silent) {
          setProcessingStep('complete');
          setTimeout(() => {
            setIsProcessing(false);
            setProcessingStep('idle');
            showSuccessModal({ 
              title: "Engine Analysis Complete", 
              message: `${report.validCount} records have been successfully calibrated. Please conduct a manual review of all results to ensure final data integrity before export.`, 
              onDownload: () => setIsExportSettingsOpen(true), 
              onViewResult: () => { 
                setViewMode('results'); 
              } 
            });
        }, 800);
      }
    });
  };

  const handleDataImported = (imported: LandRecord[], fileName: string, rawCount: number, mode: 'raw' | 'exempt' | 'journal' = 'raw') => {
    const updatedExemptPins = new Set(exemptPins);
    if (mode === 'exempt') {
      const pinsFromThisFile = new Set<string>();
      imported.forEach(r => { 
        if (r.pin) {
          const pin = r.pin.trim();
          updatedExemptPins.add(pin);
          pinsFromThisFile.add(pin);
        } 
      });
      setExemptPins(updatedExemptPins);
      setExemptFileManifest(prev => [...prev, { name: fileName, count: imported.length, pins: pinsFromThisFile }]);
    } else if (mode === 'journal') {
      setJournalFileManifest(prev => [...prev, { name: fileName, count: rawCount }]);
      setJournalData(prev => [...prev, ...imported]);
    } else {
      setRawFileManifest(prev => [...prev, { name: fileName, count: rawCount }]);
    }
    
    const isAppending = rawData.length > 0 || journalData.length > 0;
    const newData = mode === 'journal' ? [...rawData, ...journalData, ...imported] : [...rawData, ...imported];
    
    if (mode === 'raw') setRawData(prev => [...prev, ...imported]);

    let newFileName = fileName;
    if (isAppending && (mode === 'raw' || mode === 'journal')) {
        if (importedFileName.includes('Batch')) { newFileName = `${importedFileName.replace(')', '')}, ${fileName})`; }
        else { newFileName = `Batch (${importedFileName}, ${fileName})`; }
    } else if (mode === 'raw' || mode === 'journal') {
      newFileName = fileName;
    } else {
      newFileName = importedFileName;
    }

    setImportedFileName(newFileName);
    
    // Abstract Flow Management
    if (workflowMode === 'abstract') {
      if (abstractStep === 'roll') {
        setAbstractStep('journal');
        toast({ title: "Roll Staged", description: "Assessment Roll loaded. Now, please upload the corresponding Journal file." });
      } else if (abstractStep === 'journal') {
        setAbstractStep('ready');
        setShowDetailedResults(true);
        const { allWithDuplicateMarkers } = processRecords(newData, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, newFileName, updatedExemptPins);
        setPreviewData(allWithDuplicateMarkers);
        toast({ title: "Data Staged", description: "Roll and Journal joined. Report ready for Abstract Export." });
      }
    } else {
      if (newData.length > 0 || mode === 'raw' || mode === 'journal') {
        setShowDetailedResults(true);
      }

      if (processedData.length > 0) {
        runProcessWithData(newData, newData.length, newFileName, true);
      } else {
        const { allWithDuplicateMarkers } = processRecords(newData, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, newFileName, updatedExemptPins);
        setPreviewData(allWithDuplicateMarkers);
      }
    }
    
    toast({ 
      title: mode === 'exempt' ? "Exempt Data Integrated" : mode === 'journal' ? "Journal Data Integrated" : "Data Loaded", 
      description: mode === 'exempt' ? `${imported.length} records integrated and indexed as Exempt reference.` : `${rawCount} records from ${fileName} imported successfully.` 
    });
  };

  const deleteFile = (fileName: string, mode: 'raw' | 'exempt' | 'journal') => {
    if (mode === 'raw') {
      const newRawData = rawData.filter(r => r.sourceFile !== fileName);
      setRawData(newRawData);
      setRawFileManifest(prev => prev.filter(f => f.name !== fileName));
      
      const combined = [...newRawData, ...journalData];
      const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, importedFileName, exemptPins);
      setPreviewData(allWithDuplicateMarkers);
      setProcessedData([]); 

      if (combined.length === 0) {
        setShowDetailedResults(false);
        setImportedFileName("");
        if (workflowMode === 'abstract') setAbstractStep('roll');
      }
    } else if (mode === 'journal') {
      const newJournalData = journalData.filter(r => r.sourceFile !== fileName);
      setJournalData(newJournalData);
      setJournalFileManifest(prev => prev.filter(f => f.name !== fileName));
      
      const combined = [...rawData, ...newJournalData];
      const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, importedFileName, exemptPins);
      setPreviewData(allWithDuplicateMarkers);
      setProcessedData([]);

      if (combined.length === 0) {
        setShowDetailedResults(false);
        setImportedFileName("");
        if (workflowMode === 'abstract') setAbstractStep('journal');
      }
    } else {
      const fileToDelete = exemptFileManifest.find(f => f.name === fileName);
      if (!fileToDelete) return;
      
      const newExemptFiles = exemptFileManifest.filter(f => f.name !== fileName);
      setExemptFileManifest(newExemptFiles);
      
      const newExemptPins = new Set<string>();
      newExemptFiles.forEach(f => f.pins.forEach(pin => newExemptPins.add(pin)));
      setExemptPins(newExemptPins);
      
      const combined = [...rawData, ...journalData];
      const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, importedFileName, newExemptPins);
      setPreviewData(allWithDuplicateMarkers);
      setProcessedData([]); 
    }
    toast({ title: "File Removed", description: `${fileName} has been removed from the session.` });
  };

  const handleDirectImport = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'raw' | 'exempt' | 'journal') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsDirectImporting(true);
    setDirectImportProgress({ current: 0, total: files.length, mode });
    const allRecords: LandRecord[] = [];
    let totalRawCount = 0;
    const fileNames: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setDirectImportProgress(prev => ({ ...prev, current: i }));
        const workflow = workflowMode === 'abstract' ? (mode === 'journal' ? 'journal' : 'roll') : workflowMode;
        const result = await parseFile(files[i], workflow, mode);
        allRecords.push(...result.data);
        totalRawCount += result.count;
        fileNames.push(files[i].name);
        await delay(400);
      }
      const summaryFileName = fileNames.length > 1 ? `Batch (${fileNames.length} Files)` : fileNames[0];
      handleDataImported(allRecords, summaryFileName, totalRawCount, mode);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Import Error", description: err.message || "Failed to parse one or more files." });
    } finally {
      setIsDirectImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const runProcess = async () => { 
    const combined = [...rawData, ...journalData];
    if (combined.length === 0) return; 
    runProcessWithData(combined, combined.length, importedFileName); 
  };

  const handleSaveRecord = useCallback((updatedRecord: LandRecord, silent = false) => {
    setSelectedRecord(null); setComparisonRecord(null); if (!silent) setIsProcessing(true);
    startTransition(() => {
      const isJournalRecord = journalData.some(r => r.id === updatedRecord.id);
      let newRawData = rawData;
      let newJournalData = journalData;

      if (isJournalRecord) {
        newJournalData = journalData.map(r => r.id === updatedRecord.id ? updatedRecord : r);
        setJournalData(newJournalData);
      } else {
        newRawData = rawData.map(r => r.id === updatedRecord.id ? updatedRecord : r);
        setRawData(newRawData);
      }

      const combined = [...newRawData, ...newJournalData];

      setTimeout(() => {
        if (processedData.length > 0) { runProcessWithData(combined, combined.length, importedFileName, silent); }
        else {
          const { allWithDuplicateMarkers } = processRecords(combined, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, importedFileName, exemptPins);
          setPreviewData(allWithDuplicateMarkers);
          if (!silent) setIsProcessing(false);
        }
        if (!silent) { toast({ title: "Record Saved", description: "The property record has been updated and re-validated." }); }
      }, silent ? 0 : 10);
    });
  }, [rawData, journalData, processedData.length, importedFileName, locationSettings, taxRates, exemptPins]);

  const handleArchiveRecord = useCallback((record: LandRecord) => { handleSaveRecord({ ...record, isManualArchive: true }, true); toast({ title: "Record Archived", description: "The record has been moved to the Archive tab." }); }, [handleSaveRecord]);
  const handleUnarchiveRecord = useCallback((record: LandRecord) => { handleSaveRecord({ ...record, isManualArchive: false }, true); toast({ title: "Record Restored", description: "The record has been moved back to the Results tab." }); }, [handleSaveRecord]);

  const handleRowClick = useCallback((record: LandRecord) => { 
    if (workflowMode === 'abstract') return; 
    setSelectedRecord(record); 
    if (record.statusLabel === 'DUPLICATE') {
      const validPeer = previewData.find(p => p.pin === record.pin && !p.isDuplicate && !p.isCleanup && !p.isManualArchive);
      setSelectedRecord({ ...record, duplicateWithReference: validPeer?.arpNo || "N/A" });
      setComparisonRecord(validPeer || null);
    } else { setComparisonRecord(null); }
  }, [previewData, workflowMode]);

  const handleFinalExport = async (settings: ExportFinalSettings) => {
    setIsExporting(true); setIsExportSettingsOpen(false);
    try {
      await delay(1500);
      const baseFilteredSet = previewData.filter(r => 
        settings.barangays.includes(r.barangayName || 'UNMAPPED') && 
        settings.statuses.includes(r.statusLabel || 'VALID' as any) &&
        settings.kinds.includes(r.kind?.trim().toUpperCase() || '') &&
        settings.taxabilities.includes(r.taxability || 'T') &&
        settings.updateCodes.includes(r.update?.trim().toUpperCase() || '')
      );

      if (baseFilteredSet.length === 0) { 
        toast({ variant: "destructive", title: "Export Failed", description: "No records match your selected export criteria." }); 
        setIsExporting(false); 
        return; 
      }
      
      const finalOutputList: LandRecord[] = [];
      const handledIds = new Set<string>();
      const baselineSorted = [...baseFilteredSet].sort((a, b) => (a.arpNo || '').localeCompare(b.arpNo || ''));

      baselineSorted.forEach(record => {
        if (handledIds.has(record.id!)) return;
        if (record.statusLabel === 'DUPLICATE') {
          const ref = previewData.find(p => p.pin === record.pin && !p.isDuplicate && !p.isCleanup && !p.isManualArchive);
          finalOutputList.push(record); 
          handledIds.add(record.id!);
          if (ref) {
            finalOutputList.push({ ...ref, isComparisonInjected: true });
            if (baseFilteredSet.some(r => r.id === ref.id)) { handledIds.add(record.id!); }
          }
        } else {
          finalOutputList.push(record);
          handledIds.add(record.id!);
        }
      });

      const taxableRecords = finalOutputList.filter(r => r.taxability === 'T');
      const exemptRecords = finalOutputList.filter(r => r.taxability === 'E');
      const sum = (recs: LandRecord[], field: keyof LandRecord) => recs.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
      const fmt = (val: number) => `₱${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;

      const headerMapping: Record<string, string> = { 
        arpNo: "ARP NO#", date: "DATE", previous: "PREVIOUS",
        newArpNo: "NEW ARP NO#", update: "UPDATE", taxability: "TAXABILITY", acctName: "ACCTNAME", 
        address: "ADDRESS", location: "LOCATION", kind: "KIND", au: "AU", landArea: "LAND AREA", 
        unitValue2028: "UNIT VALUE (2028)", marketValue2028: "MARKET VALUE (2028)", assessedValue2028: "ASSESSED VALUE (2028)", 
        yearlyTax2028: "YEARLY TAX (2028 CAP)", unitValue: "UNIT VALUE", marketValue: "MARKET VALUE", 
        assessedValue: "ASSESSED VALUE", yearlyTax: "YEARLY TAX"
      };

      const activeHeaders = Object.values(headerMapping).filter(h => settings.columns[h]);
      const formattedExport = finalOutputList.map(record => {
        const row: any = {};
        Object.entries(headerMapping).forEach(([key, label]) => { 
          if (settings.columns[label]) {
            if (label === "UNIT VALUE") row[label] = processedData.length > 0 ? record.unitValue2029 : record.unitValue2028;
            else if (label === "MARKET VALUE") row[label] = processedData.length > 0 ? record.marketValue2029 : record.marketValue2028;
            else if (label === "ASSESSED VALUE") row[label] = processedData.length > 0 ? record.assessedValue2029 : record.assessedValue2028;
            else if (label === "YEARLY TAX") row[label] = processedData.length > 0 ? record.yearlyTax2029 : record.yearlyTax2028;
            else row[label] = record[key as keyof LandRecord];
          }
        });
        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([["DATA LINK PARAÑAQUE - SMART EXPORT"], ["EXPORT DATE:", new Date().toLocaleString()], ["TOTAL RECORDS:", finalOutputList.length.toLocaleString()], [], ["SUMMARY TAXABLE PROPERTIES"], [], ["CURRENT (2028)"], ["TOTAL MARKET VALUE (2028):", fmt(sum(taxableRecords, 'marketValue2028'))], ["TOTAL ASSESSED VALUE (2028):", fmt(sum(taxableRecords, 'assessedValue2028'))], ["TOTAL YEARLY TAX (2028 capped at 6%):", fmt(sum(taxableRecords, 'yearlyTax2028'))], [], ["RPVARA (2029)"], ["TOTAL MARKET VALUE (2029):", fmt(sum(taxableRecords, 'marketValue2029'))], ["TOTAL ASSESSED VALUE (2029):", fmt(sum(taxableRecords, 'assessedValue2029'))], ["TOTAL YEARLY TAX (2029):", fmt(sum(taxableRecords, 'yearlyTax2029'))], [], ["SUMMARY EXEMPTED PROPERTIES"], [], ["CURRENT (2028)"], ["TOTAL MARKET VALUE (2028):", fmt(sum(exemptRecords, 'marketValue2028'))], ["TOTAL ASSESSED VALUE (2028):", fmt(sum(exemptRecords, 'assessedValue2028'))], [], ["RPVARA (2029)"], ["TOTAL MARKET VALUE (2029):", fmt(sum(exemptRecords, 'marketValue2029'))], ["TOTAL ASSESSED VALUE (2029):", fmt(sum(exemptRecords, 'assessedValue2029'))], [], activeHeaders]);
      XLSX.utils.sheet_add_json(ws, formattedExport, { origin: -1, skipHeader: true });
      ws['!cols'] = activeHeaders.map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, ws, "ExportResults");
      XLSX.writeFile(wb, `DataLink-SmartExport-${new Date().toISOString().split('T')[0]}.xlsx`);
      showSuccessToast(`Exported ${finalOutputList.length} records successfully.`);
    } catch (error: any) { toast({ variant: "destructive", title: "Export Failed", description: error.message }); }
    finally { setIsExporting(false); }
  };

  const handleAbstractExport = async (settings: AbstractExportSettings) => {
    setIsExporting(true);
    try {
      await delay(1500);
      
      // Start with the full joined set
      let baseData = [...joinedAbstractData];

      const start = settings.startDate ? startOfDay(new Date(settings.startDate)) : null;
      const end = settings.endDate ? endOfDay(new Date(settings.endDate)) : null;

      // Apply Filters
      baseData = baseData.filter(record => {
        if (settings.linkedOnly && !record.isJoined) return false;
        if (start || end) {
          const recDate = parseRecordDate(record.date);
          if (!recDate) return false;
          if (start && recDate < start) return false;
          if (end && recDate > end) return false;
        }
        const kind = (record.kind || '').trim().toUpperCase();
        if (!settings.kinds.includes(kind)) return false;
        if (!settings.taxabilities.includes(record.taxability)) return false;
        const code = (record.update || '').trim().toUpperCase();
        if (!settings.updateCodes.includes(code)) return false;
        return true;
      });

      // Strict Sorting: Date primarily, then ARP No.
      baseData.sort((a, b) => {
         const dateA = parseRecordDate(a.date) || new Date(0);
         const dateB = parseRecordDate(b.date) || new Date(0);
         if (dateA.getTime() !== dateB.getTime()) {
           return dateA.getTime() - dateB.getTime();
         }
         return (a.arpNo || "").localeCompare(b.arpNo || "", undefined, { numeric: true });
      });
      
      if (baseData.length === 0) {
        toast({ variant: "destructive", title: "Abstract Export Failed", description: "No records found matching your specific filter criteria." });
        setIsExporting(false);
        return;
      }

      // Visual logic for the Export: Show all dates to verify carry-forward
      const abstractData = baseData.map(j => {
        const currentDate = j.date || "";
        const kind = (j.kind || "").trim().toUpperCase();
        
        return {
          "col1": j.arpNo || "",
          "col2": currentDate,
          "col3": "", // LEAVE BLANK AS REQUESTED
          "col4": j.acctName || "", 
          "col5": (j as any).rollAddress || "", 
          "col6": j.location || "", 
          "col7": "", 
          "col8": "", 
          "col9": (kind === 'L' || kind === 'LAND') ? 'x' : "", 
          "col10": (kind === 'B' || kind === 'BUILDING') ? 'x' : "", 
          "col11": j.landArea || 0, 
          "col12": (j as any).rollLotNo || "", 
          "col13": "", 
          "col14": (j as any).rollTctNo || "" 
        };
      });

      const headers = [
        "ARP No.",
        "Date of Conveyance/Transfer",
        "Ownership Transfer From",
        "Ownership Transfer To",
        "Address of New Owner",
        "Location of Property",
        "Mode of Conveyance",
        "Amount of Consideration",
        "Property Conveyed (L)",
        "Property Conveyed (B)",
        "Area Land/Bldg.",
        "Lot No.",
        "Title No. Previous",
        "Title No. New"
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ["ABSTRACT OF REGISTERED REAL PROPERTY TRANSACTION"],
        ["PARAÑAQUE CITY - REAL PROPERTY DATA DIVISION"],
        ["EXPORT DATE:", new Date().toLocaleString()],
        [],
        headers
      ]);

      XLSX.utils.sheet_add_json(ws, abstractData, { origin: -1, skipHeader: true });
      
      // TAILORED COLUMN WIDTHS TO REDUCE SPACE
      ws['!cols'] = [
        { wch: 20 }, // ARP No.
        { wch: 12 }, // Date of Conveyance
        { wch: 15 }, // Ownership Transfer From (Blank)
        { wch: 25 }, // Ownership Transfer To
        { wch: 30 }, // Address of New Owner
        { wch: 20 }, // Location of Property
        { wch: 15 }, // Mode of Conveyance
        { wch: 15 }, // Amount of Consideration
        { wch: 4 },  // L (Marker)
        { wch: 4 },  // B (Marker)
        { wch: 12 }, // Area Land/Bldg.
        { wch: 15 }, // Lot No.
        { wch: 15 }, // Title No. Previous
        { wch: 20 }  // Title No. New
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "AbstractReport");
      XLSX.writeFile(wb, `AbstractReport-${new Date().toISOString().split('T')[0]}.xlsx`);
      showSuccessToast(`Exported ${abstractData.length} Abstract entries successfully.`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Abstract Export Failed", description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isClient) return null;

  const canAbstractExport = (journalData.length > 0 && rawData.length > 0) || workflowMode === 'abstract';

  return (
    <div className="h-screen bg-background flex flex-col font-body overflow-hidden" suppressHydrationWarning>
      <input type="file" ref={rawFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'raw')} />
      <input type="file" ref={exemptFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'exempt')} />
      <input type="file" ref={journalFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'journal')} />

      <header className="bg-card/80 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg shrink-0 z-50 overflow-visible">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-[5px] cursor-pointer hover:opacity-80 transition-all active:scale-95 group relative" onClick={() => setIsAboutOpen(true)}>
                <div className="relative w-[86px] flex items-center h-full">
                  <div className="absolute left-0 -translate-y-1/2 top-1/2">
                    <Image src="/LOGO.png" alt="DataLink Logo" width={86} height={86} className="object-contain" />
                  </div>
                </div>
                <div className="flex items-center" style={{ marginLeft: '5px' }}>
                  <h1 className="text-[32px] font-black tracking-tighter leading-none">
                    <span className="text-foreground">DataLink</span>
                    <span className="text-primary ml-1.5">Parañaque</span>
                  </h1>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>About DataLink Parañaque</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex items-center gap-1.5">
          {workflowMode !== 'idle' && (
            <Button variant="ghost" onClick={() => clearWorkspace()} className="mr-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary gap-2">
              <ChevronLeft className="w-3.5 h-3.5" /> Switch Engine
            </Button>
          )}
          {showDetailedResults && (
            <div className="flex items-center gap-2 mr-3 px-4 border-r border-white/10">
              <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3">
                        <Label htmlFor="summary-toggle" className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground cursor-pointer hover:text-primary transition-colors">Show Summary</Label>
                        <Switch 
                          id="summary-toggle" 
                          checked={showSummary} 
                          onCheckedChange={setShowSummary}
                          className="data-[state=checked]:bg-primary scale-90"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Dashboard KPI Overview</TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            </div>
          )}
          {deferredPrompt && <Button variant="ghost" size="icon" onClick={handleInstallClick} className="hover:bg-muted"><Download className="w-5 h-5" /></Button>}
          <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="hover:bg-muted">{isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</Button>
          <ModeToggle />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsSettingsOpen(true)}
                  className={cn("transition-all hover:bg-muted", isSettingsOpen && "bg-primary text-white hover:bg-emerald-700")}
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Shortcut: Ctrl + Alt + S</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 flex flex-col p-6 overflow-hidden gap-4 min-h-0">
            <Tabs value={viewMode} onValueChange={(val: any) => { setViewMode(val); setStatusFilter('all'); }} className="flex-1 flex flex-col min-h-0">
              {workflowMode === 'idle' && viewMode !== 'audit' ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full py-12 scrollbar-vertical-custom overflow-y-auto">
                   <div className="text-center space-y-3 mb-16 shrink-0">
                     <h2 className="text-6xl font-black uppercase tracking-tight text-foreground">Select Engine Workflow</h2>
                     <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Choose the processing logic tailored to your source data format.</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto px-6 items-stretch">
                      <Card 
                        className="p-10 border-white/10 bg-card hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group shadow-2xl flex flex-col items-center text-center h-full"
                        onClick={() => setWorkflowMode('standard')}
                      >
                        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                          <Zap className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Standard Processor</h3>
                        <p className="text-sm font-bold text-muted-foreground leading-relaxed mb-8">Best for general land record spreadsheets. Uses flexible header aliases.</p>
                        <Button className="w-full h-14 bg-primary hover:bg-emerald-700 font-black uppercase text-xs tracking-widest mt-auto">Launch Standard</Button>
                      </Card>

                      <Card 
                        className="p-10 border-white/10 bg-card hover:bg-blue-600/5 hover:border-blue-500/50 transition-all cursor-pointer group shadow-2xl flex flex-col items-center text-center h-full"
                        onClick={() => { setWorkflowMode('abstract'); setAbstractStep('roll'); }}
                      >
                        <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                          <ArrowRightLeft className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Abstract of Transactions</h3>
                        <p className="text-sm font-bold text-muted-foreground leading-relaxed mb-8">Specialized mode for joining Journals with Assessment Rolls for transfer reports.</p>
                        <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest mt-auto">Launch Abstract</Button>
                      </Card>
                   </div>
                </div>
              ) : (!showDetailedResults && viewMode !== 'audit') ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full py-12">
                   <div className="text-center space-y-3 mb-10 shrink-0">
                     <h2 className="text-5xl font-black uppercase tracking-tight text-foreground">
                        {workflowMode === 'abstract' 
                          ? (abstractStep === 'roll' ? 'Step 1: Import Assessment Roll' : 'Step 2: Import Journal Logs')
                          : `Import ${workflowMode === 'standard' ? 'Records' : 'Assessment Roll'}`
                        }
                     </h2>
                     <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
                        {workflowMode === 'abstract' 
                          ? (abstractStep === 'roll' ? 'Start by uploading your current Assessment Roll reference.' : 'Now, upload the corresponding Journal transactions for the join.')
                          : `Upload your records to begin the ${workflowMode === 'standard' ? 'cleanup' : 'positional parsing'} process.`
                        }
                     </p>
                   </div>
                   <div className="w-full max-w-4xl mx-auto px-6">
                      <ImportZone 
                        onDataImported={handleDataImported} 
                        mode={workflowMode === 'abstract' ? (abstractStep === 'roll' ? 'raw' : 'journal') : 'raw'} 
                        workflowMode={workflowMode === 'abstract' ? (abstractStep === 'roll' ? 'roll' : 'journal') : workflowMode} 
                      />
                   </div>
                </div>
              ) : (
                <div className={cn(
                  "flex-1 flex flex-col min-h-0 transition-all duration-700 ease-in-out",
                  showDetailedResults ? "gap-4 h-full" : "items-center justify-center h-full",
                  isClearing && "animate-out fade-out zoom-out-95 duration-500 fill-mode-forwards"
                )}>
                  <div className={cn(
                    "transition-all duration-700 ease-in-out w-full overflow-hidden",
                    showDetailedResults ? "shrink-0" : "flex-1 flex items-center justify-center",
                    !showSummary && showDetailedResults ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[800px] opacity-100"
                  )}>
                    <div className={cn(
                      "transition-all duration-700 ease-in-out w-full",
                      !showDetailedResults && "animate-in fade-in zoom-in-95 duration-1000"
                    )}>
                      <MetricOverview 
                        stats={stats} 
                        variant={showDetailedResults ? 'default' : 'hero'} 
                        taxViewMode={taxViewMode}
                        onTaxViewModeChange={setTaxViewMode}
                        workflowMode={workflowMode}
                      />
                    </div>
                  </div>

                  {!showDetailedResults && viewMode !== 'audit' ? (
                    <div className="shrink-0 flex flex-col items-center justify-center pb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                      <Button 
                        size="lg" 
                        onClick={() => setShowDetailedResults(true)}
                        className="h-16 px-16 bg-primary hover:bg-emerald-700 text-white font-black uppercase tracking-[0.25em] text-xs shadow-2xl transition-all active:scale-95 group"
                      >
                        Show Overall Results & Analysis
                        <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      </Button>
                    </div>
                  ) : (
                    <Card className="flex-1 overflow-hidden flex flex-col min-h-0 shadow-xl border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="p-3 bg-muted/30 border-b flex flex-col xl:flex-row items-center justify-between gap-4 shrink-0">
                        <TabsList className="bg-background border">
                          <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-white h-9 text-xs font-bold px-4"><TableIcon className="w-3.5 h-3.5 mr-2" /> {workflowMode === 'abstract' ? 'Joined Preview' : 'Results'}</TabsTrigger>
                          {workflowMode !== 'abstract' ? (
                            <>
                              <TabsTrigger value="archive" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white h-9 text-xs font-bold px-4"><Archive className="w-3.5 h-3.5 mr-2" /> Archive</TabsTrigger>
                              <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-9 text-xs font-bold px-4"><BarChart3 className="w-3.5 h-3.5 mr-2" /> Analytics</TabsTrigger>
                              <TabsTrigger value="audit" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-9 text-xs font-bold px-4"><ShieldCheck className="w-3.5 h-3.5 mr-2" /> Audit Log</TabsTrigger>
                            </>
                          ) : (
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-9 text-xs font-bold px-4"><BarChart3 className="w-3.5 h-3.5 mr-2" /> Relational Analytics</TabsTrigger>
                          )}
                        </TabsList>
                        {viewMode !== 'analytics' && viewMode !== 'audit' && (
                          <div className="flex flex-1 items-center gap-2 w-full max-w-[1400px]">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Select value={searchField} onValueChange={setSearchField}>
                                <SelectTrigger className="w-[120px] h-9 text-xs font-bold uppercase shrink-0"><SelectValue placeholder="In" /></SelectTrigger>
                                <SelectContent>
                                  {workflowMode === 'abstract' ? (
                                    <>
                                      <SelectItem value="all">All Fields</SelectItem>
                                      <SelectItem value="arpNo">ARP No.</SelectItem>
                                      <SelectItem value="date">Date</SelectItem>
                                      <SelectItem value="acctName">Transfer (To)</SelectItem>
                                      <SelectItem value="rollAddress">Reg. Address</SelectItem>
                                      <SelectItem value="location">Location</SelectItem>
                                      <SelectItem value="pin">PIN</SelectItem>
                                      <SelectItem value="rollTctNo">TCT No.</SelectItem>
                                    </>
                                  ) : (
                                    <>
                                      <SelectItem value="all">All Fields</SelectItem>
                                      <SelectItem value="date">Date</SelectItem>
                                      <SelectItem value="arpNo">ARP No#</SelectItem>
                                      <SelectItem value="pin">PIN</SelectItem>
                                      <SelectItem value="acctName">Account</SelectItem>
                                      <SelectItem value="address">Address</SelectItem>
                                      <SelectItem value="update">Update</SelectItem>
                                      <SelectItem value="taxability">Taxability</SelectItem>
                                      <SelectItem value="kind">Kind</SelectItem>
                                      <SelectItem value="au">AU</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder={`Search property records...`} className="pl-9 text-sm h-9 w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                              </div>
                            </div>
                            {uniqueBarangays.length > 1 && (
                              <Select value={barangayFilter} onValueChange={setBarangayFilter}>
                                <SelectTrigger className="w-[180px] h-9 text-xs font-bold uppercase shrink-0"><MapPin className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Barangay" /></SelectTrigger>
                                <SelectContent><SelectItem value="all">All Barangays</SelectItem>{uniqueBarangays.map(brgy => (<SelectItem key={brgy} value={brgy}>{brgy}</SelectItem>))}</SelectContent>
                              </Select>
                            )}
                            {uniqueSourceFiles.length > 1 && (
                              <Select value={sourceFileFilter} onValueChange={setSourceFileFilter}>
                                <SelectTrigger className="w-[150px] h-9 text-xs font-bold uppercase shrink-0"><Files className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="File Source" /></SelectTrigger>
                                <SelectContent><SelectItem value="all">All Files</SelectItem>{uniqueSourceFiles.map(file => (<SelectItem key={file} value={file}>{file}</SelectItem>))}</SelectContent>
                              </Select>
                            )}
                            {workflowMode !== 'abstract' && (
                              <Select value={sortBy} onValueChange={(val: any) => { setSortBy(val); setStatusFilter('all'); }}>
                                <SelectTrigger className="w-[160px] h-9 text-xs font-bold uppercase shrink-0">
                                  <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                                  <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pin">Sort by PIN</SelectItem>
                                  <SelectItem value="arpNo">Sort by ARP No#</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="w-[160px] h-9 text-xs font-bold uppercase shrink-0"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {workflowMode === 'abstract' ? (
                                  <>
                                    <SelectItem value="Linked">Linked Records</SelectItem>
                                    <SelectItem value="No Match">Unlinked Records</SelectItem>
                                  </>
                                ) : (
                                  dynamicStatusOptions.sort().map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))
                                )}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2 items-center shrink-0">
                              <ImportManager 
                                mode="raw" 
                                manifest={rawFileManifest} 
                                onAdd={() => rawFileInputRef.current?.click()} 
                                onDelete={(name) => deleteFile(name, 'raw')} 
                              />
                              <ImportManager 
                                mode="exempt" 
                                manifest={exemptFileManifest} 
                                onAdd={() => exemptFileInputRef.current?.click()} 
                                onDelete={(name) => deleteFile(name, 'exempt')} 
                              />
                              {workflowMode === 'abstract' && (
                                <ImportManager 
                                  mode="journal" 
                                  manifest={journalFileManifest} 
                                  onAdd={() => journalFileInputRef.current?.click()} 
                                  onDelete={(name) => deleteFile(name, 'journal')} 
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden min-h-0">
                        <TabsContent value="results" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                          <DataPreviewTable 
                            data={filteredDisplayData} 
                            isProcessed={processedData.length > 0} 
                            onRowClick={handleRowClick} 
                            workflowMode={workflowMode}
                          />
                        </TabsContent>
                        {workflowMode !== 'abstract' && (
                          <TabsContent value="archive" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"><DataPreviewTable data={filteredDisplayData} isProcessed={true} onRowClick={handleRowClick} showLabels /></TabsContent>
                        )}
                        <TabsContent value="analytics" className="m-0 h-full p-6 overflow-y-auto scrollbar-vertical-custom bg-muted/5 data-[state=active]:flex data-[state=active]:flex-col">
                          <AnalyticsView 
                            analyticsData={analyticsData} 
                            onExplain={setExplainType} 
                            onExpand={setExpandedChart} 
                            taxabilityFilter={taxabilityFilter}
                            onTaxabilityFilterChange={setTaxabilityFilter}
                            workflowMode={workflowMode}
                          />
                        </TabsContent>
                        <TabsContent value="audit" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                          <AuditLogTab reports={processingReports} onClearHistory={() => { setProcessingReports([]); toast({ title: "History Purged", description: "Audit logs cleared permanently." }); }} onDeleteReport={(id) => { setProcessingReports(prev => prev.filter(r => r.id !== id)); toast({ title: "Log Deleted", description: "Audit entry has been removed." }); }} />
                        </TabsContent>
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
                                <FileDown className={cn(showDetailedResults ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2")} /> 
                                {isExporting ? "Generating..." : "Export Data"}
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
                              <Button 
                                variant="outline" 
                                onClick={() => setIsAbstractExportModalOpen(true)} 
                                size="sm" 
                                className={cn(
                                  "font-black uppercase tracking-widest transition-all",
                                  showDetailedResults ? "h-10 px-5 text-[10px]" : "h-14 px-8 text-[12px]",
                                  canAbstractExport ? "border-blue-500/30 text-blue-600 hover:bg-blue-50" : "opacity-30 border-muted text-muted-foreground"
                                )} 
                                disabled={isExporting || !canAbstractExport}
                              >
                                <ArrowRightLeft className={cn(showDetailedResults ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2")} /> 
                                Abstract Export
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{canAbstractExport ? "Generate Abstract of Transactions (Roll + Journal Join)" : "Requires both Assessment Roll and Journal data staged"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setIsClearConfirmOpen(true)} 
                              className="font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-red-600 hover:bg-muted transition-all flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Clear Session
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reset Session Data</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex gap-4 items-center">
                      {workflowMode === 'standard' && viewMode !== 'analytics' && viewMode !== 'audit' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="lg" className={cn("bg-primary hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95", showDetailedResults ? "h-10 px-6 text-[10px]" : "h-14 px-10 text-[12px]")} disabled={isProcessing} onClick={() => setIsRunProcessorDialogOpen(true)}>
                                {isProcessing ? "Processing Batch..." : "Run Batch Processor"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Run engine analysis sequence</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
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
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" /> 
              {workflowMode === 'abstract' ? (
                explainType === 'usage' ? 'Asset Class Profile' : 
                explainType === 'barangay' ? 'Geographic Hotspots' :
                explainType === 'update' ? 'Join Efficiency Analysis' :
                'Fiscal Profile Distribution'
              ) : (
                explainType === 'usage' ? 'Property Usage Analysis' : 
                explainType === 'barangay' ? 'Geographic Distribution' :
                explainType === 'update' ? 'Transaction Code Insights' :
                'Financial Concentration Analysis'
              )}
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Automated diagnostic report based on current session data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
             <div className="p-5 rounded-2xl bg-muted/20 border border-white/5 space-y-4">
                <p className="text-sm font-bold leading-relaxed text-foreground/80">
                  {workflowMode === 'abstract' ? (
                    <>
                      {explainType === 'usage' && "Shows the distribution of transferred assets. 'L' (Land) vs 'B' (Building) markers help determine the primary nature of real estate movements within this Abstract period. Ensure that classification markers align with the Assessment Roll reference."}
                      {explainType === 'barangay' && "Identifies locations with the highest transaction frequency from the Journal logs. Higher volume in specific areas indicates active development zones or high-demand sectors in Parañaque."}
                      {explainType === 'update' && "Analyzes the matching efficiency between the Journal and the Assessment Roll. A high 'NO MATCH' rate suggests potential data discrepancies, missing parcel records in the reference roll, or non-standard PIN formats in the source Journal."}
                      {explainType === 'market' && "Visualizes the ratio of taxable revenue-generating transactions versus exempted transfers (government, religious, or charitable). This helps in projecting future fiscal impact resulting from current transfers."}
                    </>
                  ) : (
                    <>
                      {explainType === 'usage' && "The system identifies that RESI (Residential) and COMM (Commercial) types dominate the current batch. This suggests a high concentration of taxable assets in developed zones. Ensure that assessment levels (20% for RESI, 50% for COMM) are correctly applied in the Configuration Panel."}
                      {explainType === 'barangay' && "The geographic distribution highlights key hotspots across Parañaque. Higher record counts in specific barangays often correlate with recent subdivision updates or large-scale land developments. Cross-reference this with the 'Update Code' chart to identify if these are primarily NEW or TR (Transfer) transactions."}
                      {explainType === 'update' && "The distribution of update codes (e.g., NEW, TR, RC) provides a longitudinal view of property movements. A high percentage of TR codes indicates an active real estate market, while RC (Re-assessment) suggests a batch update cycle is in progress."}
                      {explainType === 'market' && "This pie chart visualizes the total fiscal weight of each property classification. If a small percentage of 'INDU' (Industrial) properties accounts for a large portion of the pie, it indicates high-value individual assets. This helps in prioritizing audit resources for high-impact properties."}
                    </>
                  )}
                </p>
             </div>
             <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-muted-foreground leading-relaxed uppercase">
                   This insight is generated using the Parañaque Smart Logic engine. Manual verification of these trends is recommended during official reporting.
                </p>
             </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setExplainType(null)} className="bg-primary hover:bg-emerald-700 font-black uppercase text-xs tracking-widest px-8">Acknowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expanded Chart Dialog */}
      <Dialog open={!!expandedChart} onOpenChange={(open) => !open && setExpandedChart(null)}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 shadow-2xl p-0">
          <div className="p-8 border-b shrink-0 flex items-center justify-between">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                {workflowMode === 'abstract' ? (
                  <>
                    {expandedChart === 'usage' && <><Plus className="w-6 h-6 text-primary" /> Asset Classification</>}
                    {expandedChart === 'barangay' && <><MapPin className="w-6 h-6 text-primary" /> Transaction Hotspots</>}
                    {expandedChart === 'update' && <><Link2 className="w-6 h-6 text-primary" /> Join Efficiency</>}
                    {expandedChart === 'market' && <><Database className="w-6 h-6 text-primary" /> Fiscal Profiles</>}
                  </>
                ) : (
                  <>
                    {expandedChart === 'usage' && <><CheckCircle2 className="w-6 h-6 text-primary" /> Property Usage Distribution</>}
                    {expandedChart === 'barangay' && <><MapPin className="w-6 h-6 text-primary" /> Barangay Distribution</>}
                    {expandedChart === 'update' && <><RefreshCw className="w-6 h-6 text-primary" /> Update Code distribution</>}
                    {expandedChart === 'market' && <><Database className="w-6 h-6 text-primary" /> Market Value Breakdown</>}
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Full-scale visualization for detailed analysis</DialogDescription>
            </DialogHeader>
            <Button variant="ghost" size="icon" onClick={() => setExpandedChart(null)} className="rounded-full"><X className="w-5 h-5" /></Button>
          </div>
          <div className="flex-1 p-10 flex flex-col items-center justify-center overflow-hidden">
              <ChartContainer config={expandedChart === 'market' ? marketChartConfig : analyticsChartConfig} className="w-full h-full max-h-[500px]">
                 {expandedChart === 'market' ? (
                   <PieChart>
                      <Pie data={analyticsData.marketChart} cx="50%" cy="50%" innerRadius={100} outerRadius={160} paddingAngle={8} dataKey="value" stroke="none" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {analyticsData.marketChart.map((entry, index) => <Cell key={`cell-exp-m-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '40px', fontSize: '12px', fontWeight: 'bold' }}/>
                   </PieChart>
                 ) : (
                   <BarChart data={expandedChart === 'usage' ? analyticsData.auChart : expandedChart === 'barangay' ? analyticsData.barangayChart : analyticsData.updateChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                         {(expandedChart === 'usage' ? analyticsData.auChart : expandedChart === 'barangay' ? analyticsData.barangayChart : analyticsData.updateChart).map((entry, index) => (
                            <Cell key={`cell-exp-${index}`} fill={COLORS[(index + (expandedChart === 'barangay' ? 4 : expandedChart === 'update' ? 2 : 0)) % COLORS.length]} />
                         ))}
                      </Bar>
                   </BarChart>
                 )}
              </ChartContainer>
          </div>
          <div className="p-6 border-t bg-muted/20 flex justify-center shrink-0">
            <Button onClick={() => setExpandedChart(null)} className="font-black uppercase text-xs tracking-widest bg-slate-800 hover:bg-slate-900 h-12 px-12">Close Visualization</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRunProcessorDialogOpen} onOpenChange={isRunProcessorDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" /> Run Batch Processor
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-muted-foreground leading-relaxed">
              The engine will now perform a multi-pass validation sequence including system cleanup, deduplication, and financial calibration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CalibrationSidebar 
              options={options} 
              setOptions={setOptions}
              rules={rules}
              setRules={setRules}
            />
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsRunProcessorDialogOpen(false)} className="font-black uppercase text-xs h-10 px-6">Cancel</Button>
            <Button 
              onClick={() => { setIsRunProcessorDialogOpen(false); runProcess(); }}
              className="bg-primary hover:bg-emerald-700 text-white font-black uppercase text-xs h-10 px-8 shadow-lg shadow-primary/20"
            >
              Execute Engine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="sm:max-w-[1200px] w-[95vw] p-0 border-none bg-card shadow-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Configuration Panel</SheetTitle>
            <SheetDescription>Update global settings and calibration rules.</SheetDescription>
          </SheetHeader>
          <SettingsOverlay onClose={() => setIsSettingsOpen(false)} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" /> Confirm Session Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-bold text-muted-foreground leading-relaxed">
              Are you sure you want to clear your current workspace? All property records and processing results in this session will be permanently removed.
              <br /><br />
              <span className="text-red-600/80 font-black uppercase tracking-tighter">Note: Your administrative audit logs will not be affected.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="font-black uppercase text-xs h-10 px-6 hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { setIsClearConfirmOpen(false); clearWorkspace(); }}
              className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs h-10 px-8 shadow-lg shadow-red-500/10 transition-all"
            >
              Wipe Session Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isDirectImporting && (
        <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-12 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105">
            <div className="relative flex items-center justify-center mb-8">
              <Loader2 className={cn("w-16 h-16 animate-spin", directImportProgress.mode === 'raw' ? "text-primary" : directImportProgress.mode === 'journal' ? "text-amber-600" : "text-blue-600")} />
              <div className="absolute inset-0 flex items-center justify-center">
                {directImportProgress.mode === 'raw' ? <BookUser className="w-6 h-6 text-primary" /> : 
                 directImportProgress.mode === 'journal' ? <FileText className="w-6 h-6 text-amber-600" /> :
                 <ShieldOff className="w-6 h-6 text-blue-600" />}
              </div>
            </div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2 text-center">
              {directImportProgress.mode === 'raw' ? "Analyzing Records" : directImportProgress.mode === 'journal' ? "Parsing Journal Logs" : "Indexing PIN Reference"}
            </h3>
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-8 animate-pulse text-center">INITIALIZING ENGINE...</p>
            <div className="w-full pt-6 border-t flex flex-col items-center gap-2">
              <span className={cn("text-[10px] font-black uppercase tracking-widest", directImportProgress.mode === 'raw' ? "text-primary" : directImportProgress.mode === 'journal' ? "text-amber-600" : "text-blue-600")}>
                Batch Progress: {directImportProgress.current + 1} / {directImportProgress.total}
              </span>
            </div>
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
      <AboutModal open={isAboutOpen} onOpenChange={setIsAboutOpen} />
      <ProcessingReportModal report={latestReport} open={isReportOpen} onOpenChange={setIsReportOpen} />
      <RecordDetailModal record={selectedRecord} comparisonRecord={comparisonRecord} open={!!selectedRecord} onOpenChange={(isOpen) => { if (!isOpen) { setSelectedRecord(null); setComparisonRecord(null); } }} onSave={handleSaveRecord} onArchive={handleArchiveRecord} onUnarchive={handleUnarchiveRecord} />
    </div>
  );
}
