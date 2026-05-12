
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Barangay, BarangayConfig, allBarangays, SectionConfig, initialLocationSettings } from '@/lib/locations';
import { TaxRateMap } from '@/lib/processor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Percent, MapPin, Save, Info, RotateCcw, Plus, Trash2, X, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const LOCAL_STORAGE_KEY = 'paranaque_datalink_v31';

const defaultTaxRates: TaxRateMap = {
    "RESI": { assessmentLevel: 0.20, taxRate: 0.02 },
    "COMM": { assessmentLevel: 0.50, taxRate: 0.03 },
    "INDU": { assessmentLevel: 0.50, taxRate: 0.03 },
    "AGRI": { assessmentLevel: 0.20, taxRate: 0.025 },
    "GOV": { assessmentLevel: 0.15, taxRate: 0.00 },
    "SPEC": { assessmentLevel: 0.15, taxRate: 0.025 },
    "SPC1": { assessmentLevel: 0.15, taxRate: 0.025 },
    "SPC2": { assessmentLevel: 0.15, taxRate: 0.025 },
    "SPC3": { assessmentLevel: 0.15, taxRate: 0.025 },
    "SPC4": { assessmentLevel: 0.15, taxRate: 0.025 },
    "SPC5": { assessmentLevel: 0.15, taxRate: 0.025 },
};

type EditableSectionConfig = SectionConfig & { originalIndex: number };

const parseSectionKey = (key: string): { base: string; filter: string } => {
    const parts = key.split(/-(.+)/);
    if (parts.length > 1) {
        return { base: parts[0].trim(), filter: parts[1].trim() };
    }
    return { base: key.trim(), filter: '' };
};

const buildSectionKey = (base: string, filter: string): string => {
    const cleanFilter = filter.trim();
    if (!cleanFilter || cleanFilter.toUpperCase() === 'ALL LOTS') {
        return base.trim();
    }
    return `${base.trim()}-${cleanFilter}`;
};

interface SettingsOverlayProps {
    onClose: () => void;
}

export function SettingsOverlay({ onClose }: SettingsOverlayProps) {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [locationSettings, setLocationSettings] = useState<BarangayConfig[]>(initialLocationSettings);
  const [taxRates, setTaxRates] = useState<TaxRateMap>(defaultTaxRates);
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | undefined>(allBarangays[0]);
  const [currentSections, setCurrentSections] = useState<EditableSectionConfig[]>([]);
  const [currentTaxRates, setCurrentTaxRates] = useState<TaxRateMap>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<'location' | 'rates'>('location');

  const containerRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const ratesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.locationSettings) setLocationSettings(parsed.locationSettings);
        if (parsed.taxRates) setTaxRates(parsed.taxRates);
      }
    } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      if (selectedBarangay) {
        const barangayData = locationSettings.find(b => b.barangayCode === selectedBarangay.barangayCode);
        const sectionsWithIds = (barangayData?.sections || []).map((section, index) => ({
          ...section,
          originalIndex: index,
        }));
        setCurrentSections(sectionsWithIds.sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true })));
      }
      setCurrentTaxRates({ ...taxRates });
    }
  }, [isClient, selectedBarangay, locationSettings, taxRates]);

  const scrollToSection = (section: 'location' | 'rates') => {
    setActiveSection(section);
    const targetRef = section === 'location' ? locationRef : ratesRef;
    if (targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setLocationSettings(initialLocationSettings);
    setTaxRates(defaultTaxRates);
    setSelectedBarangay(allBarangays[0]);
    toast({ title: "Data Restored", description: "Calibration rules have been reset to factory defaults." });
  };

  const handleSaveChanges = () => {
    const sectionsToSave = currentSections.map(({ originalIndex, ...rest }) => rest);
    const newLocationSettings = locationSettings.map(b => {
      if (selectedBarangay && b.barangayCode === selectedBarangay.barangayCode) {
        return { ...b, sections: sectionsToSave };
      }
      return b;
    });

    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : {};
        const payload = JSON.stringify({ ...parsed, locationSettings: newLocationSettings, taxRates: currentTaxRates });
        localStorage.setItem(LOCAL_STORAGE_KEY, payload);
        toast({ title: "Settings Saved", description: "Calibration rules and tax rates have been updated successfully." });
        onClose();
    } catch(e) {
        toast({ variant: 'destructive', title: "Error Saving Settings", description: "Could not save settings to local storage." });
    }
  };

  const handleAddSection = () => {
    if (!selectedBarangay) return;
    setSearchTerm('');
    const newSection: EditableSectionConfig = { section: '000', location: 'NEW CUSTOM LOCATION', unitValue: 0, originalIndex: Date.now() };
    setCurrentSections(prev => [newSection, ...prev]);
    toast({ title: "New Mapping Added", description: "A blank entry has been created at the top of the list." });
  };

  const handleDeleteSection = (originalIndex: number) => {
    setCurrentSections(prev => prev.filter(s => s.originalIndex !== originalIndex));
  };

  const handleLocationUpdate = (originalIndex: number, field: 'location' | 'unitValue', value: string | number) => {
    setCurrentSections(prev => prev.map(sec => sec.originalIndex === originalIndex ? { ...sec, [field]: field === 'unitValue' ? Number(value) : value } : sec));
  };
  
  const handleKeyPartUpdate = (originalIndex: number, partToUpdate: 'base' | 'filter', newValue: string) => {
    setCurrentSections(prev => {
        const sectionToUpdate = prev.find(s => s.originalIndex === originalIndex);
        if (!sectionToUpdate) return prev;
        const { base: oldBase, filter: oldFilter } = parseSectionKey(sectionToUpdate.section);
        const newBase = partToUpdate === 'base' ? newValue : oldBase;
        const newFilter = partToUpdate === 'filter' ? newValue : oldFilter;
        const newFullKey = buildSectionKey(newBase, newFilter);
        return prev.map(sec => sec.originalIndex === originalIndex ? { ...sec, section: newFullKey } : sec);
    });
  };

  const handleRateUpdate = (usage: string, field: keyof TaxRateMap[string], value: number) => {
    setCurrentTaxRates(prev => ({ ...prev, [usage]: { ...prev[usage], [field]: value / 100 } }));
  };

  const filteredSections = currentSections.filter(s => s.section.toLowerCase().includes(searchTerm.toLowerCase()) || s.location.toLowerCase().includes(searchTerm.toLowerCase()));
  
  if (!isClient) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right duration-500">
        <header className="px-8 py-6 border-b shrink-0 flex items-center justify-between bg-card/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Configuration Panel</h1>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Parañaque Smart Calibration Suite</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest h-10 text-orange-600 hover:bg-muted hover:text-orange-700">
                      <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset Defaults
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Restore Factory Defaults?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm font-bold text-muted-foreground leading-relaxed">
                        This will overwrite all custom calibration rules and unit values with the official Parañaque schedule.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3">
                      <AlertDialogCancel className="font-black uppercase text-xs h-10 px-6 hover:bg-muted hover:text-foreground">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetToDefaults} className="bg-orange-600 hover:bg-orange-700 hover:text-white font-black uppercase text-xs h-10 px-8">Confirm Reset</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted transition-all">
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <div className="w-[70px] bg-muted/20 border-r flex flex-col items-center py-8 gap-8 shrink-0">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button 
                                onClick={() => scrollToSection('location')}
                                className={cn(
                                    "p-3 rounded-2xl transition-all duration-300 group relative",
                                    activeSection === 'location' ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-card text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                )}
                            >
                                <MapPin className="w-6 h-6" />
                                {activeSection === 'location' && <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-full" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-black uppercase text-[10px] tracking-widest">Location Mappings</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button 
                                onClick={() => scrollToSection('rates')}
                                className={cn(
                                    "p-3 rounded-2xl transition-all duration-300 group relative",
                                    activeSection === 'rates' ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-card text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                )}
                            >
                                <Percent className="w-6 h-6" />
                                {activeSection === 'rates' && <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-full" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-black uppercase text-[10px] tracking-widest">Tax & Assessment</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <main ref={containerRef} className="flex-1 overflow-y-auto scrollbar-vertical-custom bg-card/30 p-10 space-y-24 pb-32">
                <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" ref={locationRef}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Location Intelligence</h3>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Calibrate unit values per barangay section</p>
                        </div>
                    </div>
                    <Button onClick={handleAddSection} className="h-10 px-6 font-black uppercase text-[10px] tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 hover:text-white shadow-xl shadow-emerald-500/10">
                      <Plus className="w-4 h-4" /> Add Custom Mapping
                    </Button>
                  </div>
                  
                  <Card className="p-8 bg-muted/10 border-white/5 shadow-inner rounded-3xl">
                      <div className="grid grid-cols-5 items-center gap-10 mb-8">
                          <Label htmlFor="barangay-select" className="text-right col-span-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                              Scope Barangay
                          </Label>
                          <Select value={selectedBarangay?.name} onValueChange={(name) => setSelectedBarangay(allBarangays.find(b => b.name === name))}>
                              <SelectTrigger className="col-span-3 h-12 text-sm font-bold uppercase rounded-xl border-white/10" id="barangay-select">
                                  <SelectValue placeholder="Select a barangay" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-white/10">
                                  {allBarangays.map(b => (
                                      <SelectItem key={b.barangayCode} value={b.name} className="font-bold text-[11px] uppercase">{b.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          <div className="h-12 flex items-center justify-center px-4 bg-background/50 rounded-xl border border-white/10 font-mono text-xs font-black text-primary">
                            CODE: {selectedBarangay?.barangayCode || '---'}
                          </div>
                      </div>
                      <div className="relative">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
                          <Input 
                              placeholder="Search section patterns, filters, or specific locations..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-14 h-14 text-sm font-bold rounded-2xl border-white/10 focus-visible:ring-primary/30"
                          />
                      </div>
                  </Card>

                  <div className="border rounded-3xl overflow-hidden bg-card/50 flex flex-col shadow-2xl border-white/5 min-h-[500px]">
                    <div className="bg-muted/30 backdrop-blur-md p-6 border-b shrink-0">
                        <div className="grid grid-cols-12 gap-6 items-center">
                            <div className="col-span-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Section ID</div>
                            <div className="col-span-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Lot Range</div>
                            <div className="col-span-5 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assessed Location Name</div>
                            <div className="col-span-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Base Unit Val</div>
                            <div className="col-span-1 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Action</div>
                        </div>
                    </div>
                    <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto scrollbar-vertical-custom">
                      {filteredSections.length > 0 ? (
                        filteredSections.map((location) => {
                            const { base, filter } = parseSectionKey(location.section);
                            return (
                              <div key={location.originalIndex} className="grid grid-cols-12 gap-6 items-center group animate-in fade-in duration-300">
                                  <Input
                                      className="col-span-2 font-mono h-11 text-xs bg-background/40 font-black border-white/5 hover:border-primary/20 transition-all rounded-lg"
                                      value={base}
                                      onChange={(e) => handleKeyPartUpdate(location.originalIndex, 'base', e.target.value)}
                                  />
                                  <Input
                                      className="col-span-2 font-mono text-[10px] h-11 bg-background/40 border-white/5 hover:border-primary/20 transition-all rounded-lg"
                                      value={filter}
                                      placeholder="ALL LOTS"
                                      onChange={(e) => handleKeyPartUpdate(location.originalIndex, 'filter', e.target.value)}
                                  />
                                  <Input
                                      className="col-span-5 h-11 text-xs bg-background/40 uppercase font-black tracking-tight border-white/5 hover:border-primary/20 transition-all rounded-lg"
                                      value={location.location}
                                      onChange={(e) => handleLocationUpdate(location.originalIndex, 'location', e.target.value)}
                                  />
                                  <div className="col-span-2 relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-primary font-black">₱</span>
                                      <Input
                                          type="number"
                                          className="pl-7 font-mono h-11 text-xs bg-background/40 font-black tabular-nums border-white/5 hover:border-primary/20 transition-all rounded-lg"
                                          value={location.unitValue || ''}
                                          placeholder="0"
                                          onChange={(e) => handleLocationUpdate(location.originalIndex, 'unitValue', e.target.value)}
                                      />
                                  </div>
                                  <div className="col-span-1 flex justify-center">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleDeleteSection(location.originalIndex)}
                                      className="h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-muted rounded-xl transition-all"
                                    >
                                      <Trash2 className="w-4.5 h-4.5" />
                                    </Button>
                                  </div>
                              </div>
                            )
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                          <div className="p-5 rounded-full bg-muted/50 mb-6"><MapPin className="w-10 h-10 opacity-20" /></div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">No section data found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150" ref={ratesRef}>
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-8 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]" />
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Financial Calibration</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Update assessment levels and tax rates</p>
                    </div>
                  </div>

                  <Card className="p-8 bg-blue-600/5 border border-blue-600/20 rounded-3xl">
                      <div className="flex items-start gap-4">
                          <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-sm font-bold leading-relaxed text-muted-foreground uppercase">
                            Global multipliers for <span className="text-foreground font-black">Actual Use (AU)</span> calculations. These rates determine the fiscal output for all post-processed property records.
                          </p>
                      </div>
                  </Card>
                  
                  <div className="border rounded-3xl overflow-hidden bg-card/50 flex flex-col shadow-2xl border-white/5">
                    <div className="bg-muted/30 backdrop-blur-md p-6 border-b shrink-0">
                        <div className="grid grid-cols-12 gap-10 items-center">
                            <div className="col-span-3 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Usage Code (AU)</div>
                            <div className="col-span-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assessment Level (%)</div>
                            <div className="col-span-5 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Tax Rate (%)</div>
                        </div>
                    </div>
                    <div className="p-10 space-y-6">
                      {Object.keys(currentTaxRates).sort().map((au) => (
                        <div key={au} className="grid grid-cols-12 gap-10 items-center group transition-all">
                          <div className="col-span-3 font-black text-[13px] uppercase text-foreground/80 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-600/30 group-hover:bg-blue-600 transition-colors" />
                            {au}
                          </div>
                          <div className="col-span-4 relative">
                            <Input
                              type="number"
                              className="h-12 text-sm pr-10 font-mono font-black text-right bg-background/40 border-white/5 rounded-xl focus-visible:ring-blue-600/30"
                              value={Math.round((currentTaxRates[au].assessmentLevel * 100))}
                              onChange={(e) => handleRateUpdate(au, 'assessmentLevel', Number(e.target.value))}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-muted-foreground">%</span>
                          </div>
                          <div className="col-span-5 relative">
                            <Input
                              type="number"
                              step="0.1"
                              className="h-12 text-sm pr-10 font-mono font-black text-right bg-background/40 border-white/5 rounded-xl focus-visible:ring-blue-600/30"
                              value={(currentTaxRates[au].taxRate * 100)}
                              onChange={(e) => handleRateUpdate(au, 'taxRate', Number(e.target.value))}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-muted-foreground">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
            </main>
        </div>

        <footer className="p-8 border-t bg-card/80 backdrop-blur-xl flex justify-end shrink-0 gap-4 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
            <Button variant="ghost" className="font-black uppercase text-[11px] tracking-widest h-14 px-10 rounded-2xl hover:bg-muted hover:text-foreground" onClick={onClose}>Discard Changes</Button>
            <Button className="font-black uppercase text-[11px] tracking-widest h-14 px-14 bg-primary hover:bg-emerald-800 hover:text-white shadow-2xl shadow-primary/20 rounded-2xl" onClick={handleSaveChanges}>
                <Save className="w-5 h-5 mr-3" />
                Commit Configuration
            </Button>
        </footer>
    </div>
  );
}
