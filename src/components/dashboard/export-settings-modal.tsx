"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileDown, 
  Table as TableIcon, 
  MapPin, 
  Filter, 
  CheckSquare, 
  ChevronRight,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { LandRecord, RecordStatusType } from '@/lib/processor';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ExportSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LandRecord[];
  exportColumns: Record<string, boolean>;
  onColumnToggle: (col: string) => void;
  onBulkColumnChange?: (cols: Record<string, boolean>) => void;
  onExport: (settings: ExportFinalSettings) => void;
}

export interface ExportFinalSettings {
  columns: Record<string, boolean>;
  barangays: string[];
  statuses: RecordStatusType[];
}

const columnLabels = [
  "DATE", "ARP NO#", "PIN", "UPDATE", "ACCTNAME", "ADDRESS", 
  "LOCATION", "KIND", "AU", "LAND AREA", "UNIT VALUE", 
  "MARKET VALUE", "ASSESSED VALUE", "YEARLY TAX"
];

export function ExportSettingsModal({
  open,
  onOpenChange,
  data,
  exportColumns,
  onColumnToggle,
  onBulkColumnChange,
  onExport
}: ExportSettingsModalProps) {
  const [selectedBarangays, setSelectedBarangays] = React.useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = React.useState<RecordStatusType[]>([]);

  const availableBarangays = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => { 
      set.add(r.barangayName || 'UNMAPPED'); 
    });
    return Array.from(set).sort();
  }, [data]);

  const availableStatuses = useMemo(() => {
    const set = new Set<RecordStatusType>();
    data.forEach(r => { if (r.statusLabel) set.add(r.statusLabel); });
    return Array.from(set).sort();
  }, [data]);

  const approvedStatuses = availableStatuses.filter(s => s !== 'DUPLICATE' && s !== 'INCOMPLETE');
  const archiveStatuses = availableStatuses.filter(s => s === 'DUPLICATE' || s === 'INCOMPLETE');

  React.useEffect(() => {
    if (open) {
      setSelectedBarangays(availableBarangays);
      setSelectedStatuses(availableStatuses);
    }
  }, [open, availableBarangays, availableStatuses]);

  const toggleBarangay = (brgy: string) => {
    setSelectedBarangays(prev => 
      prev.includes(brgy) ? prev.filter(b => b !== brgy) : [...prev, brgy]
    );
  };

  const toggleStatus = (status: RecordStatusType) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const selectAllBarangays = () => setSelectedBarangays(availableBarangays);
  const deselectAllBarangays = () => setSelectedBarangays([]);

  const selectAllColumns = () => {
    if (onBulkColumnChange) {
      const newCols = { ...exportColumns };
      columnLabels.forEach(col => newCols[col] = true);
      onBulkColumnChange(newCols);
    }
  };
  const deselectAllColumns = () => {
    if (onBulkColumnChange) {
      const newCols = { ...exportColumns };
      columnLabels.forEach(col => newCols[col] = false);
      onBulkColumnChange(newCols);
    }
  };

  const selectAllApproved = () => {
    setSelectedStatuses(prev => {
      const set = new Set(prev);
      approvedStatuses.forEach(s => set.add(s));
      return Array.from(set);
    });
  };
  const clearAllApproved = () => {
    setSelectedStatuses(prev => prev.filter(s => !approvedStatuses.includes(s)));
  };

  const selectAllArchive = () => {
    setSelectedStatuses(prev => {
      const set = new Set(prev);
      archiveStatuses.forEach(s => set.add(s));
      return Array.from(set);
    });
  };
  const clearAllArchive = () => {
    setSelectedStatuses(prev => prev.filter(s => !archiveStatuses.includes(s)));
  };

  const handleExport = () => {
    onExport({
      columns: exportColumns,
      barangays: selectedBarangays,
      statuses: selectedStatuses
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl">
        <div className="p-8 pb-4 shrink-0 bg-primary/5 border-b">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
                <FileDown className="text-primary w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">
                  Smart Export Controller
                </DialogTitle>
                <DialogDescription className="text-sm font-bold text-muted-foreground mt-1.5 uppercase tracking-widest">
                  Configure output format and data filters
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-vertical-custom">
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> 1. Select Export Columns
                </h3>
                <div className="flex gap-4">
                  <button onClick={selectAllColumns} className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary tracking-tighter">Select All</button>
                  <button onClick={deselectAllColumns} className="text-[10px] font-black uppercase text-muted-foreground hover:text-red-600 tracking-tighter">Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-muted/20 p-5 rounded-2xl border border-white/5">
                {columnLabels.map(col => (
                  <div key={col} className="flex items-center gap-2.5 group">
                    <Checkbox 
                      id={`exp-col-${col}`} 
                      checked={exportColumns[col]} 
                      onCheckedChange={() => onColumnToggle(col)}
                      className="border-primary/40 data-[state=checked]:bg-primary"
                    />
                    <label htmlFor={`exp-col-${col}`} className="text-[11px] font-black uppercase cursor-pointer text-foreground/70 group-hover:text-primary transition-colors">
                      {col}
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> 2. Filter by Barangays
                </h3>
                <div className="flex gap-4">
                   <button onClick={selectAllBarangays} className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary tracking-tighter">Select All</button>
                   <button onClick={deselectAllBarangays} className="text-[10px] font-black uppercase text-muted-foreground hover:text-red-600 tracking-tighter">Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-muted/20 p-5 rounded-2xl border border-white/5 max-h-[160px] overflow-y-auto scrollbar-vertical-custom">
                {availableBarangays.map(brgy => (
                  <div key={brgy} className="flex items-center gap-2.5 group">
                    <Checkbox 
                      id={`exp-brgy-${brgy}`} 
                      checked={selectedBarangays.includes(brgy)} 
                      onCheckedChange={() => toggleBarangay(brgy)}
                    />
                    <label htmlFor={`exp-brgy-${brgy}`} className="text-[11px] font-bold uppercase cursor-pointer truncate">
                      {brgy}
                    </label>
                  </div>
                ))}
                {availableBarangays.length === 0 && (
                  <p className="col-span-full text-center text-xs font-bold text-muted-foreground py-4 opacity-50">No barangay data detected in session.</p>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                <Filter className="w-4 h-4" /> 3. Select Data Types
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-primary" /> Approved Results
                    </h4>
                    <div className="flex gap-3">
                      <button onClick={selectAllApproved} className="text-[9px] font-black uppercase text-muted-foreground hover:text-primary">All</button>
                      <button onClick={clearAllApproved} className="text-[9px] font-black uppercase text-muted-foreground hover:text-red-600">Clear</button>
                    </div>
                  </div>
                  <div className="space-y-2 bg-muted/10 p-4 rounded-xl border border-white/5">
                    {approvedStatuses.map(status => (
                      <div key={status} className="flex items-center gap-3">
                        <Checkbox 
                          id={`exp-stat-${status}`} 
                          checked={selectedStatuses.includes(status)} 
                          onCheckedChange={() => toggleStatus(status)}
                        />
                        <label htmlFor={`exp-stat-${status}`} className="text-[11px] font-black uppercase cursor-pointer flex items-center justify-between w-full">
                          <span>{status}</span>
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100">{data.filter(r => r.statusLabel === status).length}</Badge>
                        </label>
                      </div>
                    ))}
                    {approvedStatuses.length === 0 && <p className="text-[10px] font-bold text-muted-foreground py-2 opacity-50">No approved results in current view.</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                      <Archive className="w-3 h-3 text-orange-500" /> Archive Data
                    </h4>
                    <div className="flex gap-3">
                      <button onClick={selectAllArchive} className="text-[9px] font-black uppercase text-muted-foreground hover:text-primary">All</button>
                      <button onClick={clearAllArchive} className="text-[9px] font-black uppercase text-muted-foreground hover:text-red-600">Clear</button>
                    </div>
                  </div>
                  <div className="space-y-2 bg-orange-50/10 p-4 rounded-xl border border-orange-500/10">
                    {archiveStatuses.map(status => (
                      <div key={status} className="flex items-center gap-3">
                        <Checkbox 
                          id={`exp-stat-${status}`} 
                          checked={selectedStatuses.includes(status)} 
                          onCheckedChange={() => toggleStatus(status)}
                        />
                        <label htmlFor={`exp-stat-${status}`} className="text-[11px] font-black uppercase cursor-pointer flex items-center justify-between w-full">
                          <span>{status}</span>
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-orange-50 text-orange-700 border-orange-100">{data.filter(r => r.statusLabel === status).length}</Badge>
                        </label>
                      </div>
                    ))}
                    {archiveStatuses.length === 0 && <p className="text-[10px] font-bold text-muted-foreground py-2 opacity-50">No archive data in current view.</p>}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="p-8 border-t bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
             <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estimated Export:</div>
             <Badge className="font-mono text-xs font-black bg-slate-800 text-white">
                {data.filter(r => selectedBarangays.includes(r.barangayName || 'UNMAPPED') && selectedStatuses.includes(r.statusLabel || 'VALID' as any)).length.toLocaleString()} RECORDS
             </Badge>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-xs tracking-widest px-8">Cancel</Button>
            <Button 
              onClick={handleExport} 
              disabled={selectedBarangays.length === 0 || selectedStatuses.length === 0}
              className="bg-primary hover:bg-emerald-800 font-black uppercase text-xs tracking-widest px-12 h-12 shadow-xl shadow-primary/20"
            >
              <FileDown className="w-4 h-4 mr-2" /> Start Generation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
