"use client";

import React, { useState, memo } from 'react';
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
import { Plus, AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DataPreviewTableProps {
  data: LandRecord[];
  isProcessed?: boolean;
  onRowClick: (record: LandRecord) => void;
}

const RecordRow = memo(({ 
  row, 
  index, 
  onRowClick 
}: { 
  row: LandRecord; 
  index: number; 
  onRowClick: (record: LandRecord) => void 
}) => {
  const isZeroArea = row.landArea === 0 && row.pin && row.arpNo;
  
  return (
    <TableRow 
      onClick={() => onRowClick(row)}
      className={cn(
        "border-b transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-2xl hover:relative hover:z-20 hover:!bg-card/90 hover:backdrop-blur-sm cursor-pointer",
        (row.isDuplicate || row.isCleanup) && "bg-orange-50/30 dark:bg-orange-950/50 opacity-70",
        isZeroArea ? "bg-red-100/50 dark:bg-red-950/40 border-red-500/30" : (!row.isValid && "bg-red-500/5 hover:bg-red-500/10 border-red-500/20")
      )}
    >
      <TableCell className="text-center font-mono text-muted-foreground p-3 border-r bg-muted/5">{index + 1}</TableCell>
      <TableCell className="whitespace-nowrap p-3">{row.date || '---'}</TableCell>
      <TableCell className={cn("font-mono font-bold p-3", !row.isValid && row.errors?.some(e => e.field === 'arpNo') ? "text-red-600 underline decoration-wavy" : "text-emerald-800 dark:text-emerald-300")}>
        {row.arpNo || '---'}
      </TableCell>
      <TableCell className={cn("font-mono p-3", !row.isValid && row.errors?.some(e => e.field === 'pin') && "text-red-600 font-black")}>
        {row.pin || '---'}
      </TableCell>
      <TableCell className="p-3 text-center">
        {row.update ? (
          <span className="bg-muted px-2.5 py-1 rounded font-black text-emerald-900 dark:text-emerald-200 border border-muted-foreground/20 text-[11px]">
            {row.update}
          </span>
        ) : (
          <span className="text-muted-foreground opacity-30">---</span>
        )}
      </TableCell>
      <TableCell className="max-w-[200px] truncate uppercase font-bold p-3">{row.acctName || '---'}</TableCell>
      <TableCell className="max-w-[250px] truncate uppercase p-3 text-muted-foreground italic font-medium">
        {row.address || '---'}
      </TableCell>
      <TableCell className="max-w-[250px] truncate uppercase p-3 font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/50 border-x border-emerald-100/50 dark:border-emerald-900/50">
        {row.location || '---'}
      </TableCell>
      <TableCell className="p-3 font-bold">{row.kind || '---'}</TableCell>
      <TableCell className="p-3">
        <Badge variant="outline" className="text-[12px] font-black py-0.5 h-5 border-muted-foreground/30">
          {row.au || '---'}
        </Badge>
      </TableCell>
      <TableCell className={cn(
        "text-right font-mono p-3 border-l", 
        isZeroArea ? "bg-red-500/10 text-red-600 font-black" : (!row.isValid && row.errors?.some(e => e.field === 'landArea') && "text-red-600 font-black")
      )}>
        <div className="flex items-center justify-end gap-1.5">
          {isZeroArea && <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />}
          {row.landArea?.toLocaleString() || '0'}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono p-3 font-bold text-green-600 dark:text-green-400">
        {row.unitValue ? `₱${row.unitValue.toLocaleString()}` : '---'}
      </TableCell>
      <TableCell className="text-right font-mono font-black p-3 text-emerald-700 dark:text-emerald-300">₱{row.marketValue?.toLocaleString() || '0'}</TableCell>
      <TableCell className="text-right font-mono font-black p-3 text-green-800 dark:text-green-300">₱{row.assessedValue?.toLocaleString() || '0'}</TableCell>
      <TableCell className="text-right font-mono font-black p-3 text-primary border-l">₱{row.yearlyTax?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</TableCell>
      <TableCell className="text-center p-3">
        {!row.isValid ? (
          isZeroArea ? (
            <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter flex items-center gap-1 justify-center bg-red-600 hover:bg-red-700">
              <AlertTriangle className="w-2.5 h-2.5" /> ERROR
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter flex items-center gap-1 justify-center">
              INVALID
            </Badge>
          )
        ) : row.isCleanup ? (
          <Badge variant="outline" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
            {row.cleanupReason || 'CLEANUP'}
          </Badge>
        ) : row.isDuplicate ? (
          <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter">DUPLICATE</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">VALID</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for memoization: Include location and unitValue to ensure dashboard updates correctly
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.row.isValid === nextProps.row.isValid &&
    prevProps.row.isDuplicate === nextProps.row.isDuplicate &&
    prevProps.row.isCleanup === nextProps.row.isCleanup &&
    prevProps.row.isManualArchive === nextProps.row.isManualArchive &&
    prevProps.row.location === nextProps.row.location &&
    prevProps.row.unitValue === nextProps.row.unitValue &&
    prevProps.row.marketValue === nextProps.row.marketValue &&
    prevProps.index === nextProps.index
  );
});

RecordRow.displayName = 'RecordRow';

export function DataPreviewTable({ data, isProcessed = false, onRowClick }: DataPreviewTableProps) {
  const [displayLimit, setDisplayLimit] = useState(350);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 350);
  };

  const handleLoadAllClick = () => {
    setIsConfirmOpen(true);
  };

  const confirmLoadAll = () => {
    setIsConfirmOpen(false);
    setIsBulkLoading(true);
    
    setTimeout(() => {
      setDisplayLimit(data.length);
      setIsBulkLoading(false);
    }, 600);
  };

  if (data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm uppercase font-black opacity-30 tracking-widest">Awaiting Data Import</p>
      </div>
    );
  }

  const visibleData = data.slice(0, displayLimit);
  const hasMore = data.length > displayLimit;

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-card overflow-hidden" suppressHydrationWarning>
      {isBulkLoading && (
        <div className="absolute inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-card p-10 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center">
            <Loader2 className="w-14 h-14 text-primary animate-spin mb-6" />
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Rendering Large Dataset...</h3>
            <p className="text-muted-foreground font-bold mt-2">This may take a moment depending on your device performance.</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto border-t scrollbar-custom">
        <Table 
          className="text-[13px] min-w-[3000px] select-none border-separate border-spacing-0"
          wrapperClassName="overflow-visible" 
        >
          <TableHeader className="bg-card sticky top-0 z-20 shadow-sm">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="w-14 text-center font-black bg-card border-r">#</TableHead>
              <TableHead className="min-w-[110px] font-black uppercase bg-card">Date</TableHead>
              <TableHead className="min-w-[130px] font-black uppercase bg-card">ARP No#</TableHead>
              <TableHead className="min-w-[200px] font-black uppercase bg-card">PIN</TableHead>
              <TableHead className="min-w-[80px] font-black uppercase text-center bg-card">Update</TableHead>
              <TableHead className="min-w-[200px] font-black uppercase bg-card">AcctName</TableHead>
              <TableHead className="min-w-[250px] font-black uppercase bg-card">Address</TableHead>
              <TableHead className="min-w-[250px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 border-x border-emerald-100 dark:border-emerald-900">Location</TableHead>
              <TableHead className="min-w-[90px] font-black uppercase bg-card">Kind</TableHead>
              <TableHead className="min-w-[90px] font-black uppercase bg-card">AU</TableHead>
              <TableHead className="text-right min-w-[110px] font-black uppercase bg-card">Area (sqm)</TableHead>
              <TableHead className="text-right min-w-[130px] font-black uppercase bg-card">Unit Value</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-card">Market Value</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-card">Assessed Value</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-card border-l">Yearly Tax</TableHead>
              <TableHead className="w-36 text-center font-black uppercase bg-card">Record Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleData.map((row, i) => (
              <RecordRow 
                key={row.id} 
                row={row} 
                index={i} 
                onRowClick={onRowClick} 
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-3 bg-muted/30 border-t shrink-0 flex items-center justify-between gap-4">
        <div className="flex-1" />
        {hasMore && (
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLoadMore}
              className="text-xs font-black uppercase tracking-widest bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-800 h-9 shadow-md px-6"
            >
              <Plus className="w-4 h-4 mr-2" /> Load More ({data.length - displayLimit} records)
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLoadAllClick}
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground h-9 px-4"
            >
              Load All
            </Button>
          </div>
        )}
        <div className="text-[12px] font-black text-muted-foreground px-4 uppercase tracking-tighter">
          SHOWING {visibleData.length.toLocaleString()} / {data.length.toLocaleString()} TOTAL ROWS
        </div>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Performance Warning</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-bold text-muted-foreground leading-relaxed">
              You are about to load <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">{data.length.toLocaleString()}</span> records simultaneously. 
              This may cause the application to lag or slow down significantly depending on your device's performance. 
              Do you wish to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="font-black uppercase text-xs h-10 px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmLoadAll}
              className="bg-primary hover:bg-emerald-800 font-black uppercase text-xs h-10 px-8"
            >
              Confirm Load All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
