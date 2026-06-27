"use client";

import React, { useMemo, useState, useEffect } from 'react';
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
  MapPin, 
  Filter, 
  Calendar,
  Link2,
  Unlink2,
  Building2,
  Trees,
  Database,
  Percent,
  Info
} from 'lucide-react';
import { LandRecord } from '@/lib/processor';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parse, isValid, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export interface AbstractExportSettings {
  startDate: string;
  endDate: string;
  linkedOnly: boolean;
  kinds: string[];
  selectedBarangays: string[];
  taxabilities: ('T' | 'E')[];
}

interface AbstractExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[];
  onExport: (settings: AbstractExportSettings) => void;
}

export function AbstractExportModal({
  open,
  onOpenChange,
  data,
  onExport
}: AbstractExportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [selectedKinds, setSelectedKinds] = useState<string[]>(['L', 'B']);
  const [selectedTaxabilities, setSelectedTaxabilities] = useState<('T' | 'E')[]>(['T', 'E']);
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>([]);

  // Helper to parse messy date strings from Excel
  const parseRecordDate = (dateStr: string) => {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();
    // Try common formats
    const formats = ['MM/dd/yyyy', 'M/d/yyyy', 'yyyy-MM-dd', 'MM-dd-yyyy'];
    for (const fmt of formats) {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }
    const fallback = new Date(cleaned);
    return isValid(fallback) ? fallback : null;
  };

  const availableBarangays = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => { 
      const brgy = r.location || 'UNMAPPED';
      // In abstract mode, location often contains the barangay
      set.add(brgy); 
    });
    return Array.from(set).sort();
  }, [data]);

  useEffect(() => {
    if (open) {
      setSelectedBarangays(availableBarangays);
    }
  }, [open, availableBarangays]);

  const filteredCount = useMemo(() => {
    const start = startDate ? startOfDay(new Date(startDate)) : null;
    const end = endDate ? endOfDay(new Date(endDate)) : null;

    return data.filter(record => {
      // 1. Join Status Filter
      if (linkedOnly && !record.isJoined) return false;

      // 2. Date Range Filter
      if (start || end) {
        const recDate = parseRecordDate(record.date);
        if (!recDate) return false;
        if (start && recDate < start) return false;
        if (end && recDate > end) return false;
      }

      // 3. Kind Filter
      const kind = (record.kind || '').trim().toUpperCase();
      if (!selectedKinds.includes(kind)) return false;

      // 4. Taxability Filter
      if (!selectedTaxabilities.includes(record.taxability)) return false;

      // 5. Barangay/Location Filter
      if (!selectedBarangays.includes(record.location || 'UNMAPPED')) return false;

      return true;
    }).length;
  }, [data, startDate, endDate, linkedOnly, selectedKinds, selectedTaxabilities, selectedBarangays]);

  const handleExportClick = () => {
    onExport({
      startDate,
      endDate,
      linkedOnly,
      kinds: selectedKinds,
      selectedBarangays,
      taxabilities: selectedTaxabilities
    });
    onOpenChange(false);
  };

  const toggleKind = (k: string) => {
    setSelectedKinds(prev => prev.includes(k) ? prev.filter(item => item !== k) : [...prev, k]);
  };

  const toggleTaxability = (t: 'T' | 'E') => {
    setSelectedTaxabilities(prev => prev.includes(t) ? prev.filter(item => item !== t) : [...prev, t]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl">
        <div className="p-8 shrink-0 bg-blue-600/5 border-b">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-600/20">
                <FileDown className="text-blue-600 w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black text-foreground uppercase tracking-tight leading-none">
                  Abstract Report Generator
                </DialogTitle>
                <DialogDescription className="text-base font-bold text-muted-foreground mt-2 uppercase tracking-wider">
                  Configure filters for the joined Roll & Journal dataset.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-vertical-custom p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Date Range Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Period Coverage
              </h3>
              <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">From Date</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">To Date</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-11 font-bold text-sm"
                  />
                </div>
              </Card>
            </section>

            {/* Relational Settings */}
            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Join Constraints
              </h3>
              <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl flex flex-col justify-center gap-4 h-[100px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="linked-only" 
                      checked={linkedOnly} 
                      onCheckedChange={(checked) => setLinkedOnly(!!checked)}
                      className="w-5 h-5"
                    />
                    <Label htmlFor="linked-only" className="text-xs font-black uppercase cursor-pointer">Export only successful joins</Label>
                  </div>
                  {linkedOnly && <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase">Strict Mode</Badge>}
                </div>
              </Card>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Kind Filter */}
            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Classification
              </h3>
              <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox id="k-land" checked={selectedKinds.includes('L')} onCheckedChange={() => toggleKind('L')} />
                  <Label htmlFor="k-land" className="text-xs font-bold uppercase cursor-pointer flex items-center gap-2">
                    <Trees className="w-3.5 h-3.5 text-emerald-600" /> Land (L)
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="k-bldg" checked={selectedKinds.includes('B')} onCheckedChange={() => toggleKind('B')} />
                  <Label htmlFor="k-bldg" className="text-xs font-bold uppercase cursor-pointer flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> Building (B)
                  </Label>
                </div>
              </Card>
            </section>

            {/* Taxability Filter */}
            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                <Percent className="w-4 h-4" /> Financial Type
              </h3>
              <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox id="t-tax" checked={selectedTaxabilities.includes('T')} onCheckedChange={() => toggleTaxability('T')} />
                  <Label htmlFor="t-tax" className="text-xs font-bold uppercase cursor-pointer flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-primary" /> Taxable (T)
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="t-exempt" checked={selectedTaxabilities.includes('E')} onCheckedChange={() => toggleTaxability('E')} />
                  <Label htmlFor="t-exempt" className="text-xs font-bold uppercase cursor-pointer flex items-center gap-2">
                    <Badge variant="outline" className="h-4 px-1 text-[8px] bg-blue-600 text-white border-none">E</Badge> Exempt (E)
                  </Label>
                </div>
              </Card>
            </section>

            {/* Coverage Summary */}
            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                <Info className="w-4 h-4" /> Export Payload
              </h3>
              <div className="p-6 rounded-2xl bg-blue-600 text-white shadow-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Final Row Count</span>
                  <span className="text-4xl font-black">{filteredCount.toLocaleString()}</span>
                  <span className="text-[9px] font-bold uppercase mt-2 bg-white/20 px-2 py-0.5 rounded">Verified Results</span>
              </div>
            </section>
          </div>

          {/* Location Multi-Select */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Transaction Locations
              </h3>
              <div className="flex gap-4">
                <Button variant="link" size="sm" onClick={() => setSelectedBarangays(availableBarangays)} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-blue-600">Select All</Button>
                <Button variant="link" size="sm" onClick={() => setSelectedBarangays([])} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-blue-600">Clear</Button>
              </div>
            </div>
            <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl">
              <ScrollArea className="h-[150px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                  {availableBarangays.map(brgy => (
                    <div key={brgy} className="flex items-center gap-3 group">
                      <Checkbox 
                        id={`abs-loc-${brgy}`} 
                        checked={selectedBarangays.includes(brgy)} 
                        onCheckedChange={() => setSelectedBarangays(prev => prev.includes(brgy) ? prev.filter(b => b !== brgy) : [...prev, brgy])}
                      />
                      <label htmlFor={`abs-loc-${brgy}`} className="text-[11px] font-black cursor-pointer truncate uppercase select-none text-foreground/80 group-hover:text-blue-600 transition-colors">
                        {brgy}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </section>
        </div>

        <DialogFooter className="p-8 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-600/10 rounded-xl border border-blue-600/10">
             <Info className="w-4 h-4 text-blue-600" />
             <p className="text-[10px] font-bold text-blue-700 leading-tight uppercase max-w-[400px]">
               The report will prioritize Roll data for owners and parcel identity, and Journal data for transaction metrics.
             </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-xs tracking-widest px-8 h-12 hover:bg-muted">Cancel</Button>
            <Button 
              onClick={handleExportClick} 
              disabled={filteredCount === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest px-12 h-12 shadow-2xl shadow-blue-500/20"
            >
              <FileDown className="w-4 h-4 mr-2" /> Generate Abstract
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
