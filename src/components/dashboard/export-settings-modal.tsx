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
  HelpCircle,
  Shapes,
  ShieldCheck
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
  kinds: string[];
  taxabilities: ('T' | 'E')[];
}

const columnLabels = [
  "TYPE", "DATE", "ARP NO#", "PIN", "NEW ARP NO#", "UPDATE", "TAXABILITY", "ACCTNAME", "ADDRESS", 
  "LOCATION", "KIND", "AU", "LAND AREA", 
  "UNIT VALUE (2028)", "MARKET VALUE (2028)", "ASSESSED VALUE (2028)", "YEARLY TAX (2028 CAP)",
  "UNIT VALUE", "MARKET VALUE", "ASSESSED VALUE", "YEARLY TAX"
];

const KIND_LABELS: Record<string, string> = {
  'L': 'Land (L)',
  'B': 'Building (B)',
  'M': 'Machinery (M)'
};

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
  const [selectedKinds, setSelectedKinds] = React.useState<string[]>([]);
  const [selectedTaxabilities, setSelectedTaxabilities] = React.useState<('T' | 'E')[]>([]);

  const availableBarangays = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => { 
      const brgyName = r.barangayName || 'UNMAPPED';
      set.add(brgyName); 
    });
    return Array.from(set).sort();
  }, [data]);

  const availableStatuses = useMemo(() => {
    const set = new Set<RecordStatusType>();
    data.forEach(r => { if (r.statusLabel) set.add(r.statusLabel); });
    return Array.from(set).sort();
  }, [data]);

  const availableKinds = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => { if (r.kind) set.add(r.kind.trim().toUpperCase()); });
    return Array.from(set).sort();
  }, [data]);

  const availableTaxabilities = useMemo(() => {
    const set = new Set<('T' | 'E')>();
    data.forEach(r => { if (r.taxability) set.add(r.taxability); });
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

  React.useEffect(() => {
    if (open) {
      setSelectedBarangays(availableBarangays);
      setSelectedKinds(availableKinds);
      setSelectedTaxabilities(availableTaxabilities);
      if (onBulkColumnChange) {
        const allCols = { ...exportColumns };
        columnLabels.forEach(col => allCols[col] = true);
        onBulkColumnChange(allCols);
      }
      setSelectedStatuses([]);
    }
  }, [open, availableBarangays, availableKinds, availableTaxabilities]);

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

  const toggleKind = (kind: string) => {
    setSelectedKinds(prev => 
      prev.includes(kind) ? prev.filter(k => k !== kind) : [...prev, kind]
    );
  };

  const toggleTaxability = (tax: 'T' | 'E') => {
    setSelectedTaxabilities(prev => 
      prev.includes(tax) ? prev.filter(t => t !== tax) : [...prev, tax]
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
      statuses: selectedStatuses,
      kinds: selectedKinds,
      taxabilities: selectedTaxabilities
    });
  };
  
  const estimatedRecordCount = useMemo(() => {
    return data.filter(r => 
      selectedBarangays.includes(r.barangayName || 'UNMAPPED') && 
      selectedStatuses.includes(r.statusLabel || 'VALID' as any) &&
      selectedKinds.includes(r.kind?.trim().toUpperCase() || '') &&
      selectedTaxabilities.includes(r.taxability || 'T')
    ).length;
  }, [data, selectedBarangays, selectedStatuses, selectedKinds, selectedTaxabilities]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const canExport = selectedBarangays.length > 0 && selectedStatuses.length > 0 && selectedKinds.length > 0 && selectedTaxabilities.length > 0 && estimatedRecordCount > 0;
      if (canExport) {
        e.preventDefault();
        handleExport();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl"
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

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 px-0">
          {/* LEFT SIDE - Columns Selection */}
          <div className="lg:col-span-4 flex flex-col gap-6 p-8 overflow-y-auto scrollbar-vertical-custom border-r border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                <Columns className="w-4 h-4" /> Export Columns
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground outline-none"><HelpCircle className="w-3.5 h-3.5" /></button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-xl">
                    <p className="text-sm font-bold leading-relaxed text-muted-foreground">Choose which data columns will be included in the final Excel file.</p>
                  </PopoverContent>
                </Popover>
              </h3>
              <div className="flex gap-3">
                <Button variant="link" size="sm" onClick={selectAllColumns} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-primary">All</Button>
                <Button variant="link" size="sm" onClick={deselectAllColumns} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-primary">None</Button>
              </div>
            </div>
            
            <Card className="bg-muted/10 p-5 shadow-inner border-white/5">
              <div className="grid grid-cols-1 gap-y-3">
                {columnLabels.map(col => (
                  <div key={col} className="flex items-center gap-3 group">
                    <Checkbox 
                      id={`exp-col-${col}`} 
                      checked={exportColumns[col]} 
                      onCheckedChange={() => onColumnToggle(col)}
                      className="border-primary/40 data-[state=checked]:bg-primary w-4.5 h-4.5"
                    />
                    <label htmlFor={`exp-col-${col}`} className="text-xs font-black uppercase cursor-pointer text-foreground/70 group-hover:text-primary transition-colors select-none truncate">
                      {col}
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT SIDE - Advanced Filters */}
          <div className="lg:col-span-8 flex flex-col p-8 overflow-y-auto scrollbar-vertical-custom gap-10">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Geographic Coverage
                </h3>
                <div className="flex gap-4">
                  <Button variant="link" size="sm" onClick={selectAllBarangays} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-primary">Select All</Button>
                  <Button variant="link" size="sm" onClick={deselectAllBarangays} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-primary">Clear All</Button>
                </div>
              </div>
              <Card className="bg-muted/10 p-5 shadow-inner border-white/5">
                <ScrollArea className="h-[140px] pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                    {availableBarangays.map(brgy => (
                      <div key={brgy} className="flex items-center gap-3 group">
                        <Checkbox 
                          id={`exp-brgy-${brgy}`} 
                          checked={selectedBarangays.includes(brgy)} 
                          onCheckedChange={() => toggleBarangay(brgy)}
                          className="w-4.5 h-4.5"
                        />
                        <label htmlFor={`exp-brgy-${brgy}`} className="text-xs font-bold cursor-pointer truncate select-none text-foreground/80 group-hover:text-primary transition-colors">
                          {brgy}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                  <Shapes className="w-4 h-4" /> Property Kind
                </h3>
                <Card className="bg-muted/10 p-5 shadow-inner border-white/5 h-full">
                  <div className="space-y-3">
                    {availableKinds.map(kind => (
                      <div key={kind} className="flex items-center gap-3 group">
                        <Checkbox 
                          id={`exp-kind-${kind}`} 
                          checked={selectedKinds.includes(kind)} 
                          onCheckedChange={() => toggleKind(kind)}
                          className="w-4.5 h-4.5"
                        />
                        <label htmlFor={`exp-kind-${kind}`} className="text-[11px] font-black cursor-pointer truncate uppercase select-none text-foreground/80 group-hover:text-primary transition-colors">
                          {KIND_LABELS[kind] || kind}
                        </label>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Financial Status
                </h3>
                <Card className="bg-muted/10 p-5 shadow-inner border-white/5 h-full">
                  <div className="space-y-3">
                    {['T', 'E'].map(tax => (
                      <div key={tax} className="flex items-center gap-3 group">
                        <Checkbox 
                          id={`exp-tax-${tax}`} 
                          checked={selectedTaxabilities.includes(tax as any)} 
                          onCheckedChange={() => toggleTaxability(tax as any)}
                          className="w-4.5 h-4.5"
                        />
                        <label htmlFor={`exp-tax-${tax}`} className="text-[11px] font-black cursor-pointer truncate uppercase select-none text-foreground/80 group-hover:text-primary transition-colors">
                          {tax === 'T' ? 'Taxable (T)' : 'Exempted (E)'}
                        </label>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            </div>

            <section className="space-y-6">
              <h3 className="text-sm font-black uppercase text-primary tracking-[0.15em] flex items-center gap-2">
                <Filter className="w-4 h-4" /> Data Integrity Filters
              </h3>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" /> Active Verified Records
                    </h4>
                    <div className="flex gap-3">
                      <Button variant="link" size="sm" onClick={selectAllApproved} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-emerald-600">Select All</Button>
                      <Button variant="link" size="sm" onClick={clearAllApproved} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-emerald-600">Clear</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    {approvedStatuses.map(status => (
                      <div key={status} className="flex items-center gap-3 group">
                        <Checkbox 
                          id={`exp-stat-${status}`} 
                          checked={selectedStatuses.includes(status)} 
                          onCheckedChange={() => toggleStatus(status)}
                          className="w-4 h-4 border-emerald-500/40"
                        />
                        <label htmlFor={`exp-stat-${status}`} className="text-[11px] font-black uppercase cursor-pointer flex items-center justify-between w-full select-none group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          <span className="truncate mr-2">{status}</span>
                          <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] font-black bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 shadow-none shrink-0">
                            {data.filter(r => r.statusLabel === status && selectedBarangays.includes(r.barangayName || 'UNMAPPED') && selectedKinds.includes(r.kind?.trim().toUpperCase() || '') && selectedTaxabilities.includes(r.taxability || 'T')).length}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-orange-500" /> Administrative Archive
                    </h4>
                    <div className="flex gap-3">
                      <Button variant="link" size="sm" onClick={selectAllArchive} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-orange-600">Select All</Button>
                      <Button variant="link" size="sm" onClick={clearAllArchive} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-orange-600">Clear</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    {archiveStatuses.map(status => (
                      <div key={status} className="flex items-center gap-3 group">
                        <Checkbox 
                          id={`exp-stat-${status}`} 
                          checked={selectedStatuses.includes(status)} 
                          onCheckedChange={() => toggleStatus(status)}
                          className="w-4 h-4 border-orange-500/40"
                        />
                        <label htmlFor={`exp-stat-${status}`} className="text-[11px] font-black uppercase cursor-pointer flex items-center justify-between w-full select-none group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">
                          <span className="truncate mr-2">{status}</span>
                          <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] font-black bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 shadow-none shrink-0">
                            {data.filter(r => r.statusLabel === status && selectedBarangays.includes(r.barangayName || 'UNMAPPED') && selectedKinds.includes(r.kind?.trim().toUpperCase() || '') && selectedTaxabilities.includes(r.taxability || 'T')).length}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="p-8 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selected Payload:</span>
            <Badge className="font-mono text-base font-black px-5 py-2 bg-background text-foreground shadow-lg border-white/5 ring-1 ring-black/5 dark:ring-white/5">
                {estimatedRecordCount.toLocaleString()} Records
            </Badge>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-xs tracking-widest px-8 h-12 flex-1 sm:flex-none hover:bg-muted hover:text-foreground">Discard</Button>
            <Button 
              onClick={handleExport} 
              disabled={selectedBarangays.length === 0 || selectedStatuses.length === 0 || selectedKinds.length === 0 || selectedTaxabilities.length === 0 || estimatedRecordCount === 0}
              className="bg-primary hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest px-12 h-12 shadow-2xl shadow-primary/20 flex-1 sm:flex-none transition-colors"
            >
              <FileDown className="w-4 h-4 mr-2" /> Generate File
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
