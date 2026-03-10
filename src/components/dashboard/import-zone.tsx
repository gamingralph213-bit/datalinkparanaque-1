
"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Info, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LandRecord } from '@/lib/processor';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportZoneProps {
  onDataImported: (data: LandRecord[], fileName: string, rawCount: number) => void;
}

export function ImportZone({ onDataImported }: ImportZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
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
          return;
        }
        onDataImported(mappedData, file.name, rawCount);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Import Error",
          description: "Could not read spreadsheet. Ensure headers match required fields."
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    const rows = text.split(/\r?\n/).filter(line => line.trim());
    if (rows.length === 0) return;

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
          return parseFloat(clean) || 0;
        }
        return 0;
      };

      const rowValues = Object.values(item).map(v => String(v).toUpperCase());
      const isTotalRow = rowValues.some(v => 
        v.includes("GRAND TOTAL") || 
        v.includes("PAGE TOTAL") || 
        v.includes("TOTALS")
      );
      
      const allValuesEmpty = Object.values(norm).every(v => v === "" || v === "undefined" || v === "null" || v === "0");

      const hasMinimalData = (
        (norm['effectivity'] || norm['date'] || norm['current'] || norm['arp no#'] || norm['arp no']) &&
        (norm['owner'] || norm['acctname'] || (norm['pin'] && norm['pin'] !== ""))
      );

      let isCleanup = false;
      let cleanupReason = "";

      if (allValuesEmpty) {
        isCleanup = true;
        cleanupReason = "Empty Row";
      } else if (isTotalRow) {
        isCleanup = true;
        cleanupReason = "Total Row";
      } else if (!hasMinimalData) {
        isCleanup = true;
        cleanupReason = "Incomplete Data";
      }

      let kind = String(norm['k'] || norm['kind'] || '').trim();
      let au = String(norm['au'] || norm['actual use'] || '').trim();
      const kau = String(norm['k-au'] || '').trim();
      
      if (kau && kau.includes('-')) {
        const parts = kau.split('-');
        kind = parts[0]?.trim() || kind;
        au = parts[1]?.trim() || au;
      }
      
      const pin = String(norm['pin'] || '').trim();
      const arpNo = String(norm['current'] || norm['arp no#'] || norm['arp no'] || '').trim();

      return {
        id: `${index}-${pin}-${arpNo}`,
        date: String(norm['effectivity'] || norm['date'] || '').trim(),
        arpNo: arpNo,
        pin: pin,
        update: String(norm['update'] || norm['upd'] || norm['update code'] || norm['type'] || '').trim(),
        acctName: String(norm['owner'] || norm['acctname'] || '').trim(),
        address: String(norm['address'] || norm['location'] || '').trim(),
        location: "", 
        kind: kind,
        au: au,
        landArea: parseNum(norm['land area'] || norm['area']),
        unitValue: parseNum(norm['unit value']),
        marketValue: parseNum(norm['market value']),
        assessedValue: parseNum(norm['assessed value']),
        isCleanup,
        cleanupReason
      };
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card 
        className={`relative p-12 border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center group outline-none
          ${isDragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-muted-foreground/20 hover:border-primary/50'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFileUpload(file);
        }}
        onPaste={handlePaste}
        tabIndex={0}
      >
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
        
        <div className="bg-primary/10 p-5 rounded-full mb-6">
          <Upload className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-black mb-3 text-emerald-900 dark:text-emerald-400">Import Property Data</h3>
        <p className="text-muted-foreground mb-8 max-w-sm text-sm font-medium">
          Drag your Excel file here or click below. <br/>
          <span className="text-[10px] uppercase opacity-50 tracking-widest text-emerald-600 font-bold">Auto-filters GRAND TOTALS & Metadata rows</span>
        </p>
        
        <div className="flex gap-4 mb-8">
          <Button size="lg" className="px-10 font-bold bg-primary hover:bg-emerald-800 shadow-xl shadow-primary/20" onClick={() => fileInputRef.current?.click()}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Choose Excel File
          </Button>
        </div>

        <div className="w-full bg-muted/30 rounded-xl p-6 border border-white/5 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-400">Excel Template Requirements</h4>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4 font-medium leading-relaxed">
            To ensure correct processing, your spreadsheet should contain the following headers. The system is designed to map these standard Parañaque City land record columns:
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Owner", target: "AcctName" },
              { label: "Address", target: "Address" },
              { label: "PIN", target: "PIN" },
              { label: "Effectivity", target: "Date" },
              { label: "type", target: "Update Code" },
              { label: "Current", target: "ARP No" },
              { label: "K-AU", target: "Kind & Use" },
              { label: "Area", target: "Land Area" },
              { label: "Market Value", target: "Value" },
            ].map((col) => (
              <div key={col.label} className="flex items-center gap-2 bg-background/50 p-2 rounded-md border border-white/5">
                <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                <div>
                  <div className="text-[9px] font-black uppercase tracking-tighter text-foreground">{col.label}</div>
                  <div className="text-[8px] text-muted-foreground italic leading-none">maps to {col.target}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
