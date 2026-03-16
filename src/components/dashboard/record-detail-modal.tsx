"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LandRecord } from '@/lib/processor';
import { Badge } from '@/components/ui/badge';
import { Separator } from '../ui/separator';

interface RecordDetailModalProps {
  record: LandRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailItem = ({ label, value, isMono = false, isBadge = false }: { label: string; value: React.ReactNode; isMono?: boolean, isBadge?: boolean }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="grid grid-cols-3 gap-3 py-1">
      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest col-span-1 leading-relaxed">{label}</p>
      {isBadge ? (
        <div className="col-span-2">{value}</div>
      ) : (
        <p className={`text-base col-span-2 ${isMono ? 'font-mono' : 'font-bold'} leading-tight`}>{value || '---'}</p>
      )}
    </div>
  );
};

export function RecordDetailModal({ record, open, onOpenChange }: RecordDetailModalProps) {
  if (!record) return null;

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '---';
    return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const getStatusBadge = () => {
    if (record.isCleanup) {
      return (
        <Badge variant="outline" className="text-xs h-6 px-3 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
          {record.cleanupReason || 'CLEANUP'}
        </Badge>
      );
    }
    if (record.isDuplicate) {
      return <Badge variant="destructive" className="text-xs h-6 px-3 font-black uppercase tracking-tighter">DUPLICATE</Badge>;
    }
    return (
      <Badge variant="secondary" className="text-xs h-6 px-3 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
        VALID
      </Badge>
    );
  };

  const ClassificationItem = ({ label, value }: { label: string; value?: string }) => {
    if (!value) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-base font-black leading-none">{value}</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card/90 backdrop-blur-xl border-white/10 p-8 shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent uppercase tracking-tight">Property Record Details</DialogTitle>
          <DialogDescription className="text-base font-bold mt-2">
            Full information for Account: <span className="font-black text-foreground underline decoration-primary/30 underline-offset-4">{record.acctName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-muted/40 border shadow-inner">
                 <h4 className="text-sm font-black uppercase text-primary mb-6 flex items-center gap-2">
                   <div className="w-1.5 h-4 bg-primary rounded-full" />
                   Primary Information
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                    <DetailItem label="Account Name" value={record.acctName} />
                    <DetailItem label="PIN" value={record.pin} isMono />
                    <DetailItem label="Source Address" value={record.address} />
                    <DetailItem label="ARP No#" value={record.arpNo} isMono />
                    <DetailItem label="Location" value={record.location} />
                    <DetailItem label="Date" value={record.date} />
                 </div>
            </div>

            <div className="p-6 rounded-2xl bg-muted/40 border shadow-inner">
                <h4 className="text-sm font-black uppercase text-primary mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-primary rounded-full" />
                  Financial Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                    <DetailItem label="Land Area (sqm)" value={record.landArea?.toLocaleString()} isMono />
                    <DetailItem label="Unit Value" value={formatCurrency(record.unitValue)} isMono />
                    <DetailItem label="Market Value" value={formatCurrency(record.marketValue)} isMono />
                    <DetailItem label="Assessed Value" value={formatCurrency(record.assessedValue)} isMono />
                    <DetailItem label="Yearly Tax" value={formatCurrency(record.yearlyTax)} isMono />
                </div>
            </div>

             <div className="p-6 rounded-2xl bg-muted/40 border shadow-inner">
                <h4 className="text-sm font-black uppercase text-primary mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-primary rounded-full" />
                  Record Classification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-6 items-start">
                    <div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Record Status</p>
                        <div className="mt-1">{getStatusBadge()}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex flex-wrap gap-10">
                            <ClassificationItem label="Update" value={record.update} />
                            <ClassificationItem label="Kind" value={record.kind} />
                            <ClassificationItem label="AU" value={record.au} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
