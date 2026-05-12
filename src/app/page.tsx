
"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
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
  ArrowRight
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
import { BarChart, Bar, XAxis, YAxis, Cell, Pie, PieChart, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportSettingsModal, ExportFinalSettings } from '@/components/dashboard/export-settings-modal';
import { useNotification } from '@/contexts/NotificationContext';
import { SettingsOverlay } from '@/components/dashboard/settings-overlay';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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
  const [viewMode, setViewMode] = useState<'results' | 'archive' | 'analytics' | 'audit'>('results');
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isRunProcessorDialogOpen, setIsRunProcessorDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importMode, setImportMode] = useState<'raw' | 'exempt'>('raw');
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [comparisonRecord, setComparisonRecord] = useState<LandRecord | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // --- 3. FILTER & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFileFilter, setSourceFileFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [taxabilityFilter, setTaxabilityFilter] = useState("all");

  // --- 4. ANALYTICS & DIAGNOSTIC STATE ---
  const [explainType, setExplainType] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<'usage' | 'barangay' | 'update' | 'market' | null>(null);

  // --- 5. ENGINE OPTIONS ---
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

  // --- 6. STATS CALCULATION ---
  const [stats, setStats] = useState({
    totalRawRows: 0, systemCleanup: 0, totalImported: 0, duplicatesRemoved: 0,
    finalCount: 0, totalMarketValue: 0, totalAssessedValue: 0, totalYearlyTax: 0, totalErrors: 0
  });

  const latestReport = processingReports[0] || null;

  // --- 7. DERIVED STATE (useMemo) ---
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

    // Sort by PIN location (ascending)
    const sorted = [...filtered].sort((a, b) => (a.pin || '').localeCompare(b.pin || ''));

    if (viewMode === 'archive' && (statusFilter === 'all' || statusFilter === 'DUPLICATE')) {
      const finalWithComparisons: LandRecord[] = [];
      sorted.forEach(record => {
        if (record.statusLabel === 'DUPLICATE') {
          // Find the active version of this PIN (regardless of status errors)
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

  // --- 8. SIDE EFFECTS (useEffect) ---

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
        if (window.getSelection()?.toString() === '') {
          e.preventDefault();
          clearWorkspace();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setImportMode('raw');
        setIsImportDialogOpen(true);
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

  // --- 9. EVENT HANDLERS (useCallback) ---

  const clearWorkspace = () => {
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
    setStats({ totalRawRows: 0, systemCleanup: 0, totalImported: 0, duplicatesRemoved: 0, finalCount: 0, totalMarketValue: 0, totalAssessedValue: 0, totalYearlyTax: 0, totalErrors: 0 } as any);
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

  const updateStats = (data: LandRecord[], rawCount: number) => {
    const active = data.filter(r => r.statusLabel !== 'CLEANUP' && r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && !r.isManualArchive);
    const valid = active.filter(r => r.statusLabel === 'VALID');
    const errors = active.filter(r => r.statusLabel !== 'VALID').length;
    setStats({ 
      totalRawRows: rawCount,
      systemCleanup: data.filter(r => r.statusLabel === 'CLEANUP' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'DUPLICATE' || r.isManualArchive).length,
      totalImported: rawCount, 
      duplicatesRemoved: data.filter(r => r.statusLabel === 'DUPLICATE').length, 
      finalCount: active.length,
      totalMarketValue: valid.reduce((sum, r) => sum + (r.marketValue || 0), 0),
      totalAssessedValue: valid.reduce((sum, r) => sum + (r.assessedValue || 0), 0),
      totalYearlyTax: valid.reduce((sum, r) => sum + (r.yearlyTax || 0), 0),
      totalErrors: errors
    } as any);
  };

  const handleDataImported = (imported: LandRecord[], fileName: string, rawCount: number) => {
    const updatedExemptPins = new Set(exemptPins);
    if (importMode === 'exempt') {
      imported.forEach(r => { if (r.pin) updatedExemptPins.add(r.pin.trim()); });
      setExemptPins(updatedExemptPins);
    }
    const isAppending = rawData.length > 0;
    const newData = isAppending ? [...rawData, ...imported] : imported;
    const newCount = isAppending ? stats.totalRawRows + rawCount : rawCount;
    let newFileName = fileName;
    if (isAppending) {
        if (importedFileName.includes('Batch')) { newFileName = `${importedFileName.replace(')', '')}, ${fileName})`; }
        else { newFileName = `Batch (${importedFileName}, ${fileName})`; }
    }
    setRawData(newData);
    setImportedFileName(newFileName);
    setProcessedData([]);
    setViewMode('results');
    setShowDetailedResults(false); 
    setSourceFileFilter('all');
    setBarangayFilter('all');
    setIsImportDialogOpen(false);
    const { allWithDuplicateMarkers } = processRecords(newData, [], locationSettings, taxRates, { removeDuplicates: false, applyCalibration: false, systemCleanup: false }, newFileName, updatedExemptPins);
    setPreviewData(allWithDuplicateMarkers);
    updateStats(allWithDuplicateMarkers, newCount);
    toast({ title: importMode === 'exempt' ? "Exempt Data Integrated" : (isAppending ? "Data Appended" : "Data Loaded"), description: importMode === 'exempt' ? `${imported.length} records integrated and indexed as Exempt reference.` : `${rawCount} records from ${fileName} imported successfully.` });
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
              onViewResult: () => { setShowDetailedResults(false); setViewMode('results'); } 
            });
            setTimeout(() => { updateStats(allWithDuplicateMarkers, rawCount); }, 400); 
        }, 800);
      } else { updateStats(allWithDuplicateMarkers, rawCount); }
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
          setPreviewData(allWithDuplicateMarkers); updateStats(allWithDuplicateMarkers, newRawData.length);
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
      const sortedForExport = [...filteredForExport].sort((a, b) => {
        const partsA = (a.pin || '').split('-'); const partsB = (b.pin || '').split('-');
        for (let i = 0; i < 6; i++) {
          const segmentA = partsA[i] || ''; const segmentB = partsB[i] || '';
          const numA = parseInt(segmentA, 10); const numB = parseInt(segmentB, 10);
          if (!isNaN(numA) && !isNaN(numB)) { if (numA !== numB) return numA - numB; }
          else { if (segmentA !== segmentB) return segmentA.localeCompare(segmentB); }
        }
        return 0;
      });
      const totalMarketValue = sortedForExport.reduce((sum, r) => sum + (r.marketValue || 0), 0);
      const totalAssessedValue = sortedForExport.reduce((sum, r) => sum + (r.assessedValue || 0), 0);
      const totalYearlyTax = sortedForExport.reduce((sum, r) => sum + (r.yearlyTax || 0), 0);

      const totalMarketValue2028 = sortedForExport.reduce((sum, r) => sum + (r.marketValue2028 || 0), 0);
      const totalAssessedValue2028 = sortedForExport.reduce((sum, r) => sum + (r.assessedValue2028 || 0), 0);
      const totalYearlyTax2028 = sortedForExport.reduce((sum, r) => sum + (r.yearlyTax2028 || 0), 0);

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
      const activeHeaders = Object.values(headerMapping).filter(h => settings.columns[h]);
      const sheetData = [
        ["DATA LINK PARAÑAQUE - SMART EXPORT"], 
        ["EXPORT DATE:", new Date().toLocaleString()], 
        ["TOTAL RECORDS:", sortedForExport.length.toLocaleString()], 
        [],
        ["SUMMARY (2028)"],
        ["TOTAL MARKET VALUE (2028):", `₱${totalMarketValue2028.toLocaleString(undefined, { minimumFractionDigits: 2 })}`], 
        ["TOTAL ASSESSED VALUE (2028):", `₱${totalAssessedValue2028.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ["TOTAL YEARLY TAX (2028 capped at 6%):", `₱${totalYearlyTax2028.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        [],
        ["SUMMARY (2029)"],
        ["TOTAL MARKET VALUE (2029):", `₱${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`], 
        ["TOTAL ASSESSED VALUE (2029):", `₱${totalAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ["TOTAL YEARLY TAX (2029):", `₱${totalYearlyTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        [], 
        activeHeaders
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.sheet_add_json(ws, formattedExport, { origin: "A16", skipHeader: true });
      ws['!cols'] = activeHeaders.map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, ws, "ExportResults");
      let fileNameParts = ["DataLink-Export"];
      if (settings.barangays.length < uniqueBarangays.length) {
          if (settings.barangays.length === 1 && settings.barangays[0] !== 'UNMAPPED') { fileNameParts.push(settings.barangays[0].replace(/ /g, '-')); }
          else if (settings.barangays.length > 1) { fileNameParts.push(`${settings.barangays.length}Brgys`); }
      }
      if (settings.statuses.length < dynamicStatusOptions.length) {
          if (settings.statuses.length === 1) { fileNameParts.push(settings.statuses[0].replace(/ /g, '-').replace(/#/g, '')); }
          else if (settings.statuses.length > 1) { fileNameParts.push(`${settings.statuses.length}Types`); }
      }
      const dateStr = new Date().toISOString().split('T')[0];
      fileNameParts.push(dateStr);
      const fileName = `${fileNameParts.join('_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      const exportReport: ProcessingReport = { id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, timestamp: new Date().toLocaleString(), fileName: `${fileName} (CUSTOM EXPORT)`, totalImported: sortedForExport.length, cleanupCount: 0, duplicatesDetected: 0, calibratedCount: 0, errorCount: sortedForExport.filter(r => !r.isValid).length, validCount: sortedForExport.filter(r => r.isValid).length, totalMarketValue: totalMarketValue, totalAssessedValue: totalAssessedValue, totalMarketValue2028: totalMarketValue2028, totalAssessedValue2028: totalAssessedValue2028, totalYearlyTax2028: totalYearlyTax2028, records: sortedForExport };
      setProcessingReports(prev => [exportReport, ...prev]);
      showSuccessToast(`Exported ${sortedForExport.length} records successfully.`);
    } catch (error: any) { toast({ variant: "destructive", title: "Export Failed", description: error.message }); }
    finally { setIsExporting(false); }
  };

  const getInsightText = (type: string): React.ReactNode => {
    const data = analyticsData;
    const highlight = (val: any) => <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">{val}</span>;
    const neutralHighlight = (val: any) => <span className="text-foreground font-black">{val}</span>;
    if (data.totalRecords === 0) return "Insufficient data currently active. Please adjust your filters or run the processor to generate detailed diagnostics.";
    switch (type) {
      case 'usage': {
        const top = data.auChart[0]; const percentage = ((top.value / data.totalRecords) * 100).toFixed(1); const second = data.auChart[1];
        return ( <div className="space-y-4"> <p>The property distribution analysis reveals a primary concentration in {highlight(top.name)}, representing {highlight(percentage + "%")} of the active dataset with {highlight(top.value.toLocaleString() + " parcels")}.</p> {second && ( <p>This category maintains a significant lead over {neutralHighlight(second.name)}, which holds the second position. The delta between these two primary usages is {highlight((top.value - second.value).toLocaleString() + " units")}, indicating a highly skewed development priority or data refresh cycle.</p> )} <p>Audit Insight: With {highlight(data.auChart.length)} unique usage types detected, the engine suggests prioritizing verification for {highlight(top.name)} to ensure the highest impact on overall data accuracy.</p> </div> );
      }
      case 'barangay': {
        const top = data.barangayChart[0]; const totalRaw = data.barangayChart.reduce((sum, item) => sum + item.value, 0); const density = ((top.value / totalRaw) * 100).toFixed(1);
        return ( <div className="space-y-4"> <p>Geographic intelligence identifies {highlight(top.name)} as the most active sector in this batch, accounting for {highlight(density + "%")} of all records ({highlight(top.value.toLocaleString() + " properties")}).</p> <p>The current session spans {highlight(data.barangayChart.length)} distinct barangays. The high density in {neutralHighlight(top.name)} suggests a localized general revision or a major parcel subdivision project within this specific administrative boundary.</p> <p>Audit Insight: Concentrated geographic data allows for efficient field-based verification batches. The engine recommends a {highlight("focused audit pass")} for {top.name} to validate the latest boundary adjustments.</p> </div> );
      }
      case 'update': {
        const sorted = [...data.updateChart].sort((a, b) => b.value - a.value); const top = sorted[0];
        return ( <div className="space-y-4"> <p>Administrative tracking shows that update code {highlight(top.name)} is the primary driver of record revisions, appearing in {highlight(top.value.toLocaleString() + " instances")}. This represents {highlight(((top.value / data.totalRecords) * 100).toFixed(1) + "%")} of all session activity.</p> <p>With {highlight(data.updateChart.length)} unique update reasons logged, the data reflects a complex maintenance cycle. The prevalence of {neutralHighlight(top.name)} provides a clear audit trail for the batch's primary objective.</p> <p>Audit Insight: High frequencies of specific update codes can signal systematic data entry patterns. Ensure that {highlight(top.name)} complies with the latest {highlight("City Ordinance valuation standards")}.</p> </div> );
      }
      case 'market': {
        const sortedMarket = [...data.marketChart].sort((a, b) => b.value - a.value); const top = sortedMarket[0]; const totalValue = data.marketChart.reduce((sum, item) => sum + item.value, 0); const percentage = ((top.value / totalValue) * 100).toFixed(1); const avgValue = (totalValue / data.totalRecords);
        return ( <div className="space-y-4"> <p>Financial analysis confirms {highlight(top.name)} as the primary value contributor, adding {highlight("₱" + top.value.toLocaleString(undefined, { minimumFractionDigits: 2 }))} to the total session valuation.</p> <p>This single category accounts for {highlight(percentage + "%")} of the entire {highlight("₱" + totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 }))} portfolio currently being processed. The average property value across the session stands at {highlight("₱" + avgValue.toLocaleString(undefined, { minimumFractionDigits: 2 }))}.</p> <p>Audit Insight: High-value outliers in the {highlight(top.name)} category represent the {highlight("highest financial risk")} for the city. Double-verify the land area and unit values for these specific parcels to prevent valuation leakages.</p> </div> );
      }
      default: return "";
    }
  };

  if (!isClient) return null;

  return (
    <div className="h-screen bg-background flex flex-col font-body overflow-hidden" suppressHydrationWarning>
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
          {deferredPrompt && <Button variant="ghost" size="icon" onClick={handleInstallClick} className="hover:bg-muted hover:text-primary"><Download className="w-5 h-5" /></Button>}
          <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="hover:bg-muted hover:text-primary">{isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</Button>
          <ModeToggle />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsSettingsOpen(true)}
                  className={cn("transition-all hover:bg-muted hover:text-primary", isSettingsOpen && "bg-primary text-white hover:bg-emerald-700 hover:text-white")}
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
                  showDetailedResults ? "gap-4 h-full" : "items-center justify-center h-full"
                )} suppressHydrationWarning>
                  
                  {/* Metric Overview with transition */}
                  <div className={cn(
                    "transition-all duration-700 ease-in-out w-full",
                    showDetailedResults ? "shrink-0" : "flex-1 flex items-center justify-center"
                  )}>
                    <div className={cn(
                      "transition-all duration-700 ease-in-out w-full",
                      !showDetailedResults && "animate-in fade-in zoom-in-95 duration-1000"
                    )}>
                      <MetricOverview stats={stats} variant={showDetailedResults ? 'default' : 'hero'} />
                    </div>
                  </div>

                  {!showDetailedResults && viewMode !== 'audit' ? (
                    <div className="shrink-0 flex flex-col items-center justify-center pb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                      <Button 
                        size="lg" 
                        onClick={() => setShowDetailedResults(true)}
                        className="h-16 px-16 bg-primary hover:bg-emerald-700 hover:text-white font-black uppercase tracking-[0.25em] text-xs shadow-2xl transition-all active:scale-95 group"
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
                                <SelectContent><SelectItem value="all">All Files</SelectItem>{uniqueSourceFiles.map(file => (<SelectItem key={file} value={file}>{file}</SelectItem>))}</SelectContent>
                              </Select>
                            )}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="w-[160px] h-9 text-xs font-bold uppercase"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger>
                              <SelectContent><SelectItem value="all">All</SelectItem>{dynamicStatusOptions.sort().map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                            </Select>
                            <div className="flex gap-1">
                               <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-primary hover:bg-muted hover:text-primary" onClick={() => { setImportMode('raw'); setIsImportDialogOpen(true); }}><Plus className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Import Raw Records (Ctrl + Alt + A)</TooltipContent></Tooltip></TooltipProvider>
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

                  <div className={cn(
                    "mx-auto flex items-center bg-card p-2 rounded-2xl shadow-2xl border border-white/10 shrink-0 transition-all duration-700 ease-in-out px-4",
                    showDetailedResults ? "gap-12" : "gap-6"
                  )}>
                    <div className="flex gap-4">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" onClick={() => setIsExportSettingsOpen(true)} size="sm" className="font-black uppercase text-[11px] tracking-widest border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-all h-10 px-6" disabled={isExporting}><FileDown className="w-4 h-4 mr-2" /> {isExporting ? "Generating..." : "Export Data"}</Button></TooltipTrigger><TooltipContent>Shortcut: Ctrl + E</TooltipContent></Tooltip></TooltipProvider>
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-10 text-[11px] font-bold uppercase px-4 hover:bg-muted hover:text-foreground" onClick={clearWorkspace}><Eraser className="w-3.5 h-3.5 mr-1" /> Clear Session</Button></TooltipTrigger><TooltipContent>Shortcut: Ctrl + Alt + C</TooltipContent></Tooltip></TooltipProvider>
                      {viewMode !== 'audit' && (
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" onClick={() => { setImportMode('exempt'); setIsImportDialogOpen(true); }} className="h-10 px-6 font-black uppercase text-[10px] tracking-widest text-blue-600 border-blue-500/30 hover:bg-blue-600/10 hover:text-blue-600 transition-all"><ShieldOff className="w-3.5 h-3.5 mr-2" /> Load Exempt Reference</Button></TooltipTrigger><TooltipContent>Load data to be treated as Tax Exempt</TooltipContent></Tooltip></TooltipProvider>
                      )}
                    </div>
                    <div className="flex gap-4">
                      {viewMode !== 'analytics' && viewMode !== 'audit' && (
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="lg" className="bg-primary hover:bg-emerald-700 hover:text-white px-8 font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-95 h-10" disabled={isProcessing} onClick={() => setIsRunProcessorDialogOpen(true)}>{isProcessing ? "Processing Batch..." : "Run Batch Processor"}</Button></TooltipTrigger><TooltipContent>Shortcut: Ctrl + Enter</TooltipContent></Tooltip></TooltipProvider>
                      )}
                      {(viewMode === 'audit' || (showDetailedResults && viewMode !== 'results')) && ( <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 hover:text-white px-8 font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-95 h-10" onClick={() => { setShowDetailedResults(false); setViewMode('results'); }}>Return to Dashboard</Button> )}
                    </div>
                  </div>
                </div>
              )}
            </Tabs>
          </main>
      </div>

      {/* --- SETTINGS PANEL --- */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="sm:max-w-[1200px] w-[95vw] p-0 border-none bg-card shadow-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Configuration Panel</SheetTitle>
            <SheetDescription>Update global settings and calibration rules.</SheetDescription>
          </SheetHeader>
          <SettingsOverlay onClose={() => setIsSettingsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* --- DIALOGS & OVERLAYS --- */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-none bg-transparent">
          <DialogHeader className="sr-only">
            <DialogTitle>Data Import Staging Zone</DialogTitle>
            <DialogDescription>Stage and review property records for batch processing.</DialogDescription>
          </DialogHeader>
          <div className="bg-background rounded-3xl p-8 border shadow-2xl h-full overflow-y-auto">
            <ImportZone onDataImported={handleDataImported} mode="raw" />
          </div>
        </DialogContent>
      </Dialog>

      {isProcessing && processingStep !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-10 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105">
            <div className="relative flex items-center justify-center mb-8"><Loader2 className="w-16 h-16 text-primary animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><Cpu className="w-6 h-6 text-primary" /></div></div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-8">Engine Initializing...</h3>
            <div className="w-full space-y-4">
              {[ { step: 'cleanup', label: '1. System Cleanup', icon: Eraser }, { step: 'dedupe', label: '2. Deduplication', icon: Archive }, { step: 'calibrate', label: '3. Calibration', icon: Cpu } ].map((item) => (
                <div key={item.step} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all", processingStep === item.step ? "bg-primary/20 text-primary animate-pulse" : (processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') ? "bg-primary text-white" : "bg-muted text-muted-foreground"))}>{processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') ? <Check className="w-3.5 h-3.5" /> : <item.icon className="w-3.5 h-3.5" />}</div>
                    <span className={cn("text-xs font-black uppercase tracking-widest", processingStep === item.step ? "text-primary" : "text-muted-foreground")}>{item.label}</span>
                  </div>
                  {processingStep === item.step && <span className="text-[10px] font-bold text-primary animate-pulse uppercase">⏳ Running</span>}
                  {processingStep !== 'idle' && processingStep !== 'cleanup' && (item.step === 'cleanup' || (processingStep === 'calibrate' && item.step === 'dedupe') || processingStep === 'complete') && <span className="text-[10px] font-bold text-primary uppercase">✔ Done</span>}
                </div>
              ))}
            </div>
            <p className="mt-8 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Validating Parañaque Land Records</p>
          </Card>
        </div>
      )}

      {isExporting && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-10 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105"><div className="relative flex items-center justify-center mb-8"><Loader2 className="w-16 h-16 text-primary animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><FileSpreadsheet className="w-6 h-6 text-primary" /></div></div><h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-4">Generating File...</h3><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Compiling Parañaque Land Records</p></Card>
        </div>
      )}

      <Dialog open={!!explainType} onOpenChange={(open) => !open && setExplainType(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-white/10 shadow-2xl p-0 overflow-hidden"><div className="bg-primary/5 p-6 border-b"><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> Advanced Data Intelligence Report</DialogTitle><DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Deep-Dive Diagnostic Analysis</DialogDescription></DialogHeader></div><div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-vertical-custom"><div className="p-6 rounded-2xl bg-muted/30 border border-white/5 shadow-inner leading-relaxed"><div className="text-base font-bold text-foreground/90">{explainType && getInsightText(explainType)}</div></div><div className="space-y-4"><h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Audit Implications</h5><p className="text-sm font-bold text-muted-foreground leading-relaxed">Based on the detected patterns, this dataset shows high reliability for the primary categories but may require targeted sampling in the outlier groups. Identifying these densities allows for more efficient resource allocation during the manual verification phase.</p></div><div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20"><TrendingUp className="w-5 h-5 text-primary shrink-0" /><p className="text-[11px] font-black uppercase text-primary leading-snug">This diagnostic report is refreshed instantly whenever filters are applied or data is updated.</p></div></div><DialogFooter className="p-6 bg-muted/20 border-t"><Button onClick={() => setExplainType(null)} className="w-full h-11 font-black uppercase text-xs tracking-widest shadow-lg hover:bg-slate-900 hover:text-white">Acknowledge intelligence Report</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isRunProcessorDialogOpen} onOpenChange={setIsRunProcessorDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-6" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setIsRunProcessorDialogOpen(false); runProcess(); } }}><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Processor Configuration</DialogTitle><DialogDescription className="text-sm font-bold text-muted-foreground">Review engine settings before starting the batch run.</DialogDescription></DialogHeader><div className="py-4"><CalibrationSidebar rules={rules} setRules={setRules} options={options} setOptions={setOptions} /></div><DialogFooter className="gap-4"><Button variant="ghost" onClick={() => setIsRunProcessorDialogOpen(false)} className="font-black uppercase text-xs h-10 hover:bg-muted hover:text-foreground">Cancel</Button><Button onClick={() => { setIsRunProcessorDialogOpen(false); runProcess(); }} className="bg-primary hover:bg-emerald-700 hover:text-white font-black uppercase text-xs h-10 px-8 shadow-lg shadow-primary/20">Continue & Run Processor</Button></DialogFooter></DialogContent>
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
              {expandedChart === 'market' ? (
                <ChartContainer config={{ value: { label: "Value", color: "hsl(var(--primary))" } }} className="h-full w-full aspect-auto"><PieChart><Pie data={analyticsData.marketChart} cx="50%" cy="50%" innerRadius={100} outerRadius={140} paddingAngle={10} dataKey="value" stroke="none" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`} labelLine={true}>{analyticsData.marketChart.map((entry, index) => <Cell key={`cell-expanded-m-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer>
              ) : (
                <ChartContainer config={{ value: { label: "Count", color: "hsl(var(--primary))" } }} className="h-full w-full aspect-auto"><BarChart data={ expandedChart === 'usage' ? analyticsData.auChart : expandedChart === 'barangay' ? analyticsData.barangayChart : analyticsData.updateChart } layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.1} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} fontSize={10} fontWeight="bold" /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="value" radius={[0, 4, 4, 0]}>{(expandedChart === 'usage' ? analyticsData.auChart : expandedChart === 'barangay' ? analyticsData.barangayChart : analyticsData.updateChart).map((entry, index) => <Cell key={`cell-exp-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ChartContainer>
              )}
            </div>
            <div className="lg:col-span-6 flex flex-col gap-6 min-h-0">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10"><p className="text-xs font-bold leading-relaxed text-muted-foreground uppercase">Detailed distribution of <span className="text-foreground font-black">{expandedChart}</span> data for all finalized records in this batch.</p></div>
              <div className="flex-1 overflow-y-auto pr-3 scrollbar-vertical-custom space-y-3">
                {(expandedChart === 'market' ? analyticsData.marketChart : (expandedChart === 'usage' ? analyticsData.auChart : (expandedChart === 'barangay' ? analyticsData.barangayChart : analyticsData.updateChart))).map((item, index, dataList) => {
                  const total = dataList.reduce((sum, curr) => sum + curr.value, 0); const percentage = ((item.value / (total || 1)) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="flex flex-col gap-2 p-4 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/40 transition-all shadow-sm">
                      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="text-sm font-black uppercase tracking-tight">{item.name}</span><span className="text-xs font-black text-primary px-2 py-0.5 rounded-full bg-primary/10">{percentage}%</span></div><span className="text-sm font-mono font-bold">{expandedChart === 'market' ? `₱${item.value.toLocaleString()}` : `${item.value.toLocaleString()} units`}</span></div>
                      <div className="w-full h-1.5 bg-background/50 rounded-full overflow-hidden shadow-inner"><div className="h-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
