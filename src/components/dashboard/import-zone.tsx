
"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Info, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LandRecord } from '@/lib/processor';
import { useToast } from '@/hooks/use-toast';

interface ImportZoneProps {
  onDataImported: (data: LandRecord[], fileName: string, rawCount: number) => void;
}

export function ImportZone({ onDataImported }: ImportZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<{ data: LandRecord[], count: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: false,
            cellNF: true,
            cellText: true
          });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];
          const rawCount = json.length;
          const mappedData = mapRawToRecords(json, file.name);
          resolve({ data: mappedData, count: rawCount });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFilesUpload = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setIsLoading(true);

    const allRecords: LandRecord[] = [];
    let totalRawCount = 0;
    const fileNames: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await processFile(file);
        allRecords.push(...result.data);
        totalRawCount += result.count;
        fileNames.push(file.name);
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
        return;
      }

      onDataImported(allRecords, summaryFileName, totalRawCount);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Import Error",
        description: "Could not read one or more spreadsheets. Ensure headers match required fields."
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

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

      onDataImported(mapRawToRecords(records, "Clipboard-Data"), "Clipboard-Data", records.length);
      setIsLoading(false);
    }, 50);
  };

  const mapRawToRecords = (raw: any[], fileName: string): LandRecord[] => {
    return raw.map((item, index) => {
      const norm: any = {};
      Object.keys(item).forEach(key => {
        const cleanKey = key.trim().toLowerCase();
        norm[cleanKey] = String(item[key]).trim();
      });

      const parseNum = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const clean = val.replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(clean);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      let kind = String(norm['kind'] || norm['k'] || '').trim();
      let au = String(norm['au'] || norm['actual use'] || '').trim();
      const kau = String(norm['k-au'] || '').trim();
      
      if (kau && kau.includes('-')) {
        const parts = kau.split('-');
        kind = parts[0]?.trim() || kind;
        au = parts[1]?.trim() || au;
      }
      
      const pin = String(norm['pin'] || '').trim();
      const arpNo = String(norm['arp no#'] || norm['arp no'] || norm['current'] || '').trim();

      return {
        id: `${fileName}-${index}-${pin}-${arpNo}`,
        date: String(norm['date'] || norm['effectivity'] || '').trim(),
        arpNo: arpNo,
        pin: pin,
        update: String(norm['update'] || norm['upd'] || norm['update code'] || norm['type'] || '').trim(),
        acctName: String(norm['acctname'] || norm['owner'] || '').trim(),
        address: String(norm['address'] || '').trim(),
        location: String(norm['location'] || '').trim(), 
        kind: kind,
        au: au,
        landArea: parseNum(norm['land area'] || norm['area']),
        unitValue: parseNum(norm['unit value']),
        marketValue: parseNum(norm['market value']),
        assessedValue: parseNum(norm['assessed value']),
        yearlyTax: parseNum(norm['yearly tax']),
        isCleanup: false,
        cleanupReason: "",
        sourceFile: fileName
      };
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card 
        className={`relative p-16 border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center group outline-none overflow-hidden
          ${isDragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-muted-foreground/20 hover:border-primary/50'}`}
        onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (isLoading) return;
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) handleFilesUpload(files);
        }}
        onPaste={isLoading ? undefined : handlePaste}
        tabIndex={0}
      >
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
            <Loader2 className="w-14 h-14 text-primary animate-spin mb-6" />
            <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-400">Processing Files...</h3>
            <p className="text-base text-muted-foreground font-semibold">Please wait while we parse your land record data batch.</p>
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
              handleFilesUpload(e.target.files);
            }
            e.target.value = '';
          }} 
        />
        
        <div className="bg-primary/10 p-6 rounded-full mb-8">
          <Upload className="w-12 h-12 text-primary" />
        </div>
        <h3 className="text-3xl font-black mb-4 text-emerald-900 dark:text-emerald-400">Batch Import Data</h3>
        <p className="text-muted-foreground mb-10 max-w-md text-base font-semibold leading-relaxed">
          Drag multiple Excel files here or click below. <br/>
          <span className="text-[12px] uppercase opacity-60 tracking-widest text-emerald-600 font-black block mt-2">Processes all files locally.</span>
        </p>
        
        <div className="flex gap-4 mb-10">
          <Button 
            size="lg" 
            className="px-12 py-7 text-base font-black bg-primary hover:bg-emerald-800 shadow-xl shadow-primary/20 h-auto" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <FileSpreadsheet className="mr-3 h-5 w-5" /> Select Multiple Files
          </Button>
        </div>

        <div className="w-full bg-muted/30 rounded-2xl p-8 border border-white/5 text-left">
          <div className="flex items-center gap-3 mb-5">
            <Info className="w-5 h-5 text-primary" />
            <h4 className="text-sm font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-400">Excel Header Mapping</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-6 font-semibold leading-relaxed">
            Standard Parañaque Header format expected. Columns like PIN, ARP NO#, ACCTNAME, and LAND AREA will be mapped automatically across all files.
          </p>
        </div>
      </Card>
    </div>
  );
}
