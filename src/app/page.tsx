
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Trash2, 
  FileDown, 
  Play, 
  Eraser, 
  CheckCircle2, 
  LayoutDashboard,
  ShieldCheck,
  Zap,
  ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ImportZone } from '@/components/dashboard/import-zone';
import { CalibrationSidebar } from '@/components/dashboard/calibration-sidebar';
import { DataPreviewTable } from '@/components/dashboard/data-preview-table';
import { LandRecord, CalibrationRule, processRecords } from '@/lib/processor';
import { suggestCalibrationRules } from '@/ai/flows/suggest-calibration-rules-flow';
import * as XLSX from 'xlsx';

export default function Home() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<LandRecord[]>([]);
  const [processedData, setProcessedData] = useState<LandRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rules, setRules] = useState<CalibrationRule[]>([]);
  const [assessmentLevel, setAssessmentLevel] = useState(0.20);
  const [options, setOptions] = useState({
    removeDuplicates: true,
    applyCalibration: true
  });
  const [stats, setStats] = useState({
    totalImported: 0,
    duplicatesRemoved: 0,
    finalCount: 0
  });

  // Handle hydration
  useEffect(() => {
    setIsClient(true);
    // Load state from local storage for offline session persistence
    const saved = localStorage.getItem('panaque_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      setData(parsed.data || []);
      setRules(parsed.rules || []);
      setAssessmentLevel(parsed.assessmentLevel || 0.20);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('panaque_session', JSON.stringify({
        data,
        rules,
        assessmentLevel
      }));
    }
  }, [data, rules, assessmentLevel, isClient]);

  const handleDataImported = (imported: LandRecord[]) => {
    setData(imported);
    setProcessedData([]);
    setStats({ totalImported: imported.length, duplicatesRemoved: 0, finalCount: imported.length });
    toast({
      title: "Data Imported",
      description: `Loaded ${imported.length} records successfully.`,
    });
  };

  const runProcess = () => {
    if (data.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No data to process." });
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const { processed, duplicatesRemoved } = processRecords(data, rules, {
        ...options,
        assessmentLevel
      });
      setProcessedData(processed);
      setStats({
        totalImported: data.length,
        duplicatesRemoved,
        finalCount: processed.length
      });
      setIsProcessing(false);
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${processed.length} records.`,
      });
    }, 500);
  };

  const handleExport = () => {
    const exportData = processedData.length > 0 ? processedData : data;
    if (exportData.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cleaned Records");
    XLSX.writeFile(wb, `Parañaque_Land_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAutoSuggest = async () => {
    if (data.length === 0) {
      toast({ variant: "destructive", title: "Wait", description: "Import data first to suggest patterns." });
      return;
    }
    
    toast({ title: "AI Thinking", description: "Analyzing data for patterns..." });
    try {
      // Send a small sample to AI
      const sample = data.slice(0, 50).map(r => ({
        pin: r.pin,
        location: r.location
      }));
      
      const result = await suggestCalibrationRules({ records: sample as any });
      const newRules: CalibrationRule[] = result.rules.map(r => ({
        ...r,
        id: Math.random().toString(36).substr(2, 9),
        overwrite: true
      }));
      
      setRules([...rules, ...newRules]);
      toast({ title: "Rules Suggested", description: `Added ${newRules.length} patterns automatically.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "AI could not process data at this time." });
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col font-body">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#3179CD] p-2 rounded-lg">
            <Database className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#3179CD] flex items-center gap-2">
              Panaque DataLink
              <Badge variant="outline" className="text-[10px] font-normal uppercase bg-[#3179CD]/5">v2.4 - Gov Edition</Badge>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Real Property Data Cleaner & Converter</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground font-semibold">
           <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-500" /> Secure Storage</div>
           <div className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-orange-500" /> Fast Engine</div>
           <div className="flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4 text-blue-500" /> Offline Ready</div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Calibration Settings */}
        <aside className="w-[380px] border-r bg-white p-6 overflow-y-auto overflow-x-hidden hidden lg:block shadow-[1px_0_5px_rgba(0,0,0,0.02)]">
          <CalibrationSidebar 
            rules={rules} 
            setRules={setRules}
            assessmentLevel={assessmentLevel}
            setAssessmentLevel={setAssessmentLevel}
            options={options}
            setOptions={setOptions}
            onAutoSuggest={handleAutoSuggest}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col p-8 overflow-hidden gap-6">
          {data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <ImportZone onDataImported={handleDataImported} />
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Imported", value: stats.totalImported, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Duplicates Removed", value: stats.duplicatesRemoved, color: "text-red-600", bg: "bg-red-50" },
                  { label: "Final Records", value: stats.finalCount, color: "text-green-600", bg: "bg-green-50" },
                ].map((stat, i) => (
                  <Card key={i} className={`p-4 ${stat.bg} border-none shadow-sm flex items-center justify-between`}>
                    <span className="text-sm font-semibold text-muted-foreground">{stat.label}</span>
                    <span className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</span>
                  </Card>
                ))}
              </div>

              {/* Table Container */}
              <Card className="flex-1 bg-white shadow-lg border-none overflow-hidden flex flex-col">
                <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                      {processedData.length > 0 ? "Processed Output" : "Raw Data Preview"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setData([])}>
                      <Eraser className="w-3.5 h-3.5 mr-2" /> Clear
                    </Button>
                  </div>
                </div>
                <div className="p-0 flex-1 overflow-hidden">
                  <DataPreviewTable 
                    data={processedData.length > 0 ? processedData : data} 
                    isProcessed={processedData.length > 0} 
                  />
                </div>
              </Card>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-md">
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const text = JSON.stringify(processedData.length > 0 ? processedData : data, null, 2);
                      navigator.clipboard.writeText(text);
                      toast({ title: "Copied", description: "Data copied as JSON to clipboard." });
                    }}
                  >
                    Copy Table
                  </Button>
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
                    {isProcessing ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" /> Process Data
                      </>
                    )}
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
