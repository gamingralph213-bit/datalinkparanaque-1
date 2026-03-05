"use client";

import React, { useRef, useState, useEffect } from 'react';
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
import { Plus, MoveHorizontal } from 'lucide-react';

interface DataPreviewTableProps {
  data: LandRecord[];
  isProcessed?: boolean;
}

export function DataPreviewTable({ data, isProcessed = false }: DataPreviewTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(350);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    // Calculate start position relative to the container
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Sensitivity multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

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
    <div className="relative flex flex-col h-[calc(100vh-320px)]">
      {/* Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          "flex-1 overflow-auto border rounded-t-md scrollbar-custom select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <Table className="text-[10px] min-w-[2000px] pointer-events-none select-none border-separate border-spacing-0">
          <TableHeader className="bg-white sticky top-0 z-20 shadow-sm">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="w-12 text-center font-black bg-white border-r">#</TableHead>
              <TableHead className="min-w-[100px] font-black uppercase bg-white">Date</TableHead>
              <TableHead className="min-w-[120px] font-black uppercase bg-white">ARP No#</TableHead>
              <TableHead className="min-w-[180px] font-black uppercase bg-white">PIN</TableHead>
              <TableHead className="min-w-[70px] font-black uppercase text-center bg-white">Update</TableHead>
              <TableHead className="min-w-[180px] font-black uppercase bg-white">AcctName</TableHead>
              <TableHead className="min-w-[250px] font-black uppercase bg-white">Address</TableHead>
              <TableHead className="min-w-[250px] font-black uppercase bg-emerald-50 border-x border-emerald-100">Location</TableHead>
              <TableHead className="min-w-[80px] font-black uppercase bg-white">Kind</TableHead>
              <TableHead className="min-w-[80px] font-black uppercase bg-white">AU</TableHead>
              <TableHead className="text-right min-w-[100px] font-black uppercase bg-white">Area (sqm)</TableHead>
              <TableHead className="text-right min-w-[120px] font-black uppercase bg-white">Unit Value</TableHead>
              <TableHead className="text-right min-w-[130px] font-black uppercase bg-white">Market Value</TableHead>
              <TableHead className="text-right min-w-[130px] font-black uppercase bg-white">Assessed Value</TableHead>
              <TableHead className="w-32 text-center font-black uppercase bg-white">Record Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleData.map((row, i) => (
              <TableRow 
                key={i} 
                className={cn(
                  "hover:bg-accent/30 transition-colors border-b",
                  (row.isDuplicate || row.isCleanup) && "bg-orange-50/30 opacity-70"
                )}
              >
                <TableCell className="text-center font-mono text-muted-foreground p-2 border-r bg-muted/5">{i + 1}</TableCell>
                <TableCell className="whitespace-nowrap p-2">{row.date || '---'}</TableCell>
                <TableCell className="font-mono text-emerald-800 font-bold p-2">{row.arpNo || '---'}</TableCell>
                <TableCell className="font-mono p-2">{row.pin || '---'}</TableCell>
                <TableCell className="p-2 text-center">
                  {row.update ? (
                    <span className="bg-muted px-2 py-0.5 rounded font-black text-emerald-900 border border-muted-foreground/20">
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
                <TableCell className="max-w-[250px] truncate uppercase p-2 font-bold text-emerald-900 bg-emerald-50/20 border-x border-emerald-100/50">
                  {row.location || '---'}
                </TableCell>
                <TableCell className="p-2 font-bold">{row.kind || '---'}</TableCell>
                <TableCell className="p-2">
                  <Badge variant="outline" className="text-[9px] font-black py-0 h-4 border-muted-foreground/30">
                    {row.au || '---'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono p-2 border-l">{row.landArea?.toLocaleString() || '0'}</TableCell>
                <TableCell className="text-right font-mono p-2 font-bold text-green-600">
                  {row.unitValue ? `₱${row.unitValue.toLocaleString()}` : '---'}
                </TableCell>
                <TableCell className="text-right font-mono font-black p-2 text-emerald-700">₱{row.marketValue?.toLocaleString() || '0'}</TableCell>
                <TableCell className="text-right font-mono font-black p-2 text-green-800">₱{row.assessedValue?.toLocaleString() || '0'}</TableCell>
                <TableCell className="text-center p-2">
                  {row.isCleanup ? (
                    <Badge variant="outline" className="text-[8px] h-4 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200">
                      {row.cleanupReason || 'CLEANUP'}
                    </Badge>
                  ) : row.isDuplicate ? (
                    <Badge variant="destructive" className="text-[8px] h-4 font-black uppercase tracking-tighter">DUPLICATE</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[8px] h-4 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200">VALID</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer / Control Section */}
      <div className="p-2 bg-muted/20 border-x border-b rounded-b-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2">
          <MoveHorizontal className="w-3 h-3 text-primary" />
          Click and drag table to scroll horizontally
        </div>
        
        {hasMore && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLoadMore}
            className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 h-7"
          >
            <Plus className="w-3 h-3 mr-2" /> Load More ({data.length - displayLimit} left)
          </Button>
        )}

        <div className="text-[9px] font-bold text-muted-foreground px-2">
          SHOWING {visibleData.length.toLocaleString()} OF {data.length.toLocaleString()} RECORDS
        </div>
      </div>
    </div>
  );
}
