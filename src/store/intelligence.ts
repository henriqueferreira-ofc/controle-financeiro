// Pure local intelligence calculations (Score, Anomalies, Forecast, Insights)
// Fase 2 — Inteligência financeira refinada conforme roadmap
import type { Transaction, Category, Budget, Goal, Recurring } from "./types";
import { occurrencesBetween } from "./recurring-engine";

export type FinancialScore = {
  score: number; // 0-100
  level: "score.level.critical" | "score.level.warning" | "score.level.good" | "score.level.excellent";
  components: { label: string; value: number; max: number; description: string }[];
};

export type Anomaly = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  ratio: number; // multiplier vs average
  severity: "high" | "medium" | "low";
};

export type ForecastPoint = { date: string; label: string; saldo: number; projetado?: boolean };

export type Forecast = {
  series: ForecastPoint[];
  projectedBalance: number;
  daysAhead: 30 | 60 | 90;
  avgDailyNet: number;
  message: string;
};

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  let level: FinancialScore["level"] = "score.level.critical";
  if (score >= 80) level = "score.level.excellent";
  else if (score >= 60) level = "score.level.good";
  else if (score >= 40) level = "score.level.warning";

  return {
    score,
    level,
    components: [
      { label: "int.score.saving", value: Math.round(poupancaComp), max: 30, description: "int.score.saving.desc" },
      { label: "int.score.control", value: Math.round(controleComp), max: 20, description: "int.score.control.desc" },
      { label: "int.score.budgets", value: Math.round(orcComp), max: 20, description: "int.score.budgets.desc" },
      { label: "int.score.recurrings", value: Math.round(recComp), max: 10, description: "int.score.recurrings.desc" },
      { label: "int.score.goals", value: Math.round(metasComp), max: 15, description: "int.score.goals.desc" },
      { label: "int.score.stability", value: anomComp, max: 5, description: "int.score.stability.desc" },
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
        let severity: Anomaly["severity"] = "low";
        if (ratio >= 5 || z >= 3.5) severity = "high";
        else if (ratio >= 3.5 || z >= 2.5) severity = "medium";
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

  let messageKey = "int.forecast.msg.empty";
  let messageParams = {};

  if (last30.length > 0) {
    const sign = avgDailyNet >= 0 ? "+" : "";
    messageKey = avgDailyNet >= 0 ? "int.forecast.msg.ok" : "int.forecast.msg.warn";
    messageParams = {
      sign,
      daily: Math.abs(avgDailyNet).toFixed(2),
      proj: proj.toFixed(2),
      days: daysAhead,
    };
  }

  return {
    series,
    projectedBalance: Number(proj.toFixed(2)),
    daysAhead,
    avgDailyNet: Number(avgDailyNet.toFixed(2)),
    messageKey,
    messageParams,
  };
}

/* ---------------- INSIGHTS LOCAIS ACIONÁVEIS (Fase 2.3) ----------------
   Gera cards priorizados sem depender de IA, com CTA navegável.
*/
export type LocalInsight = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  params?: Record<string, any>;
  severity: "positivo" | "neutro" | "atencao" | "critico";
  ctaLabelKey?: string;
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

  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 1. Saldo projetado negativo
  if (forecast.projectedBalance < 0) {
    out.push({
      id: `forecast-negative-${ym}`,
      titleKey: "ins.forecast.neg.title",
      descriptionKey: "ins.forecast.neg.desc",
      params: { 
        days: forecast.daysAhead, 
        amount: forecast.projectedBalance.toFixed(2) 
      },
      severity: "critico",
      ctaLabelKey: "nav.recurring",
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
        id: `budget-over-${b.id}-${ym}`,
        titleKey: "ins.bud.over.title",
        params: { name: cat?.name ?? "—", spent: spent.toFixed(2), limit: b.amount.toFixed(2) },
        descriptionKey: "ins.bud.over.desc",
        severity: "critico",
        ctaLabelKey: "nav.budgets",
        ctaTo: "/orcamentos",
        priority: 90,
      });
    } else if (spent / b.amount >= 0.8) {
      out.push({
        id: `budget-near-${b.id}-${ym}`,
        titleKey: "ins.bud.near.title",
        params: { name: cat?.name ?? "—", pct: Math.round((spent / b.amount) * 100) },
        descriptionKey: "ins.bud.near.desc",
        severity: "atencao",
        ctaLabelKey: "nav.budgets",
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
  const catMonthTotals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "despesa" || !t.categoryId) continue;
    const key = `${t.categoryId}|${t.date.slice(0, 7)}`;
    catMonthTotals.set(key, (catMonthTotals.get(key) || 0) + t.amount);
  }

  for (const [catId, atual] of byCatNow.entries()) {
    let soma = 0;
    let meses = 0;
    for (let k = 1; k <= 3; k++) {
      const ref = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const ymRef = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
      const total = catMonthTotals.get(`${catId}|${ymRef}`) ?? 0;
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
        id: `cat-spike-${catId}-${ym}`,
        titleKey: "ins.cat.spike.title",
        params: { name: cat?.name ?? "Categoria", pct },
        descriptionKey: "ins.cat.spike.desc",
        severity: "atencao",
        ctaLabelKey: "nav.records",
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
        id: `savings-good-${ym}`,
        titleKey: "ins.sav.good.title",
        params: { pct: Math.round(taxa * 100) },
        descriptionKey: "ins.sav.good.desc",
        severity: "positivo",
        ctaLabelKey: "nav.goals",
        ctaTo: "/metas",
        priority: 40,
      });
    } else if (taxa < 0) {
      out.push({
        id: `savings-negative-${ym}`,
        titleKey: "ins.sav.neg.title",
        params: { pct: Math.abs(Math.round(taxa * 100)) },
        descriptionKey: "ins.sav.neg.desc",
        severity: "critico",
        ctaLabelKey: "nav.records",
        ctaTo: "/registros",
        priority: 95,
      });
    }
  }

  // 5. Recorrências pausadas há muito tempo
  const pausadas = recurrings.filter((r) => r.active && r.pausedUntil);
  if (pausadas.length >= 2) {
    out.push({
      id: `rec-paused-${ym}`,
      titleKey: "ins.rec.paused.title",
      params: { n: pausadas.length },
      descriptionKey: "ins.rec.paused.desc",
      severity: "neutro",
      ctaLabelKey: "common.edit",
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
        id: `goal-near-${g.id}-${ym}`,
        titleKey: "ins.goal.near.title",
        params: { name: g.name, pct: Math.round(pct * 100) },
        descriptionKey: "ins.goal.near.desc",
        severity: "positivo",
        ctaLabelKey: "nav.goals",
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
        id: `superfluos-high-${ym}`,
        titleKey: "ins.super.high.title",
        params: { pct: Math.round(pct * 100) },
        descriptionKey: "ins.super.high.desc",
        severity: "atencao",
        ctaLabelKey: "nav.records",
        ctaTo: "/registros",
        priority: 55,
      });
    }
  }

  // 8. Alerta de Vencimento de Cartão de Crédito (Fase 3.4)
  const hasCreditCard = last30.some(t => t.paymentMethod === "credit_card");
  if (hasCreditCard) {
    const totalCC = last30.filter(t => t.paymentMethod === "credit_card").reduce((a, b) => a + b.amount, 0);
    out.push({
      id: `credit-card-alert-${ym}`,
      titleKey: "ins.cc.title",
      descriptionKey: "ins.cc.desc",
      params: { amount: totalCC.toFixed(2) },
      severity: "atencao",
      ctaLabelKey: "nav.records",
      ctaTo: "/registros",
      priority: 85,
    });
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
