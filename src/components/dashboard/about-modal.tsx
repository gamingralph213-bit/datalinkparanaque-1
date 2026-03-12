
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
        <div className="p-8 pb-4 shrink-0">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/20 p-2 rounded-lg">
                <Info className="text-primary w-6 h-6" />
              </div>
              <DialogTitle className="text-2xl font-black text-gradient uppercase tracking-tight">
                About Parañaque Data Link
              </DialogTitle>
            </div>
            <DialogDescription className="text-base font-medium text-muted-foreground leading-relaxed">
              Parañaque Data Link is a specialized data processing tool designed to automate the cleaning, calibration, and standardization of Real Property Land Records. It transforms messy raw spreadsheets into structured, audit-ready data for the City of Parañaque.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-vertical-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4" /> Core Mission
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground font-medium">
                Our mission is to reduce human error and manual labor in property assessment. By using intelligent PIN-based wildcard matching and automated financial computations, we ensure every record follows city-mandated rules for unit values and tax levels.
              </p>
              
              <div className="bg-muted/30 rounded-2xl p-6 border border-white/5 space-y-4 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Key Capabilities</h4>
                <ul className="space-y-3">
                  {[
                    "Intelligent PIN Pattern Matching (Wildcards)",
                    "Automated Market & Assessed Value Computation",
                    "Deduplication based on Highest ARP values",
                    "Bulk Location Calibration via Barangay Codes",
                    "System-level Data Cleanup & Noise Removal",
                    "Customized Excel Export with Sticky Headers"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs font-bold text-foreground/80">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> User Instructions
              </h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="step-1" className="border-white/5">
                  <AccordionTrigger className="text-xs font-black uppercase hover:no-underline py-4">
                    1. Importing Your Data
                  </AccordionTrigger>
                  <AccordionContent className="text-xs font-medium text-muted-foreground leading-relaxed">
                    Start by dragging an Excel file (.xlsx) into the Import Zone or paste data directly from your clipboard. The system will automatically map your columns (Owner, Address, PIN, etc.) to the internal processor format.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-2" className="border-white/5">
                  <AccordionTrigger className="text-xs font-black uppercase hover:no-underline py-4">
                    2. Configuring Calibration
                  </AccordionTrigger>
                  <AccordionContent className="text-xs font-medium text-muted-foreground leading-relaxed">
                    Open the <span className="text-primary font-bold">Global Calibration Panel</span> (Gear Icon). Here, you can define Unit Values and Location Names for specific Barangay and Section codes. Use the wildcard 'x' to match broad PIN ranges.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-3" className="border-white/5">
                  <AccordionTrigger className="text-xs font-black uppercase hover:no-underline py-4">
                    3. Running the Engine
                  </AccordionTrigger>
                  <AccordionContent className="text-xs font-medium text-muted-foreground leading-relaxed">
                    Click <span className="text-primary font-bold">"Run Processor"</span>. This triggers the engine to:
                    <ul className="mt-2 space-y-1">
                      <li>• Remove empty/total rows (Cleanup)</li>
                      <li>• Identify and hide duplicate PINs</li>
                      <li>• Apply your calibrated unit values</li>
                      <li>• Compute Market & Assessed values</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-4" className="border-white/5">
                  <AccordionTrigger className="text-xs font-black uppercase hover:no-underline py-4">
                    4. Analyzing Results
                  </AccordionTrigger>
                  <AccordionContent className="text-xs font-medium text-muted-foreground leading-relaxed">
                    Switch to the <span className="text-primary font-bold">"Analytics"</span> tab to see property usage distribution. Click the Market Value card to see a detailed financial breakdown by category.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-5" className="border-white/5">
                  <AccordionTrigger className="text-xs font-black uppercase hover:no-underline py-4">
                    5. Exporting to Excel
                  </AccordionTrigger>
                  <AccordionContent className="text-xs font-medium text-muted-foreground leading-relaxed">
                    Use <span className="text-primary font-bold">"Export Results"</span> to save your cleaned data. The exporter uses your `export_template.xlsx` from the public folder and locks the first 5 rows with a frozen pane for professional navigation.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-50">
            System Version: 2.9.0 | City of Parañaque
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-emerald-800 font-black uppercase text-[10px] tracking-widest px-8">
            Got it, Let's Work
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
