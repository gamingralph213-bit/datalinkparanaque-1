
"use client";

import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface DataPreviewTableProps {
  data: LandRecord[];
  isProcessed?: boolean;
  onRowClick: (record: LandRecord) => void;
}

export function DataPreviewTable({ data, isProcessed = false, onRowClick }: DataPreviewTableProps) {
  const [displayLimit, setDisplayLimit] = useState(350);

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 350);
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-xs uppercase font-bold opacity-30 tracking-widest">Awaiting Data Import</p>
      </div>
    );
  }

  const visibleData = data.slice(0, displayLimit);
  const hasMore = data.length > displayLimit;

  return (
    <div className="relative flex flex-col h-[calc(100vh-320px)] bg-card overflow-hidden">
      {/* 
         Main Scroll Container: 
         By setting overflow-auto here and ensuring the height is constrained, 
         the horizontal scrollbar will stay at the bottom of the visible area.
         Drag functionality has been removed as per request.
      */}
      <div className="flex-1 overflow-auto border-t scrollbar-custom">
        <Table 
          className="text-[10px] min-w-[2350px] select-none border-separate border-spacing-0"
          wrapperClassName="overflow-visible" 
        >
          <TableHeader className="bg-card sticky top-0 z-20 shadow-sm">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="w-12 text-center font-black bg-card border-r">#</TableHead>
              <TableHead className="min-w-[100px] font-black uppercase bg-card">Date</TableHead>
              <TableHead className="min-w-[120px] font-black uppercase bg-card">ARP No#</TableHead>
              <TableHead className="min-w-[180px] font-black uppercase bg-card">PIN</TableHead>
              <TableHead className="min-w-[70px] font-black uppercase text-center bg-card">Update</TableHead>
              <TableHead className="min-w-[180px] font-black uppercase bg-card">AcctName</TableHead>
              <TableHead className="min-w-[250px] font-black uppercase bg-card">Address</TableHead>
              <TableHead className="min-w-[250px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 border-x border-emerald-100 dark:border-emerald-900">Location</TableHead>
              <TableHead className="min-w-[80px] font-black uppercase bg-card">Kind</TableHead>
              <TableHead className="min-w-[80px] font-black uppercase bg-card">AU</TableHead>
              <TableHead className="text-right min-w-[100px] font-black uppercase bg-card">Area (sqm)</TableHead>
              <TableHead className="text-right min-w-[120px] font-black uppercase bg-card">Unit Value</TableHead>
              <TableHead className="text-right min-w-[130px] font-black uppercase bg-card">Market Value</TableHead>
              <TableHead className="text-right min-w-[130px] font-black uppercase bg-card">Assessed Value</TableHead>
              <TableHead className="text-right min-w-[130px] font-black uppercase bg-card border-l">Yearly Tax</TableHead>
              <TableHead className="w-32 text-center font-black uppercase bg-card">Record Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleData.map((row, i) => (
              <TableRow 
                key={row.id || i}
                onClick={() => onRowClick(row)}
                className={cn(
                  "border-b transition-all duration-200 ease-in-out hover:scale-[1.015] hover:shadow-2xl hover:relative hover:z-20 hover:!bg-card/90 hover:backdrop-blur-sm cursor-pointer",
                  (row.isDuplicate || row.isCleanup) && "bg-orange-50/30 dark:bg-orange-950/50 opacity-70"
                )}
              >
                <TableCell className="text-center font-mono text-muted-foreground p-2 border-r bg-muted/5">{i + 1}</TableCell>
                <TableCell className="whitespace-nowrap p-2">{row.date || '---'}</TableCell>
                <TableCell className="font-mono text-emerald-800 dark:text-emerald-300 font-bold p-2">{row.arpNo || '---'}</TableCell>
                <TableCell className="font-mono p-2">{row.pin || '---'}</TableCell>
                <TableCell className="p-2 text-center">
                  {row.update ? (
                    <span className="bg-muted px-2 py-0.5 rounded font-black text-emerald-900 dark:text-emerald-200 border border-muted-foreground/20">
                      {row.update}
                    </span>
                  ) : (
                    <span className="text-muted-foreground opacity-30">---</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[180px] truncate uppercase font-bold p-2">{row.acctName || '---'}</TableCell>
                <TableCell className="max-w-[250px] truncate uppercase p-2 text-muted-foreground italic">
                  {row.address || '---'}
                </TableCell>
                <TableCell className="max-w-[250px] truncate uppercase p-2 font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/50 border-x border-emerald-100/50 dark:border-emerald-900/50">
                  {row.location || '---'}
                </TableCell>
                <TableCell className="p-2 font-bold">{row.kind || '---'}</TableCell>
                <TableCell className="p-2">
                  <Badge variant="outline" className="text-[9px] font-black py-0 h-4 border-muted-foreground/30">
                    {row.au || '---'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono p-2 border-l">{row.landArea?.toLocaleString() || '0'}</TableCell>
                <TableCell className="text-right font-mono p-2 font-bold text-green-600 dark:text-green-400">
                  {row.unitValue ? `₱${row.unitValue.toLocaleString()}` : '---'}
                </TableCell>
                <TableCell className="text-right font-mono font-black p-2 text-emerald-700 dark:text-emerald-300">₱{row.marketValue?.toLocaleString() || '0'}</TableCell>
                <TableCell className="text-right font-mono font-black p-2 text-green-800 dark:text-green-300">₱{row.assessedValue?.toLocaleString() || '0'}</TableCell>
                <TableCell className="text-right font-mono font-black p-2 text-primary border-l">₱{row.yearlyTax?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</TableCell>
                <TableCell className="text-center p-2">
                  {row.isCleanup ? (
                    <Badge variant="outline" className="text-[8px] h-4 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
                      {row.cleanupReason || 'CLEANUP'}
                    </Badge>
                  ) : row.isDuplicate ? (
                    <Badge variant="destructive" className="text-[8px] h-4 font-black uppercase tracking-tighter">DUPLICATE</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[8px] h-4 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">VALID</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer / Control Section */}
      <div className="p-2 bg-muted/30 border-x border-b rounded-b-md flex items-center justify-between gap-4">
        <div className="flex-1" />
        
        {hasMore && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLoadMore}
            className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-800 h-8 shadow-md"
          >
            <Plus className="w-3 h-3 mr-2" /> Load More ({data.length - displayLimit} records)
          </Button>
        )}

        <div className="text-[10px] font-black text-muted-foreground px-4 uppercase tracking-tighter">
          SHOWING {visibleData.length.toLocaleString()} / {data.length.toLocaleString()} TOTAL ROWS
        </div>
      </div>
    </div>
  );
}
