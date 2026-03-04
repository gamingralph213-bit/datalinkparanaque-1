"use client";

import React from 'react';
import { Settings, Plus, Trash2, CheckSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  };
  setOptions: (options: any) => void;
  exportColumns: Record<string, boolean>;
  setExportColumns: (cols: Record<string, boolean>) => void;
}

export function CalibrationSidebar({
  rules,
  setRules,
  options,
  setOptions,
  exportColumns,
  setExportColumns
}: CalibrationSidebarProps) {
  const addRule = () => {
    const newRule: CalibrationRule = {
      id: Math.random().toString(36).substr(2, 9),
      pinPattern: '124-x-x-x-x-x',
      barangay: '',
      section: '',
      unitValue: undefined,
      overwrite: true,
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<CalibrationRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const toggleColumn = (col: string) => {
    setExportColumns({ ...exportColumns, [col]: !exportColumns[col] });
  };

  const columns = Object.keys(exportColumns);

  return (
    <Card className="h-full border-none shadow-none bg-transparent flex flex-col gap-6 pb-10">
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Settings className="w-3.5 h-3.5" /> Processor Options
        </h3>
        <Card className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold">DEDUPE (PIN)</Label>
            <Switch 
              checked={options.removeDuplicates}
              onCheckedChange={(val) => setOptions({ ...options, removeDuplicates: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold">APPLY CALIBRATION</Label>
            <Switch 
              checked={options.applyCalibration}
              onCheckedChange={(val) => setOptions({ ...options, applyCalibration: val })}
            />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5" /> Export Columns
        </h3>
        <Card className="p-3 grid grid-cols-2 gap-2">
          {columns.map(col => (
            <div key={col} className="flex items-center gap-2">
              <Checkbox 
                id={`col-${col}`} 
                checked={exportColumns[col]} 
                onCheckedChange={() => toggleColumn(col)}
              />
              <label htmlFor={`col-${col}`} className="text-[9px] font-bold uppercase cursor-pointer truncate">
                {col}
              </label>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            PIN PATTERNS
          </h3>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={addRule}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Rule
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {rules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-[9px] uppercase font-bold opacity-50">No rules active</p>
            </div>
          )}
          {rules.map((rule) => (
            <Card key={rule.id} className="p-3 relative group shadow-sm border-blue-100">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-1 right-1 h-6 w-6 text-destructive"
                onClick={() => removeRule(rule.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-blue-600 uppercase">PIN Pattern</Label>
                  <Input 
                    placeholder="124-00-x..." 
                    className="h-8 text-xs font-mono border-blue-200"
                    value={rule.pinPattern}
                    onChange={(e) => updateRule(rule.id, { pinPattern: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase">Barangay</Label>
                    <Input 
                      className="h-8 text-xs"
                      value={rule.barangay}
                      onChange={(e) => updateRule(rule.id, { barangay: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase">Section</Label>
                    <Input 
                      className="h-8 text-xs"
                      value={rule.section}
                      onChange={(e) => updateRule(rule.id, { section: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-green-700 uppercase">Unit Value (₱)</Label>
                  <Input 
                    type="number"
                    placeholder="Auto Calculate"
                    className="h-8 text-xs font-bold border-green-200"
                    value={rule.unitValue || ''}
                    onChange={(e) => updateRule(rule.id, { unitValue: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}
