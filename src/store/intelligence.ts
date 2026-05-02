// Pure local intelligence calculations (Score, Anomalies, Forecast, Insights)
// Fase 2 — Inteligência financeira refinada conforme roadmap
import type { Transaction, Category, Budget, Goal, Recurring } from "./types";
import { occurrencesBetween } from "./recurring-engine";

export type FinancialScore = {
  score: number; // 0-100
  level: "Crítico" | "Atenção" | "Bom" | "Excelente";
  components: { label: string; value: number; max: number; description: string }[];
};

export type Anomaly = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  ratio: number; // multiplier vs average
  severity: "alta" | "média" | "baixa";
};

export type ForecastPoint = { date: string; label: string; saldo: number; projetado?: boolean };

export type Forecast = {
  series: ForecastPoint[];
  projectedBalance: number;
  daysAhead: number;
  avgDailyNet: number;
  message: string;
};

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/* ---------------- SCORE 0–100 (Fase 2 — refinado) ----------------
   Pesos do roadmap:
   - Taxa de poupança (saldo / entradas) — 30 pts
   - Controle de gastos essenciais vs supérfluos — 20 pts
   - Cumprimento de orçamentos — 20 pts
   - Saúde de recorrências (sem atrasos / pausadas demais) — 10 pts
   - Progresso em metas — 15 pts
   - Ausência de anomalias graves — 5 pts
*/
export function calculateScore(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
  recurrings: Recurring[] = [],
  anomalies: Anomaly[] = [],
): FinancialScore {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(now.getDate() - 30);
  const start30ISO = ymd(start30);

  const last30 = transactions.filter((t) => t.date >= start30ISO);
  const entradas = last30.filter((t) => t.type === "entrada").reduce((a, b) => a + b.amount, 0);
  const despesas = last30.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);

  // 1. Taxa de poupança (30) — saldo positivo / entradas
  let poupancaComp = 0;
  if (entradas > 0) {
    const taxa = (entradas - despesas) / entradas;
    if (taxa >= 0.3) poupancaComp = 30;
    else if (taxa >= 0.2) poupancaComp = 25;
    else if (taxa >= 0.1) poupancaComp = 18;
    else if (taxa >= 0) poupancaComp = 10;
    else poupancaComp = Math.max(0, 10 + taxa * 25);
  } else if (last30.length === 0) {
    poupancaComp = 12;
  }

  // 2. Controle essenciais vs supérfluos (20) — supérfluos < 30% das despesas é ideal
  let controleComp = 10;
  if (despesas > 0) {
    const superfluos = last30
      .filter((t) => t.type === "despesa" && !t.essential)
      .reduce((a, b) => a + b.amount, 0);
    const pct = superfluos / despesas;
    if (pct <= 0.2) controleComp = 20;
    else if (pct <= 0.3) controleComp = 17;
    else if (pct <= 0.45) controleComp = 12;
    else if (pct <= 0.6) controleComp = 7;
    else controleComp = 3;
  }

  // 3. Orçamentos (20)
  let orcComp = 12;
  if (budgets.length > 0) {
    const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    let okCount = 0;
    for (const b of budgets) {
      const spent = transactions
        .filter((t) => t.type === "despesa" && t.categoryId === b.categoryId && t.date >= monthStart)
        .reduce((a, b2) => a + b2.amount, 0);
      if (spent <= b.amount) okCount++;
    }
    orcComp = (okCount / budgets.length) * 20;
  }

  // 4. Saúde de recorrências (10)
  let recComp = 5;
  if (recurrings.length > 0) {
    const ativas = recurrings.filter((r) => r.active && !r.pausedUntil).length;
    recComp = (ativas / recurrings.length) * 10;
  }

  // 5. Metas (15)
  let metasComp = 7;
  if (goals.length > 0) {
    const avgPct = goals.reduce(
      (acc, g) => acc + Math.min(1, g.currentAmount / Math.max(1, g.targetAmount)),
      0,
    ) / goals.length;
    metasComp = avgPct * 15;
  }

  // 6. Ausência de anomalias graves (5)
  const altas = anomalies.filter((a) => a.severity === "alta").length;
  const anomComp = Math.max(0, 5 - altas * 2);

  const total = Math.round(poupancaComp + controleComp + orcComp + recComp + metasComp + anomComp);
  const score = Math.max(0, Math.min(100, total));

  let level: FinancialScore["level"] = "Crítico";
  if (score >= 80) level = "Excelente";
  else if (score >= 60) level = "Bom";
  else if (score >= 40) level = "Atenção";

  return {
    score,
    level,
    components: [
      { label: "Poupança", value: Math.round(poupancaComp), max: 30, description: "% da renda que sobra (30d)" },
      { label: "Controle", value: Math.round(controleComp), max: 20, description: "Essenciais vs supérfluos" },
      { label: "Orçamentos", value: Math.round(orcComp), max: 20, description: "Limites respeitados no mês" },
      { label: "Recorrências", value: Math.round(recComp), max: 10, description: "Ativas e em dia" },
      { label: "Metas", value: Math.round(metasComp), max: 15, description: "Progresso médio" },
      { label: "Estabilidade", value: anomComp, max: 5, description: "Sem gastos atípicos graves" },
    ],
  };
}

/* ---------------- DETECÇÃO DE ANOMALIAS (Fase 2) ----------------
   Combina:
   - Razão vs média da categoria (>= 2.5x)
   - Z-score por categoria (|z| >= 2 indica desvio significativo)
   Severidade considera AMBOS os sinais.
*/
export function detectAnomalies(transactions: Transaction[], categories: Category[]): Anomaly[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 60);
  const startISO = ymd(start);

  const despesas = transactions.filter((t) => t.type === "despesa" && t.date >= startISO);

  const byCat = new Map<string, Transaction[]>();
  for (const t of despesas) {
    const key = t.categoryId || "_none";
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(t);
  }

  const anomalies: Anomaly[] = [];

  for (const [catId, txs] of byCat.entries()) {
    if (txs.length < 4) continue;
    const mean = txs.reduce((a, b) => a + b.amount, 0) / txs.length;
    if (mean <= 0) continue;
    const variance = txs.reduce((a, b) => a + (b.amount - mean) ** 2, 0) / txs.length;
    const std = Math.sqrt(variance);

    for (const t of txs) {
      const ratio = t.amount / mean;
      const z = std > 0 ? (t.amount - mean) / std : 0;
      // Critério: ratio >= 2.5 OU z >= 2
      if (ratio >= 2.5 || z >= 2) {
        const cat = categories.find((c) => c.id === catId);
        let severity: Anomaly["severity"] = "baixa";
        if (ratio >= 5 || z >= 3.5) severity = "alta";
        else if (ratio >= 3.5 || z >= 2.5) severity = "média";
        anomalies.push({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: cat?.name,
          ratio,
          severity,
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.ratio - a.ratio).slice(0, 12);
}

/* ---------------- FORECAST DE SALDO (Fase 2.3 — refinado) ----------------
   Combina:
   - Histórico real dos últimos 30 dias (saldo cumulativo)
   - Projeção futura = recorrências CONFIRMADAS por dia + média móvel diária do não-recorrente
   Suporta horizontes de 30, 60 ou 90 dias.
*/
export function buildForecast(
  transactions: Transaction[],
  daysAhead: 30 | 60 | 90 = 30,
  recurrings: Recurring[] = [],
): Forecast {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - 30);
  const pastISO = ymd(past);

  const last30 = transactions.filter((t) => t.date >= pastISO);

  // Média diária do que NÃO é recorrente/auto-gerado (gastos variáveis reais)
  const variaveis = last30.filter((t) => !t.autoGenerated && !t.recurringId);
  const entVar = variaveis.filter((t) => t.type === "entrada").reduce((a, b) => a + b.amount, 0);
  const despVar = variaveis.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);
  const avgDailyVarNet = (entVar - despVar) / 30;

  // Total de tudo (para mensagem)
  const entTotal = last30.filter((t) => t.type === "entrada").reduce((a, b) => a + b.amount, 0);
  const despTotal = last30.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);
  const avgDailyNet = (entTotal - despTotal) / 30;

  const series: ForecastPoint[] = [];
  let acc = 0;
  const startReal = new Date(past);
  startReal.setDate(past.getDate() + 1);
  for (let i = 0; i < 30; i++) {
    const d = new Date(startReal);
    d.setDate(startReal.getDate() + i);
    const key = ymd(d);
    const dayTx = transactions.filter((t) => t.date === key);
    const ent = dayTx.filter((t) => t.type === "entrada").reduce((a, b) => a + b.amount, 0);
    const desp = dayTx.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);
    acc += ent - desp;
    series.push({
      date: key,
      label: key.slice(8, 10) + "/" + key.slice(5, 7),
      saldo: Number(acc.toFixed(2)),
    });
  }

  // Pré-calcula recorrências por dia até o horizonte
  const futureStart = new Date(now);
  futureStart.setDate(now.getDate() + 1);
  futureStart.setHours(0, 0, 0, 0);
  const futureEnd = new Date(now);
  futureEnd.setDate(now.getDate() + daysAhead);
  futureEnd.setHours(23, 59, 59, 999);

  const recByDay = new Map<string, number>(); // delta líquido por dia
  for (const r of recurrings) {
    if (!r.active) continue;
    const dates = occurrencesBetween(r, futureStart, futureEnd);
    for (const d of dates) {
      const cur = recByDay.get(d) ?? 0;
      const delta = r.type === "entrada" ? r.amount : -r.amount;
      recByDay.set(d, cur + delta);
    }
  }

  let proj = acc;
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const key = ymd(d);
    proj += (recByDay.get(key) ?? 0) + avgDailyVarNet;
    series.push({
      date: key,
      label: key.slice(8, 10) + "/" + key.slice(5, 7),
      saldo: Number(proj.toFixed(2)),
      projetado: true,
    });
  }

  let message = "Sem histórico suficiente para projeção.";
  if (last30.length > 0) {
    const sign = avgDailyNet >= 0 ? "+" : "";
    const projFmt = proj.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const dailyFmt = Math.abs(avgDailyNet).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    message =
      avgDailyNet >= 0
        ? `Mantendo o ritmo (${sign}${dailyFmt}/dia), seu saldo será ${projFmt} em ${daysAhead} dias.`
        : `Atenção: você está perdendo ${dailyFmt}/dia. Em ${daysAhead} dias seu saldo será ${projFmt}.`;
  }

  return {
    series,
    projectedBalance: Number(proj.toFixed(2)),
    daysAhead,
    avgDailyNet: Number(avgDailyNet.toFixed(2)),
    message,
  };
}

/* ---------------- INSIGHTS LOCAIS ACIONÁVEIS (Fase 2.3) ----------------
   Gera cards priorizados sem depender de IA, com CTA navegável.
*/
export type LocalInsight = {
  id: string;
  title: string;
  description: string;
  severity: "positivo" | "neutro" | "atencao" | "critico";
  ctaLabel?: string;
  ctaTo?: string;
  priority: number; // maior = mais importante
};

export function buildInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  goals: Goal[],
  recurrings: Recurring[],
  forecast: Forecast,
): LocalInsight[] {
  const out: LocalInsight[] = [];
  const now = new Date();
  const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const start30 = new Date(now);
  start30.setDate(now.getDate() - 30);
  const startISO = ymd(start30);
  const last30 = transactions.filter((t) => t.date >= startISO);

  // 1. Saldo projetado negativo
  if (forecast.projectedBalance < 0) {
    out.push({
      id: "forecast-negative",
      title: "Saldo projetado negativo",
      description: `Em ${forecast.daysAhead} dias seu saldo será ${forecast.projectedBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Reagende despesas ou antecipe entradas.`,
      severity: "critico",
      ctaLabel: "Ver recorrências",
      ctaTo: "/recorrentes",
      priority: 100,
    });
  }

  // 2. Orçamentos estourados
  for (const b of budgets) {
    const cat = categories.find((c) => c.id === b.categoryId);
    const spent = transactions
      .filter((t) => t.type === "despesa" && t.categoryId === b.categoryId && t.date >= monthStart)
      .reduce((a, x) => a + x.amount, 0);
    if (spent > b.amount) {
      out.push({
        id: `budget-over-${b.id}`,
        title: `Orçamento estourado: ${cat?.name ?? "—"}`,
        description: `Gasto ${spent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de ${b.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} no mês.`,
        severity: "critico",
        ctaLabel: "Revisar orçamentos",
        ctaTo: "/orcamentos",
        priority: 90,
      });
    } else if (spent / b.amount >= 0.8) {
      out.push({
        id: `budget-near-${b.id}`,
        title: `Próximo do limite: ${cat?.name ?? "—"}`,
        description: `Você já usou ${Math.round((spent / b.amount) * 100)}% do orçamento da categoria.`,
        severity: "atencao",
        ctaLabel: "Ver orçamentos",
        ctaTo: "/orcamentos",
        priority: 70,
      });
    }
  }

  // 3. Categoria com gasto bem acima da média
  const byCatNow = new Map<string, number>();
  for (const t of last30.filter((t) => t.type === "despesa" && t.categoryId)) {
    byCatNow.set(t.categoryId!, (byCatNow.get(t.categoryId!) || 0) + t.amount);
  }
  // média de cada categoria nos 3 meses anteriores
  for (const [catId, atual] of byCatNow.entries()) {
    let soma = 0;
    let meses = 0;
    for (let k = 1; k <= 3; k++) {
      const ref = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const y = ref.getFullYear();
      const m = ref.getMonth();
      let total = 0;
      for (const t of transactions) {
        if (t.type !== "despesa" || t.categoryId !== catId) continue;
        const d = new Date(t.date + "T12:00:00");
        if (d.getFullYear() === y && d.getMonth() === m) total += t.amount;
      }
      if (total > 0) {
        soma += total;
        meses++;
      }
    }
    if (meses === 0) continue;
    const media = soma / meses;
    if (atual > media * 1.4 && atual - media > 50) {
      const cat = categories.find((c) => c.id === catId);
      const pct = Math.round(((atual - media) / media) * 100);
      out.push({
        id: `cat-spike-${catId}`,
        title: `${cat?.name ?? "Categoria"} acima da média`,
        description: `Você gastou ${pct}% a mais que sua média de 3 meses nesta categoria.`,
        severity: "atencao",
        ctaLabel: "Ver registros",
        ctaTo: "/registros",
        priority: 60,
      });
    }
  }

  // 4. Taxa de poupança
  const ent = last30.filter((t) => t.type === "entrada").reduce((a, b) => a + b.amount, 0);
  const desp = last30.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);
  if (ent > 0) {
    const taxa = (ent - desp) / ent;
    if (taxa >= 0.2) {
      out.push({
        id: "savings-good",
        title: "Boa taxa de poupança",
        description: `Você está poupando ${Math.round(taxa * 100)}% das suas entradas nos últimos 30 dias. Considere alocar em uma meta.`,
        severity: "positivo",
        ctaLabel: "Minhas metas",
        ctaTo: "/metas",
        priority: 40,
      });
    } else if (taxa < 0) {
      out.push({
        id: "savings-negative",
        title: "Você está gastando mais do que ganha",
        description: `Suas saídas superaram entradas em ${Math.abs(Math.round(taxa * 100))}% nos últimos 30 dias.`,
        severity: "critico",
        ctaLabel: "Ver registros",
        ctaTo: "/registros",
        priority: 95,
      });
    }
  }

  // 5. Recorrências pausadas há muito tempo
  const pausadas = recurrings.filter((r) => r.active && r.pausedUntil);
  if (pausadas.length >= 2) {
    out.push({
      id: "rec-paused",
      title: `${pausadas.length} recorrências pausadas`,
      description: "Revise se ainda fazem sentido ou retome para manter projeções precisas.",
      severity: "neutro",
      ctaLabel: "Revisar",
      ctaTo: "/recorrentes",
      priority: 30,
    });
  }

  // 6. Meta próxima de concluir
  for (const g of goals) {
    if (g.completed) continue;
    const pct = g.currentAmount / Math.max(1, g.targetAmount);
    if (pct >= 0.8 && pct < 1) {
      out.push({
        id: `goal-near-${g.id}`,
        title: `Meta "${g.name}" quase lá`,
        description: `Você está em ${Math.round(pct * 100)}% da sua meta. Falta pouco!`,
        severity: "positivo",
        ctaLabel: "Ver meta",
        ctaTo: "/metas",
        priority: 50,
      });
    }
  }

  // 7. Supérfluos elevados
  if (desp > 0) {
    const superfluos = last30
      .filter((t) => t.type === "despesa" && !t.essential)
      .reduce((a, b) => a + b.amount, 0);
    const pct = superfluos / desp;
    if (pct > 0.45) {
      out.push({
        id: "superfluos-high",
        title: "Gastos supérfluos elevados",
        description: `${Math.round(pct * 100)}% das suas despesas foram não-essenciais nos últimos 30 dias.`,
        severity: "atencao",
        ctaLabel: "Ver registros",
        ctaTo: "/registros",
        priority: 55,
      });
    }
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 8);
}


/* ---------------- AI SUMMARY PAYLOAD ----------------
   Build a compact JSON payload to send to Lovable AI for textual insights.
*/
export function buildAISummary(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  goals: Goal[],
) {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(now.getDate() - 30);
  const startISO = ymd(start30);

  const last30 = transactions.filter((t) => t.date >= startISO);
  const entradas = last30.filter((t) => t.type === "entrada").reduce((a, b) => a + b.amount, 0);
  const despesas = last30.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);

  const byCat = new Map<string, number>();
  for (const t of last30.filter((x) => x.type === "despesa")) {
    if (!t.categoryId) continue;
    byCat.set(t.categoryId, (byCat.get(t.categoryId) || 0) + t.amount);
  }
  const topCats = [...byCat.entries()]
    .map(([id, total]) => ({
      name: categories.find((c) => c.id === id)?.name || "Sem nome",
      total: Number(total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const orcamentos = budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.type === "despesa" && t.categoryId === b.categoryId && t.date >= monthStart)
      .reduce((a, b2) => a + b2.amount, 0);
    return {
      categoria: categories.find((c) => c.id === b.categoryId)?.name || "—",
      limite: b.amount,
      gasto: Number(spent.toFixed(2)),
      excedido: spent > b.amount,
    };
  });

  return {
    periodo: "últimos 30 dias",
    entradas: Number(entradas.toFixed(2)),
    despesas: Number(despesas.toFixed(2)),
    saldo: Number((entradas - despesas).toFixed(2)),
    transacoes: last30.length,
    topCategorias: topCats,
    orcamentos,
    metas: goals.map((g) => ({
      nome: g.name,
      progresso_pct: Math.min(100, Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100)),
    })),
  };
}
