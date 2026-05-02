// Pure local intelligence calculations (Score, Anomalies, Forecast)
// Fase 2 — Inteligência financeira refinada conforme roadmap
import type { Transaction, Category, Budget, Goal, Recurring } from "./types";

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

/* ---------------- FORECAST DE SALDO ---------------- */
export function buildForecast(transactions: Transaction[], daysAhead = 30): Forecast {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - 30);
  const pastISO = ymd(past);

  const last30 = transactions.filter((t) => t.date >= pastISO);
  const entradas = last30.filter((t) => t.type === "entrada").reduce((a, b) => a + b.amount, 0);
  const despesas = last30.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);
  const avgDailyNet = (entradas - despesas) / 30;

  // Cumulative real series of last 30d
  const series: ForecastPoint[] = [];
  let acc = 0;
  // Build daily map
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

  // Project daysAhead forward using avgDailyNet
  let proj = acc;
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const key = ymd(d);
    proj += avgDailyNet;
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
