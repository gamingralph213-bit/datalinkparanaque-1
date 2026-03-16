"use client";

import React from 'react';
import { 
  Settings, 
  CheckSquare,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CalibrationRule } from '@/lib/processor';
import { Checkbox } from '@/components/ui/checkbox';

interface CalibrationSidebarProps {
  rules: CalibrationRule[];
  setRules: (rules: CalibrationRule[]) => void;
  options: {
    removeDuplicates: boolean;
    applyCalibration: boolean;
    systemCleanup: boolean;
  };
  setOptions: (options: any) => void;
  exportColumns: Record<string, boolean>;
  setExportColumns: (cols: Record<string, boolean>) => void;
}

export function CalibrationSidebar({
  options,
  setOptions,
  exportColumns,
  setExportColumns
}: CalibrationSidebarProps) {
  
  const toggleColumn = (col: string) => {
    setExportColumns({ ...exportColumns, [col]: !exportColumns[col] });
  };

  const columns = Object.keys(exportColumns);

  return (
    <Card className="h-full border-none shadow-none bg-transparent flex flex-col gap-8 pb-10">
      {/* SECTION 1: SYSTEM OPTIONS */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2.5">
          <Settings className="w-4 h-4" /> Processor Engine
        </h3>
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold tracking-tight">SYSTEM CLEANUP</Label>
            <Switch 
              checked={options.systemCleanup}
              onCheckedChange={(val) => setOptions({ ...options, systemCleanup: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold tracking-tight">REMOVE DUPLICATES</Label>
            <Switch 
              checked={options.removeDuplicates}
              onCheckedChange={(val) => setOptions({ ...options, removeDuplicates: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold tracking-tight">APPLY CALIBRATION</Label>
            <Switch 
              checked={options.applyCalibration}
              onCheckedChange={(val) => setOptions({ ...options, applyCalibration: val })}
            />
          </div>
        </Card>
      </div>

      {/* SECTION 2: EXPORT CONFIGURATION */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2.5">
          <CheckSquare className="w-4 h-4" /> Export Columns
        </h3>
        <Card className="p-4 space-y-3">
          {columns.map(col => (
            <div key={col} className="flex items-center gap-3">
              <Checkbox 
                id={`col-${col}`} 
                checked={exportColumns[col]} 
                onCheckedChange={() => toggleColumn(col)}
              />
              <label htmlFor={`col-${col}`} className="text-xs font-bold uppercase cursor-pointer truncate tracking-tight text-foreground/80">
                {col}
              </label>
            </div>
          ))}
        </Card>
      </div>
    </Card>
  );
}
