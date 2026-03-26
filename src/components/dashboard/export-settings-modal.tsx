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
  FileCheck2,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { LandRecord, RecordStatusType } from '@/lib/processor';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';

interface ExportSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LandRecord[];
  isProcessed: boolean;
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
  isProcessed,
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
    // We keep UNMAPPED if it exists because INCOMPLETE/CLEANUP records often live there
    return Array.from(set).sort();
  }, [data]);

  const availableStatuses = useMemo(() => {
    const set = new Set<RecordStatusType>();
    data.forEach(r => { if (r.statusLabel) set.add(r.statusLabel); });
    return Array.from(set).sort();
  }, [data]);

  const approvedStatuses = useMemo(() => 
    availableStatuses.filter(s => s !== 'DUPLICATE' && s !== 'INCOMPLETE' && s !== 'CLEANUP'),
    [availableStatuses]
  );
  
  const archiveStatuses = useMemo(() => 
    availableStatuses.filter(s => s === 'DUPLICATE' || s === 'INCOMPLETE' || s === 'CLEANUP'),
    [availableStatuses]
  );

  const approvedGroupCount = useMemo(() => {
    return data.filter(r => 
      approvedStatuses.includes(r.statusLabel as any) && 
      selectedBarangays.includes(r.barangayName || 'UNMAPPED')
    ).length;
  }, [data, approvedStatuses, selectedBarangays]);

  const archiveGroupCount = useMemo(() => {
    return data.filter(r => 
      archiveStatuses.includes(r.statusLabel as any) && 
      selectedBarangays.includes(r.barangayName || 'UNMAPPED')
    ).length;
  }, [data, archiveStatuses, selectedBarangays]);

  React.useEffect(() => {
    if (open) {
      // Default to all barangays and columns checked
      setSelectedBarangays(availableBarangays);
      if (onBulkColumnChange) {
        const allCols = { ...exportColumns };
        columnLabels.forEach(col => allCols[col] = true);
        onBulkColumnChange(allCols);
      }
      // Default to no statuses checked
      setSelectedStatuses([]);
    }
  }, [open, availableBarangays]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const canExport = selectedBarangays.length > 0 && selectedStatuses.length > 0 && estimatedRecordCount > 0;
      if (canExport) {
        e.preventDefault();
        handleExport();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl"
        onKeyDown={handleKeyDown}
      >
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
          {/* LEFT SIDE - Columns */}
          <div className="flex flex-col gap-4 pr-4 pb-8 overflow-y-auto scrollbar-vertical-custom">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                  <Columns className="w-5 h-5" /> Select Export Columns
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground outline-none"><HelpCircle className="w-4 h-4" /></button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-xl">
                      <p className="text-sm font-bold leading-relaxed text-muted-foreground">Choose which data columns will be included in the final Excel file.</p>
                    </PopoverContent>
                  </Popover>
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

          {/* RIGHT SIDE - Filters */}
          <div className="flex flex-col gap-8 overflow-y-auto scrollbar-vertical-custom pb-8 pl-8 border-l">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Filter by Barangays
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground outline-none"><HelpCircle className="w-4 h-4" /></button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-xl">
                      <p className="text-sm font-bold leading-relaxed text-muted-foreground">Export records only from the selected Barangays. Only areas present in your data will appear here.</p>
                    </PopoverContent>
                  </Popover>
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
                    <Badge variant="outline" className="ml-2 font-black text-emerald-600 bg-emerald-50 border-emerald-200">
                      {approvedGroupCount.toLocaleString()} Total
                    </Badge>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground outline-none"><HelpCircle className="w-3.5 h-3.5" /></button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-xl">
                        <p className="text-sm font-bold leading-relaxed text-muted-foreground">Records that have passed initial cleanup and are not duplicates. This includes both fully valid records and those flagged with correctable errors.</p>
                      </PopoverContent>
                    </Popover>
                  </h4>
                  <div className="flex gap-4">
                    <Button variant="link" size="sm" onClick={selectAllApproved} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Select All</Button>
                    <Button variant="link" size="sm" onClick={clearAllApproved} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Clear All</Button>
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
                        <Badge variant="secondary" className="h-5 px-2 text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                          {data.filter(r => r.statusLabel === status && selectedBarangays.includes(r.barangayName || 'UNMAPPED')).length}
                        </Badge>
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
                    <Badge variant="outline" className="ml-2 font-black text-orange-600 bg-orange-50 border-orange-200">
                      {archiveGroupCount.toLocaleString()} Total
                    </Badge>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground outline-none"><HelpCircle className="w-3.5 h-3.5" /></button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-xl">
                        <p className="text-sm font-bold leading-relaxed text-muted-foreground">Records automatically moved aside by the engine, such as duplicates or rows with critical missing data (PIN/Acct Name).</p>
                      </PopoverContent>
                    </Popover>
                  </h4>
                  <div className="flex gap-4">
                    <Button variant="link" size="sm" onClick={selectAllArchive} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Select All</Button>
                    <Button variant="link" size="sm" onClick={clearAllArchive} className="text-xs font-black uppercase text-muted-foreground h-auto p-0">Clear All</Button>
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
                        <Badge variant="destructive" className="h-5 px-2 text-xs">
                          {data.filter(r => r.statusLabel === status && selectedBarangays.includes(r.barangayName || 'UNMAPPED')).length}
                        </Badge>
                      </label>
                    </div>
                  ))}
                  {archiveStatuses.length === 0 && <p className="text-xs font-bold text-center text-muted-foreground py-2 opacity-50">No archive data in current view.</p>}
                </div>
              </div>
            </section>
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
