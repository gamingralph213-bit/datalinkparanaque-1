
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

interface DataPreviewTableProps {
  data: LandRecord[];
  isProcessed?: boolean;
}

export function DataPreviewTable({ data, isProcessed = false }: DataPreviewTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>No data loaded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-auto border rounded-md h-[calc(100vh-280px)] scrollbar-thin">
      <Table className="text-xs">
        <TableHeader className="bg-muted/50 sticky top-0 z-10">
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead className="min-w-[100px]">DATE</TableHead>
            <TableHead className="min-w-[120px]">ARP NO#</TableHead>
            <TableHead className="min-w-[180px]">PIN</TableHead>
            <TableHead className="min-w-[150px]">ACCOUNT NAME</TableHead>
            <TableHead className="min-w-[200px]">LOCATION</TableHead>
            <TableHead className="min-w-[120px]">BRGY/SEC</TableHead>
            <TableHead className="text-right">AREA (SQM)</TableHead>
            <TableHead className="text-right">MARKET VALUE</TableHead>
            <TableHead className="text-right">ASSESSED VALUE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 1000).map((row, i) => (
            <TableRow key={i} className="hover:bg-accent/30">
              <TableCell className="text-center font-mono text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium whitespace-nowrap">{row.date || '---'}</TableCell>
              <TableCell className="font-mono text-primary font-semibold">{row.arpNo || '---'}</TableCell>
              <TableCell className="font-mono">{row.pin || '---'}</TableCell>
              <TableCell className="max-w-[200px] truncate uppercase">{row.acctName || '---'}</TableCell>
              <TableCell className="max-w-[250px] truncate text-muted-foreground uppercase">{row.location || '---'}</TableCell>
              <TableCell>
                {row.barangay && (
                  <Badge variant="secondary" className="text-[10px] font-normal mr-1">{row.barangay}</Badge>
                )}
                {row.section && (
                  <Badge variant="outline" className="text-[10px] font-normal">{row.section}</Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-mono">{row.landArea?.toLocaleString() || '0'}</TableCell>
              <TableCell className="text-right font-mono font-bold">{row.marketValue?.toLocaleString() || '0'}</TableCell>
              <TableCell className="text-right font-mono font-bold text-blue-600">{row.assessedValue?.toLocaleString() || '0'}</TableCell>
            </TableRow>
          ))}
          {data.length > 1000 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-4 bg-muted/20 text-muted-foreground">
                Showing first 1,000 records of {data.length.toLocaleString()}...
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
