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
import { Plus, AlertTriangle, Loader2, Info } from 'lucide-react';
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
import { useNotification } from '@/contexts/NotificationContext';

interface DataPreviewTableProps {
  data: LandRecord[];
  isProcessed?: boolean;
  onRowClick: (record: LandRecord) => void;
}

const RecordRow = memo(({ 
  row, 
  index, 
  isProcessed,
  onRowClick 
}: { 
  row: LandRecord; 
  index: number; 
  isProcessed: boolean;
  onRowClick: (record: LandRecord) => void 
}) => {
  const getStatusBadge = () => {
    if (row.isComparisonInjected) {
      return <Badge variant="outline" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-emerald-500 text-white border-none shadow-sm">VALID REFERENCE</Badge>;
    }
    
    switch (row.statusLabel) {
      case 'VALID':
        return <Badge variant="secondary" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">VALID</Badge>;
      case 'INVALID PIN FORMAT':
        return <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-red-600">INVALID PIN FORMAT</Badge>;
      case 'INCOMPLETE':
        return <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-orange-600">INCOMPLETE</Badge>;
      case 'AREA ERROR':
        return <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-red-500">AREA ERROR</Badge>;
      case 'DUPLICATE':
        return <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter">DUPLICATE</Badge>;
      case 'CLEANUP':
        return <Badge variant="outline" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200">{row.cleanupReason || 'CLEANUP'}</Badge>;
      case 'NO ARP NO#':
      case 'NO UPDATE':
      case 'NO ADDRESS':
      case 'NO KIND':
      case 'NO AU':
        return <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-amber-600 text-white border-none">{row.statusLabel}</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] h-5 font-black uppercase tracking-tighter">UNKNOWN</Badge>;
    }
  };

  const displayUnitValue = isProcessed ? (row.unitValue2029 ?? row.unitValue) : row.unitValue2028;
  const displayMarketValue = isProcessed ? (row.marketValue2029 ?? row.marketValue) : row.marketValue2028;
  const displayAssessedValue = isProcessed ? (row.assessedValue2029 ?? row.assessedValue) : row.assessedValue2028;
  const displayYearlyTax = isProcessed ? (row.yearlyTax2029 ?? row.yearlyTax) : row.yearlyTax2028;

  const getTypeLabel = () => {
    if (row.isComparisonInjected || row.duplicateWithReference === 'REF') return "REF";
    if (row.isDuplicate || row.duplicateWithReference === 'DUP') return "DUP";
    return index + 1;
  };

  return (
    <TableRow 
      onClick={() => onRowClick(row)}
      className={cn(
        "border-b transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-2xl hover:relative hover:z-20 hover:!bg-card/90 hover:backdrop-blur-sm cursor-pointer",
        row.isComparisonInjected && "bg-emerald-500/10 border-l-4 border-l-emerald-500 opacity-90",
        (row.statusLabel === 'DUPLICATE' || row.statusLabel === 'INCOMPLETE' || row.statusLabel === 'CLEANUP') && !row.isComparisonInjected && "bg-orange-50/30 dark:bg-orange-950/50 opacity-70",
        row.statusLabel === 'AREA ERROR' ? "bg-red-100/50 dark:bg-red-950/40 border-red-500/30" : (row.statusLabel !== 'VALID' && row.statusLabel !== 'DUPLICATE' && row.statusLabel !== 'INCOMPLETE' && !row.isComparisonInjected && "bg-red-500/5 hover:bg-red-500/10 border-red-500/20")
      )}
    >
      <TableCell className={cn(
        "text-center font-black p-3 border-r bg-muted/5",
        (row.isComparisonInjected || row.duplicateWithReference === 'REF') ? "text-emerald-600 text-[10px] tracking-widest" : "text-muted-foreground font-mono"
      )}>
        {getTypeLabel()}
      </TableCell>
      <TableCell className="whitespace-nowrap p-3">{row.date || '---'}</TableCell>
      <TableCell className={cn(
        "font-mono font-bold p-3", 
        row.statusLabel === 'NO ARP NO#' ? "text-red-600 underline decoration-wavy" : "text-emerald-800 dark:text-emerald-300",
        row.isComparisonInjected && "text-emerald-600"
      )}>
        {row.arpNo || '---'}
      </TableCell>
      <TableCell className={cn("font-mono p-3", (row.statusLabel === 'INVALID PIN FORMAT' || (row.statusLabel === 'INCOMPLETE' && !row.pin)) && "text-red-600 font-black")}>
        {row.pin || '---'}
      </TableCell>
      <TableCell className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 max-w-[120px] truncate">
        {row.newArpNo || '---'}
      </TableCell>
      <TableCell className="p-3 text-center">
        {row.update ? (
          <span className="bg-muted px-2.5 py-1 rounded font-black text-emerald-900 dark:text-emerald-200 border border-muted-foreground/20 text-[11px]">
            {row.update}
          </span>
        ) : (
          <span className={cn("text-muted-foreground", row.statusLabel === 'NO UPDATE' && "text-red-500 font-bold")}>---</span>
        )}
      </TableCell>
      <TableCell className="p-3 text-center">
        {row.taxability === 'E' ? (
          <Badge variant="outline" className="text-[11px] font-black h-6 px-2 bg-blue-600 text-white border-none shadow-sm">E</Badge>
        ) : (
          <span className="text-muted-foreground font-black text-[11px]">T</span>
        )}
      </TableCell>
      <TableCell className="max-w-[200px] truncate uppercase font-bold p-3">{row.acctName || '---'}</TableCell>
      <TableCell className={cn("max-w-[250px] truncate uppercase p-3 text-muted-foreground italic font-medium", row.statusLabel === 'NO ADDRESS' && "text-red-500")}>
        {row.address || '---'}
      </TableCell>
      <TableCell className="max-w-[250px] truncate uppercase p-3 font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/50 border-x border-emerald-100/50 dark:border-emerald-900/50">
        {row.location || '---'}
      </TableCell>
      <TableCell className={cn("p-3 font-bold", row.statusLabel === 'NO KIND' && "text-red-500")}>{row.kind || '---'}</TableCell>
      <TableCell className="p-3">
        <Badge variant="outline" className={cn("text-[12px] font-black py-0.5 h-5 border-muted-foreground/30", row.statusLabel === 'NO AU' && "border-red-500 text-red-500")}>
          {row.au || '---'}
        </Badge>
      </TableCell>
      <TableCell className={cn(
        "text-right font-mono p-3 border-l", 
        row.statusLabel === 'AREA ERROR' ? "bg-red-500/10 text-red-600 font-black" : (row.statusLabel === 'INCOMPLETE' && row.landArea === 0 && "text-red-600 font-bold")
      )}>
        <div className="flex items-center justify-end gap-1.5">
          {row.statusLabel === 'AREA ERROR' && <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />}
          {row.landArea?.toLocaleString() || '0'}
        </div>
      </TableCell>
      
      {/* 2028 Static Columns */}
      <TableCell className="text-right font-mono p-3 text-slate-500 border-l bg-slate-50/10">
        {row.unitValue2028 ? `₱${row.unitValue2028.toLocaleString()}` : '---'}
      </TableCell>
      <TableCell className="text-right font-mono p-3 text-slate-500 bg-slate-50/10">₱{row.marketValue2028?.toLocaleString() || '0'}</TableCell>
      <TableCell className="text-right font-mono p-3 text-slate-500 bg-slate-50/10">₱{row.assessedValue2028?.toLocaleString() || '0'}</TableCell>
      <TableCell className="text-right font-mono p-3 text-slate-500 bg-slate-50/10">₱{row.yearlyTax2028?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</TableCell>

      {/* Dynamic Active Columns (2028 initially, 2029 after processing) */}
      <TableCell className="text-right font-mono p-3 font-bold text-green-600 dark:text-green-400 border-l">
        {displayUnitValue ? `₱${displayUnitValue.toLocaleString()}` : '---'}
      </TableCell>
      <TableCell className="text-right font-mono font-black p-3 text-emerald-700 dark:text-emerald-300">₱{displayMarketValue?.toLocaleString() || '0'}</TableCell>
      <TableCell className="text-right font-mono font-black p-3 text-green-800 dark:text-green-300">₱{displayAssessedValue?.toLocaleString() || '0'}</TableCell>
      <TableCell className="text-right font-mono font-black p-3 text-primary border-l">₱{displayYearlyTax?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</TableCell>
      
      <TableCell className="text-center p-3">
        {getStatusBadge()}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.row.statusLabel === nextProps.row.statusLabel &&
    prevProps.row.taxability === nextProps.row.taxability &&
    prevProps.row.isValid === nextProps.row.isValid &&
    prevProps.row.isManualArchive === nextProps.row.isManualArchive &&
    prevProps.row.location === nextProps.row.location &&
    prevProps.row.unitValue === nextProps.row.unitValue &&
    prevProps.row.marketValue === nextProps.row.marketValue &&
    prevProps.row.unitValue2028 === nextProps.row.unitValue2028 &&
    prevProps.row.unitValue2029 === nextProps.row.unitValue2029 &&
    prevProps.row.isComparisonInjected === nextProps.row.isComparisonInjected &&
    prevProps.row.newArpNo === nextProps.row.newArpNo &&
    prevProps.row.duplicateWithReference === nextProps.row.duplicateWithReference &&
    prevProps.isProcessed === nextProps.isProcessed &&
    prevProps.index === nextProps.index
  );
});

RecordRow.displayName = 'RecordRow';

export function DataPreviewTable({ data, isProcessed = false, onRowClick }: DataPreviewTableProps) {
  const [displayLimit, setDisplayLimit] = useState(350);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const { showSuccessToast } = useNotification();

  const BATCH_SIZE = 350;

  const handleLoadMore = () => {
    const nextBatchSize = Math.min(BATCH_SIZE, data.length - displayLimit);
    setDisplayLimit(prev => prev + BATCH_SIZE);
    showSuccessToast(`Loaded ${nextBatchSize} additional records successfully.`);
  };

  const handleLoadAllClick = () => {
    setIsConfirmOpen(true);
  };

  const confirmLoadAll = () => {
    setIsConfirmOpen(false);
    setIsBulkLoading(true);
    
    setTimeout(() => {
      const remainingCount = data.length - displayLimit;
      setDisplayLimit(data.length);
      setIsBulkLoading(false);
      showSuccessToast(`Loaded all ${remainingCount} remaining records successfully.`);
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
  const nextBatchSize = Math.min(BATCH_SIZE, data.length - displayLimit);

  const hasComparisons = data.some(r => r.isComparisonInjected);

  const yearLabel = isProcessed ? "2029" : "2028";
  const taxSuffix = !isProcessed ? " (CAPPED @ 6%)" : "";

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

      {hasComparisons && (
        <div className="px-4 py-2 bg-emerald-500/10 border-b flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-600" />
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
            Conflict Comparison Mode Active: Valid counterparts are injected as reference for all duplicate records.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto border-t scrollbar-custom">
        <Table 
          className="text-[13px] min-w-[4000px] select-none border-separate border-spacing-0"
          wrapperClassName="overflow-visible" 
        >
          <TableHeader className="bg-card sticky top-0 z-20 shadow-sm">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="w-14 text-center font-black bg-card border-r">#</TableHead>
              <TableHead className="min-w-[110px] font-black uppercase bg-card">Date</TableHead>
              <TableHead className="min-w-[130px] font-black uppercase bg-card">ARP No#</TableHead>
              <TableHead className="min-w-[200px] font-black uppercase bg-card">PIN</TableHead>
              <TableHead className="min-w-[110px] font-black uppercase bg-card">NEW ARP#</TableHead>
              <TableHead className="min-w-[80px] font-black uppercase text-center bg-card">Update</TableHead>
              <TableHead className="min-w-[100px] font-black uppercase text-center bg-card">Taxability</TableHead>
              <TableHead className="min-w-[200px] font-black uppercase bg-card">AcctName</TableHead>
              <TableHead className="min-w-[250px] font-black uppercase bg-card">Address</TableHead>
              <TableHead className="min-w-[250px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 border-x border-emerald-100 dark:border-emerald-900">Location</TableHead>
              <TableHead className="min-w-[90px] font-black uppercase bg-card">Kind</TableHead>
              <TableHead className="min-w-[90px] font-black uppercase bg-card">AU</TableHead>
              <TableHead className="text-right min-w-[110px] font-black uppercase bg-card">Area (sqm)</TableHead>
              
              {/* Static 2028 Baseline Headers */}
              <TableHead className="text-right min-w-[130px] font-black uppercase bg-slate-100 dark:bg-slate-900 border-l">Unit (2028)</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-slate-100 dark:bg-slate-900">Market (2028)</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-slate-100 dark:bg-slate-900">Assessed (2028)</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-slate-100 dark:bg-slate-900">Tax (2028 CAP)</TableHead>

              {/* Dynamic Yearly Headers */}
              <TableHead className="text-right min-w-[130px] font-black uppercase bg-card border-l">Unit ({yearLabel})</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-card">Market ({yearLabel})</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-card">Assessed ({yearLabel})</TableHead>
              <TableHead className="text-right min-w-[140px] font-black uppercase bg-card border-l">Tax ({yearLabel}{taxSuffix})</TableHead>
              
              <TableHead className="w-36 text-center font-black uppercase bg-card">Record Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleData.map((row, i) => (
              <RecordRow 
                key={row.id} 
                row={row} 
                index={i} 
                isProcessed={isProcessed}
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
              <Plus className="w-4 h-4 mr-2" /> Load More ({nextBatchSize} records)
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
