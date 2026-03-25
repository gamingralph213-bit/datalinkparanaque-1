'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, FileCheck2, X } from 'lucide-react';
import { format } from 'date-fns';

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  onDownload?: () => void;
  onViewFile?: () => void;
}

export function SuccessModal({
  open,
  onOpenChange,
  title = "Processing Completed Successfully",
  message = "Your file has been processed and verified. You may now download the result or continue working.",
  onDownload,
  onViewFile,
}: SuccessModalProps) {
  const timestamp = format(new Date(), 'p'); // e.g., 2:45 PM

  const handleDownload = () => {
    onOpenChange(false);
    onDownload?.();
  };

  const handleViewFile = () => {
    onOpenChange(false);
    onViewFile?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl p-8" hideClose>
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-2xl font-black text-foreground">{title}</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground font-semibold leading-relaxed">
              {message}
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm font-bold text-muted-foreground">
            Completed at {timestamp}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-center gap-3 pt-4">
            <Button variant="outline" className="font-bold h-11" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download Result
            </Button>
            <Button className="font-bold h-11 bg-primary hover:bg-primary/90" onClick={handleViewFile}>
              <FileCheck2 className="w-4 h-4 mr-2" />
              View File
            </Button>
          </DialogFooter>
        </div>
         <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
           <X className="h-4 w-4" />
           <span className="sr-only">Close</span>
         </button>
      </DialogContent>
    </Dialog>
  );
}
