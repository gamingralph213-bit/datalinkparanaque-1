"use client";

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { LandRecord } from '@/lib/processor';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DataPreviewTableProps {
  data: LandRecord[];
  isProcessed?: boolean;
}

export function DataPreviewTable({ data, isProcessed = false }: DataPreviewTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-xs uppercase font-bold opacity-30 tracking-widest">Awaiting Data Import</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto border rounded-md h-[calc(100vh-320px)] scrollbar-thin">
      <Table className="text-[10px] min-w-[1400px]">
        <TableHeader className="bg-muted/50 sticky top-0 z-10">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 text-center font-black">#</TableHead>
            <TableHead className="min-w-[80px] font-black uppercase">Date</TableHead>
            <TableHead className="min-w-[100px] font-black uppercase">ARP No#</TableHead>
            <TableHead className="min-w-[160px] font-black uppercase">PIN</TableHead>
            <TableHead className="min-w-[80px] font-black uppercase text-center">Update</TableHead>
            <TableHead className="min-w-[140px] font-black uppercase">AcctName</TableHead>
            <TableHead className="min-w-[180px] font-black uppercase">Location</TableHead>
            <TableHead className="min-w-[60px] font-black uppercase">Kind</TableHead>
            <TableHead className="min-w-[60px] font-black uppercase">AU</TableHead>
            <TableHead className="text-right w-[80px] font-black uppercase">Area</TableHead>
            <TableHead className="text-right w-[100px] font-black uppercase">Unit Val</TableHead>
            <TableHead className="text-right w-[110px] font-black uppercase">Market Val</TableHead>
            <TableHead className="text-right w-[110px] font-black uppercase">Assessed Val</TableHead>
            {!isProcessed && <TableHead className="w-20 text-center font-black uppercase">Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 1000).map((row, i) => (
            <TableRow 
              key={i} 
              className={cn(
                "hover:bg-accent/30 transition-colors",
                !isProcessed && row.isDuplicate && "bg-red-50/50 opacity-50 grayscale"
              )}
            >
              <TableCell className="text-center font-mono text-muted-foreground p-2">{i + 1}</TableCell>
              <TableCell className="whitespace-nowrap p-2">{row.date || '---'}</TableCell>
              <TableCell className="font-mono text-blue-800 font-bold p-2">{row.arpNo || '---'}</TableCell>
              <TableCell className="font-mono p-2">{row.pin || '---'}</TableCell>
              <TableCell className="p-2 text-center">
                {row.update ? (
                  <span className="bg-muted px-2 py-0.5 rounded font-black text-blue-900 border border-muted-foreground/20">
                    {row.update}
                  </span>
                ) : (
                  <span className="text-muted-foreground opacity-30">---</span>
                )}
              </TableCell>
              <TableCell className="max-w-[140px] truncate uppercase font-bold p-2">{row.acctName || '---'}</TableCell>
              <TableCell className="max-w-[180px] truncate uppercase p-2 text-muted-foreground">
                {row.location || '---'}
              </TableCell>
              <TableCell className="p-2 font-bold">{row.kind || '---'}</TableCell>
              <TableCell className="p-2">
                <Badge variant="outline" className="text-[9px] font-black py-0 h-4 border-muted-foreground/30">
                  {row.au || '---'}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono p-2">{row.landArea?.toLocaleString() || '0'}</TableCell>
              <TableCell className="text-right font-mono p-2 font-bold text-green-600">
                {row.unitValue ? `₱${row.unitValue.toLocaleString()}` : '---'}
              </TableCell>
              <TableCell className="text-right font-mono font-black p-2 text-blue-700">₱{row.marketValue?.toLocaleString() || '0'}</TableCell>
              <TableCell className="text-right font-mono font-black p-2 text-purple-700">₱{row.assessedValue?.toLocaleString() || '0'}</TableCell>
              {!isProcessed && (
                <TableCell className="text-center p-2">
                  {row.isDuplicate ? (
                    <Badge variant="destructive" className="text-[8px] h-4 font-black uppercase tracking-tighter">REMOVED</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[8px] h-4 font-black uppercase tracking-tighter bg-green-100 text-green-700">KEPT</Badge>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
