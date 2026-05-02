// Fase 1.2 — Card "Esta semana" + alerta de saldo negativo + timeline visual
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, formatDateBR } from "@/lib/format";
import { AlertTriangle, CalendarClock, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { WeekPoint } from "@/store/projection";

export function WeekProjectionCard({
  points,
  totalExpense,
  totalIncome,
  currentBalance,
}: {
  points: WeekPoint[];
  totalExpense: number;
  totalIncome: number;
  currentBalance: number;
}) {
  const projected = Number((currentBalance + totalIncome - totalExpense).toFixed(2));
  const negative = projected < 0;
  const max = Math.max(1, ...points.map((p) => p.amount + p.income));

  return (
    <Card className={`border-border/60 shadow-[var(--shadow-card)] ${negative ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-primary" />
          Próximos 7 dias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saídas previstas</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-destructive sm:text-base">{brl(totalExpense)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Entradas previstas</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-success sm:text-base">{brl(totalIncome)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo projetado</p>
            <p className={`mt-1 text-sm font-semibold tabular-nums sm:text-base ${negative ? "text-destructive" : "text-foreground"}`}>
              {brl(projected)}
            </p>
          </div>
        </div>

        {/* Alerta */}
        {negative && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Atenção: seu saldo projetado fica <strong className="font-semibold">negativo</strong> nos próximos 7 dias.
              Considere reagendar despesas ou antecipar entradas.
            </span>
          </motion.div>
        )}

        {/* Timeline visual */}
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Timeline da semana</p>
          <div className="flex items-end gap-1.5">
            {points.map((p) => {
              const total = p.amount + p.income;
              const h = total > 0 ? Math.max(8, (total / max) * 56) : 4;
              const hasMovement = total > 0;
              return (
                <div key={p.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-colors ${
                      hasMovement
                        ? p.amount > p.income
                          ? "bg-red-500/70"
                          : "bg-green-500/70"
                        : "bg-muted"
                    }`}
                    style={{ height: `${h}px` }}
                    title={`${formatDateBR(p.date)} · saída ${brl(p.amount)} · entrada ${brl(p.income)}`}
                  />
                  <span className="text-[9px] text-muted-foreground sm:text-[10px]">{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthDeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <Badge
      variant="outline"
      className={`gap-1 px-1.5 py-0 text-[10px] font-medium sm:text-xs ${
        up 
          ? "border-destructive/30 bg-destructive/10 text-destructive" 
          : "border-success/30 bg-success/10 text-success"
      }`}
    >
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {delta}% vs média 3M
    </Badge>
  );
}
