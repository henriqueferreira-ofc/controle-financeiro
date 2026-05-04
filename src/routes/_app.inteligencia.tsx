import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useFinwise } from "@/store/finwise-store";
import {
  calculateScore,
  detectAnomalies,
  buildForecast,
  buildAISummary,
  buildInsights,
  type LocalInsight,
} from "@/store/intelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { brl, formatDateBR } from "@/lib/format";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Info,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SimulationCard } from "@/components/SimulationCard";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_app/inteligencia")({
  head: () => ({
    meta: [
      { title: "AxisPay" },
      {
        name: "description",
        content: "int.meta.desc",
      },
    ],
  }),
  component: IntelligencePage,
});

type AIInsight = {
  titulo: string;
  descricao: string;
  recomendacao: string;
  severidade: "positivo" | "neutro" | "atencao" | "critico";
};

function IntelligencePage() {
  const { t } = useI18n();
  const { transactions, categories, budgets, goals, recurrings, loading } = useFinwise();
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);

  const anomalies = useMemo(
    () => detectAnomalies(transactions, categories),
    [transactions, categories],
  );
  const score = useMemo(
    () => calculateScore(transactions, budgets, goals, recurrings, anomalies),
    [transactions, budgets, goals, recurrings, anomalies],
  );
  const forecast = useMemo(
    () => buildForecast(transactions, horizon, recurrings),
    [transactions, horizon, recurrings],
  );
  const localInsights = useMemo(
    () => buildInsights(transactions, categories, budgets, goals, recurrings, forecast),
    [transactions, categories, budgets, goals, recurrings, forecast],
  );

  const [aiInsights, setAiInsights] = useState<AIInsight[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAI = async () => {
    if (transactions.length === 0) {
      toast.info(t("ai.errNoData") || "Add records to generate insights.");
      return;
    }
    setAiLoading(true);
    setAiInsights(null);
    try {
      const summary = buildAISummary(transactions, categories, budgets, goals);
      const { data, error } = await supabase.functions.invoke("financial-insights", {
        body: { summary },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiInsights(data.insights || []);
      toast.success(t("int.toast.aiSuccess"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("int.toast.aiError");
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-fetch once on first load when data exists
  useEffect(() => {
    if (!loading && transactions.length > 0 && aiInsights === null && !aiLoading) {
      // Don't auto-fetch to avoid burning credits — leave button only
    }
  }, [loading, transactions.length, aiInsights, aiLoading]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[280px] lg:col-span-1" />
          <Skeleton className="h-[280px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("int.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("int.subtitle")}
          </p>
        </div>
        <Button onClick={fetchAI} disabled={aiLoading} className="shrink-0">
          <Sparkles className="mr-1 h-4 w-4" />
          {aiLoading ? t("int.btn.loading") : aiInsights ? t("int.btn.update") : t("int.btn.generate")}
        </Button>
      </div>

      {/* Score + Forecast side by side */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ScoreCard score={score} />
        <ForecastCard forecast={forecast} horizon={horizon} setHorizon={setHorizon} />
      </div>

      {/* Insights locais acionáveis (Fase 2.3) */}
      <LocalInsightsSection insights={localInsights} />

      {/* Simulações "E se..." (Fase 3.2) */}
      <SimulationCard />

      {/* Anomalies */}
      <AnomaliesSection anomalies={anomalies} />

      {/* AI Insights */}
      <AIInsightsSection
        insights={aiInsights}
        loading={aiLoading}
        hasData={transactions.length > 0}
      />
    </div>
  );
}

/* ---------------- LOCAL INSIGHTS (Fase 2.3) ---------------- */
function LocalInsightsSection({ insights }: { insights: LocalInsight[] }) {
  const { t } = useI18n();
  if (insights.length === 0) return null;
  const sevMap = {
    positivo: { color: "text-success", bg: "bg-success/15", border: "border-success/30", icon: CheckCircle2 },
    neutro: { color: "text-primary", bg: "bg-primary/15", border: "border-border/60", icon: Info },
    atencao: { color: "text-warning", bg: "bg-warning/15", border: "border-warning/30", icon: AlertTriangle },
    critico: { color: "text-destructive", bg: "bg-destructive/15", border: "border-destructive/40", icon: AlertTriangle },
  } as const;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t("ai.insights") || "Insights acionáveis"}
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((ins, i) => {
          const cfg = sevMap[ins.severity];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={ins.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Card className={`h-full border ${cfg.border} shadow-[var(--shadow-card)]`}>
                <CardContent className="flex h-full gap-3 p-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-semibold leading-snug">{t(ins.titleKey, ins.params)}</p>
                    <p className="text-sm text-muted-foreground">{t(ins.descriptionKey, ins.params)}</p>
                    {ins.ctaLabelKey && ins.ctaTo && (
                      <Link to={ins.ctaTo} className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary hover:underline">
                        {t(ins.ctaLabelKey)}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- SCORE CARD ---------------- */
function ScoreCard({ score }: { score: ReturnType<typeof calculateScore> }) {
  const { t } = useI18n();
  const colors: Record<string, string> = {
    Crítico: "oklch(0.65 0.21 25)",
    Atenção: "oklch(0.78 0.15 75)",
    Bom: "oklch(0.7 0.18 200)",
    Excelente: "oklch(0.78 0.16 165)",
  };
  const color = colors[score.level];

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)] lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          {t("int.score")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3">
          <ScoreRing value={score.score} color={color} />
          <Badge
            className="text-xs"
            style={{ background: `${color}25`, color }}
          >
            {t(`score.level.${score.level}`) || score.level}
          </Badge>
        </div>

        <div className="mt-5 space-y-3">
          {score.components.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{t(c.label) || c.label}</span>
                <span className="text-muted-foreground">
                  {c.value}/{c.max}
                </span>
              </div>
              <Progress value={(c.value / c.max) * 100} className="mt-1 h-1.5" />
              <p className="mt-1 text-[11px] text-muted-foreground">{t(c.description) || c.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreRing({ value, color }: { value: number; color: string }) {
  const { t } = useI18n();
  const size = 160;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="oklch(0.3 0.014 250)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{t("common.of") || "de"} 100</span>
      </div>
    </div>
  );
}

/* ---------------- FORECAST CARD ---------------- */
function ForecastCard({
  forecast,
  horizon,
  setHorizon,
}: {
  forecast: ReturnType<typeof buildForecast>;
  horizon: 30 | 60 | 90;
  setHorizon: (h: 30 | 60 | 90) => void;
}) {
  const { t } = useI18n();
  const isPositive = forecast.avgDailyNet >= 0;
  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)] lg:col-span-2">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          {t("int.forecast")} ({horizon} {t("common.days") || "dias"})
        </CardTitle>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            value={String(horizon)}
            onValueChange={(v) => v && setHorizon(Number(v) as 30 | 60 | 90)}
            className="border border-border/60 rounded-md"
          >
            <ToggleGroupItem value="30" className="h-7 px-2 text-xs">30d</ToggleGroupItem>
            <ToggleGroupItem value="60" className="h-7 px-2 text-xs">60d</ToggleGroupItem>
            <ToggleGroupItem value="90" className="h-7 px-2 text-xs">90d</ToggleGroupItem>
          </ToggleGroup>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {isPositive ? "+" : ""}
            {brl(forecast.avgDailyNet)}{t("int.forecast.perDay")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t(forecast.messageKey, forecast.messageParams)}</p>
        <div className="h-[200px] w-full sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={forecast.series.map((p) => ({
                ...p,
                saldoReal: p.projetado ? null : p.saldo,
                saldoProj: p.projetado ? p.saldo : null,
              }))}
              margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.014 250)" />
              <XAxis
                dataKey="label"
                stroke="oklch(0.7 0.015 250)"
                fontSize={11}
                interval="preserveStartEnd"
              />
              <YAxis stroke="oklch(0.7 0.015 250)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.22 0.014 250)",
                  border: "1px solid oklch(0.3 0.014 250)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => (typeof v === "number" ? brl(v) : "—")}
                labelFormatter={(l) => t("int.forecast.day", { d: l })}
              />
              <ReferenceLine y={0} stroke="oklch(0.5 0.014 250)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="saldoReal"
                name={t("dash.legend.history") || "Histórico"}
                stroke="oklch(0.78 0.16 165)"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="saldoProj"
                name={t("int.forecast") || "Projeção"}
                stroke="oklch(0.78 0.16 165)"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-primary" /> {t("dash.legend.history")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-primary" /> {t("int.forecast")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- ANOMALIES SECTION ---------------- */
function AnomaliesSection({
  anomalies,
}: {
  anomalies: ReturnType<typeof detectAnomalies>;
}) {
  const { t } = useI18n();
  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" />
          {t("int.anomalies")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <span>
              {t("int.anomalies.emptyLong") || "Nenhum gasto fora do padrão detectado nos últimos 60 dias. Continue assim!"}
            </span>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {anomalies.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    a.severity === "high"
                      ? "bg-destructive/15 text-destructive"
                      : a.severity === "medium"
                        ? "bg-warning/15 text-warning"
                        : "bg-primary/15 text-primary"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{a.description}</p>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {brl(a.amount)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateBR(a.date)}
                    {a.category && ` · ${a.category}`}
                    {" · "}
                    <span className="font-medium text-foreground">
                      {t("int.anomalies.ratio", { n: a.ratio.toFixed(1) }) || `${a.ratio.toFixed(1)}x acima da média`}
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- AI INSIGHTS ---------------- */
function AIInsightsSection({
  insights,
  loading,
  hasData,
}: {
  insights: AIInsight[] | null;
  loading: boolean;
  hasData: boolean;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t("int.ai.title")}
        </h2>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
      ) : !insights ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {hasData
                  ? t("int.ai.empty")
                  : t("int.ai.noData") || "Adicione registros para gerar insights"}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("int.ai.desc") || "A IA analisa seu padrão de gastos e gera recomendações práticas."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t("int.ai.error") || "Nenhum insight retornado. Tente novamente em alguns instantes."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((ins, i) => (
            <InsightCard key={i} insight={ins} delay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight, delay }: { insight: AIInsight; delay: number }) {
  const { t } = useI18n();
  const sevMap = {
    positivo: { color: "text-success", bg: "bg-success/15", icon: CheckCircle2 },
    neutro: { color: "text-primary", bg: "bg-primary/15", icon: Info },
    atencao: { color: "text-warning", bg: "bg-warning/15", icon: AlertTriangle },
    critico: { color: "text-destructive", bg: "bg-destructive/15", icon: AlertTriangle },
  } as const;
  const cfg = sevMap[insight.severidade] || sevMap.neutro;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <Card className="h-full border-border/60 shadow-[var(--shadow-card)]">
        <CardContent className="flex h-full gap-3 p-5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold leading-snug">{insight.titulo}</p>
            <p className="text-sm text-muted-foreground">{insight.descricao}</p>
            <div className="mt-2 rounded-md border border-border/60 bg-muted/40 p-2.5">
              <p className="text-xs">
                <span className="font-medium text-foreground">{t("int.ai.recommendation") || "Recomendação"}: </span>
                <span className="text-muted-foreground">{insight.recomendacao}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
