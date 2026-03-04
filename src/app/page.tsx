"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileDown, 
  Play, 
  Eraser, 
  LayoutDashboard,
  Calculator,
  Archive,
  CheckCircle2,
  Trash2,
  FileSearch
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
    const saved = localStorage.getItem('panaque_session_v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.rules) setRules(parsed.rules);
      if (parsed.exportColumns) {
        setExportColumns({ ...defaultExportColumns, ...parsed.exportColumns });
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('panaque_session_v4', JSON.stringify({ rules, exportColumns }));
    }
  }, [rules, exportColumns, isClient]);

  const handleDataImported = (imported: LandRecord[], fileName: string, rawCount: number) => {
    setRawData(imported);
    setImportedFileName(fileName);
    setProcessedData([]);
    setViewMode('results');
    
    const { allWithDuplicateMarkers, duplicatesRemoved } = processRecords(imported, [], {
      removeDuplicates: true,
      applyCalibration: false
    });
    
    setPreviewData(allWithDuplicateMarkers);
    setStats({ 
      totalRawRows: rawCount,
      systemCleanup: rawCount - imported.length,
      totalImported: imported.length, 
      duplicatesRemoved, 
      finalCount: imported.length - duplicatesRemoved,
      totalMarket: allWithDuplicateMarkers.reduce((sum, r) => sum + (r.isDuplicate ? 0 : (r.marketValue || 0)), 0),
      totalAssessed: allWithDuplicateMarkers.reduce((sum, r) => sum + (r.isDuplicate ? 0 : (r.assessedValue || 0)), 0)
    });

    toast({
      title: "Data Loaded",
      description: `${imported.length} valid property records imported.`,
    });
  };

  const runProcess = () => {
    if (rawData.length === 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      const { processed, allWithDuplicateMarkers, duplicatesRemoved } = processRecords(rawData, rules, options);
      setProcessedData(processed);
      setPreviewData(allWithDuplicateMarkers);
      setStats(prev => ({
        ...prev,
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
      dataToExport = processedData.length > 0 ? processedData : previewData.filter(r => !r.isDuplicate);
    } else {
      dataToExport = previewData.filter(r => r.isDuplicate);
    }

    if (dataToExport.length === 0) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: `No ${exportType === 'results' ? 'processed records' : 'duplicate records'} found to export.`,
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
      [exportType === 'results' ? "PARAÑAQUE DATA LINK - SUMMARY RESULTS" : "PARAÑAQUE DATA LINK - DUPLICATES ARCHIVE"],
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
    ? previewData.filter(r => r.isDuplicate)
    : (processedData.length > 0 ? processedData : previewData.filter(r => !r.isDuplicate));

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col font-body">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#3179CD] p-2 rounded-lg">
            <Calculator className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#3179CD]">Parañaque Data Link</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Land Data Processor</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[360px] border-r bg-white p-6 overflow-y-auto hidden lg:block shadow-[1px_0_5px_rgba(0,0,0,0.02)]">
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
          {rawData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <ImportZone onDataImported={handleDataImported} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-center border-l-4 border-l-blue-400">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <FileSearch className="w-2.5 h-2.5" /> Total Rows in File
                  </span>
                  <span className="text-lg font-black text-slate-800">{stats.totalRawRows.toLocaleString()}</span>
                </Card>
                <Card className="p-4 bg-white border-none shadow-sm flex flex-col justify-center border-l-4 border-l-red-400">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">System Cleanup (Totals/Empty)</span>
                  <span className="text-lg font-black text-red-600">{stats.systemCleanup.toLocaleString()}</span>
                </Card>
                <Card className="p-4 bg-blue-50 border-none shadow-sm flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Final Processed Records</span>
                  <span className="text-lg font-black text-blue-600">{stats.finalCount.toLocaleString()}</span>
                </Card>
                <Card className="p-4 bg-orange-50 border-none shadow-sm flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Duplicate PINs Removed</span>
                  <span className="text-lg font-black text-orange-600">{stats.duplicatesRemoved.toLocaleString()}</span>
                </Card>
                <Card className="p-4 bg-green-50 border-none shadow-sm flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Total Market Value</span>
                  <span className="text-lg font-black text-green-700">₱{stats.totalMarket.toLocaleString()}</span>
                </Card>
              </div>

              <Card className="flex-1 bg-white shadow-lg border-none overflow-hidden flex flex-col">
                <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                  <Tabs value={viewMode} onValueChange={(val: any) => setViewMode(val)} className="w-[400px]">
                    <TabsList className="bg-white border">
                      <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                        {processedData.length > 0 ? "Processed Results" : "Import Preview"}
                      </TabsTrigger>
                      <TabsTrigger value="archive" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <Archive className="w-3.5 h-3.5 mr-2" />
                        Archive ({stats.duplicatesRemoved})
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

              <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-md">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExport('results')} size="lg" className="font-bold border-primary text-primary hover:bg-primary/5">
                    <FileDown className="w-4 h-4 mr-2" /> Export Results
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('archive')} size="lg" className="font-bold border-orange-500 text-orange-600 hover:bg-orange-50">
                    <Archive className="w-4 h-4 mr-2" /> Export Archive
                  </Button>
                </div>
                <Button 
                  size="lg" 
                  className="bg-[#3179CD] hover:bg-[#1D5EAA] px-12 font-bold shadow-lg shadow-blue-500/20"
                  disabled={isProcessing}
                  onClick={runProcess}
                >
                  {isProcessing ? "Processing..." : "Run Processor"}
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
