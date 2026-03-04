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
        
        // Use raw: false to get formatted strings for dates and values
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];
        
        const mappedData = mapRawToRecords(json);
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
    return raw.map((item) => {
      const norm: any = {};
      Object.keys(item).forEach(key => {
        // Aggressive key normalization
        const cleanKey = key.trim().toLowerCase();
        norm[cleanKey] = item[key];
      });

      return {
        date: String(norm['date'] || '').trim(),
        arpNo: String(norm['arp no#'] || norm['arp no'] || norm['arpno'] || norm['arp'] || '').trim(),
        pin: String(norm['pin'] || '').trim(),
        // Enhanced matching for the Update column (TR, RC, GR codes)
        update: String(norm['update'] || norm['upd'] || norm['update code'] || norm['type'] || '').trim(),
        acctName: String(norm['acctname'] || norm['account name'] || norm['acct name'] || '').trim(),
        location: String(norm['location'] || '').trim(),
        kind: String(norm['kind'] || '').trim(),
        au: String(norm['au'] || norm['actual use'] || '').trim(),
        landArea: typeof norm['land area'] === 'string' ? parseFloat(norm['land area'].replace(/,/g, '')) : parseFloat(norm['land area'] || norm['area'] || 0),
        unitValue: typeof norm['unit value'] === 'string' ? parseFloat(norm['unit value'].replace(/,/g, '')) : parseFloat(norm['unit value'] || 0),
        marketValue: typeof norm['market value'] === 'string' ? parseFloat(norm['market value'].replace(/,/g, '')) : parseFloat(norm['market value'] || 0),
        assessedValue: typeof norm['assessed value'] === 'string' ? parseFloat(norm['assessed value'].replace(/,/g, '')) : parseFloat(norm['assessed value'] || 0),
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
        Drag your Excel file here or click below to start processing Parañaque land records.
      </p>
      
      <div className="flex gap-4">
        <Button size="lg" className="px-8 font-bold" onClick={() => fileInputRef.current?.click()}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Choose Excel
        </Button>
      </div>
    </Card>
  );
}
