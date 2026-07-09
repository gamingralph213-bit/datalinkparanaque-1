"use client";

import React, { useState, memo, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { LandRecord, getModeOfConveyance } from '@/lib/processor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, AlertTriangle, Loader2, Info, Link2, Unlink2, HardHat } from 'lucide-react';
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
  showLabels?: boolean;
  workflowMode?: 'standard' | 'abstract' | 'building-permit';
}

const RecordRow = memo(({ 
  row, 
  index, 
  isProcessed,
  onRowClick,
  showLabels,
  workflowMode
}: { 
  row: LandRecord; 
  index: number; 
  isProcessed: boolean;
  onRowClick: (record: LandRecord) => void;
  showLabels?: boolean;
  workflowMode?: 'standard' | 'abstract' | 'building-permit';
}) => {
  if (workflowMode === 'abstract') {
    const abstractRow = row as any;
    const kind = (row.kind || "").trim().toUpperCase();
    
    return (
      <TableRow 
        className={cn(
          "border-b transition-all duration-200 hover:bg-muted/30",
          !abstractRow.isJoined && "bg-red-50/30 dark:bg-red-950/20"
        )}
      >
        <TableCell className="text-center font-black p-3 border-r bg-muted/5 text-muted-foreground font-mono">
          {index + 1}
        </TableCell>
        <TableCell className="font-mono p-3 font-black text-primary">{row.arpNo || '---'}</TableCell>
        <TableCell className="whitespace-nowrap p-3 font-bold">{row.date || ''}</TableCell>
        
        <TableCell className="p-3 bg-muted/5 border-l font-bold text-red-700/80 uppercase truncate max-w-[220px]">
          {abstractRow.cancelledOwner || ''}
        </TableCell>

        <TableCell className={cn(
          "max-w-[250px] truncate uppercase p-3 font-bold border-l",
          abstractRow.isJoined ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50/10" : "text-red-400 italic opacity-50"
        )} title={row.acctName}>
          {row.acctName || '---'}
        </TableCell>

        <TableCell className="max-w-[250px] truncate uppercase p-3 text-muted-foreground italic border-l">
          {abstractRow.rollAddress || '---'}
        </TableCell>

        <TableCell className="max-w-[150px] truncate uppercase p-3 text-muted-foreground italic border-l">
          {row.location || '---'}
        </TableCell>

        <TableCell className="p-3 text-center border-l font-bold text-xs uppercase text-foreground">
          {getModeOfConveyance(row.update)}
        </TableCell>

        <TableCell className="text-right font-mono p-3 font-black border-l text-emerald-600">
          {abstractRow.sellingPrice ? (
            typeof abstractRow.sellingPrice === 'number' 
              ? `₱${abstractRow.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : abstractRow.sellingPrice
          ) : '0.00'}
        </TableCell>

        <TableCell className="p-3 text-center border-l font-black text-primary">
          {(kind === 'L' || kind === 'LAND') ? 'x' : ''}
        </TableCell>
        <TableCell className="p-3 text-center border-l font-black text-blue-600">
          {(kind === 'B' || kind === 'BUILDING') ? 'x' : ''}
        </TableCell>

        <TableCell className="text-right font-mono p-3 font-black border-l">
          {row.landArea?.toLocaleString() || '0'}
        </TableCell>

        <TableCell className={cn(
          "p-3 font-mono text-center border-l",
          abstractRow.isJoined ? "text-blue-600 font-black" : "text-muted-foreground opacity-30"
        )}>
          {abstractRow.rollLotNo || '---'}
        </TableCell>

        <TableCell className="p-3 bg-muted/5 border-l text-center font-mono font-bold text-red-600/80">
          {abstractRow.cancelledTctNo || ''}
        </TableCell>

        <TableCell className={cn(
          "p-3 font-mono text-center border-l",
          abstractRow.isJoined ? "text-blue-600 font-black" : "text-muted-foreground opacity-30"
        )}>
          {abstractRow.rollTctNo || '---'}
        </TableCell>

        <TableCell className="p-3 font-bold border-l truncate">
          {abstractRow.notarialDate || '---'}
        </TableCell>

        <TableCell className="p-3 font-mono border-l truncate max-w-[180px]">
          {abstractRow.docFileNo || '---'}
        </TableCell>

        <TableCell className="p-3 font-bold border-l truncate uppercase text-muted-foreground">
          {abstractRow.notary || '---'}
        </TableCell>
        
        <TableCell className="text-center p-3 border-l">
          <div className="flex flex-col items-center gap-1">
            {abstractRow.isJoined ? (
              <Badge className="bg-emerald-600 text-white font-black text-[9px] tracking-widest gap-1 uppercase">
                <Link2 className="w-3" /> Linked
              </Badge>
            ) : (
              <Badge variant="destructive" className="font-black text-[9px] tracking-widest gap-1 uppercase opacity-60">
                <Unlink2 className="w-3" /> No Match
              </Badge>
            )}
            {row.taxability === 'E' && (
              <Badge variant="outline" className="text-[9px] font-black h-4 px-1.5 bg-blue-600 text-white border-none shadow-sm">EXEMPT</Badge>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (workflowMode === 'building-permit') {
    const permitRow = row as any;
    return (
      <TableRow 
        className={cn(
          "border-b transition-all duration-200 hover:bg-muted/30",
          !permitRow.isJoined && "bg-orange-50/30 dark:bg-orange-950/20"
        )}
      >
        <TableCell className="text-center font-black p-3 border-r bg-muted/5 text-muted-foreground font-mono">
          {index + 1}
        </TableCell>
        <TableCell className="whitespace-nowrap p-3 font-bold">{row.dateIssued || '---'}</TableCell>
        <TableCell className="font-mono p-3 font-black text-orange-600">{row.buildingPermitNo || '---'}</TableCell>
        <TableCell className="p-3 font-bold uppercase truncate max-w-[200px]">{row.barangayName || '---'}</TableCell>
        
        <TableCell className={cn(
          "font-mono p-3 border-l font-bold",
          permitRow.isJoined ? "text-emerald-700" : "text-muted-foreground italic opacity-40"
        )}>
          {permitRow.rollArp || '---'}
        </TableCell>

        <TableCell className="p-3 border-l uppercase text-muted-foreground truncate max-w-[220px]">
          {permitRow.rollAddress || '---'}
        </TableCell>

        <TableCell className="p-3 border-l uppercase font-bold text-xs truncate max-w-[200px]">
          {row.location || '---'}
        </TableCell>

        <TableCell className="p-3 border-l font-bold text-xs text-blue-600 uppercase">
          {row.useOfOccupancy || '---'}
        </TableCell>

        <TableCell className="text-right font-mono p-3 font-black border-l">
          {permitRow.rollArea?.toLocaleString() || '0'}
        </TableCell>

        <TableCell className="text-right font-mono p-3 font-black border-l text-emerald-600">
          ₱{row.estimatedCost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
        </TableCell>

        <TableCell className="text-center p-3 border-l font-black text-xs">
          {permitRow.rollUpdate || '---'}
        </TableCell>

        <TableCell className="text-center p-3 border-l">
          {permitRow.isJoined ? (
            <Badge className="bg-emerald-600 text-white font-black text-[9px] tracking-widest gap-1 uppercase">
              <Link2 className="w-3" /> Matched
            </Badge>
          ) : (
            <Badge variant="outline" className="font-black text-[9px] tracking-widest gap-1 uppercase opacity-60">
              <Unlink2 className="w-3" /> Unlinked
            </Badge>
          )}
        </TableCell>
      </TableRow>
    );
  }

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
      default:
        return <Badge variant="outline" className="text-[10px] h-5 font-black uppercase tracking-tighter">{row.statusLabel || 'UNKNOWN'}</Badge>;
    }
  };

  const displayUnitValue = isProcessed ? (row.unitValue2029 ?? row.unitValue) : row.unitValue2028;
  const displayMarketValue = isProcessed ? (row.marketValue2029 ?? row.marketValue) : row.marketValue2028;
  const displayAssessedValue = isProcessed ? (row.assessedValue2029 ?? row.assessedValue) : row.assessedValue2028;
  const displayYearlyTax = isProcessed ? (row.yearlyTax2029 ?? row.yearlyTax) : row.yearlyTax2028;

  const getTypeLabel = () => {
    if (showLabels) {
      if (row.isComparisonInjected || row.duplicateWithReference === 'REF') return "REF";
      if (row.isDuplicate || row.duplicateWithReference === 'DUP') return "DUP";
    }
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
        (showLabels && (row.isComparisonInjected || row.duplicateWithReference === 'REF')) ? "text-emerald-600 text-[10px] tracking-widest" : "text-muted-foreground font-mono"
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
      <TableCell className="p-3 font-mono text-muted-foreground italic truncate max-w-[160px]">
        {row.previous || '---'}
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
          {row.statusLabel === 'AREA ERROR' && <AlertTriangle className="w-3 h-3 text-red-600 animate-pulse" />}
          {row.landArea?.toLocaleString() || '0'}
        </div>
      </TableCell>
      
      <TableCell className="text-right font-mono p-3 text-slate-500 border-l bg-slate-50/10">
        {row.unitValue2028 ? `₱${row.unitValue2028.toLocaleString()}` : '---'}
      </TableCell>
      <TableCell className="text-right font-mono p-3 text-slate-500 bg-slate-50/10">₱{row.marketValue2028?.toLocaleString() || '0'}</TableCell>
      <TableCell className="text-right font-mono p-3 text-slate-500 bg-slate-50/10">₱{row.assessedValue2028?.toLocaleString() || '0'}</TableCell>
      <TableCell className="text-right font-mono p-3 text-slate-500 bg-slate-50/10">₱{row.yearlyTax2028?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</TableCell>

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
});

RecordRow.displayName = 'RecordRow';

export function DataPreviewTable({ data, isProcessed = false, onRowClick, showLabels = false, workflowMode = 'standard' }: DataPreviewTableProps) {
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

      {workflowMode === 'abstract' && (
        <div className="px-4 py-2 bg-blue-500/10 border-b flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">
            Relational Preview: Showing Journal transactions enriched with Assessment Roll parcel details and Cancelled references.
          </p>
        </div>
      )}

      {workflowMode === 'building-permit' && (
        <div className="px-4 py-2 bg-orange-500/10 border-b flex items-center gap-2">
          <HardHat className="w-3.5 h-3.5 text-orange-600" />
          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">
            Building Permit Preview: Linking orange permit logs with the Assessment Roll reference roll.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto border-t scrollbar-custom">
        <Table 
          className="text-[13px] min-w-[3000px] select-none border-separate border-spacing-0"
          wrapperClassName="overflow-visible" 
        >
          <TableHeader className="bg-card sticky top-0 z-20 shadow-sm">
            {workflowMode === 'abstract' ? (
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="w-14 text-center font-black bg-card border-r">#</TableHead>
                <TableHead className="min-w-[150px] font-black uppercase bg-card border-l">ARP NO.</TableHead>
                <TableHead className="min-w-[120px] font-black uppercase bg-card">CONVEYANCE DATE</TableHead>
                <TableHead className="min-w-[220px] font-black uppercase bg-card border-l">OWNERSHIP TRANSFER FROM</TableHead>
                <TableHead className="min-w-[250px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 border-l border-emerald-100 dark:border-emerald-900">OWNERSHIP TRANSFER (TO)</TableHead>
                <TableHead className="min-w-[250px] font-black uppercase bg-card border-l">NEW OWNER ADDRESS</TableHead>
                <TableHead className="min-w-[200px] font-black uppercase bg-card border-l">PROPERTY LOCATION</TableHead>
                <TableHead className="min-w-[150px] text-center font-black uppercase bg-card border-l">MODE OF CONVEYANCE</TableHead>
                <TableHead className="min-w-[180px] text-right font-black uppercase bg-card border-l text-emerald-700">AMOUNT OF CONSIDERATION</TableHead>
                <TableHead className="min-w-[50px] text-center font-black uppercase bg-card border-l">L</TableHead>
                <TableHead className="min-w-[50px] text-center font-black uppercase bg-card border-l">B</TableHead>
                <TableHead className="min-w-[120px] text-right font-black uppercase bg-card border-l">AREA (sqm)</TableHead>
                <TableHead className="min-w-[100px] text-center font-black uppercase bg-emerald-50 dark:bg-emerald-950 border-l border-emerald-100 dark:border-blue-900">LOT NO.</TableHead>
                <TableHead className="min-w-[120px] text-center font-black uppercase bg-card border-l">TITLE NO. (PREV)</TableHead>
                <TableHead className="min-w-[120px] text-center font-black uppercase bg-emerald-50 dark:bg-emerald-950 border-l border-emerald-100 dark:border-blue-900">TITLE NO. (NEW)</TableHead>
                <TableHead className="min-w-[140px] font-black uppercase bg-card border-l">NOTARIAL DATE</TableHead>
                <TableHead className="min-w-[180px] font-black uppercase bg-card border-l">DOCUMENT FILE NO.</TableHead>
                <TableHead className="min-w-[220px] font-black uppercase bg-card border-l">NOTARY / AGENT</TableHead>
                <TableHead className="min-w-[140px] text-center font-black uppercase bg-card border-l">JOIN STATUS</TableHead>
              </TableRow>
            ) : workflowMode === 'building-permit' ? (
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="w-14 text-center font-black bg-card border-r">#</TableHead>
                <TableHead className="min-w-[120px] font-black uppercase bg-card">DATE ISSUED</TableHead>
                <TableHead className="min-w-[150px] font-black uppercase bg-card">PERMIT NO.</TableHead>
                <TableHead className="min-w-[200px] font-black uppercase bg-card">BARANGAY</TableHead>
                <TableHead className="min-w-[150px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 border-l border-emerald-100">ARP/TDN (ROLL)</TableHead>
                <TableHead className="min-w-[220px] font-black uppercase bg-card border-l">PERMITTEE ADDRESS</TableHead>
                <TableHead className="min-w-[200px] font-black uppercase bg-card border-l">LOCATION</TableHead>
                <TableHead className="min-w-[180px] font-black uppercase bg-card border-l">OCCUPANCY</TableHead>
                <TableHead className="min-w-[120px] text-right font-black uppercase bg-card border-l">FLOOR AREA (ROLL)</TableHead>
                <TableHead className="min-w-[180px] text-right font-black uppercase bg-card border-l text-emerald-700">EST. COST</TableHead>
                <TableHead className="min-w-[100px] text-center font-black uppercase bg-card border-l">CLASS (ROLL)</TableHead>
                <TableHead className="min-w-[140px] text-center font-black uppercase bg-card border-l">MATCH STATUS</TableHead>
              </TableRow>
            ) : (
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="w-14 text-center font-black bg-card border-r">#</TableHead>
                <TableHead className="min-w-[110px] font-black uppercase bg-card">Date</TableHead>
                <TableHead className="min-w-[130px] font-black uppercase bg-card">ARP No#</TableHead>
                <TableHead className="min-w-[200px] font-black uppercase bg-card">PIN</TableHead>
                <TableHead className="min-w-[160px] font-black uppercase bg-card">Previous</TableHead>
                <TableHead className="min-w-[110px] font-black uppercase bg-card">NEW ARP#</TableHead>
                <TableHead className="min-w-[80px] font-black uppercase text-center bg-card">Update</TableHead>
                <TableHead className="min-w-[100px] font-black uppercase text-center bg-card">Taxability</TableHead>
                <TableHead className="min-w-[200px] font-black uppercase bg-card">AcctName</TableHead>
                <TableHead className="min-w-[250px] font-black uppercase bg-card">Address</TableHead>
                <TableHead className="min-w-[250px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 border-x border-emerald-100 dark:border-emerald-900">Location</TableHead>
                <TableHead className="min-w-[90px] font-black uppercase bg-card">Kind</TableHead>
                <TableHead className="min-w-[90px] font-black uppercase bg-card">AU</TableHead>
                <TableHead className="text-right min-w-[110px] font-black uppercase bg-card">Area (sqm)</TableHead>
                <TableHead className="text-right min-w-[130px] font-black uppercase bg-slate-100 dark:bg-slate-900 border-l">Unit (2028)</TableHead>
                <TableHead className="text-right min-w-[140px] font-black uppercase bg-slate-100 dark:bg-slate-900">Market (2028)</TableHead>
                <TableHead className="text-right min-w-[140px] font-black uppercase bg-slate-100 dark:bg-slate-900">Assessed (2028)</TableHead>
                <TableHead className="text-right min-w-[140px] font-black uppercase bg-slate-100 dark:bg-slate-900">Tax (2028 CAP)</TableHead>
                <TableHead className="text-right min-w-[130px] font-black uppercase bg-card border-l">Unit ({yearLabel})</TableHead>
                <TableHead className="text-right min-w-[140px] font-black uppercase bg-card">Market ({yearLabel})</TableHead>
                <TableHead className="text-right min-w-[140px] font-black uppercase bg-card">Assessed ({yearLabel})</TableHead>
                <TableHead className="text-right min-w-[140px] font-black uppercase bg-card border-l">Tax ({yearLabel}{taxSuffix})</TableHead>
                <TableHead className="w-36 text-center font-black uppercase bg-card">Record Status</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {visibleData.map((row, i) => (
              <RecordRow 
                key={row.id} 
                row={row} 
                index={i} 
                isProcessed={isProcessed}
                onRowClick={onRowClick} 
                showLabels={showLabels}
                workflowMode={workflowMode}
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
