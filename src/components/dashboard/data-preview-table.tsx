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
import { Plus } from 'lucide-react';

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

  // Use a more robust drag-to-scroll implementation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    // Use clientX for better precision in cross-browser scenarios
    setStartX(e.clientX - scrollContainerRef.current.offsetLeft);
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
    const x = e.clientX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Adjusted multiplier for smooth feel
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Ensure dragging stops if the mouse button is released outside the element
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
      <div 
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          "flex-1 overflow-auto border rounded-t-md scrollbar-thin select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {/* Table needs pointer-events-none to let the drag events fall through to the container, 
            but we keep internal elements accessible via CSS if needed */}
        <Table className="text-[10px] min-w-[1800px] pointer-events-none select-none">
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="w-10 text-center font-black">#</TableHead>
              <TableHead className="min-w-[80px] font-black uppercase">Date</TableHead>
              <TableHead className="min-w-[100px] font-black uppercase">ARP No#</TableHead>
              <TableHead className="min-w-[160px] font-black uppercase">PIN</TableHead>
              <TableHead className="min-w-[60px] font-black uppercase text-center">Upd</TableHead>
              <TableHead className="min-w-[140px] font-black uppercase">AcctName</TableHead>
              <TableHead className="min-w-[200px] font-black uppercase">Address</TableHead>
              <TableHead className="min-w-[200px] font-black uppercase bg-emerald-50/50">Location</TableHead>
              <TableHead className="min-w-[60px] font-black uppercase">Kind</TableHead>
              <TableHead className="min-w-[60px] font-black uppercase">AU</TableHead>
              <TableHead className="text-right w-[80px] font-black uppercase">Area</TableHead>
              <TableHead className="text-right w-[100px] font-black uppercase">Unit Val</TableHead>
              <TableHead className="text-right w-[110px] font-black uppercase">Market Val</TableHead>
              <TableHead className="text-right w-[110px] font-black uppercase">Assessed Val</TableHead>
              <TableHead className="w-24 text-center font-black uppercase">Status</TableHead>
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
                <TableCell className="text-center font-mono text-muted-foreground p-2 border-r">{i + 1}</TableCell>
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
                <TableCell className="max-w-[140px] truncate uppercase font-bold p-2">{row.acctName || '---'}</TableCell>
                <TableCell className="max-w-[200px] truncate uppercase p-2 text-muted-foreground italic">
                  {row.address || '---'}
                </TableCell>
                <TableCell className="max-w-[200px] truncate uppercase p-2 font-bold text-emerald-900 bg-emerald-50/30">
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

      {hasMore && (
        <div className="p-4 bg-white border-x border-b rounded-b-md flex justify-center shadow-inner">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLoadMore}
            className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm"
          >
            <Plus className="w-3 h-3 mr-2" /> Load More Results ({data.length - displayLimit} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
