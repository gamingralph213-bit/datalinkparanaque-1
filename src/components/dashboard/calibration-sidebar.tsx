"use client";

import React from 'react';
import { 
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CalibrationRule } from '@/lib/processor';

interface CalibrationSidebarProps {
  rules: CalibrationRule[];
  setRules: (rules: CalibrationRule[]) => void;
  options: {
    removeDuplicates: boolean;
    applyCalibration: boolean;
    systemCleanup: boolean;
  };
  setOptions: (options: any) => void;
}

export function CalibrationSidebar({
  options,
  setOptions,
}: CalibrationSidebarProps) {
  
  return (
    <Card className="h-full border-none shadow-none bg-transparent flex flex-col gap-8 pb-10">
      {/* SECTION 1: SYSTEM OPTIONS */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2.5">
          <Settings className="w-4 h-4" /> Processor Engine
        </h3>
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold tracking-tight uppercase">System Cleanup</Label>
            <Switch 
              checked={options.systemCleanup}
              onCheckedChange={(val) => setOptions({ ...options, systemCleanup: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold tracking-tight uppercase">Remove Duplicates</Label>
            <Switch 
              checked={options.removeDuplicates}
              onCheckedChange={(val) => setOptions({ ...options, removeDuplicates: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold tracking-tight uppercase">Apply Calibration</Label>
            <Switch 
              checked={options.applyCalibration}
              onCheckedChange={(val) => setOptions({ ...options, applyCalibration: val })}
            />
          </div>
        </Card>
      </div>

      <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
        <p className="text-[11px] font-bold text-muted-foreground leading-relaxed uppercase">
          Configure how the engine handles raw data rows during the multi-pass validation sequence.
        </p>
      </div>
    </Card>
  );
}
