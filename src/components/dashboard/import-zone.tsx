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

  const handleFileUpload = (file: File) => {
    setIsLoading(true);
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
        
        const mappedData = mapRawToRecords(json);
        if (mappedData.length === 0) {
          toast({
            variant: "destructive",
            title: "Empty Data",
            description: "No property records found in this file."
          });
          setIsLoading(false);
          return;
        }
        
        setTimeout(() => {
          onDataImported(mappedData, file.name, rawCount);
          setIsLoading(false);
        }, 100);

      } catch (error) {
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Import Error",
          description: "Could not read spreadsheet. Ensure headers match required fields."
        });
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "An error occurred while reading the file."
      });
    };

    reader.readAsArrayBuffer(file);
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

      onDataImported(mapRawToRecords(records), "Clipboard-Data", records.length);
      setIsLoading(false);
    }, 50);
  };

  const mapRawToRecords = (raw: any[]): LandRecord[] => {
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

      // Handle KIND and AU specifically, including legacy K-AU combined format
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
        id: `${index}-${pin}-${arpNo}`,
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
        cleanupReason: ""
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
          const file = e.dataTransfer.files[0];
          if (file) handleFileUpload(file);
        }}
        onPaste={isLoading ? undefined : handlePaste}
        tabIndex={0}
      >
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
            <Loader2 className="w-14 h-14 text-primary animate-spin mb-6" />
            <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-400">Reading Spreadsheet...</h3>
            <p className="text-base text-muted-foreground font-semibold">Please wait while we parse your land record data.</p>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".xlsx, .xls, .csv" 
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
            e.target.value = '';
          }} 
        />
        
        <div className="bg-primary/10 p-6 rounded-full mb-8">
          <Upload className="w-12 h-12 text-primary" />
        </div>
        <h3 className="text-3xl font-black mb-4 text-emerald-900 dark:text-emerald-400">Import Property Data</h3>
        <p className="text-muted-foreground mb-10 max-w-md text-base font-semibold leading-relaxed">
          Drag your Excel file here or click below. <br/>
          <span className="text-[12px] uppercase opacity-60 tracking-widest text-emerald-600 font-black block mt-2">Standard Parañaque Header format expected.</span>
        </p>
        
        <div className="flex gap-4 mb-10">
          <Button 
            size="lg" 
            className="px-12 py-7 text-base font-black bg-primary hover:bg-emerald-800 shadow-xl shadow-primary/20 h-auto" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <FileSpreadsheet className="mr-3 h-5 w-5" /> Choose Excel File
          </Button>
        </div>

        <div className="w-full bg-muted/30 rounded-2xl p-8 border border-white/5 text-left">
          <div className="flex items-center gap-3 mb-5">
            <Info className="w-5 h-5 text-primary" />
            <h4 className="text-sm font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-400">Excel Header Mapping</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-6 font-semibold leading-relaxed">
            The system identifies the following column headers from your spreadsheet:
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "DATE", target: "Effectivity" },
              { label: "ARP NO#", target: "Current ARP" },
              { label: "PIN", target: "PIN Number" },
              { label: "ACCTNAME", target: "Owner Name" },
              { label: "ADDRESS", target: "Physical Address" },
              { label: "LOCATION", target: "Barangay/Section" },
              { label: "KIND / AU", target: "Kind & Actual Use" },
              { label: "LAND AREA", target: "Sq. Meters" },
              { label: "UNIT VALUE", target: "Base Price" },
            ].map((col) => (
              <div key={col.label} className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-[11px] font-black uppercase tracking-tighter text-foreground leading-tight">{col.label}</div>
                  <div className="text-[10px] text-muted-foreground italic leading-none font-bold">{col.target}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
