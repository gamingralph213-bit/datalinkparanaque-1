"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
  Info,
  Layers,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Files,
  FileCheck2
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

interface AuditLogEntryProps {
  report: ProcessingReport;
  onDeleteReport?: (id: string) => void;
}

/**
 * Sub-component to handle individual audit entries safely.
 * This resolves the "hooks in a loop" issue.
 */
function AuditLogEntry({ report, onDeleteReport }: AuditLogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showIndividualRecovery, setShowIndividualRecovery] = useState(false);
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const hasRecoverableData = report.records && report.records.length > 0;
  const displayId = report.id?.includes('-') ? report.id.split('-')[1].toUpperCase() : 'LEGACY';
  const hasErrors = report.errorCount > 0;

  // Safe calculation of source files for batch batches
  const sourceFiles = useMemo(() => {
    if (!report.records) return [];
    const files = new Map<string, number>();
    report.records.forEach(r => {
      if (r.sourceFile) {
        files.set(r.sourceFile, (files.get(r.sourceFile) || 0) + 1);
      }
    });
    return Array.from(files.entries()).map(([name, count]) => ({ name, count }));
  }, [report.records]);

  const exportAsPDF = async () => {
    setLoadingType('pdf');
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(34, 197, 94);
      doc.text("DATA LINK PARAÑAQUE", 105, 20, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("CITY GOVERNMENT OF PARAÑAQUE - REAL PROPERTY DATA DIVISION", 105, 28, { align: "center" });
      doc.setDrawColor(200);
      doc.line(20, 35, 190, 35);
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text("DATA PROCESSING AUDIT CERTIFICATE", 105, 50, { align: "center" });
      doc.setFontSize(11);
      doc.text(`Certificate No: AUDIT-${displayId}`, 20, 65);
      doc.text(`Processing Date: ${report.timestamp}`, 20, 72);
      doc.text(`Source File: ${report.fileName}`, 20, 79);
      const bodyText = `This document serves as an official audit log for the land record data processing performed on the specified date. The DataLink Parañaque engine has completed a multi-stage validation, cleanup, and calibration sequence as summarized below:`;
      const splitText = doc.splitTextToSize(bodyText, 170);
      doc.text(splitText, 20, 95);
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
      doc.setFontSize(9);
      doc.setTextColor(120);
      const legalText = "I hereby certify that the data processing results listed above have been generated through the standardized Parañaque Land Records engine and are ready for official audit review and integration.";
      doc.text(doc.splitTextToSize(legalText, 170), 20, 260);
      doc.save(`AuditReport-${report.fileName.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setLoadingType(null);
    }
  };

  const exportAsExcel = async () => {
    setLoadingType('excel');
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
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
    } finally {
      setLoadingType(null);
    }
  };

  const exportRawData = async (filterSourceFile?: string) => {
    const loadingKey = filterSourceFile ? `raw-${filterSourceFile}` : 'raw';
    if (!report.records || report.records.length === 0) return;
    setLoadingType(loadingKey);
    await new Promise(resolve => setTimeout(resolve, 1200));
    try {
      let recordsToExport = report.records;
      if (filterSourceFile) {
        recordsToExport = report.records.filter(r => r.sourceFile === filterSourceFile);
      }

      // CRITICAL RECOVERY LOGIC: Use the stored rawRow for 1:1 original copy
      const formattedExport = recordsToExport.map(record => {
        let rowData: any;
        if (record.rawRow) {
          rowData = { ...record.rawRow };
        } else {
          // Fallback for older records
          rowData = {
            "DATE": record.date || "",
            "ARP NO#": record.arpNo || "",
            "PIN": record.pin || "",
            "UPDATE": record.update || "",
            "ACCTNAME": record.acctName || "",
            "ADDRESS": record.address || "",
            "LOCATION": record.location || "",
            "KIND": record.kind || "",
            "AU": record.au || "",
            "LAND AREA": record.landArea || 0,
            "UNIT VALUE": record.unitValue || 0,
            "MARKET VALUE": record.marketValue || 0,
            "ASSESSED VALUE": record.assessedValue || 0,
            "YEARLY TAX": record.yearlyTax || 0
          };
        }

        // Standard cleanup for all recovery exports
        Object.keys(rowData).forEach(key => {
          const lowerKey = key.trim().toLowerCase();
          if (lowerKey === 'rec #' || lowerKey === 'rec#') {
            delete rowData[key];
          }
        });

        return rowData;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(formattedExport);
      XLSX.utils.book_append_sheet(wb, ws, "AuditRawData");
      const fileNameSuffix = filterSourceFile ? filterSourceFile.replace(/\s+/g, '_') : 'Full_Batch';
      XLSX.writeFile(wb, `AuditRawData-${fileNameSuffix}-${Date.now()}.xlsx`);
    } finally {
      setLoadingType(null);
    }
  };

  const handleRecoveryToggle = () => {
    if (sourceFiles.length > 1) {
      setShowIndividualRecovery(!showIndividualRecovery);
    } else {
      exportRawData();
    }
  };

  return (
    <Card className="overflow-hidden border-white/10 shadow-xl hover:shadow-2xl transition-all group">
      <div className={cn(
        "absolute top-0 left-0 w-1.5 h-full transition-all group-hover:w-2",
        hasErrors ? "bg-red-500" : "bg-emerald-600"
      )} />
      
      <div className="p-0">
        <div 
          className="p-6 cursor-pointer hover:bg-muted/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded) setShowIndividualRecovery(false);
          }}
        >
          <div className="flex items-center gap-5 min-w-0 flex-1">
            <div className={cn(
              "p-3 rounded-xl border group-hover:scale-110 transition-transform flex-shrink-0",
              hasErrors ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20"
            )}>
              <FileText className={cn("w-6 h-6", hasErrors ? "text-red-600" : "text-emerald-600")} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <h4 className="text-lg font-black uppercase tracking-tight truncate pr-4">
                {report.fileName}
              </h4>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {report.timestamp}</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-600" /> ID: {displayId}</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 
                  {report.validCount.toLocaleString()} Valid Records
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-10 px-5 font-black uppercase text-[10px] tracking-[0.15em] transition-all gap-2",
                isExpanded ? "bg-emerald-600 text-white border-emerald-600" : "bg-transparent text-primary border-primary/20 hover:bg-primary hover:text-white"
              )}
            >
              {isExpanded ? <><EyeOff className="w-3.5 h-3.5" /> Hide Details</> : <><Eye className="w-3.5 h-3.5" /> View Audit Report</>}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.stopPropagation(); onDeleteReport?.(report.id); }}
                    className="h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete log</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {isExpanded && (
          <div className="p-8 pt-2 border-t border-white/5 bg-card animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: "Imported", val: report.totalImported, color: "text-foreground", sub: "Raw Rows" },
                { label: "Cleanup", val: report.cleanupCount, color: "text-orange-600", sub: "Discarded" },
                { label: "Duplicates", val: report.duplicatesDetected, color: "text-amber-500", sub: "Merged" },
                { label: "Calibrated", val: report.calibratedCount, color: "text-primary", sub: "Auto-Mapped" },
                { label: "Errors", val: report.errorCount, color: "text-red-600", sub: "Need Fix" },
                { label: "Validated", val: report.validCount, color: "text-emerald-600", sub: "Certified" },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-white/5 flex flex-col items-center justify-center text-center shadow-inner">
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</div>
                  <div className={cn("text-lg font-black leading-none", stat.color)}>{stat.val.toLocaleString()}</div>
                  <div className="text-[8px] font-bold text-muted-foreground/60 uppercase mt-1.5">{stat.sub}</div>
                </div>
              ))}
            </div>

            {showIndividualRecovery && sourceFiles.length > 1 && (
              <div className="mb-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                    <Files className="w-3.5 h-3.5" /> Individual Source File Recovery
                  </h5>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => exportRawData()}
                    className="h-8 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 mr-1.5" /> Recover Combined Batch
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sourceFiles.map((file) => (
                    <div key={file.name} className="flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-white/5 hover:bg-muted/20 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase truncate pr-2">{file.name}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{file.count} Records</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => exportRawData(file.name)}
                        disabled={!hasRecoverableData || loadingType !== null}
                        className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all shrink-0"
                      >
                        {loadingType === `raw-${file.name}` ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Download className="w-3 h-3 mr-1.5" />}
                        {loadingType === `raw-${file.name}` ? "Exporting..." : "Recover File"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col xl:flex-row items-center justify-between gap-8 pt-6 border-t border-white/5">
              <div className="flex flex-wrap items-center gap-10">
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2"><Database className="w-3 h-3 text-primary" /> Market Value</div>
                  <div className="text-base font-black font-mono">₱{report.totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2"><ArrowRight className="w-3 h-3 text-blue-600" /> Assessed Value</div>
                  <div className="text-base font-black font-mono">₱{report.totalAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleRecoveryToggle}
                          disabled={!hasRecoverableData || (loadingType !== null && loadingType !== 'raw')}
                          className={cn(
                            "h-11 px-5 font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2",
                            showIndividualRecovery ? "bg-primary text-white border-primary" : "border-primary/30 text-primary hover:bg-primary hover:text-white"
                          )}
                        >
                          {loadingType === 'raw' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                          {loadingType === 'raw' ? "Recovering..." : (sourceFiles.length > 1 ? (showIndividualRecovery ? "Hide Options" : "Recover Raw Files") : "Recover Raw Data")}
                        </Button>
                        {!hasRecoverableData && (
                          <Badge className="absolute -top-2.5 -right-2 bg-orange-500 text-[8px] h-4 font-black p-1 border-2 border-card shadow-lg animate-pulse z-10">PURGED</Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{hasRecoverableData ? (sourceFiles.length > 1 ? "Manage recovery options for this batch" : "Download original dataset") : "Raw data automatically moved to browser cache to save space"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Separator orientation="vertical" className="h-8 mx-1 opacity-20 hidden md:block" />

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportAsPDF}
                  disabled={loadingType !== null}
                  className="h-11 px-5 font-black uppercase text-[10px] tracking-widest border-emerald-600/30 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                >
                  {loadingType === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {loadingType === 'pdf' ? "Generating..." : "Audit Certificate"}
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportAsExcel}
                  disabled={loadingType !== null}
                  className="h-11 px-5 font-black uppercase text-[10px] tracking-widest border-blue-600/30 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                >
                  {loadingType === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                  {loadingType === 'excel' ? "Exporting..." : "Summary Log"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-vertical-custom bg-muted/5">
      <div className="max-w-7xl mx-auto space-y-8">
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

        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <AuditLogEntry 
              key={report.id} 
              report={report} 
              onDeleteReport={onDeleteReport} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
