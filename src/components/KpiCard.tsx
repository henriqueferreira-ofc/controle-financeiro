import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "destructive" | "warning";
  delay?: number;
}

const toneRing: Record<string, string> = {
  default: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  warning: "bg-warning/15 text-warning",
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "default", delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <Card className="overflow-hidden border-border/60 bg-card shadow-[var(--shadow-card)] transition-colors hover:border-border">
        <CardContent className="flex items-start justify-between gap-4 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneRing[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
