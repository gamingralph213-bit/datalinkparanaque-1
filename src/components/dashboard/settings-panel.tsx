"use client";

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Barangay, BarangayConfig, allBarangays, SectionConfig } from '@/lib/locations';
import { TaxRateMap } from '@/lib/processor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Percent, MapPin, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationSettings: BarangayConfig[];
  onSettingsChange: (newSettings: BarangayConfig[]) => void;
  taxRates: TaxRateMap;
  onTaxRatesChange: (newRates: TaxRateMap) => void;
}

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

export function SettingsPanel({
  open,
  onOpenChange,
  locationSettings,
  onSettingsChange,
  taxRates,
  onTaxRatesChange,
}: SettingsPanelProps) {
  const { toast } = useToast();
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | undefined>(allBarangays[0]);
  const [currentSections, setCurrentSections] = useState<EditableSectionConfig[]>([]);
  const [currentTaxRates, setCurrentTaxRates] = useState<TaxRateMap>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
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
  }, [open, selectedBarangay, locationSettings, taxRates]);

  const handleSaveChanges = () => {
    const sectionsToSave = currentSections.map(({ originalIndex, ...rest }) => rest);
    const newSettings = locationSettings.map(b => {
      if (selectedBarangay && b.barangayCode === selectedBarangay.barangayCode) {
        return { ...b, sections: sectionsToSave };
      }
      return b;
    });

    onSettingsChange(newSettings);
    onTaxRatesChange(currentTaxRates);

    toast({
      title: "Settings Saved",
      description: "Calibration rules and tax rates have been updated successfully.",
    });
    onOpenChange(false);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[900px] sm:max-w-[900px] flex flex-col bg-card/95 backdrop-blur-xl border-white/10">
        <SheetHeader className="shrink-0">
          <SheetTitle className="text-2xl font-black text-gradient uppercase">Global Calibration Panel</SheetTitle>
          <SheetDescription className="font-medium">
            Manage your land data processing rules and financial tax rates in one view.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-vertical-custom space-y-10 py-6 pr-2">
          {/* SECTION 1: LOCATION CALIBRATION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-wider">Location Mappings</h3>
            </div>
            
            <div className="flex flex-col gap-4 px-1">
                <div className="grid grid-cols-5 items-center gap-4">
                    <Label htmlFor="barangay-select" className="text-right col-span-1 text-xs font-black uppercase">
                        Barangay
                    </Label>
                    <Select value={selectedBarangay?.name} onValueChange={(name) => setSelectedBarangay(allBarangays.find(b => b.name === name))}>
                        <SelectTrigger className="col-span-3 h-9 text-xs" id="barangay-select">
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
                        className="h-9 bg-muted/50 text-center font-mono text-xs font-black"
                    />
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search section, filter, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-xs"
                    />
                </div>
            </div>

            <div className="border rounded-md overflow-hidden bg-muted/20 min-h-[400px] flex flex-col">
              <div className="bg-muted/80 backdrop-blur-sm p-4 border-b shrink-0">
                  <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2 text-[10px] font-black uppercase text-muted-foreground">Section</div>
                      <div className="col-span-3 text-[10px] font-black uppercase text-muted-foreground">Lot Filter</div>
                      <div className="col-span-5 text-[10px] font-black uppercase text-muted-foreground">Location Name</div>
                      <div className="col-span-2 text-[10px] font-black uppercase text-muted-foreground">Unit Value</div>
                  </div>
              </div>
              <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto scrollbar-vertical-custom">
                {filteredSections.map((location) => {
                    const { base, filter } = parseSectionKey(location.section);
                    return (
                      <div key={location.originalIndex} className="grid grid-cols-12 gap-4 items-center group">
                          <Input
                              className="col-span-2 font-mono h-8 text-xs bg-background"
                              value={base}
                              onChange={(e) => handleKeyPartUpdate(location.originalIndex, 'base', e.target.value)}
                          />
                          <Input
                              className="col-span-3 font-mono text-[10px] h-8 bg-background"
                              value={filter}
                              placeholder="ALL LOTS"
                              onChange={(e) => handleKeyPartUpdate(location.originalIndex, 'filter', e.target.value)}
                          />
                          <Input
                              className="col-span-5 h-8 text-xs bg-background uppercase font-bold"
                              value={location.location}
                              onChange={(e) => handleLocationUpdate(location.originalIndex, 'location', e.target.value)}
                          />
                          <div className="col-span-2 relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-black">₱</span>
                              <Input
                                  type="number"
                                  className="pl-5 font-mono h-8 text-xs bg-background"
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
          </div>

          <Separator className="opacity-50" />

          {/* SECTION 2: RATES CALIBRATION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Percent className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-wider">Tax & Assessment Calibration</h3>
            </div>

            <div className="px-1">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                  <span className="font-black text-primary uppercase">Financial Settings:</span> These rates determine how Assessed Value and Yearly Tax are calculated based on <span className="font-bold">Actual Use (AU)</span>.
                </p>
              </div>
            </div>
            
            <div className="border rounded-md overflow-hidden bg-muted/20 flex flex-col">
              <div className="bg-muted/80 backdrop-blur-sm p-4 border-b shrink-0">
                  <div className="grid grid-cols-12 gap-6 items-center">
                      <div className="col-span-3 text-[10px] font-black uppercase text-muted-foreground">Usage Code (AU)</div>
                      <div className="col-span-4 text-[10px] font-black uppercase text-muted-foreground">Assessment Level (%)</div>
                      <div className="col-span-5 text-[10px] font-black uppercase text-muted-foreground">Tax Rate (%)</div>
                  </div>
              </div>
              <div className="p-4 space-y-3">
                {Object.keys(currentTaxRates).sort().map((au) => (
                  <div key={au} className="grid grid-cols-12 gap-6 items-center">
                    <div className="col-span-3 font-black text-xs uppercase text-emerald-900 dark:text-emerald-400">
                      {au}
                    </div>
                    <div className="col-span-4 relative">
                      <Input
                        type="number"
                        className="h-8 text-xs pr-6 font-mono font-bold"
                        value={Math.round((currentTaxRates[au].assessmentLevel * 100))}
                        onChange={(e) => handleRateUpdate(au, 'assessmentLevel', Number(e.target.value))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">%</span>
                    </div>
                    <div className="col-span-5 relative">
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8 text-xs pr-6 font-mono font-bold"
                        value={(currentTaxRates[au].taxRate * 100)}
                        onChange={(e) => handleRateUpdate(au, 'taxRate', Number(e.target.value))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="pt-6 border-t mt-4 shrink-0 bg-card/50 backdrop-blur-sm">
          <Button variant="outline" className="font-bold uppercase text-[10px]" onClick={() => onOpenChange(false)}>Discard Changes</Button>
          <Button className="font-black uppercase text-[10px] bg-primary hover:bg-emerald-800" onClick={handleSaveChanges}>
            Update Global Settings
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
