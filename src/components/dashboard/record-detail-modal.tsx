
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
import { AlertTriangle, Save, Edit3, Archive, RotateCcw, ArrowRightLeft, CheckCircle2, Link2, Database, Tag } from 'lucide-react';
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
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none flex items-center gap-1">
        {label}
        {hasError && <AlertTriangle className="w-3 h-3 text-red-500" />}
      </label>
      <Input 
        type={type}
        value={displayValue}
        onChange={(e) => onChange(field, e.target.value)}
        className={cn(
          "h-9 text-xs font-bold",
          isMono && "font-mono",
          hasError && "border-red-500 bg-red-500/5 focus-visible:ring-red-500"
        )}
      />
      {hasError && (
        <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">
          {errors?.find(e => e.field === field)?.message}
        </p>
      )}
    </div>
  );
};

const StaticItem = ({ label, value, isMono = false, subValue }: { label: string; value: string; isMono?: boolean, subValue?: string }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
    <p className={cn("text-xs font-black truncate", isMono && "font-mono")}>{value}</p>
    {subValue && <p className="text-[9px] font-bold text-muted-foreground/50 uppercase">{subValue}</p>}
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
  workflowMode?: string;
}

export function RecordDetailModal({ record, comparisonRecord, open, onOpenChange, onSave, onArchive, onUnarchive, workflowMode }: RecordDetailModalProps) {
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

  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return '---';
    if (typeof value === 'string') return value;
    return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const getStatusBadge = () => {
    if (workflowMode === 'abstract') {
      const isJoined = (editedRecord as any).isJoined;
      return isJoined ? (
        <Badge className="bg-emerald-600 text-white font-black uppercase text-[9px] h-5 px-2.5 tracking-widest gap-1.5">
          <Link2 className="w-3 h-3" /> Relational Match
        </Badge>
      ) : (
        <Badge variant="destructive" className="font-black uppercase text-[9px] h-5 px-2.5 tracking-widest opacity-60">
          Unlinked
        </Badge>
      );
    }

    if (!editedRecord.isValid) {
      if (editedRecord.landArea === 0 && editedRecord.pin && editedRecord.arpNo) {
        return (
          <Badge variant="destructive" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter flex items-center gap-1 bg-red-600">
            <AlertTriangle className="w-3 h-3" /> ERROR
          </Badge>
        );
      }
      return (
        <Badge variant="destructive" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter">
          INVALID
        </Badge>
      );
    }
    if (editedRecord.isCleanup || editedRecord.isManualArchive) {
      return (
        <Badge variant="outline" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200">
          {editedRecord.isManualArchive ? 'ARCHIVED' : (editedRecord.cleanupReason || 'CLEANUP')}
        </Badge>
      );
    }
    if (editedRecord.isDuplicate) {
      return <Badge variant="destructive" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter">DUPLICATE</Badge>;
    }
    return (
      <Badge variant="secondary" className="text-[10px] h-5 px-2 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200">
        VALID
      </Badge>
    );
  };

  const isZeroArea = editedRecord.landArea === 0 && editedRecord.pin && editedRecord.arpNo;
  const isInArchive = editedRecord.isManualArchive || editedRecord.isCleanup || editedRecord.isDuplicate;
  const isAbstract = workflowMode === 'abstract';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] bg-card/95 backdrop-blur-xl border-white/10 p-0 shadow-2xl flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent uppercase tracking-tight flex items-center gap-2 leading-none">
                <Edit3 className="w-5 h-5 text-primary" /> {isAbstract ? "Relational Audit Explorer" : "Property Record Editor"}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold">
                {isAbstract ? "Abstract Transaction Details: " : "Correction & Validation: "} 
                <span className="font-black text-foreground underline decoration-primary/30 underline-offset-4">{record?.acctName}</span>
              </DialogDescription>
            </div>
            <div>{getStatusBadge()}</div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
              {isAbstract && (
                <div className="p-4 rounded-xl bg-blue-600/5 border border-blue-600/20 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-blue-700 flex items-center gap-2 tracking-widest">
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Sequential Ownership Analysis
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 bg-background/40 p-4 rounded-xl border border-white/10">
                     <div className="space-y-3">
                        <div className="text-[8px] font-black uppercase text-red-600 tracking-[0.2em] border-b border-red-500/20 pb-1 mb-2">Ownership Transfer From</div>
                        <StaticItem label="Previous Owner" value={(editedRecord as any).cancelledOwner || '---'} />
                        <StaticItem label="Previous Title No." value={(editedRecord as any).cancelledTctNo || '---'} isMono />
                     </div>
                     <div className="flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1">
                          <ArrowRightLeft className="w-6 h-6 text-blue-600/40" />
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{getModeOfConveyance(editedRecord.update, editedRecord.acctName)}</span>
                        </div>
                     </div>
                     <div className="space-y-3 border-l border-white/10 pl-4">
                        <div className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] border-b border-emerald-500/20 pb-1 mb-2 flex items-center gap-1">
                          Ownership Transfer To <CheckCircle2 className="w-2.5 h-2.5" />
                        </div>
                        <StaticItem label="New Owner (Account)" value={editedRecord.acctName || '---'} />
                        <StaticItem label="New Title No." value={(editedRecord as any).rollTctNo || '---'} isMono subValue="Assessment Roll Match" />
                     </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 pt-3 border-t border-blue-600/10">
                     <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Tag className="w-2.5 h-2.5 text-emerald-600" /> Consideration</p>
                        <p className="text-sm font-black font-mono text-emerald-600">{formatCurrency((editedRecord as any).sellingPrice)}</p>
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Database className="w-2.5 h-2.5 text-blue-600" /> Area</p>
                        <p className="text-sm font-black font-mono">{(editedRecord.landArea || 0).toLocaleString()} sqm</p>
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Notarial Date</p>
                        <p className="text-sm font-black uppercase">{(editedRecord as any).notarialDate || '---'}</p>
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Doc File No.</p>
                        <p className="text-sm font-black uppercase">{(editedRecord as any).docFileNo || '---'}</p>
                     </div>
                  </div>
                </div>
              )}

              {comparisonRecord && editedRecord.statusLabel === 'DUPLICATE' && !isAbstract && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-2 tracking-widest">
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Duplicate Conflict Analysis
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-6 bg-background/40 p-4 rounded-xl border border-white/10">
                     <div className="space-y-3">
                        <div className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] border-b pb-1 mb-2">Archived (This Row)</div>
                        <StaticItem label="ARP No#" value={editedRecord.arpNo} isMono />
                        <StaticItem label="Market Value" value={formatCurrency(editedRecord.marketValue)} isMono />
                     </div>
                     <div className="space-y-3 border-l border-white/10 pl-6">
                        <div className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] border-b border-emerald-500/20 pb-1 mb-2 flex items-center gap-1">
                          Priority (Active) <CheckCircle2 className="w-2.5 h-2.5" />
                        </div>
                        <StaticItem label="ARP No#" value={comparisonRecord.arpNo} isMono />
                        <StaticItem label="Market Value" value={formatCurrency(comparisonRecord.marketValue)} isMono />
                     </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-muted/30 border shadow-inner space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 leading-none">
                     <div className="w-1 h-3 bg-primary rounded-full" /> {isAbstract ? "Identification" : "Primary Identity"}
                   </h4>
                   <div className="grid grid-cols-1 gap-3">
                      <EditableItem label="Account Name" field="acctName" value={editedRecord.acctName} errors={editedRecord.errors} onChange={handleInputChange} />
                      <div className="grid grid-cols-2 gap-3">
                        <EditableItem label="PIN Number" field="pin" value={editedRecord.pin} errors={editedRecord.errors} onChange={handleInputChange} isMono />
                        <EditableItem label="ARP No#" field="arpNo" value={editedRecord.arpNo} errors={editedRecord.errors} onChange={handleInputChange} isMono />
                      </div>
                      <EditableItem label="Address" field="address" value={editedRecord.address} errors={editedRecord.errors} onChange={handleInputChange} />
                      <div className="grid grid-cols-2 gap-3">
                        <EditableItem label="Date" field="date" value={editedRecord.date} errors={editedRecord.errors} onChange={handleInputChange} />
                        <EditableItem label="Update Code" field="update" value={editedRecord.update} errors={editedRecord.errors} onChange={handleInputChange} />
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
                          <EditableItem label="Land Area (sqm)" field="landArea" value={editedRecord.landArea} errors={editedRecord.errors} onChange={handleInputChange} isMono type="number" />
                        </div>
                        <EditableItem label="Unit Value (₱)" field="unitValue" value={editedRecord.unitValue} errors={editedRecord.errors} onChange={handleInputChange} isMono type="number" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                        <StaticItem label="Location" value={editedRecord.location || 'Pending Calibration'} />
                        <StaticItem label="Actual Use (AU)" value={editedRecord.au || '---'} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Market Value</p>
                          <p className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(editedRecord.marketValue)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assessed Value</p>
                          <p className="text-sm font-black text-blue-600 font-mono">{formatCurrency(editedRecord.assessedValue)}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Yearly Tax Estimate</p>
                        <p className="text-xl font-black font-mono tracking-tighter">{formatCurrency(editedRecord.yearlyTax)}</p>
                      </div>
                  </div>
                </div>
              </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            {!isAbstract && (
              isInArchive ? (
                <Button 
                  variant="outline" 
                  onClick={() => onUnarchive?.(editedRecord)} 
                  className="font-black uppercase text-[9px] h-9 px-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <RotateCcw className="w-3 h-3 mr-1.5" /> Restore Record
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => onArchive?.(editedRecord)} 
                  className="font-black uppercase text-[9px] h-9 px-3 text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <Archive className="w-3 h-3 mr-1.5" /> Archive Record
                </Button>
              )
            )}
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="font-black uppercase text-[10px] h-10 px-5 flex-1 sm:flex-none">Discard</Button>
            <Button onClick={() => onSave?.(editedRecord)} className="bg-primary hover:bg-emerald-800 font-black uppercase text-[10px] h-10 px-6 shadow-lg gap-2 flex-1 sm:flex-none text-white">
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
