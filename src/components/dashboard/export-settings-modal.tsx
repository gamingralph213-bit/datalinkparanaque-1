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
  Columns,
  MapPin, 
  Filter, 
  CheckSquare, 
  ChevronRight,
  Archive,
  AlertTriangle,
  FileSignature,
  FileCheck2,
  Trash2
} from 'lucide-react';
import { LandRecord, RecordStatusType } from '@/lib/processor';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

  const approvedStatuses = availableStatuses.filter(s => s !== 'DUPLICATE' && s !== 'INCOMPLETE' && s !== 'CLEANUP');
  const archiveStatuses = availableStatuses.filter(s => s === 'DUPLICATE' || s === 'INCOMPLETE' || s === 'CLEANUP');

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
  
  const estimatedRecordCount = useMemo(() => {
    return data.filter(r => 
      selectedBarangays.includes(r.barangayName || 'UNMAPPED') && 
      selectedStatuses.includes(r.statusLabel || 'VALID' as any)
    ).length;
  }, [data, selectedBarangays, selectedStatuses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl">
        <div className="p-8 shrink-0">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-primary/20 p-3 rounded-xl border border-primary/20">
                <FileDown className="text-primary w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black text-foreground uppercase tracking-tight leading-none">
                  Smart Export Controller
                </DialogTitle>
                <DialogDescription className="text-base font-bold text-muted-foreground mt-2 uppercase tracking-wider">
                  Select columns and apply filters before generating your file.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 px-8">
          {/* LEFT SIDE - Filters */}
          <div className="flex flex-col gap-8 overflow-y-auto scrollbar-vertical-custom pb-8 pr-4">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Filter by Barangays
                </h3>
                <div className="flex gap-4">
                   <Button variant="link" size="sm" onClick={selectAllBarangays} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Select All</Button>
                   <Button variant="link" size="sm" onClick={deselectAllBarangays} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Clear All</Button>
                </div>
              </div>
              <Card className="bg-muted/30 p-5 shadow-inner">
                <ScrollArea className="h-40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableBarangays.map(brgy => (
                      <div key={brgy} className="flex items-center gap-3 group">
                        <Checkbox 
                          id={`exp-brgy-${brgy}`} 
                          checked={selectedBarangays.includes(brgy)} 
                          onCheckedChange={() => toggleBarangay(brgy)}
                          className="w-5 h-5"
                        />
                        <label htmlFor={`exp-brgy-${brgy}`} className="text-sm font-bold cursor-pointer truncate">
                          {brgy}
                        </label>
                      </div>
                    ))}
                    {availableBarangays.length === 0 && (
                      <p className="col-span-full text-center text-sm font-bold text-muted-foreground py-4 opacity-50">No barangay data detected.</p>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                <Filter className="w-5 h-5" /> Filter by Data Type
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-muted-foreground flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-500" /> Approved Results
                  </h4>
                  <div className="flex gap-4">
                    <Button variant="link" size="sm" onClick={selectAllApproved} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">All</Button>
                    <Button variant="link" size="sm" onClick={clearAllApproved} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Clear</Button>
                  </div>
                </div>
                <div className="space-y-2 bg-muted/20 p-4 rounded-xl border">
                  {approvedStatuses.map(status => (
                    <div key={status} className="flex items-center gap-3">
                      <Checkbox 
                        id={`exp-stat-${status}`} 
                        checked={selectedStatuses.includes(status)} 
                        onCheckedChange={() => toggleStatus(status)}
                        className="w-5 h-5"
                      />
                      <label htmlFor={`exp-stat-${status}`} className="text-sm font-black uppercase cursor-pointer flex items-center justify-between w-full">
                        <span>{status}</span>
                        <Badge variant="secondary" className="h-5 px-2 text-xs bg-emerald-100 text-emerald-800 border-emerald-200">{data.filter(r => r.statusLabel === status).length}</Badge>
                      </label>
                    </div>
                  ))}
                  {approvedStatuses.length === 0 && <p className="text-xs font-bold text-center text-muted-foreground py-2 opacity-50">No approved results in current view.</p>}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                   <h4 className="font-bold text-muted-foreground flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-orange-500" /> Archive Data
                  </h4>
                  <div className="flex gap-4">
                    <Button variant="link" size="sm" onClick={selectAllArchive} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">All</Button>
                    <Button variant="link" size="sm" onClick={clearAllArchive} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Clear</Button>
                  </div>
                </div>
                <div className="space-y-2 bg-muted/20 p-4 rounded-xl border">
                  {archiveStatuses.map(status => (
                    <div key={status} className="flex items-center gap-3">
                      <Checkbox 
                        id={`exp-stat-${status}`} 
                        checked={selectedStatuses.includes(status)} 
                        onCheckedChange={() => toggleStatus(status)}
                        className="w-5 h-5"
                      />
                      <label htmlFor={`exp-stat-${status}`} className="text-sm font-black uppercase cursor-pointer flex items-center justify-between w-full">
                        <span>{status}</span>
                        <Badge variant="destructive" className="h-5 px-2 text-xs">{data.filter(r => r.statusLabel === status).length}</Badge>
                      </label>
                    </div>
                  ))}
                  {archiveStatuses.length === 0 && <p className="text-xs font-bold text-center text-muted-foreground py-2 opacity-50">No archive data in current view.</p>}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT SIDE - Columns */}
          <div className="flex flex-col gap-4 border-l pl-8 pr-1 pb-8 overflow-y-auto scrollbar-vertical-custom">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                  <Columns className="w-5 h-5" /> Select Export Columns
                </h3>
                <div className="flex gap-4">
                  <Button variant="link" size="sm" onClick={selectAllColumns} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Select All</Button>
                  <Button variant="link" size="sm" onClick={deselectAllColumns} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Clear All</Button>
                </div>
              </div>
              <Card className="bg-muted/30 p-6 shadow-inner flex-1">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {columnLabels.map(col => (
                    <div key={col} className="flex items-center gap-3 group">
                      <Checkbox 
                        id={`exp-col-${col}`} 
                        checked={exportColumns[col]} 
                        onCheckedChange={() => onColumnToggle(col)}
                        className="border-primary/40 data-[state=checked]:bg-primary w-5 h-5"
                      />
                      <label htmlFor={`exp-col-${col}`} className="text-sm font-bold uppercase cursor-pointer text-foreground/80 group-hover:text-primary transition-colors">
                        {col}
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
          </div>
        </div>

        <DialogFooter className="p-8 border-t bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="text-sm font-black uppercase text-muted-foreground">Estimated Export:</div>
             <Badge className="font-mono text-base font-black px-4 py-1.5 bg-background text-foreground shadow-md border">
                {estimatedRecordCount.toLocaleString()} Records
             </Badge>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-xs tracking-widest px-8 h-12">Cancel</Button>
            <Button 
              onClick={handleExport} 
              disabled={selectedBarangays.length === 0 || selectedStatuses.length === 0 || estimatedRecordCount === 0}
              className="bg-primary hover:bg-emerald-800 font-black uppercase text-xs tracking-widest px-12 h-12 shadow-xl shadow-primary/20"
            >
              <FileDown className="w-4 h-4 mr-2" /> Start Generation
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
