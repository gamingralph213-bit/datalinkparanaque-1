"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileDown, 
  Play, 
  Eraser, 
  Settings,
  Archive,
  CheckCircle2,
  FileSearch,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ImportZone } from '@/components/dashboard/import-zone';
import { CalibrationSidebar } from '@/components/dashboard/calibration-sidebar';
import { DataPreviewTable } from '@/components/dashboard/data-preview-table';
import { LandRecord, CalibrationRule, processRecords } from '@/lib/processor';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';
import { SettingsPanel } from '@/components/dashboard/settings-panel';
import { defaultLocationSettings, BarangayConfig } from '@/lib/locations';
import { ModeToggle } from '@/components/mode-toggle';

export default function Home() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [rawData, setRawData] = useState<LandRecord[]>([]);
  const [previewData, setPreviewData] = useState<LandRecord[]>([]);
  const [processedData, setProcessedData] = useState<LandRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [rules, setRules] = useState<CalibrationRule[]>([]);
  const [viewMode, setViewMode] = useState<'results' | 'archive'>('results');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [locationSettings, setLocationSettings] = useState<BarangayConfig[]>(defaultLocationSettings);
  const [options, setOptions] = useState({
    removeDuplicates: true,
    applyCalibration: true
  });
  
  const defaultExportColumns = {
    "DATE": true,
    "ARP NO#": true,
    "PIN": true,
    "UPDATE": true,
    "ACCTNAME": true,
    "ADDRESS": true,
    "LOCATION": true,
    "KIND": true,
    "AU": true,
    "LAND AREA": true,
    "UNIT VALUE": true,
    "MARKET VALUE": true,
    "ASSESSED VALUE": true
  };

  const [exportColumns, setExportColumns] = useState<Record<string, boolean>>(defaultExportColumns);

  const [stats, setStats] = useState({
    totalRawRows: 0,
    systemCleanup: 0,
    totalImported: 0,
    duplicatesRemoved: 0,
    finalCount: 0,
    totalMarket: 0,
    totalAssessed: 0
  });

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('panaque_session_v18_cyber');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.rules) setRules(parsed.rules);
      if (parsed.exportColumns) {
        setExportColumns({ ...defaultExportColumns, ...parsed.exportColumns });
      }
      
      if (parsed.locationSettings) {
        const savedSettings: BarangayConfig[] = parsed.locationSettings;
        const savedSettingsMap = new Map(savedSettings.map(s => [s.name, s]));
        
        const mergedSettings = defaultLocationSettings.map(defaultBrgy => {
          const savedBrgy = savedSettingsMap.get(defaultBrgy.name);
          if (savedBrgy) {
            const savedSectionsMap = new Map(savedBrgy.sections.map(s => [s.section, s]));
            const mergedSections = defaultBrgy.sections.map(defaultSection => {
              const savedSection = savedSectionsMap.get(defaultSection.section);
              return savedSection || defaultSection;
            });
            return { ...defaultBrgy, sections: mergedSections };
          }
          return defaultBrgy;
        });
        setLocationSettings(mergedSettings);

      } else {
        setLocationSettings(defaultLocationSettings);
      }
    } else {
      setLocationSettings(defaultLocationSettings);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('panaque_session_v18_cyber', JSON.stringify({ rules, exportColumns, locationSettings }));
    }
  }, [rules, exportColumns, locationSettings, isClient]);


  const handleDataImported = (imported: LandRecord[], fileName: string, rawCount: number) => {
    setRawData(imported);
    setImportedFileName(fileName);
    setProcessedData([]);
    setViewMode('results');
    
    const { allWithDuplicateMarkers, duplicatesRemoved, cleanupCount } = processRecords(imported, [], [], {
      removeDuplicates: true,
      applyCalibration: false
    });
    
    setPreviewData(allWithDuplicateMarkers);
    setStats({ 
      totalRawRows: rawCount,
      systemCleanup: cleanupCount,
      totalImported: imported.length - cleanupCount, 
      duplicatesRemoved, 
      finalCount: imported.length - cleanupCount - duplicatesRemoved,
      totalMarket: allWithDuplicateMarkers.reduce((sum, r) => sum + (r.isDuplicate || r.isCleanup ? 0 : (r.marketValue || 0)), 0),
      totalAssessed: allWithDuplicateMarkers.reduce((sum, r) => sum + (r.isDuplicate || r.isCleanup ? 0 : (r.assessedValue || 0)), 0)
    });

    toast({
      title: "Data Loaded",
      description: `${imported.length - cleanupCount} property records imported.`,
    });
  };

  const runProcess = () => {
    if (rawData.length === 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      const { processed, allWithDuplicateMarkers, duplicatesRemoved, cleanupCount } = processRecords(rawData, rules, locationSettings, options);
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
      setIsProcessing(false);
      toast({
        title: "Process Complete",
        description: `Final count: ${processed.length} records.`,
      });
    }, 400);
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
      date: "DATE",
      arpNo: "ARP NO#",
      pin: "PIN",
      update: "UPDATE",
      acctName: "ACCTNAME",
      address: "ADDRESS",
      location: "LOCATION",
      kind: "KIND",
      au: "AU",
      landArea: "LAND AREA",
      unitValue: "UNIT VALUE",
      marketValue: "MARKET VALUE",
      assessedValue: "ASSESSED VALUE"
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

  if (!isClient) return null;

  const currentDisplayData = viewMode === 'archive' 
    ? previewData.filter(r => r.isDuplicate || r.isCleanup)
    : (processedData.length > 0 ? processedData : previewData.filter(r => !r.isDuplicate && !r.isCleanup));

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <header className="bg-card/80 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Database className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Parañaque Data Link</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Land Data Processor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <div>
            {rawData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <ImportZone onDataImported={handleDataImported} />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card className="p-4 border-l-4 border-l-slate-400">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <FileSearch className="w-2.5 h-2.5" /> Total Rows
                    </span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-200">{stats.totalRawRows.toLocaleString()}</span>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-orange-400">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">System Cleanup</span>
                    <span className="text-lg font-black text-orange-600 dark:text-orange-400">{stats.systemCleanup.toLocaleString()}</span>
                  </Card>
                  <Card className="p-4 bg-primary/10 border-l-4 border-l-primary">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Final Records</span>
                    <span className="text-lg font-black text-primary">{stats.finalCount.toLocaleString()}</span>
                  </Card>
                  <Card className="p-4 bg-amber-500/10 border-l-4 border-l-amber-400">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Duplicates</span>
                    <span className="text-lg font-black text-amber-500">{stats.duplicatesRemoved.toLocaleString()}</span>
                  </Card>
                  <Card className="p-4 bg-green-500/10 border-l-4 border-l-green-600">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Market Value</span>
                    <span className="text-lg font-black text-green-500">₱{stats.totalMarket.toLocaleString()}</span>
                  </Card>
                </div>

                <Card className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                    <Tabs value={viewMode} onValueChange={(val: any) => setViewMode(val)} className="w-[400px]">
                      <TabsList className="bg-background border">
                        <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                          {processedData.length > 0 ? "Results" : "Preview"}
                        </TabsTrigger>
                        <TabsTrigger value="archive" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                          <Archive className="w-3.5 h-3.5 mr-2" />
                          Archive ({stats.duplicatesRemoved + stats.systemCleanup})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => { setRawData([]); setProcessedData([]); setPreviewData([]); }}>
                        <Eraser className="w-3.5 h-3.5 mr-2" /> Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="p-0 flex-1 overflow-hidden">
                    <DataPreviewTable 
                      data={currentDisplayData} 
                      isProcessed={processedData.length > 0 || viewMode === 'archive'} 
                    />
                  </div>
                </Card>

                <div className="flex items-center justify-between bg-card p-4 rounded-xl shadow-md">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('results')} size="lg" className="font-bold border-primary text-primary hover:bg-primary/5">
                      <FileDown className="w-4 h-4 mr-2" /> Export Results
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('archive')} size="lg" className="font-bold border-orange-500 text-orange-600 hover:bg-orange-500/10">
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
          </div>
        </main>
      </div>
      <SettingsPanel 
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        locationSettings={locationSettings}
        onLocationSettingsChange={setLocationSettings}
      />
    </div>
  );
}
