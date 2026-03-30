
"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback, useRef } from 'react';
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
  RefreshCw,
  Lightbulb,
  TrendingUp,
  PieChart as PieChartIcon,
  Loader2,
  Check,
  FileSpreadsheet
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
import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExportSettingsModal, ExportFinalSettings } from '@/components/dashboard/export-settings-modal';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * A component that animates a numeric value counting from its previous state to the new state.
 */
const AnimatedNumber = ({ value, prefix = "", decimals = 0 }: { value: number, prefix?: string, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 1500; // 1.5 seconds for visible impact

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (endValue - startValue) * eased;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animate);
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
};

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

type ProcessingStep = 'idle' | 'cleanup' | 'dedupe' | 'calibrate' | 'complete';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function Home() {
  const { toast } = useToast();
  const { showSuccessModal, showSuccessToast } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [isClient, setIsClient] = useState(false);
  const [rawData, setRawData] = useState<LandRecord[]>([]);
  const [previewData, setPreviewData] = useState<LandRecord[]>([]);
  const [processedData, setProcessedData] = useState<LandRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [isExporting, setIsExporting] = useState(false);
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
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFileFilter, setSourceFileFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");

  const [explainType, setExplainType] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<'usage' | 'barangay' | 'update' | 'market' | null>(null);

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
    previewData.forEach(r => { 
      brgySet.add(r.barangayName || 'UNMAPPED'); 
    });
    return Array.from(brgySet).sort();
  }, [previewData]);

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

  /**
   * SESSION GUARD: Prevent accidental reload/closure when active data is present.
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (rawData.length > 0) {
        e.preventDefault();
        // Custom message is ignored by modern browsers, but setting e.returnValue triggers the dialog
        e.returnValue = "You have unsaved property records in your active session. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rawData.length]);

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
        setIsSettingsOpen(true);
      }

      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'c') {
        if (window.getSelection()?.toString() === '') {
          e.preventDefault();
          clearWorkspace();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsImportDialogOpen(true);
      }

      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeElem = document.activeElement;
        const isTyping = activeElem instanceof HTMLInputElement || 
                         activeElem instanceof HTMLTextAreaElement || 
                         activeElem?.getAttribute('contenteditable') === 'true';
        
        if (!isTyping) {
          e.preventDefault();
          const modes: Array<'results' | 'archive' | 'analytics' | 'audit'> = ['results', 'archive', 'analytics', 'audit'];
          setViewMode(prev => {
            const currentIndex = modes.indexOf(prev as any);
            const nextIndex = e.shiftKey 
              ? (currentIndex - 1 + modes.length) % modes.length 
              : (currentIndex + 1) % modes.length;
            
            setStatusFilter('all');
            return modes[nextIndex];
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rawData.length, isProcessing, isRunProcessorDialogOpen, isExportSettingsOpen]);

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
      window.removeEventListener('beforeinstallprompt', handleBeforeinstallprompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => { console.error(`Error attempting to enable full-screen mode: ${err.message}`); });
    } else { document.exitFullscreen(); }
  };

  /**
   * REFINED ADAPTIVE STORAGE LOGIC (ANTI-PURGE)
   * This logic attempts to save as much raw data as possible, 
   * prioritizing the most recent records over old history to avoid the QuotaExceededError.
   */
  useEffect(() => {
    if (isClient) {
      const saveToStorage = (reports: ProcessingReport[]) => {
        try {
          const payload = JSON.stringify({ 
            rules, 
            exportColumns, 
            locationSettings, 
            options, 
            taxRates, 
            processingReports: reports 
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, payload);
          return true;
        } catch (e) {
          return false;
        }
      };

      // TIER 1: Try to save everything (full history + full records)
      if (!saveToStorage(processingReports)) {
        
        // TIER 2: Try to save with records only for the most recent 3 reports
        const partiallySlimmed = processingReports.map((r, i) => i < 3 ? r : { ...r, records: undefined });
        if (!saveToStorage(partiallySlimmed)) {
          
          // TIER 3: Only save records for the absolute latest report (most important for user)
          const mostlySlimmed = processingReports.map((r, i) => i === 0 ? r : { ...r, records: undefined });
          if (!saveToStorage(mostlySlimmed)) {
            
            // TIER 4: Save metadata only (all records undefined)
            const fullySlimmed = processingReports.map(r => ({ ...r, records: undefined }));
            if (!saveToStorage(fullySlimmed)) {
              
              // LAST RESORT: Keep only the 10 most recent metadata entries
              saveToStorage(fullySlimmed.slice(0, 10));
            }
          }
        }
      }
    }
  }, [rules, exportColumns, locationSettings, options, taxRates, processingReports, isClient]);

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
    if (!silent) {
      setIsProcessing(true);
      setProcessingStep('cleanup');
    }
    
    if (!silent) {
      await delay(1200);
      setProcessingStep('dedupe');
      await delay(1000);
      setProcessingStep('calibrate');
      await delay(800);
    }

    startTransition(() => {
      const processOptions = options;
      const { processed, allWithDuplicateMarkers, report } = processRecords(data, rules, locationSettings, taxRates, processOptions, fileName);
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
                onViewResult: () => setViewMode('results'),
            });
            setTimeout(() => {
                updateStats(allWithDuplicateMarkers, rawCount);
            }, 400); 
        }, 800);
      } else {
        updateStats(allWithDuplicateMarkers, rawCount);
      }
    });
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
      ? previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'CLEANUP' || r.isManualArchive)
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
      await delay(1500);

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

      const sortedForExport = [...filteredForExport].sort((a, b) => {
        const partsA = (a.pin || '').split('-');
        const partsB = (b.pin || '').split('-');
        
        for (let i = 0; i < 6; i++) {
          const segmentA = partsA[i] || '';
          const segmentB = partsB[i] || '';
          
          const numA = parseInt(segmentA, 10);
          const numB = parseInt(segmentB, 10);
          
          if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) return numA - numB;
          } else {
            if (segmentA !== segmentB) return segmentA.localeCompare(segmentB);
          }
        }
        return 0;
      });

      const totalMarketValue = sortedForExport.reduce((sum, r) => sum + (r.marketValue || 0), 0);
      const totalAssessedValue = sortedForExport.reduce((sum, r) => sum + (r.assessedValue || 0), 0);
      
      const headerMapping: Record<string, string> = {
        date: "DATE", arpNo: "ARP NO#", pin: "PIN", update: "UPDATE",
        acctName: "ACCTNAME", address: "ADDRESS", location: "LOCATION",
        kind: "KIND", au: "AU", landArea: "LAND AREA", unitValue: "UNIT VALUE",
        marketValue: "MARKET VALUE", assessedValue: "ASSESSED VALUE", yearlyTax: "YEARLY TAX"
      };

      const formattedExport = sortedForExport.map(record => {
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
        ["TOTAL RECORDS:", sortedForExport.length.toLocaleString()],
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
        id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toLocaleString(),
        fileName: `${fileName} (CUSTOM EXPORT)`,
        totalImported: sortedForExport.length,
        cleanupCount: 0,
        duplicatesDetected: 0,
        calibratedCount: 0,
        errorCount: sortedForExport.filter(r => !r.isValid).length,
        validCount: sortedForExport.filter(r => r.isValid).length,
        totalMarketValue: totalMarketValue,
        totalAssessedValue: totalAssessedValue,
        records: sortedForExport
      };
      setProcessingReports(prev => [exportReport, ...prev]);
      showSuccessToast(`Exported ${sortedForExport.length} records successfully.`);
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
      ? previewData.filter(r => r.statusLabel === 'DUPLICATE' || r.statusLabel === 'INCOMPLETE' || r.statusLabel === 'CLEANUP' || r.isManualArchive)
      : (processedData.length > 0 ? processedData : previewData.filter(r => r.statusLabel !== 'DUPLICATE' && r.statusLabel !== 'INCOMPLETE' && r.statusLabel !== 'CLEANUP' && !r.isManualArchive));

    return baseData.filter(record => {
      if (sourceFileFilter !== 'all' && record.sourceFile !== sourceFileFilter) return false;
      if (barangayFilter !== 'all' && (record.barangayName || 'UNMAPPED') !== barangayFilter) return false;

      const query = searchQuery.toLowerCase();
      let matchesSearch = true;
      if (query) {
        if (searchField === 'all') {
          matchesSearch = record.acctName?.toLowerCase().includes(query) || record.pin?.toLowerCase().includes(query) || record.arpNo?.toLowerCase().includes(query) || record.location?.toLowerCase().includes(query) || record.address?.toLowerCase().includes(query) || record.au?.toLowerCase().includes(query) || record.sourceFile?.toLowerCase().includes(query);
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
      totalRecords: filteredActiveData.length,
      auChart: Object.entries(auDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value),
      marketChart: Object.entries(marketValueSum).map(([name, value]) => ({ name, value })).filter(item => item.value > 0),
      updateChart: Object.entries(updateDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value),
      barangayChart: Object.entries(barangayDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value)
    };
  }, [processedData, previewData, sourceFileFilter, barangayFilter]);

  const getInsightText = (type: string): React.ReactNode => {
    const data = analyticsData;
    const highlight = (val: any) => <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">{val}</span>;
    const neutralHighlight = (val: any) => <span className="text-foreground font-black">{val}</span>;
    
    if (data.totalRecords === 0) return "Insufficient data currently active. Please adjust your filters or run the processor to generate detailed diagnostics.";

    switch (type) {
      case 'usage': {
        const top = data.auChart[0];
        const percentage = ((top.value / data.totalRecords) * 100).toFixed(1);
        const second = data.auChart[1];
        return (
          <div className="space-y-4">
            <p>
              The property distribution analysis reveals a primary concentration in {highlight(top.name)}, representing {highlight(percentage + "%")} of the active dataset with {highlight(top.value.toLocaleString() + " parcels")}.
            </p>
            {second && (
              <p>
                This category maintains a significant lead over {neutralHighlight(second.name)}, which holds the second position. The delta between these two primary usages is {highlight((top.value - second.value).toLocaleString() + " units")}, indicating a highly skewed development priority or data refresh cycle.
              </p>
            )}
            <p>
              Audit Insight: With {highlight(data.auChart.length)} unique usage types detected, the engine suggests prioritizing verification for {highlight(top.name)} to ensure the highest impact on overall data accuracy.
            </p>
          </div>
        );
      }
      case 'barangay': {
        const top = data.barangayChart[0];
        const totalRaw = data.barangayChart.reduce((sum, item) => sum + item.value, 0);
        const density = ((top.value / totalRaw) * 100).toFixed(1);
        return (
          <div className="space-y-4">
            <p>
              Geographic intelligence identifies {highlight(top.name)} as the most active sector in this batch, accounting for {highlight(density + "%")} of all records ({highlight(top.value.toLocaleString() + " properties")}).
            </p>
            <p>
              The current session spans {highlight(data.barangayChart.length)} distinct barangays. The high density in {neutralHighlight(top.name)} suggests a localized general revision or a major parcel subdivision project within this specific administrative boundary.
            </p>
            <p>
              Audit Insight: Concentrated geographic data allows for efficient field-based verification batches. The engine recommends a {highlight("focused audit pass")} for {top.name} to validate the latest boundary adjustments.
            </p>
          </div>
        );
      }
      case 'update': {
        const sorted = [...data.updateChart].sort((a, b) => b.value - a.value);
        const top = sorted[0];
        return (
          <div className="space-y-4">
            <p>
              Administrative tracking shows that update code {highlight(top.name)} is the primary driver of record revisions, appearing in {highlight(top.value.toLocaleString() + " instances")}. This represents {highlight(((top.value / data.totalRecords) * 100).toFixed(1) + "%")} of all session activity.
            </p>
            <p>
              With {highlight(data.updateChart.length)} unique update reasons logged, the data reflects a complex maintenance cycle. The prevalence of {neutralHighlight(top.name)} provides a clear audit trail for the batch's primary objective.
            </p>
            <p>
              Audit Insight: High frequencies of specific update codes can signal systematic data entry patterns. Ensure that {highlight(top.name)} complies with the latest {highlight("City Ordinance valuation standards")}.
            </p>
          </div>
        );
      }
      case 'market': {
        const sortedMarket = [...data.marketChart].sort((a, b) => b.value - a.value);
        const top = sortedMarket[0];
        const totalValue = data.marketChart.reduce((sum, item) => sum + item.value, 0);
        const percentage = ((top.value / totalValue) * 100).toFixed(1);
        const avgValue = (totalValue / data.totalRecords);
        return (
          <div className="space-y-4">
            <p>
              Financial analysis confirms {highlight(top.name)} as the primary value contributor, adding {highlight("₱" + top.value.toLocaleString(undefined, { minimumFractionDigits: 2 }))} to the total session valuation.
            </p>
            <p>
              This single category accounts for {highlight(percentage + "%")} of the entire {highlight("₱" + totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 }))} portfolio currently being processed. The average property value across the session stands at {highlight("₱" + avgValue.toLocaleString(undefined, { minimumFractionDigits: 2 }))}.
            </p>
            <p>
              Audit Insight: High-value outliers in the {highlight(top.name)} category represent the {highlight("highest financial risk")} for the city. Double-verify the land area and unit values for these specific parcels to prevent valuation leakages.
            </p>
          </div>
        );
      }
      default: return "";
    }
  };

  const clearAuditHistory = () => {
    setProcessingReports([]);
    toast({ title: "History Purged", description: "Audit logs cleared permanently." });
  };

  const handleDeleteReport = (id: string) => {
    setProcessingReports(prev => prev.filter(r => r.id !== id));
    toast({ title: "Log Deleted", description: "Audit entry has been removed." });
  };

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
  if (!isClient) return null;

  const statDefinitions = [
    {
      label: "Imported Rows",
      value: <AnimatedNumber value={stats.totalRawRows} />,
      icon: Files,
      color: "border-l-slate-400",
      definition: "The total count of all raw data lines detected across all your uploaded spreadsheets before any filtering or processing."
    },
    {
      label: "Data Errors",
      value: <AnimatedNumber value={stats.totalErrors} />,
      icon: AlertTriangle,
      color: "border-l-red-500 bg-red-500/5",
      textClass: "text-red-600",
      definition: "Records flagged for critical data issues like missing Property Identification Numbers (PIN) or invalid formats that require manual correction."
    },
    {
      label: "Engine Cleanup",
      value: <AnimatedNumber value={stats.systemCleanup} />,
      icon: Eraser,
      color: "border-l-orange-400",
      textClass: "text-orange-600",
      definition: "Rows identified as non-data noise, duplicates, or incomplete entries that are moved to the Archive tab."
    },
    {
      label: "Valid Records",
      value: <AnimatedNumber value={stats.finalCount} />,
      icon: CheckCircle2,
      color: "border-l-primary bg-primary/5",
      textClass: "text-primary",
      definition: "The finalized set of clean, unique, and verified records that have passed all city-standard validation rules."
    },
    {
      label: "Duplicates",
      value: <AnimatedNumber value={stats.duplicatesRemoved} />,
      icon: Archive,
      color: "border-l-amber-400 bg-amber-500/5",
      textClass: "text-amber-500",
      definition: "Multiple records sharing the same PIN. The engine automatically moves duplicates to the Archive tab."
    },
    {
      label: "Total Market",
      value: <AnimatedNumber value={stats.totalMarketValue || 0} prefix="₱" decimals={2} />,
      icon: Database,
      color: "border-l-green-600 bg-green-500/5",
      textClass: "text-green-600",
      definition: "The combined Market Value of all currently filtered valid records."
    },
    {
      label: "Total Assessed",
      value: <AnimatedNumber value={stats.totalAssessedValue || 0} prefix="₱" decimals={2} />,
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
          {deferredPrompt && <Button variant="ghost" size="icon" onClick={handleInstallClick}><Download className="w-5 h-5" /></Button>}
          <Button variant="ghost" size="icon" onClick={toggleFullScreen}>{isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</Button>
          <ModeToggle />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Shortcut: Ctrl + Alt + S</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col p-6 overflow-hidden gap-4 min-h-0">
          <Tabs value={viewMode} onValueChange={(val: any) => { setViewMode(val); setStatusFilter('all'); }} className="flex-1 flex flex-col min-h-0">
            {rawData.length === 0 && viewMode !== 'audit' ? (
              <div className="flex-1 flex items-center justify-center h-full"><ImportZone onDataImported={handleDataImported} /></div>
            ) : (
              <div className="flex-1 flex flex-col gap-4 h-full min-0" suppressHydrationWarning>
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
                              <SelectItem value="address">Address</SelectItem>
                              <SelectItem value="update">Update</SelectItem>
                              <SelectItem value="kind">Kind</SelectItem>
                              <SelectItem value="au">AU</SelectItem>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-9 text-xs font-bold uppercase px-3 text-primary hover:bg-primary/10" onClick={() => setIsImportDialogOpen(true)}>
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Data
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Shortcut: Ctrl + Alt + A</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        <Card className="p-6 border-white/5 bg-card shadow-2xl overflow-hidden flex flex-col group">
                          <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-black uppercase flex items-center gap-2.5 tracking-widest text-muted-foreground">
                              <CheckCircle2 className="w-4.5 h-4.5 text-primary" /> Property Usage Distribution
                            </h4>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setExplainType('usage')}
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white"
                              >
                                <Lightbulb className="w-3.5 h-3.5 mr-1.5" /> Explain
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setExpandedChart('usage')}
                                className="h-8 w-8 bg-muted/20 hover:bg-primary hover:text-white transition-all"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
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
                        
                        <Card className="p-6 border-white/5 bg-card shadow-2xl overflow-hidden flex flex-col group">
                          <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-black uppercase flex items-center gap-2.5 tracking-widest text-muted-foreground">
                              <MapPin className="w-4.5 h-4.5 text-primary" /> Barangay Distribution
                            </h4>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setExplainType('barangay')}
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white"
                              >
                                <Lightbulb className="w-3.5 h-3.5 mr-1.5" /> Explain
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setExpandedChart('barangay')}
                                className="h-8 w-8 bg-muted/20 hover:bg-primary hover:text-white transition-all"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
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

                        <Card className="p-6 border-white/5 bg-card shadow-2xl overflow-hidden flex flex-col group">
                          <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-black uppercase flex items-center gap-2.5 tracking-widest text-muted-foreground">
                              <RefreshCw className="w-4.5 h-4.5 text-primary" /> Update Code Distribution
                            </h4>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setExplainType('update')}
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white"
                              >
                                <Lightbulb className="w-3.5 h-3.5 mr-1.5" /> Explain
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setExpandedChart('update')}
                                className="h-8 w-8 bg-muted/20 hover:bg-primary hover:text-white transition-all"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="h-[300px] w-full">
                            <ChartContainer config={analyticsChartConfig}>
                              <BarChart data={analyticsData.updateChart} margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{analyticsData.updateChart.map((entry, index) => <Cell key={`cell-upd-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}</Bar>
                              </BarChart>
                            </ChartContainer>
                          </div>
                        </Card>

                        <Card className="p-6 border-white/5 bg-card shadow-2xl flex flex-col group relative overflow-hidden">
                          <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-black uppercase flex items-center gap-2.5 tracking-widest text-muted-foreground">
                              <Database className="w-4.5 h-4.5 text-primary" /> Market Value Breakdown
                            </h4>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setExplainType('market')}
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white"
                              >
                                <Lightbulb className="w-3.5 h-3.5 mr-1.5" /> Explain
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setExpandedChart('market')}
                                className="h-8 w-8 bg-muted/20 hover:bg-primary hover:text-white transition-all"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
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
                      <AuditLogTab reports={processingReports} onClearHistory={clearAuditHistory} onDeleteReport={handleDeleteReport} />
                    </TabsContent>
                  </div>
                </Card>
                <div className="flex items-center justify-between bg-card p-4 rounded-xl shadow-2xl border border-white/10 shrink-0">
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" onClick={() => setIsExportSettingsOpen(true)} size="sm" className="font-black uppercase text-xs tracking-widest border-primary/30 text-primary hover:bg-primary hover:text-white transition-all h-10 px-6" disabled={isExporting}><FileDown className="w-4 h-4 mr-2" /> {isExporting ? "Generating..." : "Export Data"}</Button>
                        </TooltipTrigger>
                        <TooltipContent>Shortcut: Ctrl + E</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-10 text-xs font-bold uppercase px-3" onClick={clearWorkspace}><Eraser className="w-3.5 h-3.5 mr-1" /> Clear Session</Button>
                        </TooltipTrigger>
                        <TooltipContent>Shortcut: Ctrl + Alt + C</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {viewMode !== 'analytics' && viewMode !== 'audit' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="lg" className="bg-primary hover:bg-green-700 px-12 font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95 h-10" disabled={isProcessing} onClick={() => setIsRunProcessorDialogOpen(true)}>{isProcessing ? "Processing Batch..." : "Run Batch Processor"}</Button>
                        </TooltipTrigger>
                        <TooltipContent>Shortcut: Ctrl + Enter</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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

      {isProcessing && processingStep !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-10 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105">
            <div className="relative flex items-center justify-center mb-8">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-8">Engine Initializing...</h3>
            
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    processingStep === 'cleanup' ? "bg-primary/20 text-primary animate-pulse" : 
                    (processingStep !== 'idle' && processingStep !== 'cleanup' ? "bg-primary text-white" : "bg-muted text-muted-foreground")
                  )}>
                    {processingStep !== 'idle' && processingStep !== 'cleanup' ? <Check className="w-3.5 h-3.5" /> : <Eraser className="w-3.5 h-3.5" />}
                  </div>
                  <span className={cn("text-xs font-black uppercase tracking-widest", processingStep === 'cleanup' ? "text-primary" : "text-muted-foreground")}>
                    1. System Cleanup
                  </span>
                </div>
                {processingStep === 'cleanup' && <span className="text-[10px] font-bold text-primary animate-pulse uppercase">⏳ Running</span>}
                {processingStep !== 'idle' && processingStep !== 'cleanup' && <span className="text-[10px] font-bold text-primary uppercase">✔ Done</span>}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    processingStep === 'dedupe' ? "bg-primary/20 text-primary animate-pulse" : 
                    (processingStep === 'calibrate' || processingStep === 'complete' ? "bg-primary text-white" : "bg-muted text-muted-foreground")
                  )}>
                    {processingStep === 'calibrate' || processingStep === 'complete' ? <Check className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </div>
                  <span className={cn("text-xs font-black uppercase tracking-widest", processingStep === 'dedupe' ? "text-primary" : "text-muted-foreground")}>
                    2. Deduplication
                  </span>
                </div>
                {processingStep === 'dedupe' && <span className="text-[10px] font-bold text-primary animate-pulse uppercase">⏳ Running</span>}
                {(processingStep === 'calibrate' || processingStep === 'complete') && <span className="text-[10px] font-bold text-primary uppercase">✔ Done</span>}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    processingStep === 'calibrate' ? "bg-primary/20 text-primary animate-pulse" : 
                    (processingStep === 'complete' ? "bg-primary text-white" : "bg-muted text-muted-foreground")
                  )}>
                    {processingStep === 'complete' ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                  </div>
                  <span className={cn("text-xs font-black uppercase tracking-widest", processingStep === 'calibrate' ? "text-primary" : "text-muted-foreground")}>
                    3. Calibration
                  </span>
                </div>
                {processingStep === 'calibrate' && <span className="text-[10px] font-bold text-primary animate-pulse uppercase">⏳ Running</span>}
                {processingStep === 'complete' && <span className="text-[10px] font-bold text-primary uppercase">✔ Done</span>}
              </div>
            </div>

            <p className="mt-8 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">
              Validating Parañaque Land Records
            </p>
          </Card>
        </div>
      )}

      {isExporting && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-10 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105">
            <div className="relative flex items-center justify-center mb-8">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-4">Generating File...</h3>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">
              Compiling Parañaque Land Records
            </p>
          </Card>
        </div>
      )}

      <Dialog open={!!explainType} onOpenChange={(open) => !open && setExplainType(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-white/10 shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary/5 p-6 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" /> Advanced Data Intelligence Report
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Deep-Dive Diagnostic Analysis
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-vertical-custom">
            <div className="p-6 rounded-2xl bg-muted/30 border border-white/5 shadow-inner leading-relaxed">
              <div className="text-base font-bold text-foreground/90">
                {explainType && getInsightText(explainType)}
              </div>
            </div>
            <div className="space-y-4">
               <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-primary" /> Audit Implications
               </h5>
               <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                 Based on the detected patterns, this dataset shows high reliability for the primary categories but may require targeted sampling in the outlier groups. Identifying these densities allows for more efficient resource allocation during the manual verification phase.
               </p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <TrendingUp className="w-5 h-5 text-primary shrink-0" />
              <p className="text-[11px] font-black uppercase text-primary leading-snug">
                This diagnostic report is refreshed instantly whenever filters are applied or data is updated.
              </p>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/20 border-t">
            <Button onClick={() => setExplainType(null)} className="w-full h-11 font-black uppercase text-xs tracking-widest shadow-lg">
              Acknowledge intelligence Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRunProcessorDialogOpen} onOpenChange={setIsRunProcessorDialogOpen}>
        <DialogContent 
          className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-6"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setIsRunProcessorDialogOpen(false);
              runProcess();
            }
          }}
        >
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
        isProcessed={processedData.length > 0}
        exportColumns={exportColumns}
        onColumnToggle={(col) => setExportColumns(prev => ({ ...prev, [col]: !prev[col] }))}
        onBulkColumnChange={(cols) => setExportColumns(cols)}
        onExport={handleFinalExport}
      />

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
      
      <Dialog open={!!expandedChart} onOpenChange={(isOpen) => !isOpen && setExpandedChart(null)}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-6 shadow-2xl">
          <DialogHeader className="mb-4 shrink-0">
            <DialogTitle className="text-xl font-black text-foreground uppercase flex items-center gap-2.5 leading-none tracking-tight">
              {expandedChart === 'usage' && <><CheckCircle2 className="w-6 h-6 text-primary" /> Usage Distribution Analysis</>}
              {expandedChart === 'barangay' && <><MapPin className="w-6 h-6 text-primary" /> Barangay Geographic Breakdown</>}
              {expandedChart === 'update' && <><RefreshCw className="w-6 h-6 text-primary" /> Update Code Tracking</>}
              {expandedChart === 'market' && <><Database className="w-6 h-6 text-primary" /> Financial Market Value Analysis</>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
            <div className="lg:col-span-6 bg-muted/5 rounded-2xl border border-white/5 flex items-center justify-center p-6 shadow-inner relative overflow-hidden">
              {expandedChart === 'market' ? (
                <ChartContainer config={marketChartConfig} className="h-full w-full aspect-auto">
                  <PieChart>
                    <Pie data={analyticsData.marketChart} cx="50%" cy="50%" innerRadius={100} outerRadius={140} paddingAngle={10} dataKey="value" stroke="none" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`} labelLine={true}>
                      {analyticsData.marketChart.map((entry, index) => <Cell key={`cell-expanded-m-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <ChartContainer config={analyticsChartConfig} className="h-full w-full aspect-auto">
                  <BarChart 
                    data={
                        expandedChart === 'usage' ? analyticsData.auChart : 
                        expandedChart === 'barangay' ? analyticsData.barangayChart : 
                        analyticsData.updateChart
                    } 
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} fontSize={10} fontWeight="bold" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {(expandedChart === 'usage' ? analyticsData.auChart : 
                        expandedChart === 'barangay' ? analyticsData.barangayChart : 
                        analyticsData.updateChart).map((entry, index) => <Cell key={`cell-exp-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </div>
            <div className="lg:col-span-6 flex flex-col gap-6 min-h-0">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-bold leading-relaxed text-muted-foreground uppercase">
                    Detailed distribution of <span className="text-foreground font-black">{expandedChart}</span> data for all finalized records in this batch.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto pr-3 scrollbar-vertical-custom space-y-3">
                {(expandedChart === 'market' ? analyticsData.marketChart : 
                  (expandedChart === 'usage' ? analyticsData.auChart : 
                  (expandedChart === 'barangay' ? analyticsData.barangayChart : 
                  analyticsData.updateChart))).map((item, index, dataList) => {
                  const total = dataList.reduce((sum, curr) => sum + curr.value, 0);
                  const percentage = ((item.value / (total || 1)) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="flex flex-col gap-2 p-4 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/40 transition-all shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm font-black uppercase tracking-tight">{item.name}</span>
                          <span className="text-xs font-black text-primary px-2 py-0.5 rounded-full bg-primary/10">{percentage}%</span>
                        </div>
                        <span className="text-sm font-mono font-bold">
                            {expandedChart === 'market' ? `₱${item.value.toLocaleString()}` : `${item.value.toLocaleString()} units`}
                        </span>
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
