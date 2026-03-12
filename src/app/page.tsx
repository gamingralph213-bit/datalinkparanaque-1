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
  Maximize2
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
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, Pie, PieChart, Legend, CartesianGrid } from 'recharts';

// Bumped version for updated AGRI and GOV default rates
const LOCAL_STORAGE_KEY = 'paranaque_datalink_v28';

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

export default function Home() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [rawData, setRawData] = useState<LandRecord[]>([]);
  const [previewData, setPreviewData] = useState<LandRecord[]>([]);
  const [processedData, setProcessedData] = useState<LandRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [rules, setRules] = useState<CalibrationRule[]>([]);
  const [viewMode, setViewMode] = useState<'results' | 'archive' | 'analytics'>('results');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [isMarketDetailOpen, setIsMarketDetailOpen] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // App settings state
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

  // Effect to set client-side rendering and load from localStorage
  useEffect(() => {
    setIsClient(true);
    
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const handleAppInstalled = () => { setDeferredPrompt(null); toast({ title: "Installation Successful", description: "Parañaque Data Link is now available on your device." }); };
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
        console.error("Failed to parse localStorage, resetting to defaults:", error);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Effect to save to localStorage whenever settings change
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
    
    // Initial import ALWAYS shows data raw
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
      title: "Data Imported",
      description: `${rawCount} property records loaded as raw data. Click "Run Processor" to apply rules.`,
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
      description: `Final count: ${processed.length} records. ${duplicatesRemoved} duplicates found.`,
    });
    setIsProcessing(false);
  };

  const handleExport = (exportType: 'results' | 'archive' = 'results') => {
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
        description: `No records found to export for ${exportType}.`,
      });
      return;
    }

    const totalMarket = dataToExport.reduce((sum, r) => sum + (r.marketValue || 0), 0);
    const totalAssessed = dataToExport.reduce((sum, r) => sum + (r.assessedValue || 0), 0);

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

    const ws = XLSX.utils.json_to_sheet([]);
    
    XLSX.utils.sheet_add_aoa(ws, [
      [exportType === 'results' ? "PARAÑAQUE DATA LINK - SUMMARY RESULTS" : "PARAÑAQUE DATA LINK - ARCHIVE (DUPLICATES & CLEANUP)"],
      ["TOTAL RECORDS:", dataToExport.length.toLocaleString()],
      ["TOTAL MARKET VALUE:", `₱${totalMarket.toLocaleString()}`],
      ["TOTAL ASSESSED VALUE:", `₱${totalAssessed.toLocaleString()}`],
      [""] 
    ], { origin: "A1" });

    const activeHeaders = Object.values(headerMapping).filter(h => exportColumns[h]);
    XLSX.utils.sheet_add_aoa(ws, [activeHeaders], { origin: "A6" });
    XLSX.utils.sheet_add_json(ws, formattedExport, { origin: "A7", skipHeader: true });
    
    ws['!freeze'] = { xSplit: 0, ySplit: 6 };
    ws['!cols'] = activeHeaders.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportType === 'results' ? "Processed Data" : "Archive");
    
    const baseName = importedFileName.replace(/\.[^/.]+$/, "");
    const dateStr = new Date().toISOString().split('T')[0];
    const typeLabel = exportType === 'results' ? 'Filtered' : 'Archive';
    const finalFileName = `${baseName}-${typeLabel}-${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, finalFileName);
    
    toast({
      title: `${exportType === 'results' ? 'Results' : 'Archive'} Export Successful`,
      description: `Saved as ${finalFileName}`,
    });
  };

  const handleRowClick = (record: LandRecord) => {
    setSelectedRecord(record);
  };

  // Memoized Filtered Data
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

  // Analytics Data
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

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <header className="bg-card/80 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Database className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">Parañaque Data Link</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Land Data Processor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <Button variant="ghost" size="icon" onClick={handleInstallClick} title="Install App">
              <Download className="w-5 h-5" />
            </Button>
          )}
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                   <Card className="p-4 border-l-4 border-l-slate-400 flex flex-col">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <FileSearch className="w-2.5 h-2.5" /> Total Rows
                    </div>
                    <div className="text-lg font-black text-gradient leading-tight">{stats.totalRawRows.toLocaleString()}</div>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-orange-400 flex flex-col">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <Eraser className="w-2.5 h-2.5" /> System Cleanup
                    </div>
                    <div className="text-lg font-black text-orange-600 dark:text-orange-400 leading-tight">{stats.systemCleanup.toLocaleString()}</div>
                  </Card>
                  <Card className="p-4 bg-primary/10 border-l-4 border-l-primary flex flex-col">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Final Records
                    </div>
                    <div className="text-lg font-black text-gradient leading-tight">{stats.finalCount.toLocaleString()}</div>
                  </Card>
                  <Card className="p-4 bg-amber-500/10 border-l-4 border-l-amber-400 flex flex-col">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <Archive className="w-2.5 h-2.5" /> Duplicates
                    </div>
                    <div className="text-lg font-black text-amber-500 leading-tight">{stats.duplicatesRemoved.toLocaleString()}</div>
                  </Card>
                  <Card className="p-4 bg-green-500/10 border-l-4 border-l-green-600 flex flex-col">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <Database className="w-2.5 h-2.5" /> Market Value
                    </div>
                    <div className="text-lg font-black text-gradient leading-tight">₱{stats.totalMarket.toLocaleString()}</div>
                  </Card>
                </div>

                <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
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
                    <TabsContent value="analytics" className="m-0 h-full p-6 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
                        <Card className="p-6">
                          <h4 className="text-sm font-bold uppercase mb-6 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" /> Property Usage Distribution (AU)
                          </h4>
                          <div className="h-[300px] w-full">
                            <ChartContainer 
                              config={{ 
                                value: { label: "Count", color: "hsl(var(--primary))" } 
                              }}
                              className="aspect-auto h-full w-full"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                  data={analyticsData.auChart}
                                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                                >
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                                  <XAxis 
                                    dataKey="name" 
                                    fontSize={10} 
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                                  />
                                  <YAxis 
                                    fontSize={10} 
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                                  />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                                    {analyticsData.auChart.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </div>
                        </Card>

                        <Card 
                          className="p-6 cursor-pointer hover:bg-muted/10 transition-all group relative" 
                          onClick={() => setIsMarketDetailOpen(true)}
                        >
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Maximize2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <h4 className="text-sm font-bold uppercase mb-6 flex items-center gap-2">
                            <Database className="w-4 h-4 text-primary" /> Market Value Breakdown by Usage
                          </h4>
                          <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analyticsData.marketChart}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                  {analyticsData.marketChart.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <ChartTooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-4 text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            Click to View Full Breakdown
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                  </div>
                </Card>

                <div className="flex items-center justify-between bg-card p-4 rounded-xl shadow-md border border-white/10 shrink-0">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleExport('results')} 
                      size="lg" 
                      className="font-bold border-primary text-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <FileDown className="w-4 h-4 mr-2" /> Export Results
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleExport('archive')} 
                      size="lg" 
                      className="font-bold border-orange-500 text-orange-600 hover:bg-orange-500/10 hover:text-orange-600"
                    >
                      <Archive className="w-4 h-4 mr-2" /> Export Archive
                    </Button>
                  </div>
                  <Button 
                    size="lg" 
                    className="bg-primary hover:bg-green-700 px-12 font-bold shadow-lg shadow-green-500/20"
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
      <RecordDetailModal
        record={selectedRecord}
        open={!!selectedRecord}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedRecord(null);
          }
        }}
      />
      
      {/* Expanded Market Value Detail Modal */}
      <Dialog open={isMarketDetailOpen} onOpenChange={setIsMarketDetailOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-white/10 p-4 sm:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-gradient uppercase flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" /> Market Value Breakdown
            </DialogTitle>
            <DialogDescription className="font-medium text-xs">
              Complete distribution by property usage (Actual Use).
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 h-[350px] sm:h-[450px] bg-muted/10 rounded-xl border border-white/5 flex items-center justify-center p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.marketChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  >
                    {analyticsData.marketChart.map((entry, index) => (
                      <Cell key={`cell-expanded-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Usage Categories
                </h5>
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Share
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-vertical-custom">
                {analyticsData.marketChart.map((item, index) => {
                  const total = analyticsData.marketChart.reduce((sum, curr) => sum + curr.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  
                  return (
                    <div key={item.name} className="flex flex-col gap-1.5 p-2 px-3 rounded-lg bg-muted/40 border border-white/5 transition-colors hover:bg-muted/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-xs font-black uppercase tracking-tight">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none">
                          {percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase opacity-60">Value</span>
                        <span className="text-xs font-mono font-bold">₱{item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1 bg-background/50 rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full transition-all duration-1000 ease-out" 
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: COLORS[index % COLORS.length] 
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-2 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">Total Market Value</span>
                  <span className="text-sm font-black text-gradient">
                    ₱{analyticsData.marketChart.reduce((sum, curr) => sum + curr.value, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
