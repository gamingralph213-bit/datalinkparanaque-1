
"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback, useRef } from 'react';
import Image from 'next/image';
import { 
  FileDown, 
  Eraser, 
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
  TrendingUp,
  Loader2,
  Check,
  FileSpreadsheet,
  ArrowLeft,
  BookUser,
  ShieldOff,
  Cpu,
  ShieldCheck,
  Files,
  Plus,
  BarChart3,
  LayoutDashboard,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ImportZone } from '@/components/dashboard/import-zone';
import { CalibrationSidebar } from '@/components/dashboard/calibration-sidebar';
import { DataPreviewTable } from '@/components/dashboard/data-preview-table';
import { LandRecord, CalibrationRule, processRecords, TaxRateMap, ProcessingReport, RecordStatusType } from '@/lib/processor';
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
import { BarChart, Bar, XAxis, YAxis, Cell, Pie, PieChart, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportSettingsModal, ExportFinalSettings } from '@/components/dashboard/export-settings-modal';
import { useNotification } from '@/contexts/NotificationContext';
import { SettingsOverlay } from '@/components/dashboard/settings-overlay';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { parseFile } from '@/lib/importer';

// Sub-components
import { MetricOverview } from '@/components/dashboard/metric-overview';
import { AnalyticsView } from '@/components/dashboard/analytics-view';

const LOCAL_STORAGE_KEY = 'paranaque_datalink_v31';

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

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

type ProcessingStep = 'idle' | 'cleanup' | 'dedupe' | 'calibrate' | 'complete';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function Home() {
  const { toast } = useToast();
  const { showSuccessModal, showSuccessToast } = useNotification();
  const [isPending, startTransition] = useTransition();

  // --- 1. DATA STATE ---
  const [rawData, setRawData] = useState<LandRecord[]>([]);
  const [previewData, setPreviewData] = useState<LandRecord[]>([]);
  const [processedData, setProcessedData] = useState<LandRecord[]>([]);
  const [exemptPins, setExemptPins] = useState<Set<string>>(new Set());
  const [rules, setRules] = useState<CalibrationRule[]>([]);
  const [locationSettings, setLocationSettings] = useState<BarangayConfig[]>(initialLocationSettings);
  const [taxRates, setTaxRates] = useState<TaxRateMap>(defaultTaxRates);
  const [processingReports, setProcessingReports] = useState<ProcessingReport[]>([]);

  // --- 2. UI & MODAL STATE ---
  const [isClient, setIsClient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isDirectImporting, setIsDirectImporting] = useState(false);
  const [directImportProgress, setDirectImportProgress] = useState({ current: 0, total: 0, mode: 'raw' as 'raw' | 'exempt' });
  const [viewMode, setViewMode] = useState<'results' | 'archive' | 'analytics' | 'audit'>('results');
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isRunProcessorDialogOpen, setIsRunProcessorDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [comparisonRecord, setComparisonRecord] = useState<LandRecord | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [taxViewMode, setTaxViewMode] = useState<'T' | 'E'>('T');

  // --- 3. REFS FOR DIRECT IMPORT ---
  const rawFileInputRef = useRef<HTMLInputElement>(null);
  const exemptFileInputRef = useRef<HTMLInputElement>(null);

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
    "DATE": true, "ARP NO#": true, "PIN": true, "NEW ARP NO#": true, "UPDATE": true, "TAXABILITY": true,
    "ACCTNAME": true, "ADDRESS": true, "LOCATION": true, "KIND": true,
    "AU": true, "LAND AREA": true, "UNIT VALUE (2028)": true, "MARKET VALUE (2028)": true,
    "ASSESSED VALUE (2028)": true, "YEARLY TAX (2028 CAP)": true,
    "UNIT VALUE": true, "MARKET VALUE": true,
    "ASSESSED VALUE": true, "YEARLY TAX": true,
  };
  const [exportColumns, setExportColumns] = useState<Record<string, boolean>>(defaultExportColumns);

  // --- 7. STATS CALCULATION (Dynamic via useMemo) ---
  const stats = useMemo(() => {
    const active = previewData.filter(r => r.statusLabel !== 'CLEANUP' && r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && !r.isManualArchive);
    const valid = active.filter(r => r.statusLabel === 'VALID');
    const filteredValid = valid.filter(r => r.taxability === taxViewMode);
    const errors = active.filter(r => r.statusLabel !== 'VALID').length;
    const isProcessed = processedData.length > 0;
    const mvField = isProcessed ? 'marketValue2029' : 'marketValue2028';
    const avField = isProcessed ? 'assessedValue2029' : 'assessedValue2028';
    const ytField = isProcessed ? 'yearlyTax2029' : 'yearlyTax2028';

    return { 
      totalRawRows: rawData.length,
      systemCleanup: previewData.filter(r => r.statusLabel === 'CLEANUP' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'DUPLICATE' || r.isManualArchive).length,
      totalImported: rawData.length, 
      duplicatesRemoved: previewData.filter(r => r.statusLabel === 'DUPLICATE').length, 
      finalCount: active.length,
      totalMarketValue: filteredValid.reduce((sum, r) => sum + (r[mvField as keyof LandRecord] as number || 0), 0),
      totalAssessedValue: filteredValid.reduce((sum, r) => sum + (r[avField as keyof LandRecord] as number || 0), 0),
      totalYearlyTax: filteredValid.reduce((sum, r) => sum + (r[ytField as keyof LandRecord] as number || 0), 0),
      totalErrors: errors
    };
  }, [previewData, rawData.length, taxViewMode, processedData.length]);

  const latestReport = processingReports[0] || null;

  // --- 8. DERIVED STATE (useMemo) ---
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
    const activeData = viewMode === 'archive' 
      ? previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'CLEANUP' || r.isManualArchive)
      : (processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP' && !r.isManualArchive));
    
    const available = new Set<string>();
    activeData.forEach(r => {
        if (r.statusLabel) available.add(r.statusLabel);
    });
    return Array.from(available);
  }, [previewData, processedData, viewMode]);

  const analyticsData = useMemo(() => {
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
      updateChart: Object.entries(updateDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value),
      barangayChart: Object.entries(barangayDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value)
    };
  }, [processedData, previewData, sourceFileFilter, barangayFilter, taxabilityFilter]);

  const filteredDisplayData = useMemo(() => {
    const baseData = viewMode === 'archive' 
      ? previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'CLEANUP' || r.isManualArchive)
      : (processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP' && !r.isManualArchive));

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

    const sorted = [...filtered].sort((a, b) => (a.pin || '').localeCompare(b.pin || ''));

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
  }, [previewData, processedData, viewMode, searchQuery, searchField, statusFilter, sourceFileFilter, barangayFilter]);

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
      }
    } catch (error) { console.error("Failed to parse localStorage:", error); }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (rawData.length > 0 && !isProcessing && !isRunProcessorDialogOpen) {
          e.preventDefault();
          setIsRunProcessorDialogOpen(true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        if (rawData.length > 0 && !isExportSettingsOpen) {
          e.preventDefault();
          setIsExportSettingsOpen(true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'c') {
        if (rawData.length > 0) {
          e.preventDefault();
          setIsClearConfirmOpen(true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        rawFileInputRef.current?.click();
      }
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (showDetailedResults || viewMode === 'audit') {
          e.preventDefault();
          const modes: Array<'results' | 'archive' | 'analytics' | 'audit'> = ['results', 'archive', 'analytics', 'audit'];
          setViewMode(prev => {
            const currentIndex = modes.indexOf(prev as any);
            const nextIndex = e.shiftKey ? (currentIndex - 1 + modes.length) % modes.length : (currentIndex + 1) % modes.length;
            setStatusFilter('all');
            return modes[nextIndex];
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rawData.length, isProcessing, isRunProcessorDialogOpen, isExportSettingsOpen, showDetailedResults, viewMode]);

  // adaptive Storage Persistence
  useEffect(() => {
    if (isClient) {
      const saveToStorage = (reports: ProcessingReport[]) => {
        try {
          const payload = JSON.stringify({ rules, exportColumns, locationSettings, options, taxRates, processingReports: reports });
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
  }, [rules, exportColumns, locationSettings, options, taxRates, processingReports, isClient]);

  // Session Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (rawData.length > 0) {
        e.preventDefault();
        e.returnValue = "You have unsaved property records in your active session. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rawData.length]);

  const clearWorkspace = async () => {
    if (rawData.length === 0) return;
    setIsClearing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRawData([]);
    setProcessedData([]);
    setPreviewData([]);
    setExemptPins(new Set());
    setSearchQuery("");
    setImportedFileName("");
    setSourceFileFilter("all");
    setBarangayFilter("all");
    setTaxabilityFilter("all");
    setShowDetailedResults(false);
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
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDataImported = (imported: LandRecord[], fileName: string, rawCount: number, mode: 'raw' | 'exempt' = 'raw') => {
    const updatedExemptPins = new Set(exemptPins);
    if (mode === 'exempt') {
      imported.forEach(r => { if (r.pin) updatedExemptPins.add(r.pin.trim()); });
      setExemptPins(updatedExemptPins);
    }
    const isAppending = rawData.length > 0;
    const newData = isAppending ? [...rawData, ...imported] : imported;
    let newFileName = fileName;
    if (isAppending) {
        if (importedFileName.includes('Batch')) { newFileName = `${importedFileName.replace(')', '')}, ${fileName})`; }
        else { newFileName = `Batch (${importedFileName}, ${fileName})`; }
    }
    setRawData(newData);
    setImportedFileName(newFileName);
    setProcessedData([]);
    setViewMode('results');
    setSourceFileFilter('all');
    setBarangayFilter('all');
    setShowDetailedResults(true);

    const { allWithDuplicateMarkers } = processRecords(newData, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, newFileName, updatedExemptPins);
    setPreviewData(allWithDuplicateMarkers);
    toast({ title: mode === 'exempt' ? "Exempt Data Integrated" : (isAppending ? "Data Appended" : "Data Loaded"), description: mode === 'exempt' ? `${imported.length} records integrated and indexed as Exempt reference.` : `${rawCount} records from ${fileName} imported successfully.` });
  };

  const handleDirectImport = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'raw' | 'exempt') => {
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
        const result = await parseFile(files[i]);
        allRecords.push(...result.data);
        totalRawCount += result.count;
        fileNames.push(files[i].name);
        await delay(400);
      }
      const summaryFileName = fileNames.length > 1 ? `Batch (${fileNames.length} Files)` : fileNames[0];
      handleDataImported(allRecords, summaryFileName, totalRawCount, mode);
    } catch (err) {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to parse one or more files." });
    } finally {
      setIsDirectImporting(false);
      e.target.value = '';
    }
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

  const runProcess = async () => { if (rawData.length === 0) return; runProcessWithData(rawData, rawData.length, importedFileName); };

  const handleSaveRecord = useCallback((updatedRecord: LandRecord, silent = false) => {
    setSelectedRecord(null); setComparisonRecord(null); if (!silent) setIsProcessing(true);
    startTransition(() => {
      const newRawData = rawData.map(r => r.id === updatedRecord.id ? updatedRecord : r);
      setRawData(newRawData);
      setTimeout(() => {
        if (processedData.length > 0) { runProcessWithData(newRawData, newRawData.length, importedFileName, silent); }
        else {
          const { allWithDuplicateMarkers } = processRecords(newRawData, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, importedFileName, exemptPins);
          setPreviewData(allWithDuplicateMarkers);
          if (!silent) setIsProcessing(false);
        }
        if (!silent) { toast({ title: "Record Saved", description: "The property record has been updated and re-validated." }); }
      }, silent ? 0 : 10);
    });
  }, [rawData, processedData.length, importedFileName, locationSettings, taxRates, exemptPins]);

  const handleArchiveRecord = useCallback((record: LandRecord) => { handleSaveRecord({ ...record, isManualArchive: true }, true); toast({ title: "Record Archived", description: "The record has been moved to the Archive tab." }); }, [handleSaveRecord]);
  const handleUnarchiveRecord = useCallback((record: LandRecord) => { handleSaveRecord({ ...record, isManualArchive: false }, true); toast({ title: "Record Restored", description: "The record has been moved back to the Results tab." }); }, [handleSaveRecord]);

  const handleRowClick = useCallback((record: LandRecord) => { 
    setSelectedRecord(record); 
    if (record.statusLabel === 'DUPLICATE') {
      const validPeer = previewData.find(p => p.pin === record.pin && !p.isDuplicate && !p.isCleanup && !p.isManualArchive);
      setComparisonRecord(validPeer || null);
    } else { setComparisonRecord(null); }
  }, [previewData]);

  const handleFinalExport = async (settings: ExportFinalSettings) => {
    setIsExporting(true); setIsExportSettingsOpen(false);
    try {
      await delay(1500);
      const filteredForExport = previewData.filter(r => 
        settings.barangays.includes(r.barangayName || 'UNMAPPED') && 
        settings.statuses.includes(r.statusLabel || 'VALID' as any) &&
        settings.kinds.includes(r.kind?.trim().toUpperCase() || '') &&
        settings.taxabilities.includes(r.taxability || 'T')
      );
      if (filteredForExport.length === 0) { toast({ variant: "destructive", title: "Export Failed", description: "No records match your selected export criteria." }); setIsExporting(false); return; }
      
      const sortedForExport = [...filteredForExport].sort((a, b) => (a.pin || '').localeCompare(b.pin || ''));
      
      const taxableRecords = sortedForExport.filter(r => r.taxability === 'T');
      const exemptRecords = sortedForExport.filter(r => r.taxability === 'E');

      const sum = (recs: LandRecord[], field: keyof LandRecord) => recs.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
      const fmt = (val: number) => `₱${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;

      // Summaries for Taxable
      const tMV28 = sum(taxableRecords, 'marketValue2028');
      const tAV28 = sum(taxableRecords, 'assessedValue2028');
      const tYT28 = sum(taxableRecords, 'yearlyTax2028');
      const tMV29 = sum(taxableRecords, 'marketValue2029');
      const tAV29 = sum(taxableRecords, 'assessedValue2029');
      const tYT29 = sum(taxableRecords, 'yearlyTax2029');

      // Summaries for Exempt
      const eMV28 = sum(exemptRecords, 'marketValue2028');
      const eAV28 = sum(exemptRecords, 'assessedValue2028');
      const eMV29 = sum(exemptRecords, 'marketValue2029');
      const eAV29 = sum(exemptRecords, 'assessedValue2029');

      const headerMapping: Record<string, string> = { 
        date: "DATE", 
        arpNo: "ARP NO#", 
        pin: "PIN", 
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
        yearlyTax: "YEARLY TAX" 
      };

      const activeHeaders = Object.values(headerMapping).filter(h => settings.columns[h]);
      const formattedExport = sortedForExport.map(record => {
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
      const sheetData = [
        ["DATA LINK PARAÑAQUE - SMART EXPORT"], 
        ["EXPORT DATE:", new Date().toLocaleString()], 
        ["TOTAL RECORDS:", sortedForExport.length.toLocaleString()], 
        [],
        ["SUMMARY TAXABLE PROPERTIES"],
        [],
        ["CURRENT (2028)"],
        ["TOTAL MARKET VALUE (2028):", fmt(tMV28)], 
        ["TOTAL ASSESSED VALUE (2028):", fmt(tAV28)],
        ["TOTAL YEARLY TAX (2028 capped at 6%):", fmt(tYT28)],
        [],
        ["RPVARA (2029)"],
        ["TOTAL MARKET VALUE (2029):", fmt(tMV29)], 
        ["TOTAL ASSESSED VALUE (2029):", fmt(tAV29)],
        ["TOTAL YEARLY TAX (2029):", fmt(tYT29)],
        [],
        ["SUMMARY EXEMPTED PROPERTIES"],
        [],
        ["CURRENT (2028)"],
        ["TOTAL MARKET VALUE (2028):", fmt(eMV28)], 
        ["TOTAL ASSESSED VALUE (2028):", fmt(eAV28)],
        [],
        ["RPVARA (2029)"],
        ["TOTAL MARKET VALUE (2029):", fmt(eMV29)], 
        ["TOTAL ASSESSED VALUE (2029):", fmt(eAV29)],
        [], 
        activeHeaders
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.sheet_add_json(ws, formattedExport, { origin: -1, skipHeader: true });
      ws['!cols'] = activeHeaders.map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, ws, "ExportResults");
      XLSX.writeFile(wb, `DataLink-SmartExport-${new Date().toISOString().split('T')[0]}.xlsx`);
      showSuccessToast(`Exported ${sortedForExport.length} records successfully.`);
    } catch (error: any) { toast({ variant: "destructive", title: "Export Failed", description: error.message }); }
    finally { setIsExporting(false); }
  };

  if (!isClient) return null;

  return (
    <div className="h-screen bg-background flex flex-col font-body overflow-hidden" suppressHydrationWarning>
      <input type="file" ref={rawFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'raw')} />
      <input type="file" ref={exemptFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" multiple onChange={(e) => handleDirectImport(e, 'exempt')} />

      {/* --- HEADER --- */}
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

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 flex flex-col p-6 overflow-hidden gap-4 min-h-0">
            <Tabs value={viewMode} onValueChange={(val: any) => { setViewMode(val); setStatusFilter('all'); }} className="flex-1 flex flex-col min-h-0">
              {rawData.length === 0 && viewMode !== 'audit' ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full py-12 scrollbar-vertical-custom overflow-y-auto">
                   <div className="text-center space-y-3 mb-10 shrink-0">
                     <h2 className="text-5xl font-black uppercase tracking-tight text-foreground">Welcome to DataLink</h2>
                     <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Upload your records to begin the cleanup process.</p>
                   </div>
                   <div className="w-full max-w-4xl mx-auto px-6">
                      <ImportZone onDataImported={handleDataImported} mode="raw" />
                   </div>
                </div>
              ) : (
                <div className={cn(
                  "flex-1 flex flex-col min-0 transition-all duration-700 ease-in-out",
                  showDetailedResults ? "gap-4 h-full" : "items-center justify-center h-full",
                  isClearing && "animate-out fade-out zoom-out-95 duration-500 fill-mode-forwards"
                )} suppressHydrationWarning>
                  
                  <div className={cn(
                    "transition-all duration-700 ease-in-out w-full",
                    showDetailedResults ? "shrink-0" : "flex-1 flex items-center justify-center"
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
                          <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-white h-9 text-xs font-bold px-4"><TableIcon className="w-3.5 h-3.5 mr-2" /> Results</TabsTrigger>
                          <TabsTrigger value="archive" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white h-9 text-xs font-bold px-4"><Archive className="w-3.5 h-3.5 mr-2" /> Archive</TabsTrigger>
                          <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-9 text-xs font-bold px-4"><BarChart3 className="w-3.5 h-3.5 mr-2" /> Analytics</TabsTrigger>
                          <TabsTrigger value="audit" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-9 text-xs font-bold px-4"><ShieldCheck className="w-3.5 h-3.5 mr-2" /> Audit Log</TabsTrigger>
                        </TabsList>
                        {viewMode !== 'analytics' && viewMode !== 'audit' && (
                          <div className="flex flex-1 items-center gap-2 w-full max-w-[950px]">
                            <div className="flex items-center gap-2 flex-1">
                              <Select value={searchField} onValueChange={setSearchField}>
                                <SelectTrigger className="w-[120px] h-9 text-xs font-bold uppercase"><SelectValue placeholder="In" /></SelectTrigger>
                                <SelectContent><SelectItem value="all">All Fields</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="arpNo">ARP No#</SelectItem><SelectItem value="pin">PIN</SelectItem><SelectItem value="acctName">Account</SelectItem><SelectItem value="address">Address</SelectItem><SelectItem value="update">Update</SelectItem><SelectItem value="taxability">Taxability</SelectItem><SelectItem value="kind">Kind</SelectItem><SelectItem value="au">AU</SelectItem></SelectContent>
                              </Select>
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder={`Search property records...`} className="pl-9 text-sm h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                              </div>
                            </div>
                            {uniqueBarangays.length > 1 && (
                              <Select value={barangayFilter} onValueChange={setBarangayFilter}>
                                <SelectTrigger className="w-[180px] h-9 text-xs font-bold uppercase"><MapPin className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Barangay" /></SelectTrigger>
                                <SelectContent><SelectItem value="all">All Barangays</SelectItem>{uniqueBarangays.map(brgy => (<SelectItem key={brgy} value={brgy}>{brgy}</SelectItem>))}</SelectContent>
                              </Select>
                            )}
                            {uniqueSourceFiles.length > 1 && (
                              <Select value={sourceFileFilter} onValueChange={setSourceFileFilter}>
                                <SelectTrigger className="w-[150px] h-9 text-xs font-bold uppercase"><Files className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="File Source" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Files</SelectItem>
                                  {uniqueSourceFiles.map(file => (
                                    <SelectItem key={file} value={file}>{file}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="w-[160px] h-9 text-xs font-bold uppercase"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger>
                              <SelectContent><SelectItem value="all">All</SelectItem>{dynamicStatusOptions.sort().map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                            </Select>
                            <div className="flex gap-1">
                               <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-primary hover:bg-muted transition-colors" onClick={() => rawFileInputRef.current?.click()}><Plus className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Import Raw Records (Ctrl + Alt + A)</TooltipContent></Tooltip></TooltipProvider>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden min-h-0">
                        <TabsContent value="results" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"><DataPreviewTable data={filteredDisplayData} isProcessed={processedData.length > 0} onRowClick={handleRowClick} /></TabsContent>
                        <TabsContent value="archive" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"><DataPreviewTable data={filteredDisplayData} isProcessed={true} onRowClick={handleRowClick} /></TabsContent>
                        <TabsContent value="analytics" className="m-0 h-full p-6 overflow-y-auto scrollbar-vertical-custom bg-muted/5 data-[state=active]:flex data-[state=active]:flex-col">
                          <AnalyticsView 
                            analyticsData={analyticsData} 
                            onExplain={setExplainType} 
                            onExpand={setExpandedChart} 
                            taxabilityFilter={taxabilityFilter}
                            onTaxabilityFilterChange={setTaxabilityFilter}
                          />
                        </TabsContent>
                        <TabsContent value="audit" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                          <AuditLogTab reports={processingReports} onClearHistory={() => { setProcessingReports([]); toast({ title: "History Purged", description: "Audit logs cleared permanently." }); }} onDeleteReport={(id) => { setProcessingReports(prev => prev.filter(r => r.id !== id)); toast({ title: "Log Deleted", description: "Audit entry has been removed." }); }} />
                        </TabsContent>
                      </div>
                    </Card>
                  )}

                  <div className="mx-6 mb-4 flex items-center justify-between bg-card p-3 rounded-3xl shadow-2xl border border-white/10 shrink-0 transition-all duration-700 ease-in-out px-6">
                    <div className="flex items-center gap-6">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" onClick={() => setIsExportSettingsOpen(true)} size="sm" className={cn("font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-muted transition-all", showDetailedResults ? "h-10 px-5 text-[10px]" : "h-14 px-8 text-[12px]")} disabled={isExporting}>
                              <FileDown className={cn(showDetailedResults ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2")} /> 
                              {isExporting ? "Generating..." : "Export Data"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Shortcut: Ctrl + E</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                          <TooltipContent>Shortcut: Ctrl + Alt + C</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex gap-4 items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => exemptFileInputRef.current?.click()} className={cn("font-black uppercase tracking-widest text-blue-600 border-blue-500/30 hover:bg-muted transition-all", showDetailedResults ? "h-10 px-5 text-[10px]" : "h-14 px-8 text-[12px]")}>
                              <ShieldOff className={cn(showDetailedResults ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2")} /> Load Exempt Reference
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Load data to be treated as Tax Exempt</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {viewMode !== 'analytics' && viewMode !== 'audit' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="lg" className={cn("bg-primary hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95", showDetailedResults ? "h-10 px-6 text-[10px]" : "h-14 px-10 text-[12px]")} disabled={isProcessing} onClick={() => setIsRunProcessorDialogOpen(true)}>
                                {isProcessing ? "Processing Batch..." : "Run Batch Processor"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Shortcut: Ctrl + Enter</TooltipContent>
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
              <Trash2 className="w-5 h-5 text-red-600" /> Confirm Session Reset
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
              <Loader2 className={cn("w-16 h-16 animate-spin", directImportProgress.mode === 'raw' ? "text-primary" : "text-blue-600")} />
              <div className="absolute inset-0 flex items-center justify-center">
                {directImportProgress.mode === 'raw' ? <BookUser className="w-6 h-6 text-primary" /> : <ShieldOff className="w-6 h-6 text-blue-600" />}
              </div>
            </div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2 text-center">
              {directImportProgress.mode === 'raw' ? "Analyzing Records" : "Indexing PIN Reference"}
            </h3>
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-8 animate-pulse text-center">INITIALIZING ENGINE...</p>
            <div className="w-full pt-6 border-t flex flex-col items-center gap-2">
              <span className={cn("text-[10px] font-black uppercase tracking-widest", directImportProgress.mode === 'raw' ? "text-primary" : "text-blue-600")}>
                Batch Progress: {directImportProgress.current + 1} / {directImportProgress.total}
              </span>
            </div>
            <p className="mt-10 text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">System working • Do not refresh session</p>
          </Card>
        </div>
      )}

      {isProcessing && processingStep !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-10 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105"><div className="relative flex items-center justify-center mb-8"><Loader2 className="w-16 h-16 text-primary animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><Cpu className="w-6 h-6 text-primary" /></div></div><h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-8">Engine Initializing...</h3><div className="w-full space-y-4">{[ { step: 'cleanup', label: '1. System Cleanup', icon: Eraser }, { step: 'dedupe', label: '2. Deduplication', icon: Archive }, { step: 'calibrate', label: '3. Calibration', icon: Cpu } ].map((item) => (<div key={item.step} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-white/5"><div className="flex items-center gap-3"><div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all", processingStep === item.step ? "bg-primary/20 text-primary animate-pulse" : (processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') ? "bg-primary text-white" : "bg-muted text-muted-foreground"))}>{processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') ? <Check className="w-3.5 h-3.5" /> : <item.icon className="w-3.5 h-3.5" />}</div><span className={cn("text-xs font-black uppercase tracking-widest", processingStep === item.step ? "text-primary" : "text-muted-foreground")}>{item.label}</span></div>{processingStep === item.step && <span className="text-[10px] font-bold text-primary animate-pulse uppercase">⏳ Running</span>}{processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') && <span className="text-[10px] font-bold text-primary uppercase">✔ Done</span>}</div>))}</div><p className="mt-8 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Validating Parañaque Land Records</p></Card>
        </div>
      )}

      {isExporting && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-10 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105"><div className="relative flex items-center justify-center mb-8"><Loader2 className="w-16 h-16 text-primary animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><FileSpreadsheet className="w-6 h-6 text-primary" /></div></div><h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-4">Generating File...</h3><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Compiling Parañaque Land Records</p></Card>
        </div>
      )}

      <Dialog open={!!explainType} onOpenChange={(open) => !open && setExplainType(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-white/10 shadow-2xl p-0 overflow-hidden"><div className="bg-primary/5 p-6 border-b"><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> Advanced Data Intelligence Report</DialogTitle><DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Deep-Dive Diagnostic Analysis</DialogDescription></DialogHeader></div><div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-vertical-custom"><div className="p-6 rounded-2xl bg-muted/30 border border-white/5 shadow-inner leading-relaxed"><div className="text-base font-bold text-foreground/90">Placeholder explanation...</div></div><div className="space-y-4"><h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Audit Implications</h5><p className="text-sm font-bold text-muted-foreground leading-relaxed">Based on the detected patterns, this dataset shows high reliability for the primary categories but may require targeted sampling in the outlier groups.</p></div></div><DialogFooter className="p-6 bg-muted/20 border-t"><Button onClick={() => setExplainType(null)} className="w-full h-11 font-black uppercase text-xs tracking-widest shadow-lg hover:bg-slate-900 hover:text-white transition-colors">Acknowledge Report</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isRunProcessorDialogOpen} onOpenChange={setIsRunProcessorDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-6" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setIsRunProcessorDialogOpen(false); runProcess(); } }}><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Processor Configuration</DialogTitle><DialogDescription className="text-sm font-bold text-muted-foreground">Review engine settings before starting the batch run.</DialogDescription></DialogHeader><div className="py-4"><CalibrationSidebar rules={rules} setRules={setRules} options={options} setOptions={setOptions} /></div><DialogFooter className="gap-4"><Button variant="ghost" onClick={() => setIsRunProcessorDialogOpen(false)} className="font-black uppercase text-xs h-10 hover:bg-muted">Cancel</Button><Button onClick={() => { setIsRunProcessorDialogOpen(false); runProcess(); }} className="bg-primary hover:bg-emerald-700 text-white font-black uppercase text-xs h-10 px-8 shadow-lg shadow-primary/20 transition-colors">Continue & Run Processor</Button></DialogFooter></DialogContent>
      </Dialog>

      <ExportSettingsModal open={isExportSettingsOpen} onOpenChange={setIsExportSettingsOpen} data={previewData} isProcessed={processedData.length > 0} exportColumns={exportColumns} onColumnToggle={(col) => setExportColumns(prev => ({ ...prev, [col]: !prev[col] }))} onBulkColumnChange={(cols) => setExportColumns(cols)} onExport={handleFinalExport} />
      <AboutModal open={isAboutOpen} onOpenChange={setIsAboutOpen} />
      <ProcessingReportModal report={latestReport} open={isReportOpen} onOpenChange={setIsReportOpen} />
      <RecordDetailModal record={selectedRecord} comparisonRecord={comparisonRecord} open={!!selectedRecord} onOpenChange={(isOpen) => { if (!isOpen) { setSelectedRecord(null); setComparisonRecord(null); } }} onSave={handleSaveRecord} onArchive={handleArchiveRecord} onUnarchive={handleUnarchiveRecord} />
      
      <Dialog open={!!expandedChart} onOpenChange={(isOpen) => !isOpen && setExpandedChart(null)}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-6 shadow-2xl">
          <DialogHeader className="mb-4 shrink-0"><DialogTitle className="text-xl font-black text-foreground uppercase flex items-center gap-2.5 leading-none tracking-tight">{expandedChart === 'usage' && <><CheckCircle2 className="w-6 h-6 text-primary" /> Usage Distribution Analysis</>}{expandedChart === 'barangay' && <><MapPin className="w-6 h-6 text-primary" /> Barangay Geographic Breakdown</>}{expandedChart === 'update' && <><RefreshCw className="w-6 h-6 text-primary" /> Update Code Tracking</>}{expandedChart === 'market' && <><Database className="w-6 h-6 text-primary" /> Financial Market Value Analysis</>}</DialogTitle></DialogHeader>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
            <div className="lg:col-span-6 bg-muted/5 rounded-2xl border border-white/5 flex items-center justify-center p-6 shadow-inner relative overflow-hidden">
               {/* Simplified chart placeholders for expansion */}
               <div className="text-muted-foreground font-black text-xs uppercase">Rendering High Fidelity Expanded Visual...</div>
            </div>
            <div className="lg:col-span-6 flex flex-col gap-6 min-h-0">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10"><p className="text-xs font-bold leading-relaxed text-muted-foreground uppercase">Detailed distribution analysis for all finalized records in this batch.</p></div>
              <div className="flex-1 overflow-y-auto pr-3 scrollbar-vertical-custom space-y-3">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Loading dataset details...</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
