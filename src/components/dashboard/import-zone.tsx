
"use client";

import React, { useState, useCallback } from 'react';
import { Upload, Clipboard, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LandRecord } from '@/lib/processor';

interface ImportZoneProps {
  onDataImported: (data: LandRecord[]) => void;
}

export function ImportZone({ onDataImported }: ImportZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      const mappedData = mapRawToRecords(json);
      onDataImported(mappedData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    // Handle TSV/CSV from Excel
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
    return raw.map((item, idx) => ({
      date: item.DATE || item.date || '',
      arpNo: item['ARP No#'] || item.arpNo || '',
      pin: item.PIN || item.pin || '',
      type: item.TYPE || item.type || '',
      acctName: item.AcctName || item.acctName || '',
      location: item.Location || item.location || '',
      kind: item.Kind || item.kind || '',
      au: item.AU || item.au || '',
      landArea: parseFloat(item['Land Area'] || item.landArea || 0),
      marketValue: parseFloat(item['Market Value'] || item.marketValue || 0),
      assessedValue: parseFloat(item['Assessed Value'] || item.assessedValue || 0),
    }));
  };

  return (
    <Card 
      className={`relative p-12 border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center group
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
      <div className="bg-primary/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
        <Upload className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Import Land Records</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Drag and drop your Excel file here, paste directly from spreadsheet, or click to upload.
      </p>
      
      <div className="flex gap-3">
        <label>
          <input 
            type="file" 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
          />
          <Button variant="default" className="cursor-pointer">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Upload Excel
          </Button>
        </label>
        <Button variant="outline" onClick={() => {
          // Trigger a dummy paste event handler or focus instructions
          const dummy = document.createElement('input');
          document.body.appendChild(dummy);
          dummy.focus();
          document.execCommand('paste');
          document.body.removeChild(dummy);
        }}>
          <Clipboard className="mr-2 h-4 w-4" /> Paste Support
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
