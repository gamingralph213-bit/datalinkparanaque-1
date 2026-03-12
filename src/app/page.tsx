"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ImportZone } from '@/components/dashboard/import-zone';
import { CalibrationSidebar } from '@/components/dashboard/calibration-sidebar';
import { DataPreviewTable } from '@/components/dashboard/data-preview-table';
import { LandRecord, CalibrationRule, processRecords, TaxRateMap } from '@/lib/processor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';
import { SettingsPanel } from '@/components/dashboard/settings-panel';
import { BarangayConfig, initialLocationSettings } from '@/lib/locations';
import { ModeToggle } from '@/components/mode-toggle';
import { RecordDetailModal } from '@/components/dashboard/record-detail-modal';
import { AboutModal } from '@/components/dashboard/about-modal';
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
  DialogDescription 
} from '@/components/ui/dialog';
import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart, Legend, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

const LOCAL_STORAGE_KEY = 'paranaque_datalink_v29';

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
    label: "Value",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function Home() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [rawData, setRawData] = useState<LandRecord[]>([]);
  const [previewData, setPreviewData] = useState<LandRecord[]>([]);
  const [processedData, setProcessedData] = useState<LandRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [rules, setRules] = useState<CalibrationRule[]>([]);
  const [viewMode, setViewMode] = useState<'results' | 'archive' | 'analytics'>('results');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [isMarketDetailOpen, setIsMarketDetailOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
    finalCount: 0, totalMarket: 0, totalAssessed: 0
  });

  useEffect(() => {
    setIsClient(true);
    
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const handleAppInstalled = () => { setDeferredPrompt(null); toast({ title: "Installation Successful", description: "DataLink Parañaque is now available on your device." }); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.exportColumns) setExportColumns({ ...defaultExportColumns, ...parsed.exportColumns });
        if (parsed.locationSettings) {
          setLocationSettings(parsed.locationSettings);
        }
        if (parsed.options) setOptions({ ...options, ...parsed.options });
        if (parsed.taxRates) setTaxRates(parsed.taxRates);
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ 
          rules: [], 
          exportColumns: defaultExportColumns, 
          locationSettings: initialLocationSettings, 
          options,
          taxRates: defaultTaxRates
        }));
      }
    } catch (error) {
        console.error("Failed to parse localStorage:", error);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ rules, exportColumns, locationSettings, options, taxRates }));
    }
  }, [rules, exportColumns, locationSettings, options, taxRates, isClient]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDataImported = (imported: LandRecord[], fileName: string, rawCount: number) => {
    setRawData(imported);
    setImportedFileName(fileName);
    setProcessedData([]);
    setViewMode('results');
    
    const { allWithDuplicateMarkers } = processRecords(imported, [], [], taxRates, {
      removeDuplicates: false,
      applyCalibration: false,
      systemCleanup: false
    });
    
    setPreviewData(allWithDuplicateMarkers);
    setStats({ 
      totalRawRows: rawCount,
      systemCleanup: 0,
      totalImported: rawCount, 
      duplicatesRemoved: 0, 
      finalCount: rawCount,
      totalMarket: allWithDuplicateMarkers.reduce((sum, r) => sum + (r.marketValue || 0), 0),
      totalAssessed: allWithDuplicateMarkers.reduce((sum, r) => sum + (r.assessedValue || 0), 0)
    });

    toast({
      title: "Data Loaded",
      description: `${rawCount} records imported. Click "Run Processor" to apply rules.`,
    });
  };

  const runProcess = async () => {
    if (rawData.length === 0) return;

    setIsProcessing(true);
    const { processed, allWithDuplicateMarkers, duplicatesRemoved, cleanupCount } = processRecords(rawData, rules, locationSettings, taxRates, options);
    
    setProcessedData(processed);
    setPreviewData(allWithDuplicateMarkers);
    setStats(prev => ({
      ...prev,
      systemCleanup: cleanupCount,
      duplicatesRemoved,
      finalCount: processed.length,
      totalMarket: processed.reduce((sum, r) => sum + (r.marketValue || 0), 0),
      totalAssessed: processed.reduce((sum, r) => sum + (r.assessedValue || 0), 0)
    }));
    
    toast({
      title: "Process Complete",
      description: `Final count: ${processed.length} records.`,
    });
    setIsProcessing(false);
  };

  const handleExport = async (exportType: 'results' | 'archive' = 'results') => {
    let dataToExport: LandRecord[] = [];
    
    if (exportType === 'results') {
      const currentList = processedData.length > 0 ? processedData : previewData;
      dataToExport = currentList.filter(r => !r.isCleanup && !r.isDuplicate);
    } else {
      dataToExport = previewData.filter(r => r.isDuplicate || r.isCleanup);
    }

    if (dataToExport.length === 0) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: `No records found to export.`,
      });
      return;
    }

    setIsExporting(true);
    const totalMarketValue = dataToExport.reduce((sum, r) => sum + (r.marketValue || 0), 0);
    const totalAssessedValue = dataToExport.reduce((sum, r) => sum + (r.assessedValue || 0), 0);

    const headerMapping: Record<string, string> = {
      date: "DATE", arpNo: "ARP NO#", pin: "PIN", update: "UPDATE",
      acctName: "ACCTNAME", address: "ADDRESS", location: "LOCATION",
      kind: "KIND", au: "AU", landArea: "LAND AREA", unitValue: "UNIT VALUE",
      marketValue: "MARKET VALUE", assessedValue: "ASSESSED VALUE", yearlyTax: "YEARLY TAX"
    };

    const formattedExport = dataToExport.map(record => {
      const row: any = {};
      Object.entries(headerMapping).forEach(([key, label]) => {
        if (exportColumns[label]) {
          row[label] = record[key as keyof LandRecord];
        }
      });
      return row;
    });

    try {
      const response = await fetch(`/export_template.xlsx?v=${Date.now()}`);
      if (!response.ok) throw new Error("Template 'export_template.xlsx' not found in public folder.");
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];

      const title = exportType === 'results' ? "DATALINK PARAÑAQUE - SUMMARY RESULTS" : "DATALINK PARAÑAQUE - ARCHIVE";
      XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: "A1" });
      
      XLSX.utils.sheet_add_aoa(ws, [
        ["TOTAL RECORDS:", dataToExport.length.toLocaleString()],
        ["TOTAL MARKET VALUE:", `₱${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ["TOTAL ASSESSED VALUE:", `₱${totalAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ], { origin: "A2" });

      const activeHeaders = Object.values(headerMapping).filter(h => exportColumns[h]);
      XLSX.utils.sheet_add_aoa(ws, [activeHeaders], { origin: "A5" });
      
      XLSX.utils.sheet_add_json(ws, formattedExport, { origin: "A6", skipHeader: true });
      
      if (!ws['!views']) ws['!views'] = [];
      ws['!views'][0] = { 
        state: 'frozen', 
        ySplit: 5, 
        topLeftCell: 'A6', 
        activePane: 'bottomLeft' 
      };
      
      ws['!cols'] = activeHeaders.map(() => ({ wch: 22 }));

      const baseName = importedFileName.replace(/\.[^/.]+$/, "") || "LandRecords";
      const dateStr = new Date().toISOString().split('T')[0];
      const typeLabel = exportType === 'results' ? 'Filtered' : 'Archive';
      const finalFileName = `${baseName}-${typeLabel}-${dateStr}.xlsx`;
      
      XLSX.writeFile(workbook, finalFileName);
      
      toast({
        title: "Export Successful",
        description: `Saved as ${finalFileName} using local template.`,
      });
    } catch (error: any) {
      console.error("Export Error:", error);
      toast({
        variant: "destructive",
        title: "Template Export Failed",
        description: error.message || "Check template location.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRowClick = (record: LandRecord) => {
    setSelectedRecord(record);
  };

  const filteredDisplayData = useMemo(() => {
    const baseData = viewMode === 'archive' 
      ? previewData.filter(r => r.isDuplicate || r.isCleanup)
      : (processedData.length > 0 ? processedData : previewData.filter(r => !r.isDuplicate && !r.isCleanup));

    return baseData.filter(record => {
      const query = searchQuery.toLowerCase();
      let matchesSearch = true;

      if (query) {
        if (searchField === 'all') {
          matchesSearch = 
            record.acctName?.toLowerCase().includes(query) ||
            record.pin?.toLowerCase().includes(query) ||
            record.arpNo?.toLowerCase().includes(query) ||
            record.location?.toLowerCase().includes(query) ||
            record.au?.toLowerCase().includes(query);
        } else {
          const value = record[searchField as keyof LandRecord];
          matchesSearch = String(value || '').toLowerCase().includes(query);
        }
      }
      
      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'valid') return !record.isDuplicate && !record.isCleanup;
      if (statusFilter === 'duplicate') return record.isDuplicate;
      if (statusFilter === 'cleanup') return record.isCleanup;
      
      return true;
    });
  }, [previewData, processedData, viewMode, searchQuery, searchField, statusFilter]);

  const analyticsData = useMemo(() => {
    const activeData = processedData.length > 0 ? processedData : previewData.filter(r => !r.isCleanup && !r.isDuplicate);
    
    const auDistribution: Record<string, number> = {};
    const marketValueSum: Record<string, number> = {};

    activeData.forEach(r => {
      const au = r.au || 'UNKNOWN';
      auDistribution[au] = (auDistribution[au] || 0) + 1;
      marketValueSum[au] = (marketValueSum[au] || 0) + (r.marketValue || 0);
    });

    const auChart = Object.entries(auDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);

    const marketChart = Object.entries(marketValueSum)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);

    return { auChart, marketChart };
  }, [processedData, previewData]);

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

  const getDynamicFontSize = (text: string) => {
    const length = text.length;
    if (length > 18) return "text-[11px]";
    if (length > 15) return "text-xs";
    if (length > 12) return "text-base";
    return "text-xl";
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-body" suppressHydrationWarning>
      <header className="bg-card/80 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-2 rounded-2xl shadow-inner border border-primary/20">
            <Database className="text-primary w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight leading-none flex items-center gap-1.5">
              <span className="bg-gradient-to-br from-blue-600 via-emerald-500 to-green-400 bg-clip-text text-transparent drop-shadow-sm">DataLink</span>
              <span className="text-[11px] bg-primary/10 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm ml-1">Parañaque</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1 ml-0.5 opacity-60">Land Data Processor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <Button variant="ghost" size="icon" onClick={handleInstallClick} title="Install App">
              <Download className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsAboutOpen(true)} title="About & Instructions">
            <Info className="w-5 h-5" />
          </Button>
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} title="Settings">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[260px] border-r bg-card/80 backdrop-blur-lg border-white/10 p-6 overflow-y-auto hidden lg:block shadow-[1px_0_5px_rgba(0,0,0,0.02)]">
          <CalibrationSidebar 
            rules={rules} 
            setRules={setRules}
            options={options}
            setOptions={setOptions}
            exportColumns={exportColumns}
            setExportColumns={setExportColumns}
          />
        </aside>

        <main className="flex-1 flex flex-col p-8 overflow-hidden gap-6">
          <Tabs value={viewMode} onValueChange={(val: any) => setViewMode(val)} className="flex-1 flex flex-col min-h-0">
            {rawData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <ImportZone onDataImported={handleDataImported} />
              </div>
            ) : (
              <div className="flex flex-col gap-6 h-full">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                   <Card className="p-4 border-l-4 border-l-slate-400 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <FileSearch className="w-2.5 h-2.5" /> Total Rows
                    </div>
                    <div className={cn("font-black text-foreground leading-tight", getDynamicFontSize(stats.totalRawRows.toLocaleString()))}>
                      {stats.totalRawRows.toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-orange-400 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <Eraser className="w-2.5 h-2.5" /> System Cleanup
                    </div>
                    <div className={cn("font-black text-orange-600 dark:text-orange-400 leading-tight", getDynamicFontSize(stats.systemCleanup.toLocaleString()))}>
                      {stats.systemCleanup.toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4 bg-primary/5 border-l-4 border-l-primary flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Final Records
                    </div>
                    <div className={cn("font-black text-primary leading-tight", getDynamicFontSize(stats.finalCount.toLocaleString()))}>
                      {stats.finalCount.toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4 bg-amber-500/5 border-l-4 border-l-amber-400 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <Archive className="w-2.5 h-2.5" /> Duplicates
                    </div>
                    <div className={cn("font-black text-amber-500 leading-tight", getDynamicFontSize(stats.duplicatesRemoved.toLocaleString()))}>
                      {stats.duplicatesRemoved.toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4 bg-green-500/5 border-l-4 border-l-green-600 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <Database className="w-2.5 h-2.5" /> Market Value
                    </div>
                    <div className={cn("font-black text-green-600 leading-tight truncate", getDynamicFontSize(`₱${stats.totalMarket.toLocaleString()}`))}>
                      ₱{stats.totalMarket.toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4 bg-blue-500/5 border-l-4 border-l-blue-600 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <BarChart3 className="w-2.5 h-2.5" /> Assessed Value
                    </div>
                    <div className={cn("font-black text-blue-600 dark:text-blue-400 leading-tight truncate", getDynamicFontSize(`₱${stats.totalAssessed.toLocaleString()}`))}>
                      ₱{stats.totalAssessed.toLocaleString()}
                    </div>
                  </Card>
                </div>

                <Card className="flex-1 overflow-hidden flex flex-col min-h-0 shadow-xl border-white/5">
                  <div className="p-4 bg-muted/30 border-b flex flex-col xl:flex-row items-center justify-between gap-4">
                    <TabsList className="bg-background border">
                      <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        <TableIcon className="w-3.5 h-3.5 mr-2" />
                        Results
                      </TabsTrigger>
                      <TabsTrigger value="archive" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <Archive className="w-3.5 h-3.5 mr-2" />
                        Archive
                      </TabsTrigger>
                      <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <BarChart3 className="w-3.5 h-3.5 mr-2" />
                        Analytics
                      </TabsTrigger>
                    </TabsList>

                    {viewMode !== 'analytics' && (
                      <div className="flex flex-1 items-center gap-2 w-full md:max-w-3xl">
                        <div className="flex items-center gap-2 flex-1">
                          <Select value={searchField} onValueChange={setSearchField}>
                            <SelectTrigger className="w-[140px] h-9 text-xs">
                              <SelectValue placeholder="Search In" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Fields</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="arpNo">ARP No#</SelectItem>
                              <SelectItem value="pin">PIN</SelectItem>
                              <SelectItem value="acctName">Account Name</SelectItem>
                              <SelectItem value="location">Location</SelectItem>
                              <SelectItem value="au">Usage (AU)</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input 
                              placeholder={`Search ${searchField === 'all' ? 'any field' : searchField}...`} 
                              className="pl-8 text-xs h-9"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-32 h-9 text-xs">
                            <Filter className="w-3 h-3 mr-2" />
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Records</SelectItem>
                            <SelectItem value="valid">Valid Only</SelectItem>
                            <SelectItem value="duplicate">Duplicates</SelectItem>
                            <SelectItem value="cleanup">Cleanup</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setRawData([]); setProcessedData([]); setPreviewData([]); }}>
                        <Eraser className="w-3.5 h-3.5 mr-2" /> Clear All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-0 flex-1 overflow-hidden min-h-0">
                    <TabsContent value="results" className="m-0 h-full">
                      <DataPreviewTable 
                        data={filteredDisplayData} 
                        isProcessed={processedData.length > 0} 
                        onRowClick={handleRowClick}
                      />
                    </TabsContent>
                    <TabsContent value="archive" className="m-0 h-full">
                      <DataPreviewTable 
                        data={filteredDisplayData} 
                        isProcessed={true} 
                        onRowClick={handleRowClick}
                      />
                    </TabsContent>
                    <TabsContent value="analytics" className="m-0 h-full p-6 overflow-y-auto scrollbar-vertical-custom bg-muted/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 max-w-7xl mx-auto">
                        <Card className="p-6 border-white/5 bg-card shadow-2xl overflow-hidden group">
                          <h4 className="text-sm font-black uppercase mb-8 flex items-center gap-2 tracking-widest text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary" /> Property Usage Distribution
                          </h4>
                          <div className="h-[350px] w-full">
                            <ChartContainer config={analyticsChartConfig}>
                              <BarChart 
                                data={analyticsData.auChart}
                                margin={{ top: 20, right: 20, left: 10, bottom: 40 }}
                              >
                                <defs>
                                  <filter id="softShadow" height="130%">
                                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                                    <feOffset dx="2" dy="2" result="offsetblur"/>
                                    <feComponentTransfer>
                                      <feFuncA type="linear" slope="0.3"/>
                                    </feComponentTransfer>
                                    <feMerge> 
                                      <feMergeNode/>
                                      <feMergeNode in="SourceGraphic"/> 
                                    </feMerge>
                                  </filter>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                                <XAxis 
                                  dataKey="name" 
                                  fontSize={9} 
                                  tickLine={false}
                                  axisLine={false}
                                  angle={-45}
                                  textAnchor="end"
                                  interval={0}
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} 
                                />
                                <YAxis 
                                  fontSize={10} 
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar 
                                  dataKey="value" 
                                  radius={[6, 6, 0, 0]} 
                                  filter="url(#softShadow)"
                                >
                                  {analyticsData.auChart.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ChartContainer>
                          </div>
                        </Card>

                        <Card 
                          className="p-6 border-white/5 bg-card shadow-2xl cursor-pointer hover:bg-muted/5 transition-all group relative overflow-hidden" 
                          onClick={() => setIsMarketDetailOpen(true)}
                        >
                          <div className="absolute top-4 right-4 bg-primary/10 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Maximize2 className="w-4 h-4 text-primary" />
                          </div>
                          <h4 className="text-sm font-black uppercase mb-8 flex items-center gap-2 tracking-widest text-muted-foreground">
                            <Database className="w-4 h-4 text-primary" /> Market Value Breakdown
                          </h4>
                          <div className="h-[350px] w-full">
                            <ChartContainer config={analyticsChartConfig}>
                              <PieChart>
                                <Pie
                                  data={analyticsData.marketChart}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={80}
                                  outerRadius={110}
                                  paddingAngle={8}
                                  dataKey="value"
                                  stroke="none"
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                  {analyticsData.marketChart.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} filter="url(#softShadow)" />
                                  ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }}/>
                              </PieChart>
                            </ChartContainer>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                  </div>
                </Card>

                <div className="flex items-center justify-between bg-card p-4 rounded-xl shadow-2xl border border-white/10 shrink-0">
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => handleExport('results')} 
                      size="lg" 
                      className="font-black uppercase text-[10px] tracking-widest border-primary/30 text-primary hover:bg-primary hover:text-white transition-all shadow-lg"
                      disabled={isExporting}
                    >
                      <FileDown className="w-4 h-4 mr-2" /> {isExporting ? "Exporting..." : "Export Results"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleExport('archive')} 
                      size="lg" 
                      className="font-black uppercase text-[10px] tracking-widest border-orange-500/30 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-lg"
                      disabled={isExporting}
                    >
                      <Archive className="w-4 h-4 mr-2" /> {isExporting ? "Exporting..." : "Export Archive"}
                    </Button>
                  </div>
                  <Button 
                    size="lg" 
                    className="bg-primary hover:bg-green-700 px-16 font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-95"
                    disabled={isProcessing}
                    onClick={runProcess}
                  >
                    {isProcessing ? "Processing..." : "Run Processor"}
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        </main>
      </div>
      <SettingsPanel 
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        locationSettings={locationSettings}
        onSettingsChange={setLocationSettings}
        taxRates={taxRates}
        onTaxRatesChange={setTaxRates}
      />
      <AboutModal
        open={isAboutOpen}
        onOpenChange={setIsAboutOpen}
      />
      <RecordDetailModal
        record={selectedRecord}
        open={!!selectedRecord}
        onOpenChange={(isOpen) => !isOpen && setSelectedRecord(null)}
      />
      
      <Dialog open={isMarketDetailOpen} onOpenChange={setIsMarketDetailOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="text-xl font-black bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent uppercase flex items-center gap-2 leading-none tracking-tight">
              <Database className="w-5 h-5 text-primary" /> Market Value Analysis
            </DialogTitle>
            <DialogDescription className="font-medium text-xs text-muted-foreground/60">
              In-depth financial distribution by property usage category.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            <div className="lg:col-span-5 bg-muted/5 rounded-2xl border border-white/5 flex items-center justify-center p-4 shadow-inner">
              <ChartContainer config={analyticsChartConfig} className="h-full w-full aspect-auto">
                <PieChart>
                  <Pie
                    data={analyticsData.marketChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={90}
                    outerRadius={120}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    labelLine={true}
                  >
                    {analyticsData.marketChart.map((entry, index) => (
                      <Cell key={`cell-expanded-${index}`} fill={COLORS[index % COLORS.length]} filter="url(#softShadow)" />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            
            <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
              <div className="flex items-center justify-between px-3">
                <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-50">Usage Categories</h5>
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-50">Market Value</span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-3 scrollbar-vertical-custom space-y-2">
                {analyticsData.marketChart.map((item, index) => {
                  const total = analyticsData.marketChart.reduce((sum, curr) => sum + curr.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/40 transition-all hover:scale-[1.01] shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-[11px] font-black uppercase tracking-tight text-foreground/90">{item.name}</span>
                          <span className="text-[9px] font-black text-primary px-1.5 py-0.5 rounded-full bg-primary/10 leading-none">{percentage}%</span>
                        </div>
                        <span className="text-xs font-mono font-bold tabular-nums">₱{item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1 bg-background/50 rounded-full overflow-hidden mt-0.5 shadow-inner">
                        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-auto pt-4 border-t border-white/10 shrink-0">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/20 shadow-lg">
                  <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Grand Total</span>
                  <span className="text-lg font-black bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">₱{analyticsData.marketChart.reduce((sum, curr) => sum + curr.value, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}