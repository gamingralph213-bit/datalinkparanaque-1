"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Info, HelpCircle, Database, Settings, Table as TableIcon, FileDown, Zap } from 'lucide-react';

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl">
        <div className="p-10 pb-6 shrink-0">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/20 p-3 rounded-2xl shadow-inner border border-primary/20">
                <Info className="text-primary w-7 h-7" />
              </div>
              <DialogTitle className="text-3xl font-black bg-gradient-to-br from-blue-600 to-emerald-500 bg-clip-text text-transparent uppercase tracking-tight leading-none">
                About DataLink Parañaque
              </DialogTitle>
            </div>
            <DialogDescription className="text-lg font-bold text-muted-foreground leading-relaxed">
              DataLink Parañaque is a specialized data processing tool designed to automate the cleaning, calibration, and standardization of Real Property Land Records. It transforms messy raw spreadsheets into structured, audit-ready data for the City of Parañaque.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-10 scrollbar-vertical-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-6">
            <div className="space-y-8">
              <h3 className="text-base font-black uppercase text-primary tracking-[0.2em] flex items-center gap-3">
                <Zap className="w-5 h-5" /> Core Mission
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground font-bold">
                Our mission is to reduce human error and manual labor in property assessment. By using intelligent PIN-based wildcard matching and automated financial computations, we ensure every record follows city-mandated rules for unit values and tax levels.
              </p>
              
              <div className="bg-muted/30 rounded-3xl p-8 border border-white/5 space-y-6 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Key Capabilities</h4>
                <ul className="space-y-4">
                  {[
                    "Intelligent PIN Pattern Matching (Wildcards)",
                    "Automated Market & Assessed Value Computation",
                    "Deduplication based on Highest ARP values",
                    "Bulk Location Calibration via Barangay Codes",
                    "System-level Data Cleanup & Noise Removal",
                    "Customized Excel Export with Sticky Headers"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4 text-sm font-black text-foreground/80 leading-snug">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 shadow-md shadow-primary/30" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-base font-black uppercase text-primary tracking-[0.2em] flex items-center gap-3">
                <HelpCircle className="w-5 h-5" /> User Instructions
              </h3>
              
              <Accordion type="single" collapsible className="w-full space-y-2">
                <AccordionItem value="step-1" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    1. Importing Your Data
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Start by dragging an Excel file (.xlsx) into the Import Zone or paste data directly from your clipboard. The system will automatically map your columns (Owner, Address, PIN, etc.) to the internal processor format.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-2" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    2. Configuring Calibration
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Open the <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">Global Calibration Panel</span> (Gear Icon). Here, you can define Unit Values and Location Names for specific Barangay and Section codes. Use the wildcard 'x' to match broad PIN ranges.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-3" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    3. Running the Engine
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Click <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">"Run Processor"</span>. This triggers the engine to:
                    <ul className="mt-4 space-y-2 ml-2">
                      <li className="flex items-center gap-2">• <span className="font-black">Cleanup:</span> Remove empty/total rows</li>
                      <li className="flex items-center gap-2">• <span className="font-black">Deduplicate:</span> Identify and hide duplicate PINs</li>
                      <li className="flex items-center gap-2">• <span className="font-black">Calibrate:</span> Apply your calibrated unit values</li>
                      <li className="flex items-center gap-2">• <span className="font-black">Compute:</span> Calculate Market & Assessed values</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-4" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    4. Analyzing Results
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Switch to the <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">"Analytics"</span> tab to see property usage distribution. Click the Market Value card to see a detailed financial breakdown by category.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-5" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    5. Exporting to Excel
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Use <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">"Export Results"</span> to save your cleaned data. The exporter uses your template and locks the first 5 rows with a frozen pane for professional navigation.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        <div className="p-8 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
            System Version: 2.9.0 | City of Parañaque
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-emerald-800 font-black uppercase text-xs tracking-widest px-12 h-12 shadow-lg shadow-primary/20">
            Got it, Let's Work
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
