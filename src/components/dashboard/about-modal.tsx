
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
  CheckCircle2, 
  Files, 
  Settings2, 
  PieChart, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  FileDown,
  X,
  ArrowRight,
  Database,
  Search,
  LayoutDashboard,
  Clock,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col bg-white border-none p-0 shadow-2xl rounded-2xl">
        {/* Fixed Header with Close Button */}
        <div className="absolute right-6 top-6 z-50">
          <button 
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-vertical-custom">
          {/* Hero Section */}
          <section className="px-12 pt-20 pb-16 text-center space-y-6 bg-gradient-to-b from-slate-50 to-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <ShieldCheck className="w-3 h-3" /> Government Grade Accuracy
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Transform Real Property Data Into Audit-Ready Intelligence
            </h1>
            <p className="text-xl font-medium text-slate-500 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              Automate cleaning, calibration, and standardization of land records—built specifically for government-grade accuracy and efficiency.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Button 
                onClick={() => onOpenChange(false)}
                className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all hover:scale-[1.02] hover:shadow-xl group"
              >
                Run Your First Batch <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline"
                className="h-12 px-8 rounded-xl font-bold border-slate-200 hover:bg-slate-50 transition-all hover:scale-[1.02]"
              >
                Explore Features
              </Button>
            </div>
          </section>

          {/* Value Prop Section */}
          <section className="px-12 py-16 bg-white border-y border-slate-100">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">The Vision</h2>
              <div className="space-y-6">
                <p className="text-2xl font-bold text-slate-800 leading-snug">
                  DataLink Parañaque is a powerful offline-first data processing system designed for the City of Parañaque. It converts messy, multi-file spreadsheets into structured, validated, and audit-ready datasets—eliminating manual errors and saving hundreds of hours in processing time.
                </p>
                <p className="text-xl font-bold text-slate-400">
                  Built for precision, speed, and compliance.
                </p>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="px-12 py-20 bg-white">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Core Engine</h2>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Advanced Feature Suite</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Multi-File Staging", desc: "Drop multiple spreadsheets and review them before processing.", icon: Files },
                { title: "Smart Export Controller", desc: "Granular control over columns, barangays, and data types.", icon: FileDown },
                { title: "Rule-Based Diagnostics", desc: "Get automated explanations for every chart in analytics.", icon: PieChart },
                { title: "Pre-Run Configuration", desc: "Review and toggle engine settings before every run.", icon: Settings2 },
                { title: "Persistent Audit Log", desc: "Automatically saves history of every batch run locally.", icon: ShieldCheck },
                { title: "Intelligent PIN Wildcards", desc: "Auto-mapping via sophisticated pattern recognition.", icon: Cpu },
                { title: "Financial Automation", desc: "Auto-computation based on Parañaque city standards.", icon: Database },
              ].map((feature, i) => (
                <div key={i} className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-white hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-base font-black text-slate-900 mb-2 uppercase tracking-tight">{feature.title}</h4>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Benefits Section */}
          <section className="px-12 py-20 bg-slate-900 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">The Impact</h2>
                <h3 className="text-4xl font-black tracking-tight leading-tight">Operational Excellence for the Real Property Data Division</h3>
                <ul className="space-y-6">
                  {[
                    "Reduce Processing Time by up to 85%",
                    "Eliminate Human Errors in Financial Calculation",
                    "Ensure Full Compliance with City Ordinances",
                    "Maintain 100% Data Transparency and Audit Trails",
                    "Works Entirely Offline for Maximum Security"
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-4 group">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary transition-colors">
                        <CheckCircle2 className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-lg font-bold text-slate-300 group-hover:text-white transition-colors">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-slate-800 border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl">
                   <div className="text-center space-y-4">
                      <div className="text-6xl font-black text-white">100%</div>
                      <div className="text-sm font-black uppercase tracking-widest text-primary">Accuracy Guarantee</div>
                   </div>
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.1),transparent_70%)]" />
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-12 py-20 bg-white">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Process Flow</h2>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">The Path to Clean Data</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { step: "01", title: "Stage & Import Data", desc: "Drag spreadsheets into the staging zone for multi-file processing.", icon: Files },
                { step: "02", title: "Configure Calibration", desc: "Set global unit values and location mapping rules.", icon: Settings2 },
                { step: "03", title: "Run Batch Processor", desc: "Engine performs validation, deduplication, and financial math.", icon: Zap },
                { step: "04", title: "Analyze Results", desc: "Explore data intelligence and geographic distribution reports.", icon: PieChart },
                { step: "05", title: "Export Smartly", desc: "Filter by status and barangay to generate specific reports.", icon: FileDown },
                { step: "06", title: "Track Everything", desc: "Every action is logged in the permanent local audit vault.", icon: Clock },
              ].map((item, i) => (
                <div key={i} className="relative space-y-4">
                  <div className="text-4xl font-black text-slate-100 absolute -top-6 -left-2 z-0">{item.step}</div>
                  <div className="relative z-10 space-y-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                      <item.icon className="w-5 h-5 text-slate-900" />
                    </div>
                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">{item.title}</h4>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-12 py-20 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { quote: "The deduplication engine alone has cleared thousands of duplicate PIN entries that used to take weeks to manually audit.", author: "Data Analyst", role: "Real Property Division" },
                { quote: "DataLink's offline capability is crucial for our field operations. The export controller is intuitive and lightning fast.", author: "Senior Auditor", role: "City Assessor's Office" },
                { quote: "The transition from messy Excel sheets to audit-ready data has completely transformed our workflow efficiency.", author: "Systems Administrator", role: "ICT Department" },
              ].map((t, i) => (
                <div key={i} className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-6">
                  <div className="flex gap-1 text-primary">
                    {[...Array(5)].map((_, j) => <Zap key={j} className="w-3 h-3 fill-current" />)}
                  </div>
                  <p className="text-base font-bold text-slate-700 italic leading-relaxed">"{t.quote}"</p>
                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{t.author}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing / Deployment */}
          <section className="px-12 py-20 bg-white">
            <div className="max-w-xl mx-auto p-10 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden text-center">
              <div className="relative z-10 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Enterprise Access</h3>
                  <h4 className="text-3xl font-black tracking-tight">Custom Government Deployment</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Storage", val: "Offline-First" },
                    { label: "Runs", val: "Unlimited" },
                    { label: "Audit", val: "Persistent" },
                    { label: "Format", val: "Smart Export" }
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="text-[10px] font-black uppercase text-slate-500 mb-1">{item.label}</div>
                      <div className="text-sm font-bold text-white">{item.val}</div>
                    </div>
                  ))}
                </div>
                <Button className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs">
                  Request Internal Access
                </Button>
              </div>
              <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
            </div>
          </section>

          {/* FAQ */}
          <section className="px-12 py-20 bg-white">
            <div className="max-w-2xl mx-auto space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Support</h2>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h3>
              </div>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {[
                  { q: "Is this cloud-based?", a: "No. DataLink Parañaque is built with an offline-first architecture. Your data remains strictly on your local device or internal server for maximum security and compliance." },
                  { q: "Can it handle multiple files?", a: "Yes. You can drag and drop dozens of spreadsheets into the Import Zone. The engine will stage them for simultaneous batch processing." },
                  { q: "Is data saved locally?", a: "Yes. Using advanced local persistence technology, your processing reports, calibration rules, and session state are stored securely in your browser's local vault." },
                  { q: "Does it follow city rules?", a: "Absolutely. The engine is pre-calibrated with Parañaque's official Barangay indices, section codes, and assessment level standards." },
                ].map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border border-slate-100 bg-slate-50 rounded-2xl px-6">
                    <AccordionTrigger className="hover:no-underline text-base font-black text-slate-900 uppercase tracking-tight py-6">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-base font-medium text-slate-500 leading-relaxed pb-6">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-12 py-24 bg-gradient-to-t from-slate-50 to-white text-center space-y-8">
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">Start Processing Smarter Today</h3>
            <Button 
              size="lg"
              onClick={() => onOpenChange(false)}
              className="h-16 px-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:scale-[1.02] transition-all group"
            >
              Run Batch Processor Now <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <div className="pt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              DataLink Parañaque v3.1.0 • Built for Excellence
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
