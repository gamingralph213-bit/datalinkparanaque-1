
"use client";

import React, { useState, useRef } from 'react';
import { Upload, Clipboard, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LandRecord } from '@/lib/processor';
import { useToast } from '@/hooks/use-toast';

interface ImportZoneProps {
  onDataImported: (data: LandRecord[]) => void;
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
        
        // Use raw: false to get the formatted text values (especially for dates)
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];
        
        const mappedData = mapRawToRecords(json);
        onDataImported(mappedData);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Import Error",
          description: "Failed to read the Excel file. Please ensure it's a valid .xlsx or .csv file."
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

    onDataImported(mapRawToRecords(records));
  };

  const mapRawToRecords = (raw: any[]): LandRecord[] => {
    return raw.map((item) => {
      // Normalize keys to lowercase and trimmed strings for resilient mapping
      const norm: any = {};
      Object.keys(item).forEach(key => {
        norm[key.trim().toLowerCase()] = item[key];
      });

      return {
        date: String(norm['date'] || '').trim(),
        arpNo: String(norm['arp no#'] || norm['arp no'] || norm['arpno'] || '').trim(),
        pin: String(norm['pin'] || '').trim(),
        type: String(norm['type'] || '').trim(),
        acctName: String(norm['acctname'] || norm['account name'] || norm['acct name'] || '').trim(),
        location: String(norm['location'] || '').trim(),
        kind: String(norm['kind'] || '').trim(),
        au: String(norm['au'] || '').trim(),
        landArea: typeof norm['land area'] === 'string' ? parseFloat(norm['land area'].replace(/,/g, '')) : parseFloat(norm['land area'] || norm['area'] || 0),
        marketValue: typeof norm['market value'] === 'string' ? parseFloat(norm['market value'].replace(/,/g, '')) : parseFloat(norm['market value'] || 0),
        assessedValue: typeof norm['assessed value'] === 'string' ? parseFloat(norm['assessed value'].replace(/,/g, '')) : parseFloat(norm['assessed value'] || 0),
      };
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
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
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept=".xlsx, .xls, .csv" 
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
      />
      
      <div className="bg-primary/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
        <Upload className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Import Land Records</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Drag and drop your Excel file here, paste directly from spreadsheet, or click the button below.
      </p>
      
      <div className="flex gap-3">
        <Button variant="default" onClick={triggerFileInput}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Choose Excel File
        </Button>
        <Button variant="outline" onClick={() => {
          toast({
            title: "Paste Instructions",
            description: "Simply press Ctrl+V (or Cmd+V) while this area is focused to import copied rows.",
          });
        }}>
          <Clipboard className="mr-2 h-4 w-4" /> Clipboard Support
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Excel (.xlsx)</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> CSV Files</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /> Clipboard Paste</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Auto-Cleaning</div>
      </div>
    </Card>
  );
}
