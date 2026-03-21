
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProcessingReport } from '@/lib/processor';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Eraser, 
  Archive, 
  Zap, 
  Database,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ProcessingReportModalProps {
  report: ProcessingReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcessingReportModal({ report, open, onOpenChange }: ProcessingReportModalProps) {
  if (!report) return null;

  const exportAsPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(34, 197, 94); // Primary color
    doc.text("DATA LINK PARAÑAQUE", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("CITY GOVERNMENT OF PARAÑAQUE - REAL PROPERTY DATA DIVISION", 105, 28, { align: "center" });
    
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("DATA PROCESSING AUDIT CERTIFICATE", 105, 50, { align: "center" });

    // Summary Text
    doc.setFontSize(11);
    doc.text(`Certificate No: AUDIT-${Date.now()}`, 20, 65);
    doc.text(`Processing Date: ${report.timestamp}`, 20, 72);
    doc.text(`Source File: ${report.fileName}`, 20, 79);

    const bodyText = `This document serves as an official audit log for the land record data processing performed on the specified date. The DataLink Parañaque engine has completed a multi-stage validation, cleanup, and calibration sequence as summarized below:`;
    
    const splitText = doc.splitTextToSize(bodyText, 170);
    doc.text(splitText, 20, 95);

    // Audit Data Table
    (doc as any).autoTable({
      startY: 110,
      head: [['Processing Metric', 'Result Count', 'Status']],
      body: [
        ['Total Records Imported', report.totalImported.toLocaleString(), 'Logged'],
        ['System Cleanup (Empty/Total Rows)', report.cleanupCount.toLocaleString(), 'Removed'],
        ['Duplicate PINs Detected', report.duplicatesDetected.toLocaleString(), 'Archived'],
        ['Records Calibrated (Auto-Mapping)', report.calibratedCount.toLocaleString(), 'Applied'],
        ['Data Integrity Errors Found', report.errorCount.toLocaleString(), report.errorCount > 0 ? 'NEEDS FIX' : 'CLEAN'],
        ['Final Validated Records', report.validCount.toLocaleString(), 'READY'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
    });

    const financialStartY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("FINANCIAL SUMMARY", 20, financialStartY);
    
    doc.setFontSize(11);
    doc.text(`Total Market Value: PHP ${report.totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, financialStartY + 10);
    doc.text(`Total Assessed Value: PHP ${report.totalAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, financialStartY + 17);

    // Legal Statement
    doc.setFontSize(9);
    doc.setTextColor(120);
    const legalText = "I hereby certify that the data processing results listed above have been generated through the standardized Parañaque Land Records engine and are ready for official audit review and integration.";
    doc.text(doc.splitTextToSize(legalText, 170), 20, 260);

    doc.save(`AuditReport-${report.fileName}-${Date.now()}.pdf`);
  };

  const exportAsExcel = () => {
    const data = [
      ["DATA LINK PARAÑAQUE - PROCESSING SUMMARY REPORT"],
      ["Generated On:", report.timestamp],
      ["Source File:", report.fileName],
      [],
      ["METRIC", "VALUE"],
      ["Total Imported", report.totalImported],
      ["System Cleanup", report.cleanupCount],
      ["Duplicates Detected", report.duplicatesDetected],
      ["Records Calibrated", report.calibratedCount],
      ["Records with Errors", report.errorCount],
      ["Final Validated Count", report.validCount],
      [],
      ["FINANCIALS"],
      ["Total Market Value", report.totalMarketValue],
      ["Total Assessed Value", report.totalAssessedValue],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
    XLSX.writeFile(wb, `ProcessingSummary-${report.fileName}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl overflow-hidden">
        <div className="p-8 pb-4 shrink-0 bg-primary/5 border-b">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/20 p-3 rounded-2xl shadow-inner border border-primary/20">
                <ShieldCheck className="text-primary w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">
                  Processing Summary Report
                </DialogTitle>
                <DialogDescription className="text-sm font-bold text-muted-foreground mt-1.5 uppercase tracking-widest">
                  Audit Log • {report.timestamp}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] scrollbar-vertical-custom">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 border-l-4 border-l-slate-400 bg-muted/20">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Download className="w-3 h-3"/> Total Imported</div>
              <div className="text-2xl font-black">{report.totalImported.toLocaleString()}</div>
            </Card>
            <Card className="p-5 border-l-4 border-l-primary bg-primary/5">
              <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3"/> Validated Records</div>
              <div className="text-2xl font-black text-primary">{report.validCount.toLocaleString()}</div>
            </Card>
          </div>

          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] px-1">Cleanup & Calibration Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-white/5 flex flex-col items-center text-center">
                <Eraser className="w-5 h-5 text-orange-500 mb-2" />
                <span className="text-[10px] font-black text-muted-foreground uppercase">Cleanup</span>
                <span className="text-lg font-black">{report.cleanupCount}</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-white/5 flex flex-col items-center text-center">
                <Archive className="w-5 h-5 text-amber-500 mb-2" />
                <span className="text-[10px] font-black text-muted-foreground uppercase">Duplicates</span>
                <span className="text-lg font-black">{report.duplicatesDetected}</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-white/5 flex flex-col items-center text-center">
                <Zap className="w-5 h-5 text-primary mb-2" />
                <span className="text-[10px] font-black text-muted-foreground uppercase">Calibrated</span>
                <span className="text-lg font-black">{report.calibratedCount}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-muted/30 border shadow-inner">
            <div className="flex items-center justify-between mb-6">
               <h4 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                 <Database className="w-4 h-4 text-primary" /> Financial Aggregates
               </h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-background/50 p-3 rounded-xl">
                <span className="text-xs font-bold text-muted-foreground uppercase">Total Market Value</span>
                <span className="text-sm font-black font-mono">₱{report.totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 p-3 rounded-xl">
                <span className="text-xs font-bold text-muted-foreground uppercase">Total Assessed Value</span>
                <span className="text-sm font-black font-mono">₱{report.totalAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {report.errorCount > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-4">
              <AlertTriangle className="text-red-500 w-6 h-6 shrink-0" />
              <div>
                <p className="text-xs font-black text-red-700 uppercase">Attention Required</p>
                <p className="text-[11px] font-bold text-red-600/80 leading-relaxed">
                  There are still {report.errorCount} records with data integrity errors (Missing PIN, Zero Area, etc). These should be corrected before official submission.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t bg-muted/20 flex flex-col sm:flex-row items-center gap-4 shrink-0">
          <Button 
            variant="outline" 
            onClick={exportAsPDF}
            className="w-full sm:flex-1 h-12 font-black uppercase text-xs tracking-widest border-primary/30 text-primary hover:bg-primary hover:text-white"
          >
            <FileText className="w-4 h-4 mr-2" /> Export Audit PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={exportAsExcel}
            className="w-full sm:flex-1 h-12 font-black uppercase text-xs tracking-widest border-blue-600/30 text-blue-600 hover:bg-blue-600 hover:text-white"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Summary Excel
          </Button>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-32 h-12 font-black uppercase text-xs tracking-widest bg-slate-800 hover:bg-slate-900">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
