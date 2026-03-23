
"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import Image from 'next/image';
import { 
  FileDown, 
  Eraser, 
  Settings,
  Archive,
  CheckCircle2,
  FileSearch,
  Database,
  Download,
  Search,
  Filter,
  BarChart3,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  Info,
  Layers,
  Zap,
  Cpu,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Files,
  ArrowRightLeft,
  Plus,
  MapPin,
  HelpCircle,
  RotateCcw,
  RefreshCw
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
import { SettingsPanel } from '@/components/dashboard/settings-panel';
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
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart, Legend, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExportSettingsModal, ExportFinalSettings } from '@/components/dashboard/export-settings-modal';

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

export default function Home() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isClient, setIsClient] = useState(false);
  // Default to full control mode
  const [userMode] = useState<'fast' | 'full'>('full');
  const [rawData, setRawData] = useState<LandRecord[]>([]);
  const [previewData, setPreviewData] = useState<LandRecord[]>([]);
  const [processedData, setProcessedData] = useState<LandRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [rules, setRules] = useState<CalibrationRule[]>([]);
  const [viewMode, setViewMode] = useState<'results' | 'archive' | 'analytics' | 'audit'>('results');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isRunProcessorDialogOpen, setIsRunProcessorDialogOpen] = useState(false);
  const [processingReports, setProcessingReports] = useState<ProcessingReport[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [isMarketDetailOpen, setIsMarketDetailOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFileFilter, setSourceFileFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");

  const [options, setOptions] = useState({
    removeDuplicates: true,
    applyCalibration: true,
    systemCleanup: true
  });
  
  const defaultExportColumns = {
    "DATE": true, "ARP NO#": true, "PIN": true, "UPDATE": true,
    "ACCTNAME": true, "ADDRESS": true, "LOCATION": true, "KIND": true,
    "AU": true, "LAND AREA": true, "UNIT VALUE": true, "MARKET VALUE": true,
    "ASSESSED VALUE": true, "YEARLY TAX": true,
  };
  const [exportColumns, setExportColumns] = useState<Record<string, boolean>>(defaultExportColumns);
  const [locationSettings, setLocationSettings] = useState<BarangayConfig[]>(initialLocationSettings);
  const [taxRates, setTaxRates] = useState<TaxRateMap>(defaultTaxRates);

  const [stats, setStats] = useState({
    totalRawRows: 0, systemCleanup: 0, totalImported: 0, duplicatesRemoved: 0,
    finalCount: 0, totalMarketValue: 0, totalAssessedValue: 0, totalErrors: 0
  });

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
      document.addEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ rules, exportColumns, locationSettings, options, taxRates, processingReports }));
    }
  }, [rules, exportColumns, locationSettings, options, taxRates, processingReports, isClient]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => { console.error(`Error attempting to enable full-screen mode: ${err.message}`); });
    } else { document.exitFullscreen(); }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDataImported = (imported: LandRecord[], fileName: string, rawCount: number) => {
    const isAppending = rawData.length > 0;
    const newData = isAppending ? [...rawData, ...imported] : imported;
    const newCount = isAppending ? stats.totalRawRows + rawCount : rawCount;
    
    let newFileName = fileName;
    if (isAppending) {
        if (importedFileName.includes('Batch')) {
            newFileName = `${importedFileName.replace(')', '')}, ${fileName})`;
        } else {
            newFileName = `Batch (${importedFileName}, ${fileName})`;
        }
    }

    setRawData(newData);
    setImportedFileName(newFileName);
    setProcessedData([]);
    setViewMode('results');
    setSourceFileFilter('all');
    setBarangayFilter('all');
    setIsImportDialogOpen(false);
    
    // Defaulting to processing logic
    const { allWithDuplicateMarkers } = processRecords(newData, [], locationSettings, taxRates, {
      removeDuplicates: false,
      applyCalibration: false,
      systemCleanup: false
    }, newFileName);
    setPreviewData(allWithDuplicateMarkers);
    updateStats(allWithDuplicateMarkers, newCount);
    toast({
      title: isAppending ? "Data Appended" : "Data Loaded",
      description: isAppending 
          ? `${rawCount} more records added to the session.` 
          : `${rawCount} records from ${fileName} imported successfully.`,
    });
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
      totalErrors: errors
    } as any);
  };

  const runProcessWithData = async (data: LandRecord[], rawCount: number, fileName: string, silent = false) => {
    if (!silent) setIsProcessing(true);
    
    setTimeout(() => {
      startTransition(() => {
        const processOptions = options;
        const { processed, allWithDuplicateMarkers, report } = processRecords(data, rules, locationSettings, taxRates, processOptions, fileName);
        setProcessedData(processed);
        setPreviewData(allWithDuplicateMarkers);
        setProcessingReports(prev => [report, ...prev]);
        updateStats(allWithDuplicateMarkers, rawCount);
        
        if (!silent) {
          setProcessSuccess(true);
          setTimeout(() => setProcessSuccess(false), 1500);
          setIsProcessing(false);
        }
      });
    }, silent ? 0 : 10);
  };

  const runProcess = async () => {
    if (rawData.length === 0) return;
    runProcessWithData(rawData, rawData.length, importedFileName);
  };

  const handleSaveRecord = useCallback((updatedRecord: LandRecord, silent = false) => {
    setSelectedRecord(null);
    if (!silent) setIsProcessing(true);

    startTransition(() => {
      const newRawData = rawData.map(r => r.id === updatedRecord.id ? updatedRecord : r);
      setRawData(newRawData);
      
      setTimeout(() => {
        if (processedData.length > 0) {
          runProcessWithData(newRawData, newRawData.length, importedFileName, silent);
        } else {
          const { allWithDuplicateMarkers } = processRecords(newRawData, [], locationSettings, taxRates, {
            removeDuplicates: false, applyCalibration: false, systemCleanup: false
          }, importedFileName);
          setPreviewData(allWithDuplicateMarkers);
          updateStats(allWithDuplicateMarkers, newRawData.length);
          if (!silent) setIsProcessing(false);
        }
        if (!silent) {
          toast({ title: "Record Saved", description: "The property record has been updated and re-validated." });
        }
      }, silent ? 0 : 10);
    });
  }, [rawData, processedData.length, importedFileName, locationSettings, taxRates]);

  const handleArchiveRecord = useCallback((record: LandRecord) => {
    handleSaveRecord({ ...record, isManualArchive: true }, true);
    toast({ title: "Record Archived", description: "The record has been moved to the Archive tab." });
  }, [handleSaveRecord]);

  const handleUnarchiveRecord = useCallback((record: LandRecord) => {
    handleSaveRecord({ ...record, isManualArchive: false }, true);
    toast({ title: "Record Restored", description: "The record has been moved back to the Results tab." });
  }, [handleSaveRecord]);
  
  const dynamicStatusOptions = useMemo(() => {
    const activeData = viewMode === 'archive' 
      ? previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.isManualArchive)
      : (processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP' && !r.isManualArchive));
    
    const available = new Set<string>();
    activeData.forEach(r => {
        if (r.statusLabel) available.add(r.statusLabel);
    });
    
    return Array.from(available);
  }, [previewData, processedData, viewMode]);

  const handleFinalExport = async (settings: ExportFinalSettings) => {
    setIsExporting(true);
    setIsExportSettingsOpen(false);

    try {
      const dataToFilter = previewData;
      const filteredForExport = dataToFilter.filter(r => 
        settings.barangays.includes(r.barangayName || 'UNMAPPED') && 
        settings.statuses.includes(r.statusLabel || 'VALID' as any)
      );

      if (filteredForExport.length === 0) {
        toast({ variant: "destructive", title: "Export Failed", description: "No records match your selected export criteria." });
        setIsExporting(false);
        return;
      }

      const totalMarketValue = filteredForExport.reduce((sum, r) => sum + (r.marketValue || 0), 0);
      const totalAssessedValue = filteredForExport.reduce((sum, r) => sum + (r.assessedValue || 0), 0);
      
      const headerMapping: Record<string, string> = {
        date: "DATE", arpNo: "ARP NO#", pin: "PIN", update: "UPDATE",
        acctName: "ACCTNAME", address: "ADDRESS", location: "LOCATION",
        kind: "KIND", au: "AU", landArea: "LAND AREA", unitValue: "UNIT VALUE",
        marketValue: "MARKET VALUE", assessedValue: "ASSESSED VALUE", yearlyTax: "YEARLY TAX"
      };

      const formattedExport = filteredForExport.map(record => {
        const row: any = {};
        Object.entries(headerMapping).forEach(([key, label]) => {
          if (settings.columns[label]) row[label] = record[key as keyof LandRecord];
        });
        return row;
      });

      const wb = XLSX.utils.book_new();
      const activeHeaders = Object.values(headerMapping).filter(h => settings.columns[h]);
      
      const sheetData = [
        ["DATA LINK PARAÑAQUE - SMART EXPORT"],
        ["EXPORT DATE:", new Date().toLocaleString()],
        ["TOTAL RECORDS:", filteredForExport.length.toLocaleString()],
        ["TOTAL MARKET VALUE:", `₱${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ["TOTAL ASSESSED VALUE:", `₱${totalAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        [],
        activeHeaders
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.sheet_add_json(ws, formattedExport, { origin: "A8", skipHeader: true });
      ws['!cols'] = activeHeaders.map(() => ({ wch: 22 }));

      XLSX.utils.book_append_sheet(wb, ws, "ExportResults");
      
      let fileNameParts = ["DataLink-Export"];
      if (settings.barangays.length < uniqueBarangays.length) {
          if (settings.barangays.length === 1 && settings.barangays[0] !== 'UNMAPPED') {
              fileNameParts.push(settings.barangays[0].replace(/ /g, '-'));
          } else if (settings.barangays.length > 1) {
              fileNameParts.push(`${settings.barangays.length}Brgys`);
          }
      }
  
      if (settings.statuses.length < dynamicStatusOptions.length) {
          if (settings.statuses.length === 1) {
              fileNameParts.push(settings.statuses[0].replace(/ /g, '-').replace(/#/g, ''));
          } else if (settings.statuses.length > 1) {
             fileNameParts.push(`${settings.statuses.length}Types`);
          }
      }
      const dateStr = new Date().toISOString().split('T')[0];
      fileNameParts.push(dateStr);
      const fileName = `${fileNameParts.join('_')}.xlsx`;
      
      XLSX.writeFile(wb, fileName);

      const exportReport: ProcessingReport = {
        timestamp: new Date().toLocaleString(),
        fileName: `${fileName} (CUSTOM EXPORT)`,
        totalImported: filteredForExport.length,
        cleanupCount: 0,
        duplicatesDetected: 0,
        calibratedCount: 0,
        errorCount: filteredForExport.filter(r => !r.isValid).length,
        validCount: filteredForExport.filter(r => r.isValid).length,
        totalMarketValue: totalMarketValue,
        totalAssessedValue: totalAssessedValue,
      };
      setProcessingReports(prev => [exportReport, ...prev]);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 1500);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Export Failed", description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRowClick = useCallback((record: LandRecord) => { 
    setSelectedRecord(record); 
  }, []);

  const filteredDisplayData = useMemo(() => {
    const baseData = viewMode === 'archive' 
      ? previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.isManualArchive)
      : (processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP' && !r.isManualArchive));

    return baseData.filter(record => {
      if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
      if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;

      const query = searchQuery.toLowerCase();
      let matchesSearch = true;
      if (query) {
        if (searchField === 'all') {
          matchesSearch = record.acctName?.toLowerCase().includes(query) || record.pin?.toLowerCase().includes(query) || record.arpNo?.toLowerCase().includes(query) || record.location?.toLowerCase().includes(query) || record.au?.toLowerCase().includes(query) || record.sourceFile?.toLowerCase().includes(query);
        } else {
          const value = record[searchField as keyof LandRecord];
          matchesSearch = String(value || '').toLowerCase().includes(query);
        }
      }
      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      
      return record.statusLabel === statusFilter;
    });
  }, [previewData, processedData, viewMode, searchQuery, searchField, statusFilter, sourceFileFilter, barangayFilter]);

  const analyticsData = useMemo(() => {
    const activeData = processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'CLEANUP' && r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && !r.isManualArchive);
    const filteredActiveData = activeData.filter(record => {
      if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
      if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;
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
      auChart: Object.entries(auDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value),
      marketChart: Object.entries(marketValueSum).map(([name, value]) => ({ name, value })).filter(item => item.value > 0),
      updateChart: Object.entries(updateDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => a.value - b.value),
      barangayChart: Object.entries(barangayDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value)
    };
  }, [processedData, previewData, sourceFileFilter, barangayFilter]);

  const clearWorkspace = () => {
    setRawData([]);
    setProcessedData([]);
    setPreviewData([]);
    setSearchQuery("");
    setImportedFileName("");
    setSourceFileFilter("all");
    setBarangayFilter("all");
    setStats({
      totalRawRows: 0, systemCleanup: 0, totalImported: 0, duplicatesRemoved: 0,
      finalCount: 0, totalMarketValue: 0, totalAssessedValue: 0, totalErrors: 0
    } as any);
    toast({ title: "Workspace Cleared", description: "All active data removed. Audit logs preserved." });
  };

  const clearAuditHistory = () => {
    setProcessingReports([]);
    toast({ title: "History Purged", description: "Audit logs cleared permanently." });
  };

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
  if (!isClient) return null;

  const statDefinitions = [
    {
      label: "Imported Rows",
      value: stats.totalRawRows.toLocaleString(),
      icon: Files,
      color: "border-l-slate-400",
      definition: "The total count of all raw data lines detected across all your uploaded spreadsheets before any filtering or processing."
    },
    {
      label: "Data Errors",
      value: stats.totalErrors.toLocaleString(),
      icon: AlertTriangle,
      color: "border-l-red-500 bg-red-500/5",
      textClass: "text-red-600",
      definition: "Records flagged for critical data issues like missing Property Identification Numbers (PIN) or invalid formats that require manual correction."
    },
    {
      label: "Engine Cleanup",
      value: stats.systemCleanup.toLocaleString(),
      icon: Eraser,
      color: "border-l-orange-400",
      textClass: "text-orange-600",
      definition: "Rows identified as non-data noise, duplicates, or incomplete entries that are moved to the Archive tab."
    },
    {
      label: "Valid Records",
      value: stats.finalCount.toLocaleString(),
      icon: CheckCircle2,
      color: "border-l-primary bg-primary/5",
      textClass: "text-primary",
      definition: "The finalized set of clean, unique, and verified records that have passed all city-standard validation rules."
    },
    {
      label: "Duplicates",
      value: stats.duplicatesRemoved.toLocaleString(),
      icon: Archive,
      color: "border-l-amber-400 bg-amber-500/5",
      textClass: "text-amber-500",
      definition: "Multiple records sharing the same PIN. The engine automatically moves duplicates to the Archive tab."
    },
    {
      label: "Total Market",
      value: `₱${stats.totalMarketValue?.toLocaleString()}`,
      icon: Database,
      color: "border-l-green-600 bg-green-500/5",
      textClass: "text-green-600",
      definition: "The combined Market Value of all currently filtered valid records."
    },
    {
      label: "Total Assessed",
      value: `₱${stats.totalAssessedValue?.toLocaleString()}`,
      icon: BarChart3,
      color: "border-l-blue-600 bg-green-500/5",
      textClass: "text-blue-600",
      definition: "The sum of all Assessed Values for valid records."
    }
  ];

  return (
    <div className="h-screen bg-background flex flex-col font-body overflow-hidden" suppressHydrationWarning>
      <header className="bg-card/80 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg shrink-0 z-50 overflow-visible">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-[5px] cursor-pointer hover:opacity-80 transition-all active:scale-95 group relative" onClick={() => window.location.reload()}>
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
            <TooltipContent>Click to refresh session</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex items-center gap-1.5">
          {deferredPrompt && <Button variant="ghost" size="icon" onClick={handleInstallClick}><Download className="w-5 h-5" /></Button>}
          <Button variant="ghost" size="icon" onClick={toggleFullScreen}>{isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</Button>
          <Button variant="ghost" size="icon" onClick={() => setIsAboutOpen(true)}><Info className="w-5 h-5" /></Button>
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}><Settings className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col p-6 overflow-hidden gap-4 min-h-0">
          <Tabs value={viewMode} onValueChange={(val: any) => { setViewMode(val); setStatusFilter('all'); }} className="flex-1 flex flex-col min-h-0">
            {rawData.length === 0 && viewMode !== 'audit' ? (
              <div className="flex-1 flex items-center justify-center h-full"><ImportZone onDataImported={handleDataImported} /></div>
            ) : (
              <div className="flex-1 flex flex-col gap-4 h-full min-h-0" suppressHydrationWarning>
                {viewMode !== 'audit' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 shrink-0">
                    {statDefinitions.map((stat, i) => (
                      <Popover key={i}>
                        <PopoverTrigger asChild>
                          <Card className={cn("p-4 border-l-4 flex flex-col shadow-sm cursor-help transition-all hover:scale-[1.03] active:scale-95 hover:shadow-md", stat.color)}>
                            <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5 tracking-wide"><stat.icon className="w-3 h-3" /> {stat.label}</div>
                            <div className={cn("font-black text-[17px] leading-tight truncate", stat.textClass || "text-foreground")}>{stat.value}</div>
                          </Card>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-5 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1.5 rounded-lg bg-primary/10", stat.textClass)}><stat.icon className="w-4 h-4" /></div>
                              <h4 className="font-black uppercase text-xs tracking-widest">{stat.label}</h4>
                            </div>
                            <p className="font-black text-2xl text-foreground break-words">{stat.value}</p>
                            <p className="text-sm font-bold text-muted-foreground leading-relaxed">{stat.definition}</p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                  </div>
                )}

                <Card className="flex-1 overflow-hidden flex flex-col min-h-0 shadow-xl border-white/5">
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
                            <SelectContent>
                              <SelectItem value="all">All Fields</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="arpNo">ARP No#</SelectItem>
                              <SelectItem value="pin">PIN</SelectItem>
                              <SelectItem value="acctName">Account</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder={`Search property records...`} className="pl-9 text-sm h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                          </div>
                        </div>
                        {uniqueBarangays.length > 1 && (
                          <Select value={barangayFilter} onValueChange={setBarangayFilter}>
                            <SelectTrigger className="w-[180px] h-9 text-xs font-bold uppercase"><MapPin className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Barangay" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Barangays</SelectItem>
                              {uniqueBarangays.map(brgy => (
                                <SelectItem key={brgy} value={brgy}>{brgy}</SelectItem>
                              ))}
                            </SelectContent>
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
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {dynamicStatusOptions.sort().map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-9 text-xs font-bold uppercase px-3 text-primary hover:bg-primary/10" onClick={() => setIsImportDialogOpen(true)}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Data
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden min-h-0">
                    <TabsContent value="results" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                      <DataPreviewTable data={filteredDisplayData} isProcessed={processedData.length > 0} onRowClick={handleRowClick} />
                    </TabsContent>
                    <TabsContent value="archive" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                      <DataPreviewTable data={filteredDisplayData} isProcessed={true} onRowClick={handleRowClick} />
                    </TabsContent>
                    <TabsContent value="analytics" className="m-0 h-full p-6 overflow-y-auto scrollbar-vertical-custom bg-muted/5 data-[state=active]:flex data-[state=active]:flex-col">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 max-w-7xl mx-auto w-full">
                        <Card className="p-6 border-white/5 bg-card shadow-2xl overflow-hidden">
                          <h4 className="text-sm font-black uppercase mb-8 flex items-center gap-2.5 tracking-widest text-muted-foreground"><CheckCircle2 className="w-4.5 h-4.5 text-primary" /> Property Usage Distribution</h4>
                          <div className="h-[300px] w-full">
                            <ChartContainer config={analyticsChartConfig}>
                              <BarChart data={analyticsData.auChart} margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{analyticsData.auChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar>
                              </BarChart>
                            </ChartContainer>
                          </div>
                        </Card>
                        
                        <Card className="p-6 border-white/5 bg-card shadow-2xl overflow-hidden">
                          <h4 className="text-sm font-black uppercase mb-8 flex items-center gap-2.5 tracking-widest text-muted-foreground"><MapPin className="w-4.5 h-4.5 text-primary" /> Barangay Record Distribution</h4>
                          <div className="h-[300px] w-full">
                            <ChartContainer config={analyticsChartConfig}>
                              <BarChart data={analyticsData.barangayChart} margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{analyticsData.barangayChart.map((entry, index) => <Cell key={`cell-brgy-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />)}</Bar>
                              </BarChart>
                            </ChartContainer>
                          </div>
                        </Card>

                        <Card className="p-6 border-white/5 bg-card shadow-2xl overflow-hidden">
                          <h4 className="text-sm font-black uppercase mb-8 flex items-center gap-2.5 tracking-widest text-muted-foreground"><RefreshCw className="w-4.5 h-4.5 text-primary" /> Update Code Distribution</h4>
                          <div className="h-[300px] w-full">
                            <ChartContainer config={analyticsChartConfig}>
                              <BarChart data={analyticsData.updateChart} margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{analyticsData.updateChart.map((entry, index) => <Cell key={`cell-upd-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}</Bar>
                              </BarChart>
                            </ChartContainer>
                          </div>
                        </Card>

                        <Card className="p-6 border-white/5 bg-card shadow-2xl cursor-pointer hover:bg-muted/5 transition-all group relative overflow-hidden" onClick={() => setIsMarketDetailOpen(true)}>
                          <div className="absolute top-4 right-4 bg-primary/10 p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-5 h-5 text-primary" /></div>
                          <h4 className="text-sm font-black uppercase mb-8 flex items-center gap-2.5 tracking-widest text-muted-foreground"><Database className="w-4.5 h-4.5 text-primary" /> Market Value Breakdown</h4>
                          <div className="h-[300px] w-full">
                            <ChartContainer config={marketChartConfig}>
                              <PieChart>
                                <Pie data={analyticsData.marketChart} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                  {analyticsData.marketChart.map((entry, index) => <Cell key={`cell-market-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '24px', fontSize: '11px', fontWeight: 'bold' }}/>
                              </PieChart>
                            </ChartContainer>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                    <TabsContent value="audit" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                      <AuditLogTab reports={processingReports} onClearHistory={clearAuditHistory} />
                    </TabsContent>
                  </div>
                </Card>
                <div className="flex items-center justify-between bg-card p-4 rounded-xl shadow-2xl border border-white/10 shrink-0">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsExportSettingsOpen(true)} size="sm" className="font-black uppercase text-xs tracking-widest border-primary/30 text-primary hover:bg-primary hover:text-white transition-all h-10 px-6" disabled={isExporting}><FileDown className="w-4 h-4 mr-2" /> {isExporting ? "Generating..." : "Export Data"}</Button>
                    <Button variant="ghost" size="sm" className="h-10 text-xs font-bold uppercase px-3" onClick={clearWorkspace}><Eraser className="w-3.5 h-3.5 mr-1" /> Clear Session</Button>
                  </div>
                  {viewMode !== 'audit' && (
                    <Button size="lg" className="bg-primary hover:bg-green-700 px-12 font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95 h-10" disabled={isProcessing} onClick={() => setIsRunProcessorDialogOpen(true)}>{isProcessing ? "Processing Batch..." : "Run Batch Processor"}</Button>
                  )}
                  {viewMode === 'audit' && (
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-12 font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95 h-10" onClick={() => setViewMode('results')}>Return to Dashboard</Button>
                  )}
                </div>
              </div>
            )}
          </Tabs>
        </main>
      </div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-none bg-transparent">
          <DialogHeader className="sr-only">
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>Upload or paste land record data for processing.</DialogDescription>
          </DialogHeader>
          <div className="bg-background rounded-3xl p-8 border shadow-2xl h-full overflow-y-auto">
            <ImportZone onDataImported={handleDataImported} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRunProcessorDialogOpen} onOpenChange={setIsRunProcessorDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" /> Processor Configuration
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-muted-foreground">
              Review engine settings before starting the batch run.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CalibrationSidebar 
              rules={rules} 
              setRules={setRules} 
              options={options} 
              setOptions={setOptions} 
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsRunProcessorDialogOpen(false)} className="font-black uppercase text-xs h-10">Cancel</Button>
            <Button 
              onClick={() => {
                setIsRunProcessorDialogOpen(false);
                runProcess();
              }}
              className="bg-primary hover:bg-emerald-800 font-black uppercase text-xs h-10 px-8 shadow-lg shadow-primary/20"
            >
              Continue & Run Processor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportSettingsModal 
        open={isExportSettingsOpen} 
        onOpenChange={setIsExportSettingsOpen} 
        data={previewData} 
        exportColumns={exportColumns}
        onColumnToggle={(col) => setExportColumns(prev => ({ ...prev, [col]: !prev[col] }))}
        onBulkColumnChange={(cols) => setExportColumns(cols)}
        onExport={handleFinalExport}
      />

      {exportSuccess && (
        <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in duration-200">
          <div className="bg-card p-12 rounded-3xl shadow-2xl border border-primary/20 flex flex-col items-center scale-110">
            <div className="bg-primary/20 p-6 rounded-full mb-6 animate-bounce"><CheckCircle2 className="w-16 h-16 text-primary" /></div>
            <h3 className="text-3xl font-black text-primary uppercase tracking-tighter">Export Successful</h3>
            <p className="text-muted-foreground font-bold mt-2">Your filtered land records have been saved locally.</p>
          </div>
        </div>
      )}

      {processSuccess && (
        <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in duration-200">
          <div className="bg-card p-12 rounded-3xl shadow-2xl border border-primary/20 flex flex-col items-center scale-110">
            <div className="bg-primary/20 p-6 rounded-full mb-6 animate-bounce"><CheckCircle2 className="w-16 h-16 text-primary" /></div>
            <h3 className="text-3xl font-black text-primary uppercase tracking-tighter">Processing Successful</h3>
            <p className="text-muted-foreground font-bold mt-2">All records have been cleaned and calibrated.</p>
          </div>
        </div>
      )}

      <SettingsPanel open={isSettingsOpen} onOpenChange={setIsSettingsOpen} locationSettings={locationSettings} onSettingsChange={setLocationSettings} taxRates={taxRates} onTaxRatesChange={setTaxRates} />
      <AboutModal open={isAboutOpen} onOpenChange={setIsAboutOpen} />
      <ProcessingReportModal report={latestReport} open={isReportOpen} onOpenChange={setIsReportOpen} />
      <RecordDetailModal 
        record={selectedRecord} 
        open={!!selectedRecord} 
        onOpenChange={(isOpen) => !isOpen && setSelectedRecord(null)} 
        onSave={handleSaveRecord} 
        onArchive={handleArchiveRecord} 
        onUnarchive={handleUnarchiveRecord}
      />
      
      <Dialog theme-color="primary" open={isMarketDetailOpen} onOpenChange={setIsMarketDetailOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader className="mb-4 shrink-0">
            <DialogTitle className="text-xl font-black text-foreground uppercase flex items-center gap-2.5 leading-none tracking-tight"><Database className="w-6 h-6 text-primary" /> Market Value Analysis</DialogTitle>
          </DialogHeader>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
            <div className="lg:col-span-5 bg-muted/5 rounded-2xl border border-white/5 flex items-center justify-center p-4 shadow-inner">
              <ChartContainer config={marketChartConfig} className="h-full w-full aspect-auto">
                <PieChart>
                  <Pie data={analyticsData.marketChart} cx="50%" cy="50%" innerRadius={90} outerRadius={120} paddingAngle={10} dataKey="value" stroke="none" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`} labelLine={true}>
                    {analyticsData.marketChart.map((entry, index) => <Cell key={`cell-expanded-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="lg:col-span-7 flex flex-col gap-5 min-h-0">
              <div className="flex-1 overflow-y-auto pr-3 scrollbar-vertical-custom space-y-3">
                {analyticsData.marketChart.map((item, index) => {
                  const total = analyticsData.marketChart.reduce((sum, curr) => sum + curr.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="flex flex-col gap-2 p-4 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/40 transition-all shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm font-black uppercase tracking-tight">{item.name}</span>
                          <span className="text-xs font-black text-primary px-2 py-0.5 rounded-full bg-primary/10">{percentage}%</span>
                        </div>
                        <span className="text-sm font-mono font-bold">₱{item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-background/50 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                      </div>
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

    
