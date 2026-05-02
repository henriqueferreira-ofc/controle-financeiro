// Fase 1.2 — Projeção dos próximos 7 dias + comparativo + timeline
// Fase 1.1 — Widget "Próximas 4 semanas" (ocorrências exatas das recorrências)
import type { Recurring, Transaction } from "./types";
import { occurrencesBetween, parseISO, ymd } from "./recurring-engine";

export type WeekPoint = {
  date: string;       // YYYY-MM-DD
  label: string;      // dd/mm
  amount: number;     // total despesas previstas no dia
  income: number;     // total entradas previstas no dia
};

export type UpcomingItem = {
  recurringId: string;
  date: string;       // YYYY-MM-DD
  description: string;
  amount: number;
  type: "entrada" | "despesa";
  categoryId?: string | null;
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/**
 * Calcula o saldo atual baseado em todas as transações já registradas.
 */
export function computeCurrentBalance(transactions: Transaction[]): number {
  let bal = 0;
  for (const t of transactions) {
    bal += t.type === "entrada" ? t.amount : -t.amount;
  }
  return Number(bal.toFixed(2));
}

/**
 * Projeção dos próximos N dias (default 7).
 * Usa as recorrências ativas para calcular saídas/entradas previstas.
 */
export function projectNextDays(
  recurrings: Recurring[],
  days = 7,
  from: Date = new Date(),
): { points: WeekPoint[]; totalExpense: number; totalIncome: number } {
  const start = startOfDay(from);
  const end = addDays(start, days - 1);
  end.setHours(23, 59, 59, 999);

  const points: WeekPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const dateStr = ymd(d);
    points.push({
      date: dateStr,
      label: dateStr.slice(8, 10) + "/" + dateStr.slice(5, 7),
      amount: 0,
      income: 0,
    });
  }
  const idx = new Map(points.map((p, i) => [p.date, i]));

  for (const r of recurrings) {
    if (!r.active) continue;
    const dates = occurrencesBetween(r, start, end);
    for (const d of dates) {
      const i = idx.get(d);
      if (i === undefined) continue;
      if (r.type === "despesa") points[i].amount += r.amount;
      else points[i].income += r.amount;
    }
  }

  let totalExpense = 0;
  let totalIncome = 0;
  for (const p of points) {
    p.amount = Number(p.amount.toFixed(2));
    p.income = Number(p.income.toFixed(2));
    totalExpense += p.amount;
    totalIncome += p.income;
  }

  return {
    points,
    totalExpense: Number(totalExpense.toFixed(2)),
    totalIncome: Number(totalIncome.toFixed(2)),
  };
}

/**
 * Comparativo de saída do período atual vs média dos últimos 3 meses.
 * Retorna delta em % (positivo = mais alto que a média).
 */
export function expenseVs3MonthAvg(
  transactions: Transaction[],
  filters: { period: "7d" | "30d" | "all" },
): number | null {
  const now = new Date();
  // Soma das despesas de cada um dos últimos 3 meses completos (não inclui o mês corrente)
  const monthly: number[] = [];
  for (let k = 1; k <= 3; k++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const y = ref.getFullYear();
    const m = ref.getMonth();
    let total = 0;
    for (const t of transactions) {
      if (t.type !== "despesa") continue;
      const d = parseISO(t.date);
      if (d.getFullYear() === y && d.getMonth() === m) total += t.amount;
    }
    monthly.push(total);
  }
  const avg = monthly.reduce((a, b) => a + b, 0) / 3;
  if (avg <= 0) return null;

  // Despesas do período atual filtrado
  const days = filters.period === "7d" ? 7 : filters.period === "30d" ? 30 : null;
  if (!days) return null;
  const start = addDays(startOfDay(now), -(days - 1));
  let current = 0;
  for (const t of transactions) {
    if (t.type !== "despesa") continue;
    const d = parseISO(t.date);
    if (d >= start && d <= now) current += t.amount;
  }
  // Normaliza a média para o mesmo nº de dias do período (média mensal ≈ 30d)
  const avgScaled = (avg / 30) * days;
  if (avgScaled <= 0) return null;
  return Number((((current - avgScaled) / avgScaled) * 100).toFixed(1));
}

/**
 * Próximas N ocorrências de TODAS as recorrências, ordenadas por data.
 * Usado pelo widget "Próximas 4 semanas".
 */
export function upcomingOccurrences(
  recurrings: Recurring[],
  weeks = 4,
  from: Date = new Date(),
): UpcomingItem[] {
  const start = startOfDay(from);
  const end = addDays(start, weeks * 7);
  const items: UpcomingItem[] = [];
  for (const r of recurrings) {
    if (!r.active) continue;
    const dates = occurrencesBetween(r, start, end);
    for (const d of dates) {
      items.push({
        recurringId: r.id,
        date: d,
        description: r.description,
        amount: r.amount,
        type: r.type,
        categoryId: r.categoryId ?? null,
      });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}
