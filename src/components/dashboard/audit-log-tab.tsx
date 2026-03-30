"use client";

import React from 'react';
import { ProcessingReport, LandRecord } from '@/lib/processor';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, 
  FileText, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Eraser, 
  Archive, 
  Zap,
  Calendar,
  Trash2,
  Database,
  ArrowRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';

interface AuditLogTabProps {
  reports: ProcessingReport[];
  onClearHistory?: () => void;
  onDeleteReport?: (id: string) => void;
}

export function AuditLogTab({ reports, onClearHistory, onDeleteReport }: AuditLogTabProps) {
  if (reports.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldCheck className="w-16 h-16 opacity-10 mb-4" />
        <p className="text-sm uppercase font-black opacity-30 tracking-widest">No Processing History Found</p>
        <p className="text-xs font-bold mt-2 opacity-20">Perform a processing run or export to log activity.</p>
      </div>
    );
  }

  const exportAsPDF = (report: ProcessingReport) => {
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
    doc.text(`Certificate No: AUDIT-${report.id}`, 20, 65);
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

    doc.save(`AuditReport-${report.fileName.replace(/\s+/g, '_')}.pdf`);
  };

  const exportAsExcel = (report: ProcessingReport) => {
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
    XLSX.writeFile(wb, `ProcessingSummary-${report.fileName.replace(/\s+/g, '_')}.xlsx`);
  };

  const exportRawData = (report: ProcessingReport) => {
    if (!report.records || report.records.length === 0) return;

    const sortedRecords = [...report.records].sort((a, b) => {
      const partsA = (a.pin || '').split('-');
      const partsB = (b.pin || '').split('-');
      for (let i = 0; i < 6; i++) {
        const segmentA = partsA[i] || '';
        const segmentB = partsB[i] || '';
        const numA = parseInt(segmentA, 10);
        const numB = parseInt(segmentB, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) return numA - numB;
        } else if (segmentA !== segmentB) {
          return segmentA.localeCompare(segmentB);
        }
      }
      return 0;
    });

    const headerMapping: Record<string, string> = {
      date: "DATE", arpNo: "ARP NO#", pin: "PIN", update: "UPDATE",
      acctName: "ACCTNAME", address: "ADDRESS", location: "LOCATION",
      kind: "KIND", au: "AU", landArea: "LAND AREA", unitValue: "UNIT VALUE",
      marketValue: "MARKET VALUE", assessedValue: "ASSESSED VALUE", yearlyTax: "YEARLY TAX"
    };

    const formattedExport = sortedRecords.map(record => {
      const row: any = {};
      Object.entries(headerMapping).forEach(([key, label]) => {
        row[label] = record[key as keyof LandRecord] ?? '';
      });
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedExport);
    XLSX.utils.book_append_sheet(wb, ws, "AuditData");
    XLSX.writeFile(wb, `AuditRawData-${report.fileName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-vertical-custom bg-muted/5">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-emerald-600" /> 
              Administrative Audit Vault
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-10">
              Persistent tracking of all data engine activity
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="h-8 px-4 text-xs font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200">
              {reports.length} Verified Entries
            </Badge>
            {onClearHistory && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearHistory}
                className="h-9 text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Eraser className="w-3.5 h-3.5 mr-1.5" /> Purge History
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {reports.map((report) => {
            const hasRecoverableData = report.records && report.records.length > 0;
            
            return (
              <Card key={report.id} className="overflow-hidden border-white/10 shadow-xl hover:shadow-2xl transition-all group relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600 group-hover:w-2 transition-all" />
                
                <div className="p-8 bg-card">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-10">
                    <div className="flex items-start gap-5">
                      <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <FileText className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-black uppercase tracking-tight truncate max-w-[400px]">
                          {report.fileName}
                        </h4>
                        <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {report.timestamp}</span>
                          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ID: {report.id.split('-')[1]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => exportRawData(report)}
                                disabled={!hasRecoverableData}
                                className={cn(
                                  "h-11 px-5 font-black uppercase text-[11px] tracking-widest border-primary/30 text-primary hover:bg-primary hover:text-white transition-all",
                                  !hasRecoverableData && "opacity-50 grayscale cursor-not-allowed"
                                )}
                              >
                                <FileSpreadsheet className="w-4 h-4 mr-2" /> Recover Raw Data
                              </Button>
                              {!hasRecoverableData && (
                                <Badge className="absolute -top-2 -right-2 bg-orange-500 text-[8px] h-4 font-black p-1 animate-pulse">PURGED</Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {hasRecoverableData 
                              ? "Download the full dataset used in this run" 
                              : "Dataset purged from storage history to save space. Metadata remains available."
                            }
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => exportAsPDF(report)}
                        className="h-11 px-5 font-black uppercase text-[11px] tracking-widest border-emerald-600/30 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                      >
                        <Download className="w-4 h-4 mr-2" /> Audit Certificate
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => exportAsExcel(report)}
                        className="h-11 px-5 font-black uppercase text-[11px] tracking-widest border-blue-600/30 text-blue-600 hover:bg-blue-600 hover:text-white"
                      >
                        <Layers className="w-4 h-4 mr-2" /> Summary Log
                      </Button>

                      <Separator orientation="vertical" className="h-8 mx-2" />

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => onDeleteReport?.(report.id)}
                              className="h-11 w-11 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete this specific log entry</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
                    {[
                      { label: "Imported", val: report.totalImported, color: "text-foreground", sub: "Raw Rows" },
                      { label: "Cleanup", val: report.cleanupCount, color: "text-orange-600", sub: "Discarded" },
                      { label: "Duplicates", val: report.duplicatesDetected, color: "text-amber-500", sub: "Merged" },
                      { label: "Calibrated", val: report.calibratedCount, color: "text-primary", sub: "Auto-Mapped" },
                      { label: "Errors", val: report.errorCount, color: "text-red-600", sub: "Need Fix" },
                      { label: "Validated", val: report.validCount, color: "text-emerald-600", sub: "Certified" },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-white/5 flex flex-col items-center justify-center text-center shadow-inner hover:bg-muted/30 transition-colors">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{stat.label}</div>
                        <div className={cn("text-lg font-black leading-none", stat.color)}>{stat.val.toLocaleString()}</div>
                        <div className="text-[9px] font-bold text-muted-foreground/60 uppercase mt-1.5">{stat.sub}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-8">
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Database className="w-3.5 h-3.5 text-primary" /> Total Market Value</div>
                        <div className="text-base font-black font-mono">₱{report.totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-blue-600" /> Total Assessed Value</div>
                        <div className="text-base font-black font-mono">₱{report.totalAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {!hasRecoverableData && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                          <Info className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-[9px] font-black uppercase text-orange-600 tracking-tighter">Raw data archived locally</span>
                        </div>
                      )}
                      {report.errorCount > 0 ? (
                        <Badge className="h-10 px-6 font-black uppercase tracking-widest bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Incomplete Data Integrity Pass
                        </Badge>
                      ) : (
                        <Badge className="h-10 px-6 font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Verified Audit Pass
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}