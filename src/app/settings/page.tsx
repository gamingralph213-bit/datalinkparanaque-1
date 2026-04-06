
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
import { Search, Percent, MapPin, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { ModeToggle } from '@/components/mode-toggle';

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

export default function SettingsPage() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [locationSettings, setLocationSettings] = useState<BarangayConfig[]>(initialLocationSettings);
  const [taxRates, setTaxRates] = useState<TaxRateMap>(defaultTaxRates);
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | undefined>(allBarangays[0]);
  const [currentSections, setCurrentSections] = useState<EditableSectionConfig[]>([]);
  const [currentTaxRates, setCurrentTaxRates] = useState<TaxRateMap>({});
  const [searchTerm, setSearchTerm] = useState('');

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
        const payload = JSON.stringify({
            ...parsed,
            locationSettings: newLocationSettings,
            taxRates: currentTaxRates
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, payload);

        toast({
          title: "Settings Saved",
          description: "Calibration rules and tax rates have been updated successfully.",
        });
        window.location.href = '/';
    } catch(e) {
        toast({
            variant: 'destructive',
            title: "Error Saving Settings",
            description: "Could not save settings to local storage.",
        });
    }
  };

  const handleLocationUpdate = (
    originalIndex: number,
    field: 'location' | 'unitValue',
    value: string | number
  ) => {
    setCurrentSections(prev => 
      prev.map(sec => {
        if (sec.originalIndex === originalIndex) {
          const updatedValue = field === 'unitValue' ? Number(value) : value;
          return { ...sec, [field]: updatedValue };
        }
        return sec;
      })
    );
  };
  
  const handleKeyPartUpdate = (originalIndex: number, partToUpdate: 'base' | 'filter', newValue: string) => {
    setCurrentSections(prev => {
        const tempSections = prev.map(s => ({...s}));
        const sectionToUpdate = tempSections.find(s => s.originalIndex === originalIndex);
        if (!sectionToUpdate) return prev;

        const { base: oldBase, filter: oldFilter } = parseSectionKey(sectionToUpdate.section);
        const newBase = partToUpdate === 'base' ? newValue : oldBase;
        const newFilter = partToUpdate === 'filter' ? newValue : oldFilter;
        const newFullKey = buildSectionKey(newBase, newFilter);

        return prev.map(sec => 
            sec.originalIndex === originalIndex ? { ...sec, section: newFullKey } : sec
        );
    });
  };

  const handleRateUpdate = (usage: string, field: keyof TaxRateMap[string], value: number) => {
    setCurrentTaxRates(prev => ({
      ...prev,
      [usage]: {
        ...prev[usage],
        [field]: value / 100
      }
    }));
  };

  const filteredSections = currentSections.filter(
    (s) =>
      s.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (!isClient) return null; // Or a loading spinner

  return (
    <div className="h-screen bg-background flex flex-col font-body overflow-hidden">
        <header className="bg-card/80 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg shrink-0 z-50">
            <div className="flex items-center gap-4">
                <a href="/">
                    <Button variant="outline" size="icon" className="h-10 w-10">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </a>
                <div>
                    <h1 className="text-xl font-black tracking-tight text-foreground">Global Calibration Panel</h1>
                    <p className="text-sm text-muted-foreground font-bold">Manage processing rules and financial tax rates.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <ModeToggle />
            </div>
        </header>

        <main className="flex-1 flex flex-col p-8 overflow-y-auto scrollbar-vertical-custom gap-12">
            {/* SECTION 1: LOCATION CALIBRATION */}
            <section className="space-y-6" ref={locationRef}>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-base font-black uppercase tracking-wider">Location Mappings</h3>
              </div>
              
              <Card className="p-6 bg-muted/20 border-white/5 shadow-inner">
                  <div className="grid grid-cols-5 items-center gap-6 mb-6">
                      <Label htmlFor="barangay-select" className="text-right col-span-1 text-sm font-black uppercase tracking-tight">
                          Barangay
                      </Label>
                      <Select value={selectedBarangay?.name} onValueChange={(name) => setSelectedBarangay(allBarangays.find(b => b.name === name))}>
                          <SelectTrigger className="col-span-3 h-11 text-sm font-semibold" id="barangay-select">
                              <SelectValue placeholder="Select a barangay" />
                          </SelectTrigger>
                          <SelectContent>
                              {allBarangays.map(b => (
                                  <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      <Input 
                          readOnly 
                          value={selectedBarangay?.barangayCode || '---'} 
                          className="h-11 bg-muted/50 text-center font-mono text-sm font-black"
                      />
                  </div>
                  <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input 
                          placeholder="Search section, filter, or location..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-11 h-11 text-sm font-medium"
                      />
                  </div>
              </Card>

              <div className="border rounded-xl overflow-hidden bg-muted/20 flex flex-col shadow-inner">
                <div className="bg-muted/80 backdrop-blur-sm p-5 border-b shrink-0">
                    <div className="grid grid-cols-12 gap-5 items-center">
                        <div className="col-span-2 text-xs font-black uppercase text-muted-foreground tracking-wide">Section</div>
                        <div className="col-span-3 text-xs font-black uppercase text-muted-foreground tracking-wide">Lot Filter</div>
                        <div className="col-span-5 text-xs font-black uppercase text-muted-foreground tracking-wide">Location Name</div>
                        <div className="col-span-2 text-xs font-black uppercase text-muted-foreground tracking-wide">Unit Value</div>
                    </div>
                </div>
                <div className="p-5 space-y-3 max-h-[550px] overflow-y-auto scrollbar-vertical-custom">
                  {filteredSections.map((location) => {
                      const { base, filter } = parseSectionKey(location.section);
                      return (
                        <div key={location.originalIndex} className="grid grid-cols-12 gap-5 items-center group">
                            <Input
                                className="col-span-2 font-mono h-10 text-sm bg-background font-bold"
                                value={base}
                                onChange={(e) => handleKeyPartUpdate(location.originalIndex, 'base', e.target.value)}
                            />
                            <Input
                                className="col-span-3 font-mono text-xs h-10 bg-background"
                                value={filter}
                                placeholder="ALL LOTS"
                                onChange={(e) => handleKeyPartUpdate(location.originalIndex, 'filter', e.target.value)}
                            />
                            <Input
                                className="col-span-5 h-10 text-sm bg-background uppercase font-black tracking-tight"
                                value={location.location}
                                onChange={(e) => handleLocationUpdate(location.originalIndex, 'location', e.target.value)}
                            />
                            <div className="col-span-2 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-black">₱</span>
                                <Input
                                    type="number"
                                    className="pl-6 font-mono h-10 text-sm bg-background font-black tabular-nums"
                                    value={location.unitValue || ''}
                                    placeholder="0"
                                    onChange={(e) => handleLocationUpdate(location.originalIndex, 'unitValue', e.target.value)}
                                />
                            </div>
                        </div>
                      )
                  })}
                </div>
              </div>
            </section>

            <Separator className="opacity-30" />

            {/* SECTION 2: RATES CALIBRATION */}
            <section className="space-y-6 pb-10" ref={ratesRef}>
              <div className="flex items-center gap-3">
                <Percent className="w-5 h-5 text-primary" />
                <h3 className="text-base font-black uppercase tracking-wider">Tax & Assessment Calibration</h3>
              </div>

              <Card className="p-6 bg-primary/5 border border-primary/20">
                  <p className="text-sm font-bold leading-relaxed text-muted-foreground">
                    <span className="font-black text-primary uppercase mr-2">Financial Settings:</span> These rates determine how Assessed Value and Yearly Tax are calculated based on <span className="font-black text-foreground underline decoration-primary/30 underline-offset-4">Actual Use (AU)</span>.
                  </p>
              </Card>
              
              <div className="border rounded-xl overflow-hidden bg-muted/20 flex flex-col shadow-inner">
                <div className="bg-muted/80 backdrop-blur-sm p-5 border-b shrink-0">
                    <div className="grid grid-cols-12 gap-8 items-center">
                        <div className="col-span-3 text-xs font-black uppercase text-muted-foreground tracking-wide">Usage Code (AU)</div>
                        <div className="col-span-4 text-xs font-black uppercase text-muted-foreground tracking-wide">Assessment Level (%)</div>
                        <div className="col-span-5 text-xs font-black uppercase text-muted-foreground tracking-wide">Tax Rate (%)</div>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                  {Object.keys(currentTaxRates).sort().map((au) => (
                    <div key={au} className="grid grid-cols-12 gap-8 items-center">
                      <div className="col-span-3 font-black text-sm uppercase text-emerald-900 dark:text-emerald-400">
                        {au}
                      </div>
                      <div className="col-span-4 relative">
                        <Input
                          type="number"
                          className="h-10 text-sm pr-8 font-mono font-black text-right"
                          value={Math.round((currentTaxRates[au].assessmentLevel * 100))}
                          onChange={(e) => handleRateUpdate(au, 'assessmentLevel', Number(e.target.value))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">%</span>
                      </div>
                      <div className="col-span-5 relative">
                        <Input
                          type="number"
                          step="0.1"
                          className="h-10 text-sm pr-8 font-mono font-black text-right"
                          value={(currentTaxRates[au].taxRate * 100)}
                          onChange={(e) => handleRateUpdate(au, 'taxRate', Number(e.target.value))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
        </main>
        <footer className="p-6 border-t bg-card/80 backdrop-blur-sm flex justify-end shrink-0 gap-4">
            <a href="/">
                <Button variant="outline" className="font-black uppercase text-xs h-12 px-8">Discard Changes</Button>
            </a>
            <Button className="font-black uppercase text-xs h-12 px-12 bg-primary hover:bg-emerald-800 shadow-lg" onClick={handleSaveChanges}>
                <Save className="w-4 h-4 mr-2" />
                Update Global Settings
            </Button>
        </footer>
    </div>
  );
}
