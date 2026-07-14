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
  Calculator,
  Link2,
  Unlink2,
  BookUser,
  FileSpreadsheet,
  HardHat,
  Building2,
  TreePine,
  AlertCircle,
  Percent,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    // Relational Specific
    linkedCount?: number;
    unlinkedCount?: number;
    rollCount?: number;
    exemptedCount?: number;
    // 3-Year Report Specific
    underReviewCount?: number;
    otherUnmappedCount?: number;
    landCount?: number;
    buildingCount?: number;
    matchRate?: number;
  };
  variant?: 'default' | 'hero';
  taxViewMode: 'T' | 'E';
  onTaxViewModeChange: (mode: 'T' | 'E') => void;
  workflowMode?: string;
}

export function MetricOverview({ 
  stats, 
  variant = 'default', 
  taxViewMode, 
  onTaxViewModeChange,
  workflowMode = 'standard'
}: MetricOverviewProps) {
  const isHero = variant === 'hero';
  const isAbstract = workflowMode === 'abstract';
  const isBuildingPermit = workflowMode === 'building-permit';

  const standardStats = [
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

  const abstractStats = [
    {
      label: "Journal Logs",
      value: <AnimatedNumber value={stats.totalRawRows} />,
      icon: BookUser,
      color: isHero ? "border-t-amber-500 bg-amber-500/5" : "border-l-amber-500 bg-amber-500/5",
      textClass: "text-amber-600",
      definition: "Total number of transaction records imported from the Journal files."
    },
    {
      label: "Unlinked Records",
      value: <AnimatedNumber value={stats.unlinkedCount || 0} />,
      icon: Unlink2,
      color: isHero ? "border-t-red-500 bg-red-500/5" : "border-l-red-500 bg-red-500/5",
      textClass: "text-red-600",
      definition: "Journal entries whose PINs could not be found within the staged Assessment Roll reference."
    },
    {
      label: "Assessment Roll",
      value: <AnimatedNumber value={stats.rollCount || 0} />,
      icon: FileSpreadsheet,
      color: isHero ? "border-t-blue-500 bg-blue-500/5" : "border-l-blue-500 bg-blue-500/5",
      textClass: "text-blue-600",
      definition: "Total reference parcel records loaded from the Assessment Roll files."
    },
    {
      label: "Successful Joins",
      value: <AnimatedNumber value={stats.linkedCount || 0} />,
      icon: Link2,
      color: isHero ? "border-t-emerald-600 bg-emerald-50/5" : "border-l-emerald-600 bg-emerald-50/5",
      textClass: "text-emerald-600",
      definition: "Total records successfully matched between the Journal and the Assessment Roll."
    },
    {
      label: "Exempted Count",
      value: <AnimatedNumber value={stats.exemptedCount || 0} />,
      icon: ShieldCheck,
      color: isHero ? "border-t-blue-700 bg-blue-600/5" : "border-l-blue-700 bg-blue-600/5",
      textClass: "text-blue-700",
      definition: "Count of matched records identified as Exempt based on the imported Exempt list."
    },
    {
      label: "Total Area",
      value: <AnimatedNumber value={stats.finalCount || 0} />,
      icon: Database,
      color: isHero ? "border-t-slate-400" : "border-l-slate-400",
      definition: "Sum of land area from all transaction records in the current batch."
    },
    {
      label: "Total Assessed",
      value: <AnimatedNumber value={stats.totalAssessedValue || 0} prefix="₱" decimals={2} />,
      icon: BarChart3,
      color: isHero ? "border-t-blue-600 bg-blue-500/5" : "border-l-blue-600 bg-blue-500/5",
      textClass: "text-blue-600",
      definition: "Total Assessed Value baseline for matched parcels."
    },
    {
      label: "Total Market",
      value: <AnimatedNumber value={stats.totalMarketValue || 0} prefix="₱" decimals={2} />,
      icon: Database,
      color: isHero ? "border-t-green-600 bg-green-500/5" : "border-l-green-600 bg-green-500/5",
      textClass: "text-green-600",
      definition: "Total Market Value baseline for matched parcels."
    }
  ];

  const permitStats = [
    {
      label: "Permits Loaded",
      value: <AnimatedNumber value={stats.totalRawRows} />,
      icon: HardHat,
      color: isHero ? "border-t-orange-500 bg-orange-500/5" : "border-l-orange-500 bg-orange-500/5",
      textClass: "text-orange-600",
      definition: "Total number of building permit log entries imported in this session."
    },
    {
      label: "Matches Found",
      value: <AnimatedNumber value={stats.linkedCount || 0} />,
      icon: Link2,
      color: isHero ? "border-t-emerald-600 bg-emerald-50/5" : "border-l-emerald-600 bg-emerald-50/5",
      textClass: "text-emerald-600",
      definition: "Permit records successfully linked to the Assessment Roll reference via PIN or ARP."
    },
    {
      label: "Unlinked Logs",
      value: <AnimatedNumber value={stats.unlinkedCount || 0} />,
      icon: Unlink2,
      color: isHero ? "border-t-red-500 bg-red-500/5" : "border-l-red-500 bg-red-500/5",
      textClass: "text-red-600",
      definition: "Building permits that could not be reconciled with a parcel in the current Assessment Roll."
    },
    {
      label: "Reference Roll",
      value: <AnimatedNumber value={stats.rollCount || 0} />,
      icon: FileSpreadsheet,
      color: isHero ? "border-t-blue-500 bg-blue-500/5" : "border-l-blue-500 bg-blue-500/5",
      textClass: "text-blue-600",
      definition: "The total size of the Assessment Roll used as a lookup reference for floor areas and classes."
    },
    {
      label: "Total Cost",
      value: <AnimatedNumber value={stats.totalMarketValue || 0} prefix="₱" decimals={2} />,
      icon: TrendingUp,
      color: isHero ? "border-t-emerald-600 bg-emerald-50/5" : "border-l-emerald-600 bg-emerald-50/5",
      textClass: "text-emerald-600",
      definition: "Aggregated Estimated Construction Cost from all valid permit entries."
    }
  ];

  const threeYearStats = [
    {
      label: "Sales Data",
      value: <AnimatedNumber value={stats.totalRawRows} />,
      icon: ClipboardList,
      color: isHero ? "border-t-violet-500 bg-violet-500/5" : "border-l-violet-500 bg-violet-500/5",
      textClass: "text-violet-600",
      definition: "Total number of sales transaction entries loaded from your imported sales data file."
    },
    {
      label: "Reference Roll",
      value: <AnimatedNumber value={stats.rollCount || 0} />,
      icon: FileSpreadsheet,
      color: isHero ? "border-t-blue-500 bg-blue-500/5" : "border-l-blue-500 bg-blue-500/5",
      textClass: "text-blue-600",
      definition: "Total parcel records in the Assessment Roll used as the lookup reference for matching."
    },
    {
      label: "Linked",
      value: <AnimatedNumber value={stats.linkedCount || 0} />,
      icon: Link2,
      color: isHero ? "border-t-emerald-600 bg-emerald-50/5" : "border-l-emerald-600 bg-emerald-50/5",
      textClass: "text-emerald-600",
      definition: "Records fully matched to the Assessment Roll with complete data — ready for export."
    },
    {
      label: "Unlinked",
      value: <AnimatedNumber value={stats.unlinkedCount || 0} />,
      icon: Unlink2,
      color: isHero ? "border-t-red-500 bg-red-500/5" : "border-l-red-500 bg-red-500/5",
      textClass: "text-red-600",
      definition: "Sales entries whose ARPN could not be found in the Assessment Roll reference file."
    },
    {
      label: "Under Review",
      value: <AnimatedNumber value={stats.underReviewCount || 0} />,
      icon: AlertCircle,
      color: isHero ? "border-t-amber-500 bg-amber-500/5" : "border-l-amber-500 bg-amber-500/5",
      textClass: "text-amber-600",
      definition: "Matched records where critical fields (name, location, kind, or area) are missing and need attention."
    },
    {
      label: "Other/Unmapped",
      value: <AnimatedNumber value={stats.otherUnmappedCount || 0} />,
      icon: MapPin,
      color: isHero ? "border-t-purple-500 bg-purple-500/5" : "border-l-purple-500 bg-purple-500/5",
      textClass: "text-purple-600",
      definition: "Matched records whose property kind (K-AU) is not classified as Land or Building (e.g. M-RESI, M-COMM)."
    },
    {
      label: "Land",
      value: <AnimatedNumber value={stats.landCount || 0} />,
      icon: TreePine,
      color: isHero ? "border-t-green-600 bg-green-500/5" : "border-l-green-600 bg-green-500/5",
      textClass: "text-green-600",
      definition: "Count of fully linked records classified as Land in the Assessment Roll."
    },
    {
      label: "Building",
      value: <AnimatedNumber value={stats.buildingCount || 0} />,
      icon: Building2,
      color: isHero ? "border-t-sky-500 bg-sky-500/5" : "border-l-sky-500 bg-sky-500/5",
      textClass: "text-sky-600",
      definition: "Count of fully linked records classified as Building in the Assessment Roll."
    }
  ];

  const statDefinitions = workflowMode === 'abstract' ? abstractStats : workflowMode === 'building-permit' ? permitStats : workflowMode === 'three-year-report' ? threeYearStats : standardStats;

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
            <h3 className="text-xs font-black uppercase tracking-tight leading-none">
              {workflowMode === 'abstract' ? "Abstract Joiner Summary" : workflowMode === 'building-permit' ? "Building Permit Analytics" : workflowMode === 'three-year-report' ? "3-Year Report Analytics" : "Dashboard Analytics Context"}
            </h3>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">
              {workflowMode === 'abstract' ? "Relational join metrics for Journal vs Roll" : workflowMode === 'building-permit' ? "Relational join metrics for Permit vs Roll" : workflowMode === 'three-year-report' ? "Relational join metrics for Sales Data vs Roll" : "Toggle view for specific financial subsets"}
            </p>
          </div>
        </div>
        
        {workflowMode === 'standard' && (
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
             <Button onClick={() => onTaxViewModeChange('T')} variant={taxViewMode === 'T' ? 'secondary' : 'ghost'} size="sm" className={cn("h-8 text-[9px] font-black uppercase tracking-widest gap-2", taxViewMode === 'T' && "bg-emerald-600 text-white hover:bg-emerald-500")}><CheckCircle2 className="w-3 h-3" /> Taxable</Button>
             <Button onClick={() => onTaxViewModeChange('E')} variant={taxViewMode === 'E' ? 'secondary' : 'ghost'} size="sm" className={cn("h-8 text-[9px] font-black uppercase tracking-widest gap-2", taxViewMode === 'E' && "bg-blue-600 text-white hover:bg-blue-500")}><Database className="w-3 h-3" /> Exempted</Button>
          </div>
        )}
      </div>

      <div className={cn(
        "grid gap-3 shrink-0 transition-all duration-700 ease-in-out",
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
