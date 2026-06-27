
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Files, 
  AlertTriangle, 
  Eraser, 
  CheckCircle2, 
  Archive, 
  Database, 
  BarChart3, 
  TrendingUp,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

/**
 * A component that animates a numeric value counting from its previous state to the new state.
 */
const AnimatedNumber = ({ value, prefix = "", decimals = 0 }: { value: number, prefix?: string, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 1500;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (endValue - startValue) * eased;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
};

interface MetricOverviewProps {
  stats: {
    totalRawRows: number;
    systemCleanup: number;
    totalImported: number;
    duplicatesRemoved: number;
    finalCount: number;
    totalMarketValue: number;
    totalAssessedValue: number;
    totalYearlyTax: number;
    totalErrors: number;
  };
  variant?: 'default' | 'hero';
  taxViewMode: 'T' | 'E';
  onTaxViewModeChange: (mode: 'T' | 'E') => void;
}

export function MetricOverview({ stats, variant = 'default', taxViewMode, onTaxViewModeChange }: MetricOverviewProps) {
  const isHero = variant === 'hero';

  const statDefinitions = [
    {
      label: "Imported Rows",
      value: <AnimatedNumber value={stats.totalRawRows} />,
      icon: Files,
      color: isHero ? "border-t-slate-400" : "border-l-slate-400",
      definition: "The total count of all raw data lines detected across all your uploaded spreadsheets."
    },
    {
      label: "Data Errors",
      value: <AnimatedNumber value={stats.totalErrors} />,
      icon: AlertTriangle,
      color: isHero ? "border-t-red-500 bg-red-500/5" : "border-l-red-500 bg-red-500/5",
      textClass: "text-red-600",
      definition: "Records flagged for critical issues like missing PIN or invalid formats that require manual correction."
    },
    {
      label: "Engine Cleanup",
      value: <AnimatedNumber value={stats.systemCleanup} />,
      icon: Eraser,
      color: isHero ? "border-t-orange-400" : "border-l-orange-400",
      textClass: "text-orange-600",
      definition: "Rows identified as noise or incomplete entries moved to the Archive."
    },
    {
      label: "Valid Records",
      value: <AnimatedNumber value={stats.finalCount} />,
      icon: CheckCircle2,
      color: isHero ? "border-t-primary bg-primary/5" : "border-l-primary bg-primary/5",
      textClass: "text-primary",
      definition: "Unique and verified records that have passed all city-standard validation rules."
    },
    {
      label: "Duplicates",
      value: <AnimatedNumber value={stats.duplicatesRemoved} />,
      icon: Archive,
      color: isHero ? "border-t-amber-400 bg-amber-500/5" : "border-l-amber-400 bg-amber-500/5",
      textClass: "text-amber-500",
      definition: "Multiple records sharing the same PIN. The engine automatically archives older entries."
    },
    {
      label: "Total Market",
      value: <AnimatedNumber value={stats.totalMarketValue || 0} prefix="₱" decimals={2} />,
      icon: Database,
      color: isHero ? "border-t-green-600 bg-green-500/5" : "border-l-green-600 bg-green-500/5",
      textClass: "text-green-600",
      definition: "The combined Market Value for the currently selected tax category (Taxable or Exempted)."
    },
    {
      label: "Total Assessed",
      value: <AnimatedNumber value={stats.totalAssessedValue || 0} prefix="₱" decimals={2} />,
      icon: BarChart3,
      color: isHero ? "border-t-blue-600 bg-blue-500/5" : "border-l-blue-600 bg-blue-500/5",
      textClass: "text-blue-600",
      definition: "The sum of all Assessed Values for the active tax view."
    },
    {
      label: "Total Tax",
      value: taxViewMode === 'E' ? "₱0.00" : <AnimatedNumber value={stats.totalYearlyTax || 0} prefix="₱" decimals={2} />,
      icon: TrendingUp,
      color: isHero ? "border-t-emerald-600 bg-emerald-50/5" : "border-l-emerald-600 bg-emerald-50/5",
      textClass: "text-emerald-600",
      definition: "The estimated combined Yearly Real Property Tax due. Always zero for Exempted properties."
    }
  ];

  return (
    <div className="space-y-4 w-full">
      <div className={cn(
        "flex items-center justify-between px-2",
        isHero ? "max-w-6xl mx-auto" : "w-full"
      )}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Calculator className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-tight leading-none">Dashboard Analytics Context</h3>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">Toggle view for specific financial subsets</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
           <Button onClick={() => onTaxViewModeChange('T')} variant={taxViewMode === 'T' ? 'secondary' : 'ghost'} size="sm" className={cn("h-8 text-[9px] font-black uppercase tracking-widest gap-2", taxViewMode === 'T' && "bg-emerald-600 text-white hover:bg-emerald-500")}><CheckCircle2 className="w-3 h-3" /> Taxable</Button>
           <Button onClick={() => onTaxViewModeChange('E')} variant={taxViewMode === 'E' ? 'secondary' : 'ghost'} size="sm" className={cn("h-8 text-[9px] font-black uppercase tracking-widest gap-2", taxViewMode === 'E' && "bg-blue-600 text-white hover:bg-blue-500")}><Database className="w-3 h-3" /> Exempted</Button>
        </div>
      </div>

      <div className={cn(
        "grid gap-4 shrink-0 transition-all duration-700 ease-in-out",
        isHero 
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto w-full" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 w-full"
      )}>
        {statDefinitions.map((stat, i) => (
          <Popover key={i}>
            <PopoverTrigger asChild>
              <Card className={cn(
                "flex flex-col shadow-sm cursor-help transition-all hover:scale-[1.03] active:scale-95 hover:shadow-xl border-border/10",
                isHero ? "p-8 border-t-4 items-center text-center justify-center aspect-square md:aspect-auto md:h-64" : "p-4 border-l-4",
                stat.color
              )}>
                <div className={cn(
                  "font-bold text-muted-foreground uppercase flex items-center gap-1.5 tracking-wide",
                  isHero ? "text-xs mb-4" : "text-[11px] mb-1.5"
                )}>
                  <stat.icon className={cn(isHero ? "w-4 h-4" : "w-3 h-3")} /> 
                  {stat.label}
                </div>
                <div className={cn(
                  "font-black leading-tight truncate w-full",
                  isHero ? "text-2xl md:text-3xl lg:text-2xl xl:text-3xl" : "text-[16px]",
                  stat.textClass || "text-foreground"
                )}>
                  {stat.value}
                </div>
                {isHero && (
                  <div className="mt-6 hidden md:block">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em] line-clamp-2 px-2">
                      {stat.definition}
                    </p>
                  </div>
                )}
              </Card>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-5 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg bg-primary/10", stat.textClass)}><stat.icon className="w-4 h-4" /></div>
                  <h4 className="font-black uppercase text-xs tracking-widest">{stat.label}</h4>
                </div>
                <p className="font-black text-2xl text-foreground break-words">{stat.value}</p>
                <p className="text-sm font-bold text-muted-foreground leading-relaxed">{stat.definition}</p>
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
}
