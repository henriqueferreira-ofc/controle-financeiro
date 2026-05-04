// Fase 3.2 — UI de Simulações ("E se...")
// Critérios cobertos:
// - 3.2.1/2/3: ajustes, re-projeção e comparação base vs simulado
import { memo, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFinwise } from "@/store/finwise-store";
import { runSimulation, type Adjustment } from "@/store/simulation";
import { brl } from "@/lib/format";
import { Beaker, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
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

type AdjType = "cut-category" | "extra-income" | "pause-recurring";

function SimulationCardInner() {
  const { transactions, categories, recurrings } = useFinwise();
  const { t } = useI18n();
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);

  // Form local
  const [draftType, setDraftType] = useState<AdjType>("cut-category");
  const [draftCat, setDraftCat] = useState<string>("");
  const [draftPct, setDraftPct] = useState<number>(20);
  const [draftIncome, setDraftIncome] = useState<string>("");
  const [draftRecId, setDraftRecId] = useState<string>("");

  const expenseCats = useMemo(
    () => categories.filter((c) => c.kind === "despesa"),
    [categories],
  );
  const activeRecs = useMemo(() => recurrings.filter((r) => r.active), [recurrings]);

  const result = useMemo(() => {
    return runSimulation(transactions, recurrings, adjustments, horizon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, recurrings, adjustments, horizon]);

  const chartData = useMemo(() => {
    // Combina série base e simulada por label (ambas têm o mesmo tamanho/datas)
    return result.base.series.map((p, i) => ({
      label: p.label,
      base: p.saldo,
      sim: result.simulated.series[i]?.saldo ?? p.saldo,
      isProjected: p.projetado,
    }));
  }, [result]);

  const addAdjustment = () => {
    if (draftType === "cut-category") {
      if (!draftCat) return;
      setAdjustments((prev) => [
        ...prev,
        { kind: "cut-category", categoryId: draftCat, percent: draftPct },
      ]);
      setDraftCat("");
    } else if (draftType === "extra-income") {
      const v = Number(draftIncome.replace(",", "."));
      if (!v || v <= 0) return;
      setAdjustments((prev) => [
        ...prev,
        { kind: "extra-income", monthlyAmount: v, description: t("sim.extraIncome") },
      ]);
      setDraftIncome("");
    } else if (draftType === "pause-recurring") {
      if (!draftRecId) return;
      setAdjustments((prev) => [
        ...prev,
        { kind: "pause-recurring", recurringId: draftRecId },
      ]);
      setDraftRecId("");
    }
  };

  const removeAt = (i: number) =>
    setAdjustments((prev) => prev.filter((_, idx) => idx !== i));

  const labelFor = (a: Adjustment): string => {
    if (a.kind === "cut-category") {
      const cat = categories.find((c) => c.id === a.categoryId);
      return t("sim.cutLabel", { p: a.percent, name: cat?.name ?? t("sim.expenseCat") });
    }
    if (a.kind === "extra-income") {
      return t("sim.incomeLabel", { v: brl(a.monthlyAmount) });
    }
    const rec = recurrings.find((r) => r.id === a.recurringId);
    return t("sim.pauseLabel", { name: rec?.description ?? "" });
  };

  const deltaPositive = result.delta >= 0;

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Beaker className="h-4 w-4 text-primary" />
          {t("sim.title")}
        </CardTitle>
        <ToggleGroup
          type="single"
          size="sm"
          value={String(horizon)}
          onValueChange={(v) => v && setHorizon(Number(v) as 30 | 60 | 90)}
          className="border border-border/60 rounded-md self-start sm:self-auto"
        >
          <ToggleGroupItem value="30" className="h-7 px-2 text-xs">30d</ToggleGroupItem>
          <ToggleGroupItem value="60" className="h-7 px-2 text-xs">60d</ToggleGroupItem>
          <ToggleGroupItem value="90" className="h-7 px-2 text-xs">90d</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Builder */}
        <div className="rounded-lg border border-dashed border-border/60 p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
            <Select value={draftType} onValueChange={(v) => setDraftType(v as AdjType)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cut-category">{t("sim.cutCategory")}</SelectItem>
                <SelectItem value="extra-income">{t("sim.extraIncome")}</SelectItem>
                <SelectItem value="pause-recurring">{t("sim.pauseRecurring")}</SelectItem>
              </SelectContent>
            </Select>

            {draftType === "cut-category" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={draftCat} onValueChange={setDraftCat}>
                  <SelectTrigger className="h-9 flex-1 text-sm">
                    <SelectValue placeholder={t("sim.expenseCat")} />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 sm:w-[200px]">
                  <Slider
                    value={[draftPct]}
                    onValueChange={(v) => setDraftPct(v[0])}
                    min={5}
                    max={100}
                    step={5}
                  />
                  <span className="w-10 text-right text-xs font-medium tabular-nums">
                    {draftPct}%
                  </span>
                </div>
              </div>
            )}

            {draftType === "extra-income" && (
              <Input
                type="number"
                inputMode="decimal"
                placeholder={t("sim.monthlyAmount")}
                value={draftIncome}
                onChange={(e) => setDraftIncome(e.target.value)}
                className="h-9 text-sm"
              />
            )}

            {draftType === "pause-recurring" && (
              <Select value={draftRecId} onValueChange={setDraftRecId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("sim.selectRecurring")} />
                </SelectTrigger>
                <SelectContent>
                  {activeRecs.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">
                      {t("sim.noActiveRec")}
                    </div>
                  ) : (
                    activeRecs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.description} ({brl(r.amount)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}

            <Button size="sm" onClick={addAdjustment} className="h-9">
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t("sim.add")}</span>
            </Button>
          </div>

          {adjustments.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {adjustments.map((a, i) => (
                <li key={i}>
                  <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                    {labelFor(a)}
                    <button
                      onClick={() => removeAt(i)}
                      className="ml-1 rounded p-0.5 hover:bg-muted"
                      aria-label={t("sim.remove")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resultado */}
        <div className="grid gap-3 sm:grid-cols-3">
          <ResultMini label={t("sim.baseBalance")} value={result.base.projectedBalance} />
          <ResultMini label={t("sim.simBalance")} value={result.simulated.projectedBalance} highlight />
          <ResultMini
            label={t("sim.delta")}
            value={result.delta}
            tone={deltaPositive ? "success" : "destructive"}
            icon={deltaPositive ? TrendingUp : TrendingDown}
          />
        </div>

        {/* Gráfico comparativo */}
        <div className="h-[200px] w-full sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
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
                labelFormatter={(l) => t("sim.day", { n: l })}
              />
              <ReferenceLine y={0} stroke="oklch(0.5 0.014 250)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="base"
                name={t("sim.base")}
                stroke="oklch(0.7 0.015 250)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="sim"
                name={t("sim.simulated")}
                stroke="oklch(0.78 0.16 165)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {adjustments.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {t("sim.hint")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultMini({
  label,
  value,
  tone,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive";
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  const color =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div
      className={`rounded-lg border ${highlight ? "border-primary/40 bg-primary/5" : "border-border/60"} p-3`}
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {Icon && <Icon className={`h-4 w-4 ${color}`} />}
        <span className={`text-lg font-semibold tabular-nums ${color}`}>
          {value >= 0 && tone === "success" ? "+" : ""}
          {brl(value)}
        </span>
      </div>
    </div>
  );
}

export const SimulationCard = memo(SimulationCardInner);
