
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
import { Barangay, LocationSetting, allBarangays } from '@/lib/locations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({
  open,
  onOpenChange,
}: SettingsPanelProps) {
  const { toast } = useToast();
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | undefined>();
  const [locations, setLocations] = useState<LocationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load the static list of barangays on component mount
    setBarangays(allBarangays);
    if (allBarangays.length > 0) {
      setSelectedBarangay(allBarangays[0]);
    }
  }, []);
  
  useEffect(() => {
    if (!open || !selectedBarangay) return;

    const fetchLocations = async () => {
      setIsLoading(true);
      try {
        const collectionRef = collection(db, "barangays", selectedBarangay.barangayCode, "locations");
        const snapshot = await getDocs(collectionRef);
        
        const fetchedLocations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as LocationSetting)).sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));

        setLocations(fetchedLocations);

      } catch (error) {
        console.error("Failed to fetch location settings:", error);
        toast({
          variant: "destructive",
          title: "Fetch Error",
          description: "Could not load location data from the database.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, [open, selectedBarangay, toast]);
  
  const handleSaveChanges = async () => {
    if (!selectedBarangay) return;
    setIsSaving(true);
    try {
      // Create a batch write operation
      const promises = locations.map(location => {
        const { id, ...data } = location;
        const docRef = doc(db, "barangays", selectedBarangay.barangayCode, "locations", id);
        return setDoc(docRef, data, { merge: true });
      });

      await Promise.all(promises);

      toast({
        title: "Settings Saved",
        description: `Location & unit value settings for ${selectedBarangay.name} have been updated.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
       toast({
          variant: "destructive",
          title: "Save Error",
          description: "Could not save settings to the database.",
        });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocationUpdate = (
    id: string,
    field: keyof Omit<LocationSetting, 'id' | 'section'>,
    value: string | number
  ) => {
    setLocations(prev => 
      prev.map(loc => {
        if (loc.id === id) {
          const updatedValue = field === 'unitValue' ? Number(value) : value;
          return { ...loc, [field]: updatedValue };
        }
        return loc;
      })
    );
  };

  const filteredSections = locations.filter(
    (s) =>
      s.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.lotFilter && s.lotFilter.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.locationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[900px] sm:max-w-[900px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Location & Unit Value Settings</SheetTitle>
          <SheetDescription>
            Manage default location names and unit values from Firestore. Changes are saved for future sessions.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
            <div className="grid grid-cols-5 items-center gap-2 px-1">
                <Label htmlFor="barangay-select" className="text-right col-span-1">
                    Barangay
                </Label>
                <Select value={selectedBarangay?.name} onValueChange={(name) => setSelectedBarangay(barangays.find(b => b.name === name))}>
                    <SelectTrigger className="col-span-3" id="barangay-select">
                        <SelectValue placeholder="Select a barangay" />
                    </SelectTrigger>
                    <SelectContent>
                        {barangays.map(b => (
                            <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input 
                    readOnly 
                    value={selectedBarangay?.barangayCode || '---'} 
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
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2"/> Loading data...
                  </div>
                ) : filteredSections.length === 0 ? (
                   <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No location data found for this barangay.
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                  {filteredSections.map((location) => (
                      <div key={location.id} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-2 font-mono font-bold truncate" title={location.section}>
                              {location.section}
                          </div>
                          <Input
                            className="col-span-3 text-xs font-mono"
                            value={location.lotFilter || ''}
                            placeholder="ALL LOTS"
                            onChange={(e) => handleLocationUpdate(location.id, 'lotFilter', e.target.value)}
                          />
                          <Input
                              className="col-span-5"
                              value={location.locationName}
                              onChange={(e) => handleLocationUpdate(location.id, 'locationName', e.target.value)}
                          />
                          <div className="col-span-2 relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span>
                              <Input
                                  type="number"
                                  className="pl-5"
                                  value={location.unitValue || ''}
                                  placeholder="Unit Value"
                                  onChange={(e) => handleLocationUpdate(location.id, 'unitValue', e.target.value)}
                              />
                          </div>
                      </div>
                  ))}
                  </div>
                )}
              </div>
            </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

    