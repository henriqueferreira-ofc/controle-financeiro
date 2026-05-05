// Fase 1.2 — Card "Esta semana" + alerta de saldo negativo + timeline visual
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, formatDateBR } from "@/lib/format";
import { AlertTriangle, CalendarClock, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import type { WeekPoint } from "@/store/projection";
import { useI18n } from "@/i18n/I18nProvider";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

const CustomTooltip = ({ active, payload, label, brl }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-2 text-[10px] shadow-lg">
        <p className="font-medium">{label}</p>
        <p className="text-primary font-bold">{brl(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

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
  const { t } = useI18n();
  const projected = Number((currentBalance + totalIncome - totalExpense).toFixed(2));
  const negative = projected < 0;
  const maxBar = Math.max(1, ...points.map((p) => p.amount + p.income));

  const chartData = useMemo(() => {
    let balance = currentBalance;
    return points.map((p) => {
      balance = balance + p.income - p.amount;
      return {
        name: p.label,
        balance: balance,
        date: formatDateBR(p.date)
      };
    });
  }, [points, currentBalance]);

  const minBalance = Math.min(...chartData.map(d => d.balance));
  const healthScore = useMemo(() => {
    if (negative) return { label: "Crítico", color: "text-red-500", bg: "bg-red-500/10" };
    if (minBalance < currentBalance * 0.2) return { label: "Alerta", color: "text-amber-500", bg: "bg-amber-500/10" };
    return { label: "Saudável", color: "text-green-500", bg: "bg-green-500/10" };
  }, [negative, minBalance, currentBalance]);

  return (
    <Card className={`border-border/60 shadow-[var(--shadow-card)] ${negative ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-primary" />
          {t("week.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("week.outflows")}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-destructive sm:text-base">{brl(totalExpense)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("week.inflows")}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-success sm:text-base">{brl(totalIncome)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("week.projected")}</p>
            <p className={`mt-1 text-sm font-semibold tabular-nums sm:text-base ${negative ? "text-destructive" : "text-foreground"}`}>
              {brl(projected)}
            </p>
          </div>
        </div>

        {negative && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("week.alert")}</span>
          </motion.div>
        )}

        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">{t("week.timeline")}</p>
          <div className="flex items-end gap-1.5 h-14">
            {points.map((p) => {
              const total = p.amount + p.income;
              const h = total > 0 ? Math.max(8, (total / maxBar) * 56) : 4;
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
                    title={`${formatDateBR(p.date)} · ${brl(p.amount)} · ${brl(p.income)}`}
                  />
                  <span className="text-[9px] text-muted-foreground sm:text-[10px]">{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-border/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Projeção de Fluxo de Caixa</p>
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${healthScore.bg} ${healthScore.color}`}>
              {healthScore.label}
            </div>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <Tooltip content={<CustomTooltip brl={brl} />} />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[9px] text-muted-foreground text-center italic">
            * O gráfico mostra a evolução estimada do seu saldo dia a dia.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthDeltaBadge({ delta }: { delta: number | null }) {
  const { t } = useI18n();
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
      {t("week.deltaVs", { n: `${up ? "+" : ""}${delta}` })}
    </Badge>
  );
}
