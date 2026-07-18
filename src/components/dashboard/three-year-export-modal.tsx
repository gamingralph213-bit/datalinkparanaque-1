'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { TrendingUp, FileDown, AlertCircle, HelpCircle, Layers } from 'lucide-react';
import { ThreeYearReportRow } from '@/lib/three-year-report-engine';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ThreeYearExportSettings {
  kinds: ('Land' | 'Building' | 'Machinery' | 'Other')[];
  statuses: ('Linked' | 'Unlinked' | 'Under Review' | 'Other/Unmapped')[];
}

interface ThreeYearExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Joined (matched) rows ready for export */
  data: ThreeYearReportRow[];
  /** Total number of sales rows before join (for unmatched count) */
  totalSalesRows?: number;
  /** Called when user confirms export */
  onExport: (settings: ThreeYearExportSettings) => void;
  isExporting?: boolean;
}

export function ThreeYearExportModal({
  open,
  onOpenChange,
  data,
  totalSalesRows = 0,
  onExport,
  isExporting = false,
}: ThreeYearExportModalProps) {
  const [selectedKinds, setSelectedKinds] = useState<('Land' | 'Building' | 'Machinery' | 'Other')[]>(['Land', 'Building', 'Machinery', 'Other']);
  const [selectedStatuses, setSelectedStatuses] = useState<('Linked' | 'Unlinked' | 'Under Review' | 'Other/Unmapped')[]>(['Linked', 'Unlinked', 'Under Review', 'Other/Unmapped']);

  useEffect(() => {
    if (open) {
      setSelectedKinds(['Land', 'Building', 'Machinery', 'Other']);
      setSelectedStatuses(['Linked', 'Unlinked', 'Under Review', 'Other/Unmapped']);
    }
  }, [open]);

  const filteredData = useMemo(() => {
    return data.filter(record => {
      // Determine the canonical status of this record
      let status: 'Linked' | 'Unlinked' | 'Under Review' | 'Other/Unmapped';
      if (!record.isJoined)                     status = 'Unlinked';
      else if ((record as any).isOtherUnmapped) status = 'Other/Unmapped';
      else if (record.isUnderReview)            status = 'Under Review';
      else                                      status = 'Linked';

      if (!selectedStatuses.includes(status)) return false;

      // For Land/Building records, also check the kind filter
      if (status === 'Linked' || status === 'Under Review') {
        if (!selectedKinds.includes(record.kindGroup as any)) return false;
      }

      return true;
    });
  }, [data, selectedKinds, selectedStatuses]);

  const landCount         = filteredData.filter(r => r.kindGroup === 'Land' && r.isJoined && !(r as any).isOtherUnmapped && !r.isUnderReview).length;
  const buildingCount     = filteredData.filter(r => r.kindGroup === 'Building' && r.isJoined && !(r as any).isOtherUnmapped && !r.isUnderReview).length;
  const machineryCount    = filteredData.filter(r => r.kindGroup === 'Machinery' && r.isJoined && !(r as any).isOtherUnmapped && !r.isUnderReview).length;
  const otherKindCount    = filteredData.filter(r => r.kindGroup === 'Other' && r.isJoined && !(r as any).isOtherUnmapped && !r.isUnderReview).length;

  const linkedCount       = filteredData.filter(r => r.isJoined && !(r as any).isOtherUnmapped && !r.isUnderReview).length;
  const unlinkedCount     = filteredData.filter(r => !r.isJoined).length;
  const reviewCount       = filteredData.filter(r => r.isJoined && !( r as any).isOtherUnmapped && r.isUnderReview).length;
  const otherUnmappedCount = filteredData.filter(r => (r as any).isOtherUnmapped).length;
  
  const unmatchedCount = Math.max(0, totalSalesRows - data.length);

  const handleExportClick = () => {
    onExport({ kinds: selectedKinds, statuses: selectedStatuses });
    onOpenChange(false);
  };

  const toggleKind = (k: 'Land' | 'Building' | 'Machinery' | 'Other') => {
    setSelectedKinds(prev => prev.includes(k) ? prev.filter(item => item !== k) : [...prev, k]);
  };

  const toggleStatus = (s: 'Linked' | 'Unlinked' | 'Under Review' | 'Other/Unmapped') => {
    setSelectedStatuses(prev => prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl">
        <div className="p-8 shrink-0 bg-violet-600/5 border-b">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-violet-600/20 p-3 rounded-xl border border-violet-600/20">
                <TrendingUp className="text-violet-600 w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-3xl font-black text-foreground uppercase tracking-tight leading-none">
                    3 Year Report Export Controller
                  </DialogTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-violet-600 transition-colors outline-none">
                        <HelpCircle className="w-5 h-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl p-6">
                      <div className="space-y-3">
                        <h4 className="font-black uppercase text-[10px] tracking-widest text-violet-600">Engine Logic Overview</h4>
                        <p className="text-xs font-bold leading-relaxed text-muted-foreground uppercase">
                          The 3 Year Report joins <span className="text-foreground">Sales Data</span> with <span className="text-foreground">Assessment Rolls</span>. 
                          <br /><br />
                          Specify which <span className="text-violet-600">Classifications</span> to include in your report.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <DialogDescription className="text-base font-bold text-muted-foreground mt-2 uppercase tracking-wider">
                  Generate a filtered relational 3-year report for official reporting.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-vertical-custom p-8 space-y-10">

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-violet-600 tracking-[0.15em] flex items-center gap-2">
                <Layers className="w-4 h-4" /> Data Filters
              </h3>
              <div className="flex gap-4">
                <Button variant="link" size="sm" onClick={() => { setSelectedKinds(['Land', 'Building', 'Machinery', 'Other']); setSelectedStatuses(['Linked', 'Unlinked', 'Under Review', 'Other/Unmapped']); }} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-violet-600">Select All</Button>
                <Button variant="link" size="sm" onClick={() => { setSelectedKinds([]); setSelectedStatuses([]); }} className="text-[10px] font-black uppercase text-muted-foreground h-auto p-0 hover:text-violet-600">Clear All</Button>
              </div>
            </div>
            <Card className="p-5 bg-muted/10 border-white/5 shadow-inner rounded-2xl grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="col-span-2 text-[10px] font-black uppercase text-muted-foreground mb-[-12px]">Classifications</div>
              <div className="flex items-center gap-3">
                <Checkbox id="k-land" checked={selectedKinds.includes('Land')} onCheckedChange={() => toggleKind('Land')} />
                <Label htmlFor="k-land" className="text-xs font-bold uppercase cursor-pointer flex items-center justify-between w-full">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" /> Land</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[10px] px-2">{landCount}</Badge>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="k-bldg" checked={selectedKinds.includes('Building')} onCheckedChange={() => toggleKind('Building')} />
                <Label htmlFor="k-bldg" className="text-xs font-bold uppercase cursor-pointer flex items-center justify-between w-full">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" /> Building (Bldg.)</span>
                  <Badge className="bg-blue-500/10 text-blue-600 border-none font-black text-[10px] px-2">{buildingCount}</Badge>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="k-mach" checked={selectedKinds.includes('Machinery')} onCheckedChange={() => toggleKind('Machinery')} />
                <Label htmlFor="k-mach" className="text-xs font-bold uppercase cursor-pointer flex items-center justify-between w-full">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" /> Machinery</span>
                  <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[10px] px-2">{machineryCount}</Badge>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="k-otherkind" checked={selectedKinds.includes('Other')} onCheckedChange={() => toggleKind('Other')} />
                <Label htmlFor="k-otherkind" className="text-xs font-bold uppercase cursor-pointer flex items-center justify-between w-full">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-zinc-500 shadow-sm" /> Other</span>
                  <Badge className="bg-zinc-500/10 text-zinc-600 border-none font-black text-[10px] px-2">{otherKindCount}</Badge>
                </Label>
              </div>

              <div className="col-span-2 my-1 border-t border-white/5" />
              <div className="col-span-2 text-[10px] font-black uppercase text-muted-foreground mb-[-12px]">Record Statuses</div>
              
              <div className="flex items-center gap-3">
                <Checkbox id="s-linked" checked={selectedStatuses.includes('Linked')} onCheckedChange={() => toggleStatus('Linked')} />
                <Label htmlFor="s-linked" className="text-xs font-bold uppercase cursor-pointer flex items-center justify-between w-full">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" /> Linked</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[10px] px-2">{linkedCount}</Badge>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="s-unlinked" checked={selectedStatuses.includes('Unlinked')} onCheckedChange={() => toggleStatus('Unlinked')} />
                <Label htmlFor="s-unlinked" className="text-xs font-bold uppercase cursor-pointer flex items-center justify-between w-full">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-zinc-500 shadow-sm" /> Unlinked</span>
                  <Badge className="bg-zinc-500/10 text-zinc-600 border-none font-black text-[10px] px-2">{unlinkedCount}</Badge>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="s-review" checked={selectedStatuses.includes('Under Review')} onCheckedChange={() => toggleStatus('Under Review')} />
                <Label htmlFor="s-review" className="text-xs font-bold uppercase cursor-pointer flex items-center justify-between w-full">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" /> Under Review</span>
                  <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[10px] px-2">{reviewCount}</Badge>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="s-other" checked={selectedStatuses.includes('Other/Unmapped')} onCheckedChange={() => toggleStatus('Other/Unmapped')} />
                <Label htmlFor="s-other" className="text-xs font-bold uppercase cursor-pointer flex items-center justify-between w-full">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" /> Other / Unmapped</span>
                  <Badge className="bg-purple-500/10 text-purple-600 border-none font-black text-[10px] px-2">{otherUnmappedCount}</Badge>
                </Label>
              </div>
            </Card>
          </section>

          {/* Notice about blank Sales Value columns */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-violet-500/5 border border-violet-500/10 shadow-sm">
            <AlertCircle className="w-6 h-6 text-violet-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-muted-foreground leading-relaxed uppercase tracking-wider">
              Sales Value columns (Lowest, Median, Highest) will be exported as <span className="text-violet-500">blank cells</span> for
              manual entry in the printed report. <br/><span className="text-[10px] text-muted-foreground/70">{unmatchedCount} unlinked rows were skipped.</span>
            </p>
          </div>
        </div>

        <DialogFooter className="p-8 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Report Payload:</span>
            <Badge className="font-mono text-xl font-black px-6 py-2 bg-background text-foreground shadow-lg border-white/5">
                {filteredData.length.toLocaleString()} Rows
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-xs tracking-widest px-8 h-12 hover:bg-muted">Discard</Button>
            <Button 
              onClick={handleExportClick} 
              disabled={filteredData.length === 0}
              className="bg-violet-600 hover:bg-violet-700 text-white font-black uppercase text-xs tracking-widest px-12 h-12 shadow-2xl shadow-violet-500/20"
            >
              <FileDown className="w-4 h-4 mr-2" /> Generate Report
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
