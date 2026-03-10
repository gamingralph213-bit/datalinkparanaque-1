
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
    <div className="grid grid-cols-3 gap-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider col-span-1">{label}</p>
      {isBadge ? (
        <div className="col-span-2">{value}</div>
      ) : (
        <p className={`text-sm col-span-2 ${isMono ? 'font-mono' : 'font-semibold'}`}>{value || '---'}</p>
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
        <Badge variant="outline" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
          {record.cleanupReason || 'CLEANUP'}
        </Badge>
      );
    }
    if (record.isDuplicate) {
      return <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter">DUPLICATE</Badge>;
    }
    return (
      <Badge variant="secondary" className="text-[10px] h-5 font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
        VALID
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card/90 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-gradient">Property Record Details</DialogTitle>
          <DialogDescription>
            Full information for Account Name: <span className="font-bold text-foreground">{record.acctName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/40 border">
                 <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4">Primary Information</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Account Name" value={record.acctName} />
                    <DetailItem label="PIN" value={record.pin} isMono />
                    <DetailItem label="Source Address" value={record.address} />
                    <DetailItem label="ARP No#" value={record.arpNo} isMono />
                    <DetailItem label="Calibrated Location" value={record.location} />
                    <DetailItem label="Date" value={record.date} />
                 </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4">Financial Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Land Area (sqm)" value={record.landArea?.toLocaleString()} isMono />
                    <DetailItem label="Unit Value" value={formatCurrency(record.unitValue)} isMono />
                    <DetailItem label="Market Value" value={formatCurrency(record.marketValue)} isMono />
                    <DetailItem label="Assessed Value" value={formatCurrency(record.assessedValue)} isMono />
                    <DetailItem label="Yearly Tax" value={formatCurrency(record.yearlyTax)} isMono />
                </div>
            </div>

             <div className="p-4 rounded-lg bg-muted/40 border">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4">Record Status & Classification</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Record Status" value={getStatusBadge()} isBadge />
                    <div className="grid grid-cols-3 gap-2 col-span-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider col-span-1">CLASS</p>
                        <div className="flex gap-2 col-span-2">
                            <DetailItem label="Update" value={record.update} />
                            <DetailItem label="Kind" value={record.kind} />
                            <DetailItem label="AU" value={record.au} />
                        </div>
                    </div>
                 </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
