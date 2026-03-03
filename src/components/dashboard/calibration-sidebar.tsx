
"use client";

import React, { useState } from 'react';
import { Settings, Plus, Trash2, Wand2, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CalibrationRule } from '@/lib/processor';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CalibrationSidebarProps {
  rules: CalibrationRule[];
  setRules: (rules: CalibrationRule[]) => void;
  assessmentLevel: number;
  setAssessmentLevel: (val: number) => void;
  options: {
    removeDuplicates: boolean;
    applyCalibration: boolean;
  };
  setOptions: (options: any) => void;
  onAutoSuggest: () => void;
}

export function CalibrationSidebar({
  rules,
  setRules,
  assessmentLevel,
  setAssessmentLevel,
  options,
  setOptions,
  onAutoSuggest
}: CalibrationSidebarProps) {
  const addRule = () => {
    const newRule: CalibrationRule = {
      id: Math.random().toString(36).substr(2, 9),
      pinPattern: '124-x-x-x-x-x',
      barangay: '',
      section: '',
      unitValue: undefined,
      overwrite: false,
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<CalibrationRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <Card className="h-full border-none shadow-none bg-transparent flex flex-col gap-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-2">
          <Settings className="w-4 h-4" /> Processing Options
        </h3>
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="remove-duplicates" className="cursor-pointer font-medium">Remove Duplicates (PIN)</Label>
            <Switch 
              id="remove-duplicates" 
              checked={options.removeDuplicates}
              onCheckedChange={(val) => setOptions({ ...options, removeDuplicates: val })}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="apply-calibration" className="cursor-pointer font-medium">Auto-Fill / Calibrate</Label>
            <Switch 
              id="apply-calibration" 
              checked={options.applyCalibration}
              onCheckedChange={(val) => setOptions({ ...options, applyCalibration: val })}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Assessment Level (%)</Label>
              <Input 
                type="number" 
                value={assessmentLevel * 100} 
                onChange={(e) => setAssessmentLevel(Number(e.target.value) / 100)}
                className="w-16 h-8 text-xs text-right"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Calibration Rules
          </h3>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAutoSuggest}>
                    <Wand2 className="w-4 h-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI Suggest Rules</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={addRule}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {rules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-xs">No rules defined</p>
            </div>
          )}
          {rules.map((rule) => (
            <Card key={rule.id} className="p-3 relative group hover:ring-1 hover:ring-primary/20 transition-all">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => removeRule(rule.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">PIN Pattern (x = wildcard)</Label>
                  <Input 
                    placeholder="124-x-x..." 
                    className="h-8 text-xs font-mono"
                    value={rule.pinPattern}
                    onChange={(e) => updateRule(rule.id, { pinPattern: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Barangay</Label>
                    <Input 
                      placeholder="B.F. Homes" 
                      className="h-8 text-xs"
                      value={rule.barangay}
                      onChange={(e) => updateRule(rule.id, { barangay: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Section</Label>
                    <Input 
                      placeholder="PH 3" 
                      className="h-8 text-xs"
                      value={rule.section}
                      onChange={(e) => updateRule(rule.id, { section: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                   <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`overwrite-${rule.id}`} 
                        checked={rule.overwrite}
                        onCheckedChange={(val) => updateRule(rule.id, { overwrite: !!val })}
                      />
                      <Label htmlFor={`overwrite-${rule.id}`} className="text-[10px] cursor-pointer">Overwrite existing</Label>
                   </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}
