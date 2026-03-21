
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
import { 
  Info, 
  HelpCircle, 
  Database, 
  Settings, 
  Table as TableIcon, 
  FileDown, 
  Zap, 
  Files, 
  ShieldCheck, 
  Search,
  LayoutDashboard
} from 'lucide-react';

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl">
        <div className="p-10 pb-6 shrink-0 bg-primary/5 border-b">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/20 p-3 rounded-2xl shadow-inner border border-primary/20">
                <Info className="text-primary w-7 h-7" />
              </div>
              <DialogTitle className="text-3xl font-black text-foreground uppercase tracking-tight leading-none">
                About DataLink Parañaque
              </DialogTitle>
            </div>
            <DialogDescription className="text-lg font-bold text-muted-foreground leading-relaxed">
              DataLink Parañaque is a specialized multi-file processor designed to automate the cleaning, calibration, and standardization of Real Property Land Records. It transforms bulk spreadsheets into structured, audit-ready data for the City of Parañaque.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-10 scrollbar-vertical-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
            <div className="space-y-8">
              <h3 className="text-base font-black uppercase text-primary tracking-[0.2em] flex items-center gap-3">
                <Zap className="w-5 h-5" /> Advanced Capabilities
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground font-bold">
                Our engine ensures every record follows city-mandated rules through intelligent wildcard matching, automated financial computations, and persistent audit tracking.
              </p>
              
              <div className="bg-muted/30 rounded-3xl p-8 border border-white/5 space-y-6 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Core Features</h4>
                <ul className="space-y-4">
                  {[
                    "Batch File Processing: Import multiple Excel files simultaneously.",
                    "Smart Export: Choice of single master file or separate source reports.",
                    "Persistent Audit Log: Locally saved history of all processing runs.",
                    "Barangay Intelligence: Automated filtering and reporting by area names.",
                    "Interactive Metrics: Click dashboard cards for logic definitions.",
                    "Intelligent PIN Wildcards: Auto-mapping via PIN pattern recognition.",
                    "Financial Automation: Unit value and tax level auto-computation."
                  ].map((item, i) => {
                    const [title, desc] = item.split(': ');
                    return (
                      <li key={i} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2.5 text-sm font-black text-foreground/90 uppercase tracking-tight">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-md shadow-primary/30" />
                          {title}
                        </div>
                        <div className="text-xs font-bold text-muted-foreground ml-4 leading-snug">
                          {desc}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-base font-black uppercase text-primary tracking-[0.2em] flex items-center gap-3">
                <HelpCircle className="w-5 h-5" /> Interactive Tutorial
              </h3>
              
              <Accordion type="single" collapsible className="w-full space-y-3">
                <AccordionItem value="step-1" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    <div className="flex items-center gap-3"><LayoutDashboard className="w-4 h-4 text-primary" /> 1. Select Workflow</div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Start by choosing a mode. <span className="text-primary font-black uppercase">Full Control Mode</span> is recommended for official audits, providing access to deep calibration and analytics. <span className="font-black uppercase">Fast Mode</span> is built for instant cleanup tasks.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-2" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    <div className="flex items-center gap-3"><Files className="w-4 h-4 text-primary" /> 2. Stage & Import Data</div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Drag multiple Excel files into the Import Zone. You can review the file list and remove incorrect documents before clicking <span className="font-black underline decoration-primary/30 underline-offset-4">"Process Selected Data"</span>. Use the <span className="font-black">"Add Data"</span> button later to append more files to your batch.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-3" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    <div className="flex items-center gap-3"><Settings className="w-4 h-4 text-primary" /> 3. Global Calibration</div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Open the <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">Global Calibration Panel</span> (Gear Icon) to define Unit Values and Location Names for specific Barangay/Section codes. The engine uses these rules to auto-map data as it processes.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-4" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    <div className="flex items-center gap-3"><Search className="w-4 h-4 text-primary" /> 4. Filter & Analyze</div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Use the <span className="font-black">Barangay Filter</span> to isolate specific areas like "BF Homes". Click on any of the summary cards (e.g., "Engine Cleanup") to see the logic definitions behind the numbers.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-5" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    <div className="flex items-center gap-3"><FileDown className="w-4 h-4 text-primary" /> 5. Smart Batch Export</div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Click <span className="text-primary font-black">"Export Results"</span>. If multiple files are detected, you can choose to download a <span className="font-black uppercase">Single Master File</span> or export <span className="font-black uppercase">Separate Files</span> for each original source document.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-6" className="border-white/10 bg-muted/20 rounded-2xl px-5 border shadow-sm">
                  <AccordionTrigger className="text-sm font-black uppercase hover:no-underline py-5 tracking-tight">
                    <div className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-primary" /> 6. Permanent Audit</div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                    Visit the <span className="font-black">"Audit Log"</span> tab to see your persistent history. Your logs are saved locally on this device and are not removed when you clear your workspace, providing a permanent ledger of your activity.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        <div className="p-8 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
            Audit Ledger v3.1.0 | City of Parañaque
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-emerald-800 font-black uppercase text-xs tracking-widest px-12 h-12 shadow-lg shadow-primary/20">
            End Tutorial & Start Work
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
