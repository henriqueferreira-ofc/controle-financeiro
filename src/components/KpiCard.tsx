import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "destructive" | "warning";
  delay?: number;
  extra?: React.ReactNode;
  to?: string;
}

const toneRing: Record<string, string> = {
  default: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  warning: "bg-warning/15 text-warning",
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "default", delay = 0, extra, to }: KpiCardProps) {
  const card = (
    <Card className={cn(
      "overflow-hidden border-border/60 bg-card shadow-[var(--shadow-card)] transition-all hover:border-border",
      to && "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
    )}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            {label}
          </span>
          <div className="flex items-baseline gap-2 overflow-hidden">
            <span className="text-2xl font-bold tracking-tight text-foreground truncate">{value}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {extra}
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner", toneRing[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      {to ? <Link to={to}>{card}</Link> : card}
    </motion.div>
  );
}
