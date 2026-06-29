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
import { 
  FileDown, 
  Calendar,
  Link2,
  Building2,
  Database,
  Percent,
  HelpCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { parse, isValid, startOfDay, endOfDay } from 'date-fns';

export interface AbstractExportSettings {
  startDate: string;
  endDate: string;
  linkedOnly: boolean;
  kinds: string[];
  taxabilities: ('T' | 'E')[];
  updateCodes: string[];
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
  const [selectedTaxabilities, setSelectedTaxabilities] = useState<('T' | 'E')[]>([]);
  const [selectedUpdateCodes, setSelectedUpdateCodes] = useState<string[]>([]);

  // Discovery logic for dynamic update codes
  const availableUpdateCodes = useMemo(() => {
    const codes = new Set<string>();
    data.forEach(r => {
      if (r.update) codes.add(r.update.trim().toUpperCase());
    });
    return Array.from(codes).sort();
  }, [data]);

  // Set defaults when modal opens
  useEffect(() => {
    if (open) {
      setSelectedUpdateCodes(availableUpdateCodes);
    }
  }, [open, availableUpdateCodes]);

  const parseRecordDate = (dateStr: string) => {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();
    const formats = ['MM/dd/yyyy', 'M/d/yyyy', 'yyyy-MM-dd', 'MM-dd-yyyy'];
    for (const fmt of formats) {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }
    const fallback = new Date(cleaned);
    return isValid(fallback) ? fallback : null;
  };

  const filteredCount = useMemo(() => {
    const start = startDate ? startOfDay(new Date(startDate)) : null;
    const end = endDate ? endOfDay(new Date(endDate)) : null;

    return data.filter(record => {
      if (linkedOnly && !record.isJoined) return false;
      if (start || end) {
        const recDate = parseRecordDate(record.date);
        if (!recDate) return false;
        if (start && recDate < start) return false;
        if (end && recDate > end) return false;
      }
      const kind = (record.kind || '').trim().toUpperCase();
      if (!selectedKinds.includes(kind)) return false;
      if (!selectedTaxabilities.includes(record.taxability)) return false;
      const code = (record.update || '').trim().toUpperCase();
      if (!selectedUpdateCodes.includes(code)) return false;
      return true;
    }).length;
  }, [data, startDate, endDate, linkedOnly, selectedKinds, selectedTaxabilities, selectedUpdateCodes]);

  const handleExportClick = () => {
    onExport({
      startDate,
      endDate,
      linkedOnly,
      kinds: selectedKinds,
      taxabilities: selectedTaxabilities,
      updateCodes: selectedUpdateCodes
    });
    onOpenChange(false);
  };

  const toggleKind = (k: string) => {
    setSelectedKinds(prev => prev.includes(k) ? prev.filter(item => item !== k) : [...prev, k]);
  };

  const toggleTaxability = (t: 'T' | 'E') => {
    setSelectedTaxabilities(prev => prev.includes(t) ? prev.filter(item => item !== t) : [...prev, t]);
  };

  const toggleUpdateCode = (c: string) => {
    setSelectedUpdateCodes(prev => prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl">
        <div className="p-8 shrink-0 bg-blue-600/5 border-b">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-600/20">
                <FileDown className="text-blue-600 w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-3xl font-black text-foreground uppercase tracking-tight leading-none">
                    Abstract Export Controller
                  </DialogTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-blue-600 transition-colors outline-none">
                        <HelpCircle className="w-5 h-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl p-6">
                      <div className="space-y-3">
                        <h4 className="font-black uppercase text-[10px] tracking-widest text-blue-600">Engine Logic Overview</h4>
                        <p className="text-xs font-bold leading-relaxed text-muted-foreground uppercase">
                          The Abstract Report joins <span className="text-foreground">Journal logs</span> with <span className="text-foreground">Assessment Rolls</span>. 
                          <br /><br />
                          Records are automatically arranged by <span className="text-foreground">Date</span> and then by <span className="text-foreground">ARP No.</span>
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <DialogDescription className="text-base font-bold text-muted-foreground mt-2 uppercase tracking-wider">
                  Generate a relational transfer report for the selected session data.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-vertical-custom p-8 space-y-12">
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Period Coverage
            </h3>
            <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl grid grid-cols-2 gap-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-10">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Classification
                  </h3>
                  <div className="flex gap-3">
                    <Button variant="link" onClick={() => setSelectedKinds(['L', 'B'])} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-blue-600">All</Button>
                    <Button variant="link" onClick={() => setSelectedKinds([])} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-blue-600">Clear</Button>
                  </div>
                </div>
                <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox id="abs-k-land" checked={selectedKinds.includes('L')} onCheckedChange={() => toggleKind('L')} />
                    <Label htmlFor="abs-k-land" className="text-xs font-bold uppercase cursor-pointer">Land (L)</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="abs-k-bldg" checked={selectedKinds.includes('B')} onCheckedChange={() => toggleKind('B')} />
                    <Label htmlFor="abs-k-bldg" className="text-xs font-bold uppercase cursor-pointer">Building (B)</Label>
                  </div>
                </Card>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                    <Percent className="w-4 h-4" /> Financial Type
                  </h3>
                  <div className="flex gap-3">
                    <Button variant="link" onClick={() => setSelectedTaxabilities(['T', 'E'])} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-blue-600">All</Button>
                    <Button variant="link" onClick={() => setSelectedTaxabilities([])} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-blue-600">Clear</Button>
                  </div>
                </div>
                <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox id="abs-t-tax" checked={selectedTaxabilities.includes('T')} onCheckedChange={() => toggleTaxability('T')} />
                    <Label htmlFor="abs-t-tax" className="text-xs font-bold uppercase cursor-pointer flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-primary" /> Taxable
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="abs-t-exempt" checked={selectedTaxabilities.includes('E')} onCheckedChange={() => toggleTaxability('E')} />
                    <Label htmlFor="abs-t-exempt" className="text-xs font-bold uppercase cursor-pointer flex items-center gap-2">
                      <Badge variant="outline" className="h-4 px-1 text-[8px] bg-blue-600 text-white border-none">E</Badge> Exempt
                    </Label>
                  </div>
                </Card>
              </section>
            </div>

            <div className="space-y-10">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Update Code
                  </h3>
                  <div className="flex gap-3">
                    <Button variant="link" onClick={() => setSelectedUpdateCodes(availableUpdateCodes)} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-blue-600">All</Button>
                    <Button variant="link" onClick={() => setSelectedUpdateCodes([])} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-blue-600">Clear</Button>
                  </div>
                </div>
                <Card className="bg-muted/10 p-5 shadow-inner border-white/5 rounded-2xl">
                  <ScrollArea className="h-[120px] pr-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {availableUpdateCodes.map(code => (
                        <div key={code} className="flex items-center gap-3 group">
                          <Checkbox 
                            id={`abs-upd-${code}`} 
                            checked={selectedUpdateCodes.includes(code)} 
                            onCheckedChange={() => toggleUpdateCode(code)}
                            className="w-4 h-4"
                          />
                          <label htmlFor={`abs-upd-${code}`} className="text-[11px] font-black cursor-pointer truncate uppercase select-none text-foreground/80 group-hover:text-blue-600 transition-colors">
                            {code || 'NONE'}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase text-blue-600 tracking-[0.15em] flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Match Rule
                </h3>
                <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="abs-linked-only" 
                      checked={linkedOnly} 
                      onCheckedChange={(checked) => setLinkedOnly(!!checked)}
                    />
                    <Label htmlFor="abs-linked-only" className="text-[10px] font-black uppercase cursor-pointer">Linked Only (Roll Match)</Label>
                  </div>
                  {linkedOnly && <Badge className="bg-emerald-600 text-white font-black text-[8px] uppercase h-4">Strict</Badge>}
                </Card>
              </section>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Report Payload:</span>
            <Badge className="font-mono text-xl font-black px-6 py-2 bg-background text-foreground shadow-lg border-white/5">
                {filteredCount.toLocaleString()} Rows
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-xs tracking-widest px-8 h-12 hover:bg-muted">Discard</Button>
            <Button 
              onClick={handleExportClick} 
              disabled={filteredCount === 0 || selectedTaxabilities.length === 0 || selectedKinds.length === 0 || selectedUpdateCodes.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest px-12 h-12 shadow-2xl shadow-blue-500/20"
            >
              <FileDown className="w-4 h-4 mr-2" /> Generate Report
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
