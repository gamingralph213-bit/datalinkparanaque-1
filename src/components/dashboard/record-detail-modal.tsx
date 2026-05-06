"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LandRecord, validateRecord, ValidationError } from '@/lib/processor';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, Edit3, Archive, RotateCcw, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableItemProps {
  label: string;
  field: keyof LandRecord;
  value: any;
  isMono?: boolean;
  type?: string;
  errors?: ValidationError[];
  onChange: (field: keyof LandRecord, value: any) => void;
}

const EditableItem = ({ 
  label, 
  field, 
  value, 
  isMono = false, 
  type = "text", 
  errors, 
  onChange 
}: EditableItemProps) => {
  const hasError = errors?.some(e => e.field === field);
  
  const displayValue = (type === "number" && value === 0) ? "" : (value ?? "");

  return (
    <div className="space-y-2">
      <label className="text-[12px] font-black text-muted-foreground uppercase tracking-widest leading-none flex items-center gap-1.5">
        {label}
        {hasError && <AlertTriangle className="w-3 h-3 text-red-500" />}
      </label>
      <Input 
        type={type}
        value={displayValue}
        onChange={(e) => onChange(field, e.target.value)}
        className={cn(
          "h-10 text-sm font-bold",
          isMono && "font-mono",
          hasError && "border-red-500 bg-red-500/5 focus-visible:ring-red-500"
        )}
      />
      {hasError && (
        <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">
          {errors?.find(e => e.field === field)?.message}
        </p>
      )}
    </div>
  );
};

const StaticItem = ({ label, value, isMono = false }: { label: string; value: string; isMono?: boolean }) => (
  <div className="space-y-1">
    <p className="text-[12px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
    <p className={cn("text-sm font-black truncate", isMono && "font-mono")}>{value}</p>
  </div>
);

interface RecordDetailModalProps {
  record: LandRecord | null;
  comparisonRecord?: LandRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedRecord: LandRecord) => void;
  onArchive?: (record: LandRecord) => void;
  onUnarchive?: (record: LandRecord) => void;
}

export function RecordDetailModal({ record, comparisonRecord, open, onOpenChange, onSave, onArchive, onUnarchive }: RecordDetailModalProps) {
  const [editedRecord, setEditedRecord] = useState<LandRecord | null>(null);

  useEffect(() => {
    if (record) {
      setEditedRecord({ ...record });
    }
  }, [record]);

  if (!editedRecord) return null;

  const handleInputChange = (field: keyof LandRecord, value: any) => {
    if (!editedRecord) return;
    
    let processedValue = value;
    if (field === 'landArea' || field === 'unitValue' || field === 'marketValue') {
      processedValue = value === "" ? 0 : Number(value);
    }

    const updated = { ...editedRecord, [field]: processedValue };
    
    if (field === 'landArea' || field === 'unitValue') {
      updated.marketValue = (Number(updated.landArea) || 0) * (Number(updated.unitValue) || 0);
    }

    const errors = validateRecord(updated);
    updated.errors = errors;
    updated.isValid = errors.length === 0;

    setEditedRecord(updated);
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '---';
    return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const getStatusBadge = () => {
    if (!editedRecord.isValid) {
      if (editedRecord.landArea === 0 && editedRecord.pin && editedRecord.arpNo) {
        return (
          <Badge variant="destructive" className="text-xs h-6 px-3 font-black uppercase tracking-tighter flex items-center gap-1 bg-red-600">
            <AlertTriangle className="w-3 h-3" /> ERROR
          </Badge>
        );
      }
      return (
        <Badge variant="destructive" className="text-xs h-6 px-3 font-black uppercase tracking-tighter">
          INVALID
        </Badge>
      );
    }
    if (editedRecord.isCleanup || editedRecord.isManualArchive) {
      return (
        <Badge variant="outline" className="text-xs h-6 px-3 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
          {editedRecord.isManualArchive ? 'ARCHIVED' : (editedRecord.cleanupReason || 'CLEANUP')}
        </Badge>
      );
    }
    if (editedRecord.isDuplicate) {
      return <Badge variant="destructive" className="text-xs h-6 px-3 font-black uppercase tracking-tighter">DUPLICATE</Badge>;
    }
    return (
      <Badge variant="secondary" className="text-xs h-6 px-3 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
        VALID
      </Badge>
    );
  };

  const isZeroArea = editedRecord.landArea === 0 && editedRecord.pin && editedRecord.arpNo;
  const isInArchive = editedRecord.isManualArchive || editedRecord.isCleanup || editedRecord.isDuplicate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card/90 backdrop-blur-xl border-white/10 p-8 shadow-2xl flex flex-col gap-6">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent uppercase tracking-tight flex items-center gap-2">
                <Edit3 className="w-6 h-6 text-primary" /> Property Record Editor
              </DialogTitle>
              <DialogDescription className="text-sm font-bold">
                Correction & Validation for Account: <span className="font-black text-foreground underline decoration-primary/30 underline-offset-4">{record?.acctName}</span>
              </DialogDescription>
            </div>
            <div>{getStatusBadge()}</div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-vertical-custom space-y-6">
            {comparisonRecord && editedRecord.statusLabel === 'DUPLICATE' && (
              <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase text-amber-700 flex items-center gap-2 tracking-widest">
                    <ArrowRightLeft className="w-4 h-4" /> Duplicate Conflict Analysis
                  </h4>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 font-black uppercase text-[9px] tracking-widest h-5 px-3 shadow-sm">
                    Diagnostic Report
                  </Badge>
                </div>
                <p className="text-[11px] font-bold text-amber-600/80 leading-relaxed uppercase">
                  The engine identified a duplicate PIN. Below is a comparison between this archived row and the prioritized result.
                </p>
                
                <div className="grid grid-cols-2 gap-8 bg-background/40 p-5 rounded-2xl border border-white/10">
                   <div className="space-y-5">
                      <div className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] border-b pb-2 mb-4">Archived Duplicate (This Row)</div>
                      <StaticItem label="ARP No#" value={editedRecord.arpNo} isMono />
                      <StaticItem label="Effectivity" value={editedRecord.date || '---'} />
                      <StaticItem label="Market Value" value={formatCurrency(editedRecord.marketValue)} isMono />
                   </div>
                   <div className="space-y-5 border-l border-white/10 pl-8">
                      <div className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.2em] border-b border-emerald-500/20 pb-2 mb-4 flex items-center gap-2">
                        Active Priority (Chosen) <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <StaticItem label="ARP No#" value={comparisonRecord.arpNo} isMono />
                      <StaticItem label="Effectivity" value={comparisonRecord.date || '---'} />
                      <StaticItem label="Market Value" value={formatCurrency(comparisonRecord.marketValue)} isMono />
                   </div>
                </div>
              </div>
            )}

            {!editedRecord.isValid && (
              <div className={cn(
                "p-4 rounded-xl border flex items-start gap-4",
                isZeroArea ? "bg-red-500/10 border-red-500/30" : "bg-red-500/10 border-red-500/20"
              )}>
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                <div className="space-y-1">
                  <h5 className="text-sm font-black text-red-700 uppercase">
                    {isZeroArea ? "Critical: Land Area is Missing (0.00)" : "Data Integrity Issues Detected"}
                  </h5>
                  <ul className="list-disc list-inside space-y-1">
                    {editedRecord.errors?.map((err, i) => (
                      <li key={i} className="text-xs font-bold text-red-600/80">{err.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-2xl bg-muted/30 border shadow-inner space-y-6">
                 <h4 className="text-[12px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                   <div className="w-1.5 h-3.5 bg-primary rounded-full" /> Primary Identity
                 </h4>
                 <div className="grid grid-cols-1 gap-4">
                    <EditableItem label="Account Name" field="acctName" value={editedRecord.acctName} errors={editedRecord.errors} onChange={handleInputChange} />
                    <div className="grid grid-cols-2 gap-4">
                      <EditableItem label="PIN Number" field="pin" value={editedRecord.pin} errors={editedRecord.errors} onChange={handleInputChange} isMono />
                      <EditableItem label="ARP No#" field="arpNo" value={editedRecord.arpNo} errors={editedRecord.errors} onChange={handleInputChange} isMono />
                    </div>
                    {editedRecord.newArpNo && editedRecord.newArpNo !== '---' && (
                      <StaticItem label="Generated New ARP No#" value={editedRecord.newArpNo} isMono />
                    )}
                    <EditableItem label="Address" field="address" value={editedRecord.address} errors={editedRecord.errors} onChange={handleInputChange} />
                    <div className="grid grid-cols-2 gap-4">
                      <EditableItem label="Date" field="date" value={editedRecord.date} errors={editedRecord.errors} onChange={handleInputChange} />
                      <EditableItem label="Update Code" field="update" value={editedRecord.update} errors={editedRecord.errors} onChange={handleInputChange} />
                    </div>
                 </div>
              </div>

              <div className="p-6 rounded-2xl bg-muted/30 border shadow-inner space-y-6">
                <h4 className="text-[12px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-primary rounded-full" /> Financial Data
                </h4>
                <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className={cn("rounded-xl transition-all", isZeroArea && "bg-red-500/5 p-2 ring-1 ring-red-500/30")}>
                        <EditableItem label="Land Area (sqm)" field="landArea" value={editedRecord.landArea} errors={editedRecord.errors} onChange={handleInputChange} isMono type="number" />
                      </div>
                      <EditableItem label="Unit Value (₱)" field="unitValue" value={editedRecord.unitValue} errors={editedRecord.errors} onChange={handleInputChange} isMono type="number" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <StaticItem label="Location" value={editedRecord.location || 'Pending Calibration'} />
                      <StaticItem label="Actual Use (AU)" value={editedRecord.au || '---'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="space-y-1">
                        <p className="text-[12px] font-black text-muted-foreground uppercase tracking-widest">Market Value</p>
                        <p className="text-lg font-black text-emerald-600 font-mono">{formatCurrency(editedRecord.marketValue)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[12px] font-black text-muted-foreground uppercase tracking-widest">Assessed Value</p>
                        <p className="text-lg font-black text-blue-600 font-mono">{formatCurrency(editedRecord.assessedValue)}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-[12px] font-black text-primary uppercase tracking-widest mb-1">Yearly Tax Estimate</p>
                      <p className="text-2xl font-black font-mono tracking-tighter">{formatCurrency(editedRecord.yearlyTax)}</p>
                    </div>
                </div>
              </div>
            </div>
        </div>

        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            {isInArchive ? (
              <Button 
                variant="outline" 
                onClick={() => onUnarchive?.(editedRecord)} 
                className="font-black uppercase text-[10px] h-10 px-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Restore Record
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => onArchive?.(editedRecord)} 
                className="font-black uppercase text-[10px] h-10 px-4 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <Archive className="w-3.5 h-3.5 mr-2" /> Archive Record
              </Button>
            )}
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="font-black uppercase text-[11px] h-11 px-6 flex-1 sm:flex-none">Discard</Button>
            <Button onClick={() => onSave?.(editedRecord)} className="bg-primary hover:bg-emerald-800 font-black uppercase text-[11px] h-11 px-8 shadow-lg gap-2 flex-1 sm:flex-none">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
