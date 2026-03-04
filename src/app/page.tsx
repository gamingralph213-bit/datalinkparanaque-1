"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileDown, 
  Play, 
  Eraser, 
  LayoutDashboard,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ImportZone } from '@/components/dashboard/import-zone';
import { CalibrationSidebar } from '@/components/dashboard/calibration-sidebar';
import { DataPreviewTable } from '@/components/dashboard/data-preview-table';
import { LandRecord, CalibrationRule, processRecords } from '@/lib/processor';
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
  const [options, setOptions] = useState({
    removeDuplicates: true,
    applyCalibration: true
  });
  const [stats, setStats] = useState({
    totalImported: 0,
    duplicatesRemoved: 0,
    finalCount: 0
  });

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('panaque_session_v3');
    if (saved) {
      const parsed = JSON.parse(saved);
      setRules(parsed.rules || []);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('panaque_session_v3', JSON.stringify({ rules }));
    }
  }, [rules, isClient]);

  const handleDataImported = (imported: LandRecord[], fileName: string) => {
    setRawData(imported);
    setImportedFileName(fileName);
    setProcessedData([]);
    
    const { allWithDuplicateMarkers, duplicatesRemoved } = processRecords(imported, [], {
      removeDuplicates: true,
      applyCalibration: false
    });
    
    setPreviewData(allWithDuplicateMarkers);
    setStats({ 
      totalImported: imported.length, 
      duplicatesRemoved, 
      finalCount: imported.length - duplicatesRemoved 
    });

    toast({
      title: "Data Loaded",
      description: `${imported.length} records imported. Duplicates are highlighted in the preview.`,
    });
  };

  const runProcess = () => {
    if (rawData.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "Please import an Excel file first." });
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const { processed, duplicatesRemoved } = processRecords(rawData, rules, options);
      setProcessedData(processed);
      setStats({
        totalImported: rawData.length,
        duplicatesRemoved,
        finalCount: processed.length
      });
      setIsProcessing(false);
      toast({
        title: "Process Complete",
        description: `Successfully cleaned and formatted ${processed.length} records.`,
      });
    }, 400);
  };

  const handleExport = () => {
    const exportData = processedData.length > 0 ? processedData : previewData.filter(r => !r.isDuplicate);
    if (exportData.length === 0) return;

    // Remove internal markers for export
    const cleanExport = exportData.map(({ isDuplicate, ...rest }) => rest);

    const ws = XLSX.utils.json_to_sheet(cleanExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Processed Records");
    
    // Naming format: (name of raw imported file)-Filtered-(date)
    const baseName = importedFileName.replace(/\.[^/.]+$/, ""); // Strip original extension
    const dateStr = new Date().toISOString().split('T')[0];
    const finalFileName = `${baseName}-Filtered-${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, finalFileName);
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col font-body">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#3179CD] p-2 rounded-lg">
            <Calculator className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#3179CD]">Parañaque Data Link</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Real Property Data Processor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-normal uppercase bg-[#3179CD]/5">Local Processor</Badge>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[360px] border-r bg-white p-6 overflow-y-auto hidden lg:block shadow-[1px_0_5px_rgba(0,0,0,0.02)]">
          <CalibrationSidebar 
            rules={rules} 
            setRules={setRules}
            options={options}
            setOptions={setOptions}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col p-8 overflow-hidden gap-6">
          {rawData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <ImportZone onDataImported={handleDataImported} />
            </div>
          ) : (
            <>
              {/* Statistics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Imported", value: stats.totalImported, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Duplicates Identified", value: stats.duplicatesRemoved, color: "text-red-600", bg: "bg-red-50" },
                  { label: "Final Records", value: processedData.length || stats.finalCount, color: "text-green-600", bg: "bg-green-50" },
                ].map((stat, i) => (
                  <Card key={i} className={`p-4 ${stat.bg} border-none shadow-sm flex items-center justify-between`}>
                    <span className="text-sm font-semibold text-muted-foreground">{stat.label}</span>
                    <span className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</span>
                  </Card>
                ))}
              </div>

              {/* Data Table */}
              <Card className="flex-1 bg-white shadow-lg border-none overflow-hidden flex flex-col">
                <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                      {processedData.length > 0 ? "Result Table" : "Preview Table (Markers Active)"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setRawData([]);
                      setPreviewData([]);
                      setProcessedData([]);
                      setImportedFileName("");
                    }}>
                      <Eraser className="w-3.5 h-3.5 mr-2" /> Clear All
                    </Button>
                  </div>
                </div>
                <div className="p-0 flex-1 overflow-hidden">
                  <DataPreviewTable 
                    data={processedData.length > 0 ? processedData : previewData} 
                    isProcessed={processedData.length > 0} 
                  />
                </div>
              </Card>

              {/* Toolbar Actions */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-md">
                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleExport}>
                    <FileDown className="w-4 h-4 mr-2" /> Export to Excel
                  </Button>
                </div>
                <div className="flex gap-4">
                  <Button 
                    size="lg" 
                    className="bg-[#3179CD] hover:bg-[#1D5EAA] px-10 shadow-lg shadow-blue-500/20"
                    disabled={isProcessing}
                    onClick={runProcess}
                  >
                    {isProcessing ? "Processing..." : "Run Processor"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
