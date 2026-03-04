"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LandRecord } from '@/lib/processor';
import { useToast } from '@/hooks/use-toast';

interface ImportZoneProps {
  onDataImported: (data: LandRecord[], fileName: string) => void;
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
          cellDates: true,
          cellNF: true,
          cellText: true
        });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];
        
        const mappedData = mapRawToRecords(json);
        if (mappedData.length === 0) {
          toast({
            variant: "destructive",
            title: "Empty Data",
            description: "No valid property records found in this file."
          });
          return;
        }
        onDataImported(mappedData, file.name);
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

    onDataImported(mapRawToRecords(records), "Clipboard-Data");
  };

  const mapRawToRecords = (raw: any[]): LandRecord[] => {
    // Filter out rows that are likely total rows or metadata
    const filteredRaw = raw.filter(item => {
      const rowValues = Object.values(item).map(v => String(v).toUpperCase());
      
      // Check for "TOTAL" keywords
      const isTotalRow = rowValues.some(v => 
        v.includes("GRAND TOTAL") || 
        v.includes("PAGE TOTAL") || 
        v.includes("TOTALS")
      );

      // Check for empty rows (minimal required fields)
      const hasMinimalData = (
        (item["Current"] || item["ARP NO#"] || item["ARP NO"]) ||
        (item["Owner"] || item["ACCTNAME"]) ||
        item["PIN"]
      );

      return !isTotalRow && hasMinimalData;
    });

    return filteredRaw.map((item) => {
      const norm: any = {};
      Object.keys(item).forEach(key => {
        const cleanKey = key.trim().toLowerCase();
        norm[cleanKey] = item[key];
      });

      const parseNum = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
        return 0;
      };

      // Extract Kind and AU from combined K-AU if available
      let kind = String(norm['k'] || norm['kind'] || '').trim();
      let au = String(norm['au'] || norm['actual use'] || '').trim();
      const kau = String(norm['k-au'] || '').trim();
      
      if (kau && kau.includes('-')) {
        const parts = kau.split('-');
        kind = parts[0]?.trim() || kind;
        au = parts[1]?.trim() || au;
      }

      // Mapping Logic based on user requirements:
      // DATE = Effectivity
      // ARP NO# = Current
      // ACCTNAME = Owner
      // LOCATION = Address
      return {
        date: String(norm['effectivity'] || norm['date'] || '').trim(),
        arpNo: String(norm['current'] || norm['arp no#'] || norm['arp no'] || norm['arpno'] || norm['arp'] || '').trim(),
        pin: String(norm['pin'] || '').trim(),
        update: String(norm['update'] || norm['upd'] || norm['update code'] || norm['type'] || '').trim(),
        acctName: String(norm['owner'] || norm['acctname'] || norm['account name'] || norm['acct name'] || '').trim(),
        location: String(norm['address'] || norm['location'] || '').trim(),
        kind: kind,
        au: au,
        landArea: parseNum(norm['land area'] || norm['area']),
        unitValue: parseNum(norm['unit value']),
        marketValue: parseNum(norm['market value']),
        assessedValue: parseNum(norm['assessed value']),
      };
    });
  };

  return (
    <Card 
      className={`relative p-16 border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center group outline-none
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
      <h3 className="text-2xl font-black mb-3 text-blue-900">Import Property Data</h3>
      <p className="text-muted-foreground mb-8 max-w-sm text-sm font-medium">
        Drag your Excel file here or click below. <br/>
        <span className="text-[10px] uppercase opacity-50 tracking-widest">Grand totals are automatically excluded</span>
      </p>
      
      <div className="flex gap-4">
        <Button size="lg" className="px-8 font-bold" onClick={() => fileInputRef.current?.click()}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Choose Excel
        </Button>
      </div>
    </Card>
  );
}
