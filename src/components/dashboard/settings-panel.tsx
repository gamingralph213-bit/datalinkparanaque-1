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
import { BarangayConfig, SectionConfig } from '@/lib/locations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationSettings: BarangayConfig[];
  onLocationSettingsChange: (settings: BarangayConfig[]) => void;
}

export function SettingsPanel({
  open,
  onOpenChange,
  locationSettings,
  onLocationSettingsChange,
}: SettingsPanelProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<BarangayConfig[]>(locationSettings);
  const [selectedBarangay, setSelectedBarangay] = useState<string>(
    locationSettings[0]?.name || ''
  );
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      // Deep copy to ensure edits don't affect the main state until saved
      setLocalSettings(JSON.parse(JSON.stringify(locationSettings)));
      // Ensure selected barangay is valid
      if (!locationSettings.some(b => b.name === selectedBarangay)) {
        setSelectedBarangay(locationSettings[0]?.name || '');
      }
    }
  }, [open, locationSettings, selectedBarangay]);
  
  const handleSaveChanges = () => {
    onLocationSettingsChange(localSettings);
    toast({
        title: "Settings Saved",
        description: "Your location & unit value settings have been updated.",
    });
    onOpenChange(false);
  };

  const handleSectionUpdate = (
    sectionKey: string,
    field: keyof SectionConfig | 'lotFilter',
    value: string | number
  ) => {
    setLocalSettings(prevSettings => {
        const newSettings = JSON.parse(JSON.stringify(prevSettings));
        const brgyToUpdate = newSettings.find(b => b.name === selectedBarangay);
        if (!brgyToUpdate) return prevSettings;

        const sectionIndex = brgyToUpdate.sections.findIndex(s => s.section === sectionKey);
        if (sectionIndex === -1) return prevSettings;
        
        const sectionToUpdate = brgyToUpdate.sections[sectionIndex];

        if (field === 'lotFilter') {
            const baseSection = sectionToUpdate.section.split(/-(.+)/s)[0];
            const newFilter = String(value);
            sectionToUpdate.section = newFilter ? `${baseSection}-${newFilter}` : baseSection;
        } else if (field === 'unitValue') {
             sectionToUpdate.unitValue = typeof value === 'string' ? parseFloat(value) : value;
        } else if (field === 'location') {
             sectionToUpdate.location = String(value);
        }

        return newSettings;
    });
  };

  const currentBarangayData = localSettings.find(
    (b) => b.name === selectedBarangay
  );

  const filteredSections = currentBarangayData?.sections.filter(
    (s) =>
      s.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Location & Unit Value Settings</SheetTitle>
          <SheetDescription>
            Manage default location names and unit values based on Barangay Code and Section from the PIN. Changes are saved for future sessions.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
            <div className="grid grid-cols-5 items-center gap-2 px-1">
                <Label htmlFor="barangay-select" className="text-right col-span-1">
                    Barangay
                </Label>
                <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
                    <SelectTrigger className="col-span-3" id="barangay-select">
                        <SelectValue placeholder="Select a barangay" />
                    </SelectTrigger>
                    <SelectContent>
                        {localSettings.map(b => (
                            <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input 
                    readOnly 
                    value={currentBarangayData?.barangayCode || '---'} 
                    className="h-10 bg-muted/50 text-center font-mono"
                    title="Barangay Code"
                />
            </div>
            <div className="relative px-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search section, lot filter, or location name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>
            <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
              <div className="sticky top-0 bg-muted/80 backdrop-blur-sm p-4 border-b z-10">
                  <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2 text-xs font-bold uppercase text-muted-foreground">Section</div>
                      <div className="col-span-3 text-xs font-bold uppercase text-muted-foreground">Lot Filter</div>
                      <div className="col-span-5 text-xs font-bold uppercase text-muted-foreground">Location Name</div>
                      <div className="col-span-2 text-xs font-bold uppercase text-muted-foreground">Unit Value</div>
                  </div>
              </div>
              <div className="overflow-y-auto scrollbar-vertical-custom flex-1">
                <div className="p-4 space-y-4">
                {filteredSections.map((section, index) => {
                    const sectionParts = section.section.split(/-(.+)/s);
                    const baseSection = sectionParts[0];
                    const lotPattern = sectionParts.length > 1 ? sectionParts[1] : '';

                    return (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-2 font-mono font-bold truncate" title={baseSection}>
                                {baseSection}
                            </div>
                            <Input
                              className="col-span-3 text-[10px] font-mono"
                              value={lotPattern}
                              placeholder="ALL LOTS"
                              onChange={(e) => handleSectionUpdate(section.section, 'lotFilter', e.target.value)}
                            />
                            <Input
                                className="col-span-5"
                                value={section.location}
                                onChange={(e) =>
                                    handleSectionUpdate(section.section, 'location', e.target.value)
                                }
                            />
                            <div className="col-span-2 relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span>
                                <Input
                                    type="number"
                                    className="pl-5"
                                    value={section.unitValue || ''}
                                    placeholder="Unit Value"
                                    onChange={(e) =>
                                        handleSectionUpdate(section.section, 'unitValue', e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    );
                })}
                </div>
              </div>
            </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
