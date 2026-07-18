
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LandRecord, validateRecord, ValidationError, getModeOfConveyance } from '@/lib/processor';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, Save, Edit3, Archive, RotateCcw, ArrowRightLeft,
  CheckCircle2, Link2, Database, Tag, HardHat, TrendingUp,
  MapPin, Unlink2, AlertCircle, DollarSign, Building2, BarChart3, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditableItemProps {
  label: string;
  field: keyof LandRecord;
  value: any;
  isMono?: boolean;
  type?: string;
  errors?: ValidationError[];
  onChange: (field: keyof LandRecord, value: any) => void;
}

const EditableItem = ({ label, field, value, isMono = false, type = "text", errors, onChange }: EditableItemProps) => {
  const hasError = errors?.some(e => e.field === field);
  const displayValue = (type === "number" && value === 0) ? "" : (value ?? "");
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none flex items-center gap-1">
        {label}
        {hasError && <AlertTriangle className="w-3 h-3 text-red-500" />}
      </label>
      <Input
        type={type}
        value={displayValue}
        onChange={(e) => onChange(field, e.target.value)}
        className={cn("h-9 text-xs font-bold", isMono && "font-mono", hasError && "border-red-500 bg-red-500/5 focus-visible:ring-red-500")}
      />
      {hasError && <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">{errors?.find(e => e.field === field)?.message}</p>}
    </div>
  );
};

/** Generic read-only display item */
const StaticItem = ({ label, value, isMono = false, subValue, accent }: { label: string; value: string; isMono?: boolean; subValue?: string; accent?: string }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
    <p className={cn("text-xs font-black truncate", isMono && "font-mono", accent)}>{value}</p>
    {subValue && <p className="text-[9px] font-bold text-muted-foreground/50 uppercase">{subValue}</p>}
  </div>
);

/** Generic currency formatter */
const fmtCurrency = (value?: number | string) => {
  if (value === undefined || value === null) return '---';
  if (typeof value === 'string') return value;
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ─────────────────────────────────────────────────────────────────────────────

interface RecordDetailModalProps {
  record: LandRecord | null;
  comparisonRecord?: LandRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedRecord: LandRecord) => void;
  onArchive?: (record: LandRecord) => void;
  onUnarchive?: (record: LandRecord) => void;
  onDelete?: (record: LandRecord) => void;
  workflowMode?: string;
}

export function RecordDetailModal({ record, comparisonRecord, open, onOpenChange, onSave, onArchive, onUnarchive, onDelete, workflowMode }: RecordDetailModalProps) {
  const [editedRecord, setEditedRecord] = useState<LandRecord | null>(null);

  useEffect(() => {
    if (record) setEditedRecord({ ...record });
  }, [record]);

  if (!editedRecord) return null;

  const r = editedRecord as any;
  const isAbstract   = workflowMode === 'abstract';
  const isPermit     = workflowMode === 'building-permit';
  const isThreeYear  = workflowMode === 'three-year-report';
  const isSpecial    = isAbstract || isPermit || isThreeYear;

  // ── Field change handler ──────────────────────────────────────────
  const handleChange = (field: keyof LandRecord, value: any) => {
    let v = value;
    if (field === 'landArea' || field === 'unitValue' || field === 'marketValue' || field === 'estimatedCost') {
      v = value === "" ? 0 : Number(value);
    }
    const updated = { ...editedRecord, [field]: v };
    if (field === 'landArea' || field === 'unitValue') {
      updated.marketValue = (Number(updated.landArea) || 0) * (Number(updated.unitValue) || 0);
    }
    const errors = validateRecord(updated);
    updated.errors = errors;
    updated.isValid = errors.length === 0;
    setEditedRecord(updated);
  };

  /** Generic field change for fields not in LandRecord keyof (e.g. permit extras stored as `any`) */
  const handleAnyChange = (field: string, value: any) => {
    setEditedRecord(prev => prev ? { ...prev, [field]: value } : prev);
  };

  // ── Status badge ──────────────────────────────────────────────────
  const getStatusBadge = () => {
    if (isPermit) {
      if (r.isUnderReview) return <Badge className="bg-orange-500 text-white font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5"><AlertCircle className="w-3 h-3" /> Under Review</Badge>;
      if (r.isPotentialMatch) return <Badge className="bg-amber-500 text-white font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5"><AlertCircle className="w-3 h-3" /> Potential Match</Badge>;
      return r.isJoined
        ? <Badge className="bg-emerald-600 text-white font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5"><Link2 className="w-3 h-3" /> Matched</Badge>
        : <Badge variant="destructive" className="font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5"><Unlink2 className="w-3 h-3" /> Unlinked</Badge>;
    }
    if (isThreeYear) {
      if (r.isUnderReview) return <Badge className="bg-orange-500 text-white font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5"><AlertCircle className="w-3 h-3" /> Under Review</Badge>;
      return r.isJoined
        ? <Badge className="bg-violet-600 text-white font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5"><Link2 className="w-3 h-3" /> Linked</Badge>
        : <Badge variant="destructive" className="font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5"><Unlink2 className="w-3 h-3" /> Unlinked</Badge>;
    }
    if (isAbstract) {
      return r.isJoined
        ? <Badge className="bg-emerald-600 text-white font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5"><Link2 className="w-3 h-3" /> Relational Match</Badge>
        : <Badge variant="destructive" className="font-black uppercase text-[9px] h-5 px-2.5 tracking-widest opacity-60">Unlinked</Badge>;
    }
    if (!editedRecord.isValid) {
      if (editedRecord.landArea === 0 && editedRecord.pin && editedRecord.arpNo)
        return <Badge variant="destructive" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter flex items-center gap-1 bg-red-600"><AlertTriangle className="w-3 h-3" /> ERROR</Badge>;
      return <Badge variant="destructive" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter">INVALID</Badge>;
    }
    if (editedRecord.isCleanup || editedRecord.isManualArchive)
      return <Badge variant="outline" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200">{editedRecord.isManualArchive ? 'ARCHIVED' : (editedRecord.cleanupReason || 'CLEANUP')}</Badge>;
    if (editedRecord.isDuplicate)
      return <Badge variant="destructive" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter">DUPLICATE</Badge>;
    return <Badge variant="secondary" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200">VALID</Badge>;
  };

  const isZeroArea = editedRecord.landArea === 0 && editedRecord.pin && editedRecord.arpNo;
  const isInArchive = editedRecord.isManualArchive || editedRecord.isCleanup || editedRecord.isDuplicate;

  // ── Title / gradient per mode ─────────────────────────────────────
  const titleGradient = isPermit ? 'from-orange-500 to-amber-400' : isThreeYear ? 'from-violet-600 to-purple-400' : 'from-blue-600 to-emerald-500';
  const titleIcon = isPermit ? <HardHat className="w-5 h-5 text-orange-500" /> : isThreeYear ? <TrendingUp className="w-5 h-5 text-violet-500" /> : <Edit3 className="w-5 h-5 text-primary" />;
  const titleText = isPermit ? 'Building Permit Editor' : isThreeYear ? '3-Year Report Editor' : isAbstract ? 'Relational Audit Explorer' : 'Property Record Editor';
  const descLabel = isPermit ? 'Permit No.' : isThreeYear ? 'Account' : isAbstract ? 'Abstract Transaction' : 'Correction & Validation';
  const descValue = isPermit ? (r.buildingPermitNo || '---') : (record?.acctName || '---');

  // ── Section header helper ─────────────────────────────────────────
  const SectionTitle = ({ icon: Icon, label, color }: { icon: any; label: string; color: string }) => (
    <h4 className={cn("text-[10px] font-black uppercase flex items-center gap-2 tracking-widest leading-none", color)}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </h4>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] bg-card/95 backdrop-blur-xl border-white/10 p-0 shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────── */}
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className={cn("text-xl font-black bg-gradient-to-r bg-clip-text text-transparent uppercase tracking-tight flex items-center gap-2 leading-none", titleGradient)}>
                {titleIcon} {titleText}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold">
                <span className="text-muted-foreground">{descLabel}: </span>
                <span className="font-black text-foreground underline decoration-primary/30 underline-offset-4">{descValue}</span>
              </DialogDescription>
            </div>
            <div>{getStatusBadge()}</div>
          </div>
        </DialogHeader>

        {/* ── Body ───────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">

            {/* ════ ABSTRACT panel ══════════════════════════════════ */}
            {isAbstract && (
              <div className="p-4 rounded-xl bg-blue-600/5 border border-blue-600/20 space-y-4 shadow-inner">
                <SectionTitle icon={ArrowRightLeft} label="Sequential Ownership Analysis" color="text-blue-700" />
                <div className="grid grid-cols-3 gap-4 bg-background/40 p-4 rounded-xl border border-white/10">
                  <div className="space-y-3">
                    <div className="text-[8px] font-black uppercase text-red-600 tracking-[0.2em] border-b border-red-500/20 pb-1 mb-2">Ownership Transfer From</div>
                    <StaticItem label="Previous Owner" value={r.cancelledOwner || '---'} />
                    <StaticItem label="Previous Title No." value={r.cancelledTctNo || '---'} isMono />
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRightLeft className="w-6 h-6 text-blue-600/40" />
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{getModeOfConveyance(editedRecord.update, editedRecord.acctName)}</span>
                    </div>
                  </div>
                  <div className="space-y-3 border-l border-white/10 pl-4">
                    <div className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] border-b border-emerald-500/20 pb-1 mb-2 flex items-center gap-1">Ownership Transfer To <CheckCircle2 className="w-2.5 h-2.5" /></div>
                    <StaticItem label="New Owner (Account)" value={editedRecord.acctName || '---'} />
                    <StaticItem label="New Title No." value={r.rollTctNo || '---'} isMono subValue="Assessment Roll Match" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 pt-3 border-t border-blue-600/10">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Tag className="w-2.5 h-2.5 text-emerald-600" /> Consideration</p>
                    <p className="text-sm font-black font-mono text-emerald-600">{fmtCurrency(r.sellingPrice)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Database className="w-2.5 h-2.5 text-blue-600" /> Area</p>
                    <p className="text-sm font-black font-mono">{(editedRecord.landArea || 0).toLocaleString()} sqm</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Notarial Date</p>
                    <p className="text-sm font-black uppercase">{r.notarialDate || '---'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Doc File No.</p>
                    <p className="text-sm font-black uppercase">{r.docFileNo || '---'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ════ BUILDING PERMIT panel ═══════════════════════════ */}
            {isPermit && (
              <div className="space-y-4">
                {/* Permit identity (editable) */}
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-4 shadow-inner">
                  <SectionTitle icon={HardHat} label="Permit Details" color="text-orange-700" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Permit No.</label>
                      <Input value={r.buildingPermitNo || ''} onChange={e => handleAnyChange('buildingPermitNo', e.target.value)} className="h-9 text-xs font-bold font-mono text-orange-600" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date Issued</label>
                      <Input value={r.dateIssued || ''} onChange={e => handleAnyChange('dateIssued', e.target.value)} className="h-9 text-xs font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Barangay / Owner Name</label>
                      <Input value={r.barangayName || ''} onChange={e => handleAnyChange('barangayName', e.target.value)} className="h-9 text-xs font-bold uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Use of Occupancy</label>
                      <Input value={r.useOfOccupancy || ''} onChange={e => handleAnyChange('useOfOccupancy', e.target.value)} className="h-9 text-xs font-bold text-blue-600 uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Property Location</label>
                      <Input value={editedRecord.location || ''} onChange={e => handleChange('location', e.target.value)} className="h-9 text-xs font-bold uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><DollarSign className="w-2.5 h-2.5 text-emerald-600" /> Estimated Cost (₱)</label>
                      <Input type="number" value={r.estimatedCost || ''} onChange={e => handleAnyChange('estimatedCost', e.target.value === '' ? 0 : Number(e.target.value))} className="h-9 text-xs font-bold font-mono text-emerald-600" />
                    </div>
                  </div>
                </div>

                {/* Assessment Roll match (read-only derived fields) */}
                <div className={cn("p-4 rounded-xl border space-y-4 shadow-inner", r.isJoined ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/20 border-white/10 opacity-60")}>
                  <SectionTitle icon={Database} label={r.isJoined ? "Assessment Roll Match" : "Assessment Roll Match — No match found"} color={r.isJoined ? "text-emerald-700" : "text-muted-foreground"} />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-background/40 p-4 rounded-xl border border-white/10">
                    <StaticItem label="ARP / TDN (Roll)" value={r.rollArp || '---'} isMono accent={r.isJoined ? "text-emerald-700" : ""} />
                    <StaticItem label="Floor Area (Roll)" value={r.rollArea ? `${Number(r.rollArea).toLocaleString()} sqm` : '---'} />
                    <StaticItem label="Class (Roll)" value={r.rollClass || '---'} />
                    <StaticItem label="Owner (Roll)" value={r.rollOwner || '---'} />
                  </div>
                  {r.rollAddress && <div className="px-4 pb-1"><StaticItem label="Roll Address" value={r.rollAddress} /></div>}
                </div>
              </div>
            )}

            {/* ════ THREE YEAR REPORT panel ═════════════════════════ */}
            {isThreeYear && (
              <div className="space-y-4">
                {/* Record identity (editable) */}
                <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-4 shadow-inner">
                  <SectionTitle icon={TrendingUp} label="Record Identity" color="text-violet-700" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Building2 className="w-2.5 h-2.5 text-violet-500" /> Name of New Owner</label>
                      <Input value={editedRecord.acctName || ''} onChange={e => handleChange('acctName', e.target.value)} className="h-9 text-xs font-bold uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ARPN / Tax Dec. No.</label>
                      <Input value={editedRecord.arpNo || ''} onChange={e => handleChange('arpNo', e.target.value)} className="h-9 text-xs font-bold font-mono text-violet-700" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-violet-500" /> Location</label>
                      <Input value={r.rollAddress || editedRecord.location || ''} onChange={e => handleChange('location', e.target.value)} className="h-9 text-xs font-bold uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Classification</label>
                      <Input value={r.salesClassification || ''} onChange={e => handleAnyChange('salesClassification', e.target.value)} className="h-9 text-xs font-bold uppercase text-blue-600" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Area (sqm)</label>
                      <Input type="number" value={editedRecord.landArea || ''} onChange={e => handleChange('landArea', e.target.value)} className="h-9 text-xs font-bold font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><DollarSign className="w-2.5 h-2.5 text-emerald-600" /> Selling Price</label>
                      <Input type="number" value={r.sellingPrice || ''} onChange={e => handleAnyChange('sellingPrice', e.target.value === '' ? 0 : Number(e.target.value))} className="h-9 text-xs font-bold font-mono text-emerald-600" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sales Value (Peso/Sqm)</label>
                      <Input type="number" value={r.salesValue || ''} onChange={e => handleAnyChange('salesValue', e.target.value === '' ? 0 : Number(e.target.value))} className="h-9 text-xs font-bold font-mono text-emerald-600" />
                    </div>
                    <StaticItem label="Kind of Property (Roll)" value={
                      !r.isJoined ? '---' : r.kindGroup === 'Land' ? 'Land' : r.kindGroup === 'Building' ? 'Building' : r.kind || 'Other'
                    } accent="text-emerald-700 text-sm font-black" />
                  </div>
                </div>

                {/* Sales values (editable) */}
                <div className={cn("p-4 rounded-xl border space-y-4 shadow-inner", r.isJoined ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/20 border-white/10")}>
                  <SectionTitle icon={BarChart3} label={r.isJoined ? "Sales Values" : "Sales Values — No roll match"} color={r.isJoined ? "text-emerald-700" : "text-muted-foreground"} />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-background/60 border border-white/10 space-y-2">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Lowest (10)</p>
                      <Input type="number" value={r.saleLow || ''} onChange={e => handleAnyChange('saleLow', e.target.value === '' ? 0 : Number(e.target.value))} className="h-9 text-xs font-bold font-mono text-emerald-600 text-center" placeholder="0.00" />
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-500/20 space-y-2">
                      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest text-center">Median (11)</p>
                      <Input type="number" value={r.saleMedian || ''} onChange={e => handleAnyChange('saleMedian', e.target.value === '' ? 0 : Number(e.target.value))} className="h-9 text-xs font-bold font-mono text-emerald-700 text-center border-emerald-300 focus-visible:ring-emerald-500" placeholder="0.00" />
                    </div>
                    <div className="p-3 rounded-xl bg-background/60 border border-white/10 space-y-2">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Highest (12)</p>
                      <Input type="number" value={r.saleHigh || ''} onChange={e => handleAnyChange('saleHigh', e.target.value === '' ? 0 : Number(e.target.value))} className="h-9 text-xs font-bold font-mono text-emerald-600 text-center" placeholder="0.00" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════ Duplicate comparison (standard only) ════════════ */}
            {comparisonRecord && editedRecord.statusLabel === 'DUPLICATE' && !isSpecial && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3 shadow-inner">
                <SectionTitle icon={ArrowRightLeft} label="Duplicate Conflict Analysis" color="text-amber-700" />
                <div className="grid grid-cols-2 gap-6 bg-background/40 p-4 rounded-xl border border-white/10">
                  <div className="space-y-3">
                    <div className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] border-b pb-1 mb-2">Archived (This Row)</div>
                    <StaticItem label="ARP No#" value={editedRecord.arpNo} isMono />
                    <StaticItem label="Market Value" value={fmtCurrency(editedRecord.marketValue)} isMono />
                  </div>
                  <div className="space-y-3 border-l border-white/10 pl-6">
                    <div className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] border-b border-emerald-500/20 pb-1 mb-2 flex items-center gap-1">Priority (Active) <CheckCircle2 className="w-2.5 h-2.5" /></div>
                    <StaticItem label="ARP No#" value={comparisonRecord.arpNo} isMono />
                    <StaticItem label="Market Value" value={fmtCurrency(comparisonRecord.marketValue)} isMono />
                  </div>
                </div>
              </div>
            )}

            {/* ════ Editable fields (standard + abstract) ═══════════ */}
            {!isPermit && !isThreeYear && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-muted/30 border shadow-inner space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 leading-none">
                    <div className="w-1 h-3 bg-primary rounded-full" /> {isAbstract ? "Identification" : "Primary Identity"}
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <EditableItem label="Account Name" field="acctName" value={editedRecord.acctName} errors={editedRecord.errors} onChange={handleChange} />
                    <div className="grid grid-cols-2 gap-3">
                      <EditableItem label="PIN Number" field="pin" value={editedRecord.pin} errors={editedRecord.errors} onChange={handleChange} isMono />
                      <EditableItem label="ARP No#" field="arpNo" value={editedRecord.arpNo} errors={editedRecord.errors} onChange={handleChange} isMono />
                    </div>
                    <EditableItem label="Address" field="address" value={editedRecord.address} errors={editedRecord.errors} onChange={handleChange} />
                    <div className="grid grid-cols-2 gap-3">
                      <EditableItem label="Date" field="date" value={editedRecord.date} errors={editedRecord.errors} onChange={handleChange} />
                      <EditableItem label="Update Code" field="update" value={editedRecord.update} errors={editedRecord.errors} onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-muted/30 border shadow-inner space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 leading-none">
                    <div className="w-1 h-3 bg-primary rounded-full" /> {isAbstract ? "Assessment" : "Financial Data"}
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={cn("rounded-lg transition-all", isZeroArea && "bg-red-500/5 p-1.5 ring-1 ring-red-500/20")}>
                        <EditableItem label="Land Area (sqm)" field="landArea" value={editedRecord.landArea} errors={editedRecord.errors} onChange={handleChange} isMono type="number" />
                      </div>
                      <EditableItem label="Unit Value (₱)" field="unitValue" value={editedRecord.unitValue} errors={editedRecord.errors} onChange={handleChange} isMono type="number" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                      <StaticItem label="Location" value={editedRecord.location || 'Pending Calibration'} />
                      <StaticItem label="Actual Use (AU)" value={editedRecord.au || '---'} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Market Value</p>
                        <p className="text-sm font-black text-emerald-600 font-mono">{fmtCurrency(editedRecord.marketValue)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assessed Value</p>
                        <p className="text-sm font-black text-blue-600 font-mono">{fmtCurrency(editedRecord.assessedValue)}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Yearly Tax Estimate</p>
                      <p className="text-xl font-black font-mono tracking-tighter">{fmtCurrency(editedRecord.yearlyTax)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="p-6 border-t bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            {!isSpecial && (
              isInArchive
                ? <Button variant="outline" onClick={() => onUnarchive?.(editedRecord)} className="font-black uppercase text-[9px] h-9 px-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50"><RotateCcw className="w-3 h-3 mr-1.5" /> Restore Record</Button>
                : <Button variant="outline" onClick={() => onArchive?.(editedRecord)} className="font-black uppercase text-[9px] h-9 px-3 text-orange-600 border-orange-200 hover:bg-orange-50"><Archive className="w-3 h-3 mr-1.5" /> Archive Record</Button>
            )}
            {onDelete && (
              <Button variant="outline" onClick={() => onDelete(editedRecord)} className="font-black uppercase text-[9px] h-9 px-3 text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-3 h-3 mr-1.5" /> Delete Record</Button>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="font-black uppercase text-[10px] h-10 px-5 flex-1 sm:flex-none">Discard</Button>
            <Button
              onClick={() => onSave?.(editedRecord)}
              className={cn(
                "font-black uppercase text-[10px] h-10 px-6 shadow-lg gap-2 flex-1 sm:flex-none text-white",
                isPermit ? "bg-orange-500 hover:bg-orange-700" : isThreeYear ? "bg-violet-600 hover:bg-violet-800" : "bg-primary hover:bg-emerald-800"
              )}
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
