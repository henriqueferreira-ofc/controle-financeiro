import { createFileRoute, Link } from "@tanstack/react-router";
import { useFinwise } from "@/store/finwise-store";
import { dashboardData } from "@/store/selectors";
import type { Filters } from "@/store/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/KpiCard";
import { brl } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Lightbulb, PiggyBank, Plus, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
      { title: "Dashboard — FinWise" },
      { name: "description", content: "Visão executiva das suas finanças com KPIs, gráficos e insights." },
    ],
  }),
  component: DashboardPage,
});

function PeriodButtons({ value, onChange }: { value: Filters["period"]; onChange: (v: Filters["period"]) => void }) {
  const opts: { v: Filters["period"]; label: string }[] = [
    { v: "7d", label: "7 dias" },
    { v: "30d", label: "30 dias" },
    { v: "all", label: "Total" },
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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-foreground">{label}</div>
      <div className="mt-1 text-primary">{brl(payload[0].value)}</div>
    </div>
  );
}

function DashboardPage() {
  const { transactions, categories, filters, setFilters, loading: dataLoading } = useFinwise();
  const [transitionLoading, setTransitionLoading] = useState(false);

  useEffect(() => {
    setTransitionLoading(true);
    const t = setTimeout(() => setTransitionLoading(false), 350);
    return () => clearTimeout(t);
  }, [filters.period, filters.categoryId]);

  const loading = transitionLoading || dataLoading;
  const data = dashboardData(transactions, categories, filters);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe entradas, despesas e tendências do seu período.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodButtons
            value={filters.period}
            onChange={(v) => setFilters((f) => ({ ...f, period: v }))}
          />
          <Select
            value={filters.categoryId}
            onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Entradas"
            value={brl(data.totalEntradas)}
            icon={ArrowUpRight}
            tone="success"
            delay={0}
          />
          <KpiCard
            label="Total Saídas"
            value={brl(data.totalSaidas)}
            icon={ArrowDownRight}
            tone="destructive"
            delay={0.05}
          />
          <KpiCard
            label="Gasto Médio Diário"
            value={brl(data.gastoMedioDiario)}
            hint={`Período de ${data.days} dia${data.days > 1 ? "s" : ""}`}
            icon={CalendarDays}
            tone="warning"
            delay={0.1}
          />
          <KpiCard
            label="Maior gasto por categoria"
            value={data.topCat ? brl(data.topCat.total) : brl(0)}
            hint={data.topCat ? data.topCat.name : "Sem dados"}
            icon={Trophy}
            tone="default"
            delay={0.15}
          />
        </div>
      )}

      {/* Charts */}
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
                      dataKey="total"
                      stroke="oklch(0.78 0.16 165)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "oklch(0.78 0.16 165)" }}
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
                    <Bar dataKey="total" fill="oklch(0.7 0.18 230)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
