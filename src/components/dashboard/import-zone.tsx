
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Info, 
  CheckCircle2, 
  Loader2, 
  X, 
  Files, 
  Trash2, 
  FileText, 
  Plus,
  HelpCircle,
  Maximize2,
  Minimize2,
  BookUser,
  ShieldOff,
  Database
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LandRecord } from '@/lib/processor';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { parseFile, mapRawToRecords } from '@/lib/importer';

interface ImportZoneProps {
  onDataImported: (data: LandRecord[], fileName: string, rawCount: number, mode: 'raw' | 'exempt') => void;
  mode?: 'raw' | 'exempt';
  workflowMode?: 'standard' | 'roll';
}

export function ImportZone({ onDataImported, mode = 'raw', workflowMode = 'standard' }: ImportZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const [fileStatuses, setFileStatuses] = useState<Record<number, 'pending' | 'processing' | 'done'>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stagedFiles.length > 0) {
      const timer = setTimeout(() => {
        cardRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [stagedFiles.length]);

  const handleStartImport = async () => {
    if (stagedFiles.length === 0) return;
    setIsLoading(true);
    
    const initialStatuses: Record<number, 'pending' | 'processing' | 'done'> = {};
    stagedFiles.forEach((_, idx) => {
      initialStatuses[idx] = 'pending';
    });
    setFileStatuses(initialStatuses);

    const allRecords: LandRecord[] = [];
    let totalRawCount = 0;
    const fileNames: string[] = [];

    try {
      for (let i = 0; i < stagedFiles.length; i++) {
        setFileStatuses(prev => ({ ...prev, [i]: 'processing' }));
        const file = stagedFiles[i];
        
        const result = await parseFile(file, mode === 'exempt' ? 'standard' : workflowMode);
        allRecords.push(...result.data);
        totalRawCount += result.count;
        fileNames.push(file.name);
        
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setFileStatuses(prev => ({ ...prev, [i]: 'done' }));
      }

      const summaryFileName = fileNames.length > 1 
        ? `Batch (${fileNames.length} Files)` 
        : fileNames[0];

      if (allRecords.length === 0) {
        toast({
          variant: "destructive",
          title: "Empty Data",
          description: "No property records found in the selected files."
        });
        setIsLoading(false);
        setFileStatuses({});
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      onDataImported(allRecords, summaryFileName, totalRawCount, mode);
      setIsLoading(false);
      setStagedFiles([]); 
      setFileStatuses({});
    } catch (error) {
      setIsLoading(false);
      setFileStatuses({});
      toast({
        variant: "destructive",
        title: "Import Error",
        description: "Could not read one or more spreadsheets. Ensure headers match required fields."
      });
    }
  };

  const addFilesToStage = (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
    });
    
    if (newFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please select Excel (.xlsx, .xls) or CSV files."
      });
      return;
    }

    setStagedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearStagedFiles = () => {
    setStagedFiles([]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text || workflowMode === 'roll') return; // Paste disabled for roll

    setIsLoading(true);

    setTimeout(() => {
      const rows = text.split(/\r?\n/).filter(line => line.trim());
      if (rows.length === 0) {
        setIsLoading(false);
        return;
      }

      const headers = rows[0].split('\t');
      const records = rows.slice(1).map(row => {
        const values = row.split('\t');
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h.trim()] = values[i]?.trim();
        });
        return obj;
      });

      setTimeout(() => {
        onDataImported(mapRawToRecords(records, "Clipboard-Data"), "Clipboard-Data", records.length, mode);
        setIsLoading(false);
      }, 500);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && stagedFiles.length > 0 && !isLoading) {
      e.preventDefault();
      handleStartImport();
    }
  };

  const processedCount = useMemo(() => Object.values(fileStatuses).filter(s => s === 'done').length, [fileStatuses]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8" onKeyDown={handleKeyDown}>
      <Card 
        ref={cardRef}
        className={cn(
          "relative border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center group outline-none overflow-hidden",
          isDragging ? (mode === 'raw' ? "border-primary bg-primary/5 scale-[0.99]" : "border-blue-500 bg-blue-500/5 scale-[0.99]") : "border-muted-foreground/20 hover:border-primary/50",
          stagedFiles.length > 0 ? "p-10" : "p-16"
        )}
        onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (isLoading) return;
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) addFilesToStage(files);
        }}
        onPaste={isLoading ? undefined : handlePaste}
        tabIndex={0}
      >
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
            <Card className="w-full max-w-md p-12 bg-card border-white/10 shadow-2xl flex flex-col items-center scale-105">
              <div className="relative flex items-center justify-center mb-8">
                <Loader2 className={cn("w-16 h-16 animate-spin", mode === 'raw' ? "text-primary" : "text-blue-600")} />
                <div className="absolute inset-0 flex items-center justify-center">
                  {mode === 'raw' ? <BookUser className="w-6 h-6 text-primary" /> : <ShieldOff className="w-6 h-6 text-blue-600" />}
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2 text-center">
                {mode === 'raw' ? "Analyzing Records" : "Indexing PIN Reference"}
              </h3>
              
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-8 animate-pulse text-center">
                INITIALIZING ENGINE...
              </p>

              {stagedFiles.length > 0 && (
                <div className="w-full pt-6 border-t flex flex-col items-center gap-2">
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", mode === 'raw' ? "text-primary" : "text-blue-600")}>
                    Batch Queue: {processedCount} / {stagedFiles.length} Completed
                  </span>
                </div>
              )}

              <p className="mt-10 text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                System working • Do not refresh session
              </p>
            </Card>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".xlsx, .xls, .csv" 
          multiple
          onChange={(e) => {
            if (e.target.files) {
              addFilesToStage(e.target.files);
            }
            e.target.value = '';
          }} 
        />
        
        {stagedFiles.length === 0 ? (
          <>
            <div className={cn("p-6 rounded-full mb-8", mode === 'raw' ? (workflowMode === 'roll' ? "bg-emerald-500/10" : "bg-primary/10") : "bg-blue-500/10")}>
              {mode === 'raw' ? (workflowMode === 'roll' ? <Database className="w-12 h-12 text-emerald-600" /> : <BookUser className="w-12 h-12 text-primary" />) : <ShieldOff className="w-12 h-12 text-blue-600" />}
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <Button 
                size="lg" 
                className={cn(
                  "px-12 py-7 text-base font-black shadow-xl h-auto transition-all active:scale-95", 
                  mode === 'raw' ? (workflowMode === 'roll' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white" : "bg-primary hover:bg-emerald-800 shadow-primary/20 text-white") : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-white"
                )} 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <FileSpreadsheet className="mr-3 h-5 w-5" /> {mode === 'raw' ? (workflowMode === 'roll' ? "Select Assessment Roll" : "Select Raw Records") : "Select Exempt List"}
              </Button>

              <Dialog onOpenChange={(open) => !open && setIsZoomed(false)}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost"
                    className="h-10 text-xs font-black border-none text-muted-foreground hover:text-primary hover:bg-accent transition-colors flex items-center gap-2" 
                    disabled={isLoading}
                  >
                    <HelpCircle className="h-4 w-4" /> View Format Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl">
                  <div className="p-8 border-b shrink-0">
                    <DialogHeader className="text-left">
                      <DialogTitle className="text-2xl font-black uppercase text-foreground">Standard Excel Format Guide</DialogTitle>
                      <DialogDescription className="font-bold text-muted-foreground text-base">
                        Ensure your spreadsheet columns align with the header layout shown below. Click the image to toggle zoom.
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  
                  <ScrollArea className="flex-1 bg-white">
                    <div className={cn("flex flex-col p-4 min-h-full", isZoomed ? "items-start" : "items-center")}>
                      <div 
                        className={cn(
                          "relative transition-all duration-300 ease-in-out cursor-pointer",
                          isZoomed ? "w-[2500px] max-w-none cursor-zoom-out" : "w-full cursor-zoom-in"
                        )}
                        onClick={() => setIsZoomed(!isZoomed)}
                      >
                        <Image 
                          src="/exportformat.png" 
                          alt="Excel Format Guide" 
                          width={3200} 
                          height={1600} 
                          className="w-full h-auto object-contain shadow-2xl rounded-lg"
                          data-ai-hint="spreadsheet template"
                        />
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white p-2 rounded-full opacity-60 group-hover:opacity-100 transition-opacity">
                          {isZoomed ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>

                  <div className="p-6 border-t bg-muted/20 flex justify-end shrink-0">
                    <Button onClick={() => document.querySelector('[data-state="open"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))} className="font-black uppercase text-xs tracking-widest bg-slate-800 hover:bg-slate-900 hover:text-white px-8 h-12">
                      Got it, thanks
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </>
        ) : (
          <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between w-full border-b pb-4">
               <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl", mode === 'raw' ? (workflowMode === 'roll' ? "bg-emerald-500/20" : "bg-primary/20") : "bg-blue-500/20")}>
                    {mode === 'raw' ? (workflowMode === 'roll' ? <Database className="w-5 h-5 text-emerald-600" /> : <Files className="w-5 h-5 text-primary" />) : <ShieldOff className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="text-left">
                    <h4 className="text-xl font-black uppercase tracking-tight leading-none">Ready for Import</h4>
                    <p className="text-xs font-bold text-muted-foreground mt-1.5 uppercase tracking-widest">{stagedFiles.length} {stagedFiles.length === 1 ? 'Document' : 'Documents'} Selected</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className={cn("font-black uppercase text-[10px] tracking-widest h-10 transition-all hover:bg-muted hover:text-foreground", mode === 'raw' ? "border-primary/30 text-primary hover:text-primary" : "border-blue-500/30 text-blue-600 hover:text-blue-600")}>
                    <Plus className="w-3.5 h-3.5 mr-2" /> Add More
                 </Button>
                 <Button variant="ghost" size="sm" onClick={clearStagedFiles} className="font-black uppercase text-[10px] tracking-widest h-10 text-red-600 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear All
                 </Button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-vertical-custom">
               {stagedFiles.map((file, idx) => (
                 <div key={`${file.name}-${idx}`} className={cn("flex items-center justify-between p-4 border rounded-xl group transition-all", mode === 'raw' ? "bg-primary/5 hover:border-primary/40" : "bg-blue-500/5 hover:border-blue-500/40")}>
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="text-left truncate">
                        <p className="text-sm font-black truncate">{file.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(idx)} className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600">
                      <X className="w-4 h-4" />
                    </Button>
                 </div>
               ))}
            </div>

            <Button 
              size="lg" 
              className={cn("w-full h-16 text-lg font-black shadow-2xl uppercase tracking-widest transition-all", mode === 'raw' ? (workflowMode === 'roll' ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20" : "bg-primary hover:bg-emerald-800 hover:text-white shadow-primary/20") : "bg-blue-600 hover:bg-blue-700 hover:text-white shadow-blue-500/20 border-none")} 
              onClick={handleStartImport}
              disabled={isLoading}
            >
              <CheckCircle2 className="mr-3 h-6 w-6" /> {mode === 'raw' ? "Process Selected Data" : "Initialize PIN Index"}
            </Button>
          </div>
        )}

        <div className="w-full bg-muted/30 rounded-2xl p-8 border border-white/5 text-left mt-10">
          <div className="flex items-center gap-3 mb-5">
            <Info className={cn("w-5 h-5", mode === 'raw' ? "text-primary" : "text-blue-600")} />
            <h4 className={cn("text-sm font-black uppercase tracking-widest", mode === 'raw' ? "text-emerald-900 dark:text-emerald-400" : "text-blue-900 dark:text-blue-400")}>
              {mode === 'raw' ? "Import Guidelines" : "Reference Guidelines"}
            </h4>
          </div>
          <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
            {mode === 'raw' 
              ? (workflowMode === 'roll' ? "Assessment Rolls must strictly adhere to the 17-column positional format. Ensure your PINs are accurately placed in column 7." : "Spreadsheets must adhere to the official Parañaque City Real Property data structure. The engine identifies, validates, and cross-references critical fields using intelligent mapping.")
              : "Upload a list of property records that should be treated as Exempt. The engine only needs the 'PIN' column from these files to build its cross-reference index."}
          </p>
        </div>
      </Card>
    </div>
  );
}
