// Pure local intelligence calculations (Score, Anomalies, Forecast)
import type { Transaction, Category, Budget, Goal } from "./types";

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

/* ---------------- SCORE 0–100 ----------------
   Components:
   - Saldo positivo (25)
   - Controle de gastos (despesas/entradas) (25)
   - Cumprimento de orçamentos (20)
   - Consistência (registros nos últimos 30 dias) (15)
   - Progresso em metas (15)
*/
export function calculateScore(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
): FinancialScore {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(now.getDate() - 30);
  const start30ISO = ymd(start30);

  const last30 = transactions.filter((t) => t.date >= start30ISO);
  const entradas = last30.filter((t) => t.type === "entrada").reduce((a, b) => a + b.amount, 0);
  const despesas = last30.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);

  // 1. Saldo (25)
  const saldoNet = entradas - despesas;
  const saldoComp = entradas > 0
    ? Math.max(0, Math.min(25, (saldoNet / entradas) * 50 + 12.5))
    : last30.length === 0 ? 12 : 0;

  // 2. Controle de gastos (25)
  let controleComp = 12;
  if (entradas > 0) {
    const ratio = despesas / entradas;
    if (ratio <= 0.5) controleComp = 25;
    else if (ratio <= 0.7) controleComp = 22;
    else if (ratio <= 0.85) controleComp = 18;
    else if (ratio <= 1) controleComp = 12;
    else controleComp = Math.max(0, 12 - (ratio - 1) * 30);
  }

  // 3. Orçamentos (20) — % de orçamentos não excedidos
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

  // 4. Consistência (15) — registros distribuídos
  const uniqueDays = new Set(last30.map((t) => t.date)).size;
  const consComp = Math.min(15, (uniqueDays / 15) * 15);

  // 5. Metas (15)
  let metasComp = 8;
  if (goals.length > 0) {
    const avgPct = goals.reduce(
      (acc, g) => acc + Math.min(1, g.currentAmount / Math.max(1, g.targetAmount)),
      0,
    ) / goals.length;
    metasComp = avgPct * 15;
  }

  const total = Math.round(saldoComp + controleComp + orcComp + consComp + metasComp);
  const score = Math.max(0, Math.min(100, total));

  let level: FinancialScore["level"] = "Crítico";
  if (score >= 80) level = "Excelente";
  else if (score >= 60) level = "Bom";
  else if (score >= 40) level = "Atenção";

  return {
    score,
    level,
    components: [
      { label: "Saldo", value: Math.round(saldoComp), max: 25, description: "Sua renda menos despesas (30d)" },
      { label: "Controle de gastos", value: Math.round(controleComp), max: 25, description: "% da renda que vai para despesas" },
      { label: "Orçamentos", value: Math.round(orcComp), max: 20, description: "Limites respeitados no mês" },
      { label: "Consistência", value: Math.round(consComp), max: 15, description: "Registros frequentes (30d)" },
      { label: "Metas", value: Math.round(metasComp), max: 15, description: "Progresso médio das metas" },
    ],
  };
}

/* ---------------- DETECÇÃO DE ANOMALIAS ----------------
   Despesa > 2.5x a média da categoria nos últimos 60 dias.
*/
export function detectAnomalies(transactions: Transaction[], categories: Category[]): Anomaly[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 60);
  const startISO = ymd(start);

  const despesas = transactions.filter((t) => t.type === "despesa" && t.date >= startISO);

  // Group by category
  const byCat = new Map<string, Transaction[]>();
  for (const t of despesas) {
    const key = t.categoryId || "_none";
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(t);
  }

  const anomalies: Anomaly[] = [];

  for (const [catId, txs] of byCat.entries()) {
    if (txs.length < 4) continue; // need history
    const avg = txs.reduce((a, b) => a + b.amount, 0) / txs.length;
    if (avg <= 0) continue;
    for (const t of txs) {
      const ratio = t.amount / avg;
      if (ratio >= 2.5) {
        const cat = categories.find((c) => c.id === catId);
        let severity: Anomaly["severity"] = "baixa";
        if (ratio >= 5) severity = "alta";
        else if (ratio >= 3.5) severity = "média";
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
