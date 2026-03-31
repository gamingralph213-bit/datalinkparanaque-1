'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileSearch, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SuccessModalOptions {
  title?: string;
  message?: string;
  onDownload?: () => void;
  onViewResult?: () => void;
}

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuccessModal({
  open,
  onOpenChange,
  title = "Processing Completed",
  message = "The batch processor has finished analyzing your data. Please conduct a manual review of all records to ensure 100% accuracy before final export.",
  onDownload,
  onViewResult,
}: SuccessModalProps & SuccessModalOptions) {
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    // Only set the timestamp on the client to avoid hydration mismatch
    if (open) {
      setTimestamp(format(new Date(), 'p'));
    }
  }, [open]);

  const handleDownload = () => {
    onOpenChange(false);
    onDownload?.();
  };

  const handleViewResult = () => {
    onOpenChange(false);
    onViewResult?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-0 overflow-hidden" hideClose>
        <div className="p-10 flex flex-col items-center text-center">
          {/* Neutral Analysis Icon instead of Check */}
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 shadow-inner mb-8">
            <FileSearch className="w-10 h-10 text-primary" />
          </div>

          <div className="mb-8">
            <DialogHeader className="p-0 space-y-3">
              <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm font-bold text-muted-foreground leading-relaxed max-w-[360px] mx-auto">
                {message}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-left w-full mb-10">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Verification Recommended</p>
              <p className="text-[10px] font-bold text-amber-600/80 leading-relaxed">
                The engine has applied standard calibration rules. However, manual oversight is still essential to validate parcel-specific edge cases and ensure 100% data integrity.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col gap-4">
            <Button 
              className="w-full font-black uppercase text-xs tracking-widest h-14 bg-primary hover:bg-emerald-800 shadow-xl shadow-primary/20" 
              onClick={handleViewResult}
            >
              <FileSearch className="w-4.5 h-4.5 mr-2" />
              Review & View Result
            </Button>
            
            {/* Minimal Export Action */}
            <button 
              onClick={handleDownload}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors py-2 flex items-center justify-center gap-2"
            >
              <Download className="w-3 h-3" />
              Continue to Direct Export
            </button>
          </div>

          <div className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] mt-8 pt-4 border-t w-full">
            Analysis sequence finalized at {timestamp || '...'}
          </div>
        </div>
        
        <button 
          onClick={() => onOpenChange(false)} 
          className="absolute right-6 top-6 rounded-full p-2 text-muted-foreground hover:bg-muted transition-all"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
