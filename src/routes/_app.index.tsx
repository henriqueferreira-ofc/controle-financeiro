import { createFileRoute, Link } from "@tanstack/react-router";
import { useFinwise } from "@/store/finwise-store";
import { dashboardData } from "@/store/selectors";
import { computeCurrentBalance, expenseVs3MonthAvg, projectNextDays } from "@/store/projection";
import type { Filters } from "@/store/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/KpiCard";
import { WeekProjectionCard, MonthDeltaBadge } from "@/components/WeekProjectionCard";
import { UpcomingRecurringsWidget } from "@/components/UpcomingRecurringsWidget";
import { SimulationCard } from "@/components/SimulationCard";
import { brl } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Lightbulb, PiggyBank, Plus, Trophy, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "AxisPay" },
      { name: "description", content: "Visão executiva das suas finanças com KPIs, gráficos e insights." },
    ],
  }),
  component: DashboardPage,
});

function PeriodButtons({ value, onChange }: { value: Filters["period"]; onChange: (v: Filters["period"]) => void }) {
  const { t } = useI18n();
  const opts: { v: Filters["period"]; label: string }[] = [
    { v: "7d", label: t("period.7d") },
    { v: "30d", label: t("period.30d") },
    { v: "all", label: t("period.all") },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o.v
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-foreground">{label}</div>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="mt-1 flex items-center gap-2" style={{ color: p.color }}>
          <span className="font-medium">{p.name}:</span>
          <span>{brl(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const { t } = useI18n();
  const { transactions, categories, recurrings, filters, setFilters, loading: dataLoading } = useFinwise();
  const [transitionLoading, setTransitionLoading] = useState(false);

  useEffect(() => {
    setTransitionLoading(true);
    const t = setTimeout(() => setTransitionLoading(false), 350);
    return () => clearTimeout(t);
  }, [filters.period, filters.categoryId]);

  const loading = transitionLoading || dataLoading;
  const data = dashboardData(transactions, categories, filters);

  // Fase 1.2 — projeção 7 dias + comparativo + saldo atual
  const projection = useMemo(() => projectNextDays(recurrings, 7), [recurrings]);
  const currentBalance = useMemo(() => computeCurrentBalance(transactions), [transactions]);
  const expenseDelta = useMemo(() => expenseVs3MonthAvg(transactions, { period: filters.period }), [transactions, filters.period]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("dash.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dash.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <PeriodButtons
            value={filters.period}
            onChange={(v) => setFilters((f) => ({ ...f, period: v }))}
          />
          <Select
            value={filters.categoryId}
            onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <KpiCard
              label="Saldo atual"
              value={brl(data.saldo)}
              hint={data.saldo >= 0 ? "Positivo" : "Negativo"}
              icon={Wallet}
              tone={data.saldo >= 0 ? "success" : "destructive"}
              delay={0}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <KpiCard
              label="Total Entradas"
              value={brl(data.totalEntradas)}
              icon={ArrowUpRight}
              tone="success"
              delay={0}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="relative">
            <KpiCard
              label="Total Saídas"
              value={brl(data.totalSaidas)}
              icon={ArrowDownRight}
              tone="destructive"
              delay={0}
              extra={expenseDelta !== null && <MonthDeltaBadge delta={expenseDelta} />}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <KpiCard
              label="Gasto Médio Diário"
              value={brl(data.gastoMedioDiario)}
              hint={`Período de ${data.days} dia${data.days > 1 ? "s" : ""}`}
              icon={CalendarDays}
              tone="warning"
              delay={0}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <KpiCard
              label="Maior gasto/categoria"
              value={data.topCat ? brl(data.topCat.total) : brl(0)}
              hint={data.topCat ? data.topCat.name : "Sem dados"}
              icon={Trophy}
              tone="default"
              delay={0}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Fase 1.2 + 1.1 — Projeção 7 dias + Próximas 4 semanas */}
      {!loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <WeekProjectionCard
            points={projection.points}
            totalExpense={projection.totalExpense}
            totalIncome={projection.totalIncome}
            currentBalance={currentBalance}
          />
          <UpcomingRecurringsWidget recurrings={recurrings} categories={categories} weeks={4} />
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Gasto por dia</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : data.perDay.length === 0 || data.totalSaidas === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.perDay} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.014 250)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.015 250)" fontSize={12} />
                    <YAxis stroke="oklch(0.7 0.015 250)" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="despesa"
                      name="Despesa"
                      stroke="oklch(0.65 0.21 25)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Despesa por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : data.perCategory.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.perCategory} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.014 250)" />
                    <XAxis dataKey="name" stroke="oklch(0.7 0.015 250)" fontSize={11} />
                    <YAxis stroke="oklch(0.7 0.015 250)" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.3 0.02 250 / 0.4)" }} />
                    <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]}>
                      {data.perCategory.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Saldo acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : data.cumulative.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.cumulative} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.014 250)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.015 250)" fontSize={12} />
                    <YAxis stroke="oklch(0.7 0.015 250)" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="saldo"
                      name="Saldo"
                      stroke="oklch(0.78 0.16 165)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Mês atual vs mês anterior</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthCompare} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.014 250)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.015 250)" fontSize={12} />
                    <YAxis stroke="oklch(0.7 0.015 250)" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.3 0.02 250 / 0.4)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="entrada" name="Entradas" fill="oklch(0.78 0.16 165)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesas" fill="oklch(0.65 0.21 25)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fase 3.2 — Simulador "E se..." */}
      {!loading && (
        <div className="mb-8 grid gap-6">
          <SimulationCard />
        </div>
      )}

      {/* Insights */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Insights</h2>
        </div>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
            ))}
          </div>
        ) : data.insights.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div>
                <p className="font-medium">Nenhum insight disponível</p>
                <p className="text-sm text-muted-foreground">
                  Adicione registros para receber recomendações inteligentes.
                </p>
              </div>
              <Button asChild>
                <Link to="/registros">
                  <Plus className="mr-1 h-4 w-4" /> Adicionar registro
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.insights.map((ins, i) => (
              <motion.div
                key={ins.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <Card className="border-border/60 shadow-[var(--shadow-card)]">
                  <CardContent className="flex gap-3 p-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <PiggyBank className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ins.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{ins.text}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 text-center">
      <p className="text-sm font-medium text-muted-foreground">Sem dados no período</p>
      <Link to="/registros" className="text-sm text-primary hover:underline">
        Adicionar registro
      </Link>
    </div>
  );
}
